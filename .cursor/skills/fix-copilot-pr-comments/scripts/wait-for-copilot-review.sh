#!/usr/bin/env bash
# wait-for-copilot-review.sh — block until a FRESH Copilot review lands on a PR.
#
# "Fresh" = a Copilot review whose `submitted_at` is later than <since_iso>. Capture <since_iso>
# with `date -u +%Y-%m-%dT%H:%M:%SZ` right BEFORE you (re)request the review (trigger-copilot-review.sh
# prints it). This handles BOTH cases correctly:
#   - a new head commit (Copilot reviews the new head), and
#   - a re-request on the SAME head, where an older Copilot review already exists and would
#     otherwise look "done" and cause you to read stale threads.
# ISO-8601 UTC timestamps compare correctly as plain strings, so no date math is needed.
#
# If <since_iso> is omitted, falls back to: a Copilot review whose commit_id == current head.
#
# Exit 0: a fresh Copilot review is present (now safe to re-list threads).
# Exit 2: timed out (Copilot disabled/slow — report; do NOT claim "quiet").
#
# Usage: wait-for-copilot-review.sh <owner/repo> <pr> [since_iso] [timeout=360] [interval=15]
# Requires: gh (authenticated).
set -euo pipefail

REPO="${1:?owner/repo}"
PR="${2:?pr number}"
SINCE="${3:-}"
TIMEOUT="${4:-360}"
INTERVAL="${5:-15}"

head="$(gh pr view "$PR" --repo "$REPO" --json headRefOid --jq .headRefOid)"
if [ -n "$SINCE" ]; then
  echo "PR #$PR: waiting up to ${TIMEOUT}s for a Copilot review submitted after $SINCE (head=$head)…"
else
  echo "PR #$PR: waiting up to ${TIMEOUT}s for a Copilot review of head $head…"
fi

deadline=$(( $(date +%s) + TIMEOUT ))
while :; do
  if [ -n "$SINCE" ]; then
    hit="$(gh api "repos/$REPO/pulls/$PR/reviews" --paginate \
      --jq '.[] | select(.user.login|test("[Cc]opilot")) | select(.submitted_at > "'"$SINCE"'") | .submitted_at' \
      2>/dev/null | head -1 || true)"
  else
    hit="$(gh api "repos/$REPO/pulls/$PR/reviews" --paginate \
      --jq '.[] | select(.user.login|test("[Cc]opilot")) | .commit_id' \
      2>/dev/null | grep -Fx "$head" || true)"
  fi
  if [ -n "$hit" ]; then
    echo "PR #$PR: fresh Copilot review detected — safe to re-list threads."
    exit 0
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "TIMEOUT PR #$PR: no fresh Copilot review after ${TIMEOUT}s." >&2
    echo "Copilot may be disabled on this PR or just slow — verify manually before concluding." >&2
    exit 2
  fi
  sleep "$INTERVAL"
done

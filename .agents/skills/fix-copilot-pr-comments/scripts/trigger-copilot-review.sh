#!/usr/bin/env bash
# trigger-copilot-review.sh — (re)request a fresh Copilot review on a PR, or on ALL your open PRs.
#
# IMPORTANT: Copilot's reviewer login is the bot slug `copilot-pull-request-reviewer[bot]`.
# The plain name "Copilot" is silently ignored by the requested_reviewers endpoint.
#
# It prints a `since` timestamp (UTC ISO) captured *before* the request — pass it to
# wait-for-copilot-review.sh so the wait only counts a review submitted AFTER this trigger
# (correct even when the head SHA hasn't changed and an older review already exists).
#
# Usage:
#   trigger-copilot-review.sh <owner/repo> <pr>              # one PR
#   trigger-copilot-review.sh <owner/repo> --all [author]    # all open PRs by author (default @me)
# Requires: gh (authenticated).
set -euo pipefail

REPO="${1:?owner/repo}"; shift
BOT='copilot-pull-request-reviewer[bot]'

req() {
  local pr="$1"
  gh api -X POST "repos/$REPO/pulls/$pr/requested_reviewers" -f "reviewers[]=$BOT" \
    --jq '"PR #'"$pr"' requested: " + ([.requested_reviewers[].login] | join(","))' \
    2>/dev/null || echo "PR #$pr request FAILED"
}

SINCE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "since=$SINCE"

if [ "${1:-}" = "--all" ]; then
  AUTHOR="${2:-@me}"
  for pr in $(gh pr list --repo "$REPO" --author "$AUTHOR" --state open --json number --jq '.[].number'); do
    req "$pr"
  done
else
  req "${1:?pr number}"
fi

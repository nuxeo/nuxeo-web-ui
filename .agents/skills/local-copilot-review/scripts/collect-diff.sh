#!/usr/bin/env bash
# collect-diff.sh — print the PR-sized diff for a local Copilot-style review.
#
# Usage:
#   collect-diff.sh [base-ref]
#   collect-diff.sh origin/maintenance-3.1.x
set -euo pipefail

BASE="${1:-}"

if [ -z "$BASE" ]; then
  git fetch --quiet origin lts-2025 maintenance-3.1.x 2>/dev/null || true
  best_base=
  best_ts=0
  for candidate in origin/lts-2025 origin/maintenance-3.1.x; do
    git rev-parse --verify --quiet "$candidate^{commit}" >/dev/null || continue
    merge_base=$(git merge-base HEAD "$candidate")
    ts=$(git show -s --format=%ct "$merge_base")
    if [ "$ts" -gt "$best_ts" ]; then
      best_ts=$ts
      best_base=$candidate
    fi
  done
  BASE=$best_base
fi

[ -n "$BASE" ] || { echo "error: could not determine a PR base" >&2; exit 2; }
git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null ||
  { echo "error: unknown base ref $BASE" >&2; exit 2; }

echo "Base: $BASE"
echo
echo "Changed files:"
git diff --name-status "$BASE"...HEAD

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo
  echo "Uncommitted changes:"
  git status --short
fi

echo
echo "Committed diff ($BASE...HEAD):"
git diff --find-renames "$BASE"...HEAD

if ! git diff --cached --quiet; then
  echo
  echo "Staged diff:"
  git diff --cached --find-renames
fi

if ! git diff --quiet; then
  echo
  echo "Unstaged diff:"
  git diff --find-renames
fi

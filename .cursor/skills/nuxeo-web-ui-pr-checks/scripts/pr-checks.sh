#!/usr/bin/env bash
# Run the same gating checks the nuxeo-web-ui PR CI runs (Lint + Unit tests),
# locally, before pushing to a PR branch.
# Mirrors .github/workflows/lint.yaml (npm run lint) and test.yaml (npm run test).
#
# Usage:
#   pr-checks.sh          # lint + test (exactly what CI gates on)
#   pr-checks.sh --fix    # npm run format first (prettier --write + eslint --fix), then lint + test
#
# Exit codes: 0 = all green (safe to push); 1 = a check failed; 2 = usage/setup error.

set -uo pipefail

FIX=0
for arg in "$@"; do
  case "$arg" in
    --fix) FIX=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $arg (use --fix or --help)" >&2; exit 2 ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "Not inside a git repository." >&2; exit 2; }
cd "$ROOT" || exit 2

fail() { printf '\n\xe2\x9d\x8c %s\n' "$1"; exit 1; }
step() { printf '\n\xe2\x96\xb6 %s\n' "$1"; }

# 0. Optional auto-format. CI does NOT format; it only verifies (prettier --list-different).
if [ "$FIX" -eq 1 ]; then
  step "npm run format (prettier --write -> eslint --fix)"
  npm run format || fail "format failed"
fi

# 1. Lint gate (lint.yaml): eslint + prettier --list-different.
step "npm run lint"
npm run lint || fail "lint failed - run with --fix (or 'npm run format'), commit, then re-run"

# 2. Unit tests (test.yaml): web-test-runner --coverage.
step "npm test"
if ! npm test; then
  # Most common local-only cause: npm install replaced the nuxeo-elements symlinks.
  if [ -e node_modules/@nuxeo/nuxeo-ui-elements ] && [ ! -L node_modules/@nuxeo/nuxeo-ui-elements ]; then
    # Prefer this run's own elements clone; fall back to the sibling reference checkout.
    EL="${NX_ELEMENTS:-$(cd .. 2>/dev/null && pwd)/nuxeo-elements}"
    if [ -d "$EL" ]; then
      cat >&2 <<HINT

Hint: @nuxeo packages are not symlinked to $EL (a prior \`npm install\`
likely replaced them). Re-link with ABSOLUTE paths and retry — relative links resolve
against whatever sits beside the checkout, which cross-wires parallel ticket workspaces:
  rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s "$EL/ui" node_modules/@nuxeo/nuxeo-ui-elements
  rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s "$EL/core" node_modules/@nuxeo/nuxeo-elements
  rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s "$EL/dataviz" node_modules/@nuxeo/nuxeo-dataviz-elements
HINT
    fi
  fi
  fail "unit tests failed"
fi

printf '\n\xe2\x9c\x85 Lint + unit tests passed (matches the PR gating checks). Safe to push.\n'
printf '   Note: CI also runs a11y/build/sonar (Maven + secrets); see SKILL.md if relevant.\n'
exit 0

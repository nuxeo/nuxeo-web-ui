#!/bin/sh
# Reject commit messages that would fail cla-assistant.io on nuxeo/* PRs.
set -eu

MSG_FILE=${1:-${HUSKY_GIT_PARAMS:-}}

if [ -z "$MSG_FILE" ] || [ ! -f "$MSG_FILE" ]; then
  echo "commit-msg-cla: missing commit message file" >&2
  exit 1
fi

if grep -qiE '^Co-authored-by:[[:space:]]*[^<]*<[[:space:]]*cursoragent@cursor\.com[[:space:]]*>[[:space:]]*$' \
  "$MSG_FILE"; then
  echo "commit-msg-cla: remove the Cursor agent co-author trailer; its email is not CLA-covered." >&2
  exit 1
fi

exit 0

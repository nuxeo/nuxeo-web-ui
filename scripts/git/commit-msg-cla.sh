#!/bin/sh
# Reject commit messages that would fail cla-assistant.io on nuxeo/* PRs.
set -eu

MSG_FILE=${1:-}

if [ -z "$MSG_FILE" ] || [ ! -f "$MSG_FILE" ]; then
  echo "commit-msg-cla: missing commit message file" >&2
  exit 1
fi

if grep -qiE '^Co-authored-by:.*cursor' "$MSG_FILE"; then
  echo "commit-msg-cla: remove Co-authored-by: Cursor from the commit message (CLA check)." >&2
  exit 1
fi

if grep -qi 'cursoragent@cursor.com' "$MSG_FILE"; then
  echo "commit-msg-cla: cursoragent@cursor.com is not CLA-covered; use your Hyland email only." >&2
  exit 1
fi

exit 0

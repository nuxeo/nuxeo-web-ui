#!/usr/bin/env bash
# reply-resolve-thread.sh — reply to a Copilot review thread, then mark it resolved.
#
# Usage:
#   reply-resolve-thread.sh <owner/repo> <pr> <commentId> <threadId> "<reply body>"
#
# - <commentId> is the REST databaseId of the first comment in the thread.
# - <threadId>  is the GraphQL node id (PRRT_...) of the review thread.
# Both come straight from list-copilot-threads.sh output.
#
# Requires: gh (authenticated).
set -euo pipefail

REPO="${1:?owner/repo}"
PR="${2:?pr number}"
COMMENT_ID="${3:?comment databaseId}"
THREAD_ID="${4:?thread node id (PRRT_...)}"
BODY="${5:?reply body}"

gh api "repos/$REPO/pulls/$PR/comments/$COMMENT_ID/replies" -f body="$BODY" --jq '"replied: \(.id)"'
gh api graphql -f query='
  mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread { isResolved } } }' \
  -f id="$THREAD_ID" --jq '"resolved: \(.data.resolveReviewThread.thread.isResolved)"'

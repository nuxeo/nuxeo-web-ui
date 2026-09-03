#!/usr/bin/env bash
# list-copilot-threads.sh — list UNRESOLVED Copilot review threads across your open PRs.
#
# Emits one JSON object per unresolved Copilot thread (across all matching PRs) so the
# agent can build a single cross-PR worklist. Pipe through `jq` to group/inspect.
#
# Usage:
#   list-copilot-threads.sh [owner/repo] [author]
#   list-copilot-threads.sh                      # defaults: nuxeo/nuxeo-web-ui, @me
#   list-copilot-threads.sh nuxeo/nuxeo-web-ui someuser
#
# Requires: gh (authenticated), jq.
set -euo pipefail

REPO="${1:-nuxeo/nuxeo-web-ui}"
AUTHOR="${2:-@me}"
OWNER="${REPO%/*}"
NAME="${REPO#*/}"

prs="$(gh pr list --repo "$REPO" --author "$AUTHOR" --state open --limit 200 --json number --jq '.[].number')"
[ -z "$prs" ] && { echo "No open PRs for author=$AUTHOR in $REPO" >&2; exit 0; }

for pr in $prs; do
  cursor=
  while :; do
    cursor_arg=${cursor:-null}
    page="$(gh api graphql -f query='
    query($owner:String!,$name:String!,$pr:Int!,$cursor:String){
      repository(owner:$owner,name:$name){
        pullRequest(number:$pr){
          number title headRefName baseRefName
          reviewThreads(first:100, after:$cursor){
            pageInfo { hasNextPage endCursor }
            nodes {
            id isResolved isOutdated
            comments(first:1){ nodes {
              author{login} path line originalLine diffHunk body url databaseId
            } }
            }
          }
        }
      }
    }' -F owner="$OWNER" -F name="$NAME" -F pr="$pr" -F cursor="$cursor_arg")"
    printf '%s\n' "$page" | jq -c '
      .data.repository.pullRequest as $p
      | $p.reviewThreads.nodes[]
      | select(.isResolved==false)
      | select(.comments.nodes[0].author.login | test("[Cc]opilot"))
      | {pr:$p.number, base:$p.baseRefName, head:$p.headRefName, title:$p.title,
         threadId:.id, commentId:.comments.nodes[0].databaseId, outdated:.isOutdated,
         path:.comments.nodes[0].path,
         line:(.comments.nodes[0].line // .comments.nodes[0].originalLine),
         url:.comments.nodes[0].url, body:.comments.nodes[0].body}'
    has_next="$(printf '%s\n' "$page" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')"
    [ "$has_next" = true ] || break
    cursor="$(printf '%s\n' "$page" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor')"
  done
done

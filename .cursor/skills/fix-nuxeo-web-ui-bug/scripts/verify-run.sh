#!/usr/bin/env bash
# Verify that a fix-nuxeo-web-ui-bug run actually did what it claims.
#
# Every gate is checked against the live Jira/GitHub state (or the filesystem) —
# never against the agent's own narration. Run it at the end of Phase 10 and keep
# fixing + re-running until it exits 0.
#
# Usage:
#   verify-run.sh <TICKET-ID> <PR-lts-2025> <PR-maintenance-3.1.x>
#   verify-run.sh WEBUI-1234 3366 3367
#
# Requires: ~/.jira_email, ~/.jira_token, gh (authenticated), python3.
# Exit codes: 0 = every gate passed; 1 = at least one gate failed; 2 = usage/setup error.

set -uo pipefail

TICKET="${1:-}"
PR_LTS="${2:-}"
PR_MAINT="${3:-}"
[ -n "$TICKET" ] && [ -n "$PR_LTS" ] && [ -n "$PR_MAINT" ] || {
  sed -n '2,14p' "$0" >&2
  exit 2
}

JIRA_BASE="https://hyland.atlassian.net"
REPO="nuxeo/nuxeo-web-ui"
EVIDENCE_DIR="$HOME/Desktop/$TICKET"

PASS=0
FAIL=0
pass() { printf '  \xe2\x9c\x85 %s\n' "$1"; PASS=$((PASS + 1)); }
fail() { printf '  \xe2\x9d\x8c %s\n' "$1"; FAIL=$((FAIL + 1)); }
gate() { printf '\n\xe2\x96\xb6 %s\n' "$1"; }

command -v python3 >/dev/null || { echo "python3 not found" >&2; exit 2; }
command -v gh >/dev/null || { echo "gh not found" >&2; exit 2; }
[ -r "$HOME/.jira_email" ] && [ -r "$HOME/.jira_token" ] || {
  echo "Missing ~/.jira_email or ~/.jira_token — see SKILL.md Phase 7.5." >&2
  exit 2
}
# Strip the trailing newline: a stray \n in either file yields a spurious 401.
U="$(tr -d '\r\n' < "$HOME/.jira_email"):$(tr -d '\r\n' < "$HOME/.jira_token")"

jira() { curl -s -u "$U" -H "Accept: application/json" "$JIRA_BASE/rest/api/3/$1"; }

# ---------------------------------------------------------------- Gate 1: auth
gate "Gate 1 — Jira credentials"
if [ "$(curl -s -o /dev/null -w '%{http_code}' -u "$U" "$JIRA_BASE/rest/api/3/myself")" = "200" ]; then
  pass "authenticated"
else
  fail "GET /myself did not return 200 — token expired/revoked or has a stray newline; refresh ~/.jira_token"
  printf '\nAborting: every remaining Jira gate would report a false failure.\n'
  exit 1
fi

# ------------------------------------------------- Gate 2: evidence on disk
# Videos have fixed names; screenshots may be numbered per state
# (<TICKET>-before-1-<state>.png), so match those by pattern.
gate "Gate 2 — Evidence files on disk ($EVIDENCE_DIR)"
check_file() { # <path> <label>
  if [ ! -f "$1" ]; then
    fail "$2 missing"
  elif [ "$(wc -c < "$1" | tr -d ' ')" -lt 10240 ]; then
    fail "$2 is under 10 KB — almost certainly a truncated/black capture"
  else
    pass "$2"
  fi
}
for state in before after; do
  check_file "$EVIDENCE_DIR/$TICKET-$state.mp4" "$TICKET-$state.mp4"
  shots=$(find "$EVIDENCE_DIR" -maxdepth 1 -name "$TICKET*$state*.png" -size +10k 2>/dev/null | wc -l | tr -d ' ')
  if [ "${shots:-0}" -gt 0 ]; then
    pass "$shots '$state' screenshot(s)"
  else
    fail "no '$state' screenshot over 10 KB (expected $TICKET-$state.png or $TICKET-$state-N-<state>.png)"
  fi
done

# ------------------------------------------- Gate 3: attachments on the ticket
gate "Gate 3 — Evidence attached to $TICKET (Jira API, not intent)"
ATTACH_JSON="$(jira "issue/$TICKET?fields=attachment")"
ATTACH_REPORT="$(TICKET="$TICKET" python3 -c '
import json, os, sys
t = os.environ["TICKET"]
d = json.load(sys.stdin)
items = (d.get("fields") or {}).get("attachment") or []
by_name = {a["filename"]: a.get("size", 0) for a in items}

# Videos are exact names; screenshots may be numbered per state, so match by pattern.
for state in ("before", "after"):
    vid = f"{t}-{state}.mp4"
    if vid not in by_name:
        print(f"FAIL|{vid} is NOT attached to the ticket")
    elif by_name[vid] < 10240:
        print(f"FAIL|{vid} attached but only {by_name[vid]} bytes")
    else:
        print(f"PASS|{vid} attached ({by_name[vid]} bytes)")

    shots = [n for n, sz in by_name.items()
             if n.lower().endswith(".png") and state in n.lower() and sz >= 10240]
    if shots:
        print(f"PASS|{len(shots)} '{state}' screenshot(s) attached")
    else:
        print(f"FAIL|no '{state}' screenshot attached to the ticket")
' <<< "$ATTACH_JSON" 2>/dev/null)"
if [ -z "$ATTACH_REPORT" ]; then
  fail "could not read attachments (unexpected API response)"
else
  while IFS='|' read -r verdict msg; do
    [ "$verdict" = "PASS" ] && pass "$msg" || fail "$msg"
  done <<< "$ATTACH_REPORT"
fi

# -------------------------------------------------- Gate 4: PRs linked on Jira
gate "Gate 4 — Both PRs linked on the ticket as remote links"
LINKS="$(jira "issue/$TICKET/remotelink")"
for pr in "$PR_LTS" "$PR_MAINT"; do
  if grep -q "/pull/$pr\"" <<< "$LINKS" || grep -q "/pull/$pr'" <<< "$LINKS" || grep -q "/pull/$pr[^0-9]" <<< "$LINKS"; then
    pass "PR #$pr linked"
  else
    fail "PR #$pr is NOT linked on the ticket (see Phase 7.5 remotelink recipe)"
  fi
done

# ------------------------------------- Gates 5-7: ticket comments are correct
gate "Gates 5-7 — Ticket comments (fix summary present, QA steps, no checklist)"
COMMENTS="$(jira "issue/$TICKET/comment?maxResults=100")"
COMMENT_REPORT="$(python3 -c '
import json, re, sys

raw = sys.stdin.read()
try:
    data = json.loads(raw)
except ValueError:
    print("FAIL|could not parse the comment list")
    raise SystemExit

def flatten(node, out):
    """Collect every text node: comments are stored as ADF, not markdown."""
    if isinstance(node, dict):
        if isinstance(node.get("text"), str):
            out.append(node["text"])
        for v in node.values():
            flatten(v, out)
    elif isinstance(node, list):
        for v in node:
            flatten(v, out)

bodies = []
for c in data.get("comments", []):
    parts = []
    flatten(c.get("body"), parts)
    bodies.append(" ".join(parts))

if not bodies:
    print("FAIL|the ticket has no comments at all — the fix summary was never posted")
    raise SystemExit

low = [b.lower() for b in bodies]

# Gate 5 — the fix-summary comment exists and carries the Phase 9 sections.
summary_idx = None
for i, b in enumerate(low):
    if "root cause" in b and ("changes" in b or "files changed" in b):
        summary_idx = i
        break
if summary_idx is None:
    print("FAIL|no fix-summary comment found (needs at least Root cause + Changes)")
else:
    print("PASS|fix-summary comment present")
    s = low[summary_idx]
    for label, needles in [
        ("root cause", ["root cause"]),
        ("verification (lint/test)", ["lint", "test"]),
        ("QA verify steps", ["verify", "steps"]),
        ("both PR links", ["/pull/"]),
    ]:
        if all(n in s for n in needles):
            print(f"PASS|fix summary covers {label}")
        else:
            print(f"FAIL|fix summary is missing {label} — QA cannot verify from it")
    # Gate 7 — evidence must use the two labelled blocks, not a run-on sentence.
    if "before fix" in s and "after fix" in s:
        print("PASS|evidence uses the Before fix / After fix blocks")
    else:
        print("FAIL|evidence is not in the two-block Before fix / After fix layout")

# Gate 6 — the Ready-for-QA checklist must NOT be on the ticket.
checklist = re.compile(r"ready for qa|y/n/na|question \| link|definition of done")
offenders = [i for i, b in enumerate(low) if checklist.search(b) and i != summary_idx]
if offenders:
    print(f"FAIL|a Ready-for-QA checklist comment is on the ticket (comment #{offenders[0] + 1}) — delete it, it is chat-only")
else:
    print("PASS|no Ready-for-QA checklist comment on the ticket")
' <<< "$COMMENTS" 2>/dev/null)"
if [ -z "$COMMENT_REPORT" ]; then
  fail "could not evaluate ticket comments"
else
  while IFS='|' read -r verdict msg; do
    [ "$verdict" = "PASS" ] && pass "$msg" || fail "$msg"
  done <<< "$COMMENT_REPORT"
fi

# ------------------------------------------------- Gate 8: the PRs themselves
gate "Gate 8 — Both PRs: base, signed commits, no open review threads"
for pr in "$PR_LTS" "$PR_MAINT"; do
  meta="$(gh pr view "$pr" --repo "$REPO" --json baseRefName,state,url 2>/dev/null)"
  if [ -z "$meta" ]; then
    fail "PR #$pr not found"
    continue
  fi
  base="$(python3 -c 'import json,sys;print(json.load(sys.stdin)["baseRefName"])' <<< "$meta")"
  pass "PR #$pr targets $base"

  unsigned="$(gh pr view "$pr" --repo "$REPO" --json commits \
    --jq '[.commits[]|select(.messageHeadline!=null)]|length' 2>/dev/null)"
  verified="$(gh api "repos/$REPO/pulls/$pr/commits" \
    --jq '[.[]|select(.commit.verification.verified==true)]|length' 2>/dev/null)"
  if [ -n "$unsigned" ] && [ "$unsigned" = "$verified" ]; then
    pass "PR #$pr — all $verified commit(s) Verified"
  else
    fail "PR #$pr — only $verified of $unsigned commit(s) are Verified (signing)"
  fi

  open_threads="$(gh api graphql -f query="{repository(owner:\"${REPO%%/*}\",name:\"${REPO##*/}\"){pullRequest(number:$pr){reviewThreads(first:100){nodes{isResolved}}}}}" \
    --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved==false)]|length' 2>/dev/null)"
  if [ "${open_threads:-0}" -eq 0 ]; then
    pass "PR #$pr — no unresolved review threads"
  else
    fail "PR #$pr — $open_threads unresolved review thread(s)"
  fi
done

# ---------------------------------------- Gate 9: gating checks (not ftests)
gate "Gate 9 — Gating checks green (ftest reported, never waited on)"
for pr in "$PR_LTS" "$PR_MAINT"; do
  rollup="$(gh pr view "$pr" --repo "$REPO" --json statusCheckRollup \
    --jq '[.statusCheckRollup[]|{name:(.name//.context),c:(.conclusion//.state)}]' 2>/dev/null)"
  report="$(PR="$pr" python3 -c '
import json, os, sys
pr = os.environ["PR"]
checks = json.load(sys.stdin)
gating = ("lint", "unit-test", "build and analyze", "sonarcloud")
bad = [c for c in checks
       if any(g in c["name"].lower() for g in gating)
       and c["c"] not in ("SUCCESS", "NEUTRAL", "SKIPPED")]
if bad:
    for c in bad:
        name, state = c["name"], c["c"]
        print(f"FAIL|PR #{pr} — {name}: {state}")
else:
    print(f"PASS|PR #{pr} — gating checks green")
ftest = [c for c in checks if "ftest" in c["name"].lower() or c["name"].lower() == "web-ui"]
for c in ftest:
    name = c["name"]
    state = c["c"] or "PENDING"
    if state in ("SUCCESS", "NEUTRAL", "SKIPPED"):
        print(f"PASS|PR #{pr} — {name}: {state}")
    elif state == "FAILURE":
        print(f"FAIL|PR #{pr} — {name} FAILED (read the log; rerun if unrelated)")
    else:
        print(f"PASS|PR #{pr} — {name}: {state} (reported, not waited on)")
' <<< "$rollup" 2>/dev/null)"
  if [ -z "$report" ]; then
    fail "PR #$pr — could not read check status"
  else
    while IFS='|' read -r verdict msg; do
      [ "$verdict" = "PASS" ] && pass "$msg" || fail "$msg"
    done <<< "$report"
  fi
done

# ----------------------------------------------------------------- verdict
printf '\n────────────────────────────────────────\n'
if [ "$FAIL" -eq 0 ]; then
  printf '\xe2\x9c\x85 All %d gates passed — the run is genuinely complete.\n' "$PASS"
  exit 0
fi
printf '\xe2\x9d\x8c %d gate(s) FAILED, %d passed.\n' "$FAIL" "$PASS"
printf 'Fix each failure above, then re-run this script. Do NOT report the run as\n'
printf 'finished — and do NOT move the ticket to Ready for QA — until it exits 0.\n'
exit 1

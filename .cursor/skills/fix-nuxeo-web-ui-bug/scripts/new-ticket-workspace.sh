#!/usr/bin/env bash
#
# new-ticket-workspace.sh — create an isolated, per-ticket workspace so several
# bug-fix agents can work on different tickets at the same time.
#
# One working tree can only be on one branch, so two agents sharing the main
# clone fight over HEAD. Worse, a worktree still shares refs, config and the
# *stash stack* with its parent, so `git stash` in one ticket can be popped by
# another. This script gives each (ticket, base) pair its own clone, its own
# node_modules, its own Docker container name, its own host port and its own
# build directories — nothing is shared with another agent.
#
# Both expensive-looking steps are near-free on this setup:
#   * `git clone --local` hardlinks the object store (~1s, a few hundred KB)
#   * `cp -Rc node_modules` is an APFS copy-on-write clone (~20s, ~0 bytes)
#
# Usage:
#   new-ticket-workspace.sh <TICKET-ID> [base] [options]
#   new-ticket-workspace.sh WEBUI-2170                     # base defaults to lts-2025
#   new-ticket-workspace.sh WEBUI-2170 maintenance-3.1.x
#   new-ticket-workspace.sh WEBUI-2170 lts-2025 --branch fix-WEBUI-2170-foo-lts-2025
#   new-ticket-workspace.sh WEBUI-2170 lts-2025 --print     # just re-print env.sh
#   new-ticket-workspace.sh WEBUI-2170 lts-2025 --remove    # tear down (keeps evidence)
#
# Options:
#   --branch <name>   Create and check out this feature branch off origin/<base>.
#                     Omit to stay on <base> and let the skill name the branch.
#   --no-elements     Skip the per-ticket nuxeo-elements clone; point the @nuxeo
#                     symlinks at the shared reference checkout instead (read-only).
#   --print           Print the workspace environment and exit.
#   --remove          Remove the workspace, its container and its build dirs.
#   --force           Recreate the workspace even if it already exists.
#
# Environment overrides:
#   NX_MAIN_REPO      Reference nuxeo-web-ui clone (default: this script's repo)
#   NX_TICKETS_ROOT   Where ticket workspaces live (default: <parent>/tickets)
#   NX_EVIDENCE_ROOT  Where evidence is captured (default: ~/Desktop)

set -euo pipefail

BASES="lts-2025 maintenance-3.1.x maintenance-3.0.x"

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}
note() { printf '  %s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }

# ---------------------------------------------------------------- arg parsing

[ $# -ge 1 ] || die "missing <TICKET-ID>. See the header of $0 for usage."

TICKET=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')
shift
case "$TICKET" in
  [A-Z]*-[0-9]*) ;;
  *) die "'$TICKET' is not a ticket id (expected e.g. WEBUI-2170 or ELEMENTS-1595)" ;;
esac

BASE=lts-2025
if [ $# -ge 1 ]; then
  case "$1" in
    --*) ;;
    *) BASE=$1; shift ;;
  esac
fi
case " $BASES " in
  *" $BASE "*) ;;
  *) die "unknown base '$BASE' (expected one of: $BASES)" ;;
esac

BRANCH=
WITH_ELEMENTS=1
ACTION=create
FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --branch) [ $# -ge 2 ] || die "--branch needs a value"; BRANCH=$2; shift 2 ;;
    --no-elements) WITH_ELEMENTS=0; shift ;;
    --print) ACTION=print; shift ;;
    --remove) ACTION=remove; shift ;;
    --force) FORCE=1; shift ;;
    *) die "unknown option '$1'" ;;
  esac
done

# ------------------------------------------------------------------- geometry

script_dir=$(cd "$(dirname "$0")" && pwd)
# The checkout holding this script also holds the skill docs that go with it.
SCRIPT_ROOT=$(git -C "$script_dir" rev-parse --show-toplevel)

if [ -n "${NX_MAIN_REPO:-}" ]; then
  MAIN_REPO=$NX_MAIN_REPO
else
  MAIN_REPO=$SCRIPT_ROOT
  # Invoked from a linked worktree? Its .git is a file, and the real clone is the
  # parent of the common git dir. Resolve it rather than failing.
  if [ ! -d "$MAIN_REPO/.git" ]; then
    common=$(git -C "$script_dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
    [ -n "$common" ] && MAIN_REPO=$(dirname "$common")
  fi
fi
[ -d "$MAIN_REPO/.git" ] || die "could not find a reference clone from $MAIN_REPO; set NX_MAIN_REPO"

PARENT=$(dirname "$MAIN_REPO")
TICKETS_ROOT=${NX_TICKETS_ROOT:-$PARENT/tickets}
EVIDENCE_ROOT=${NX_EVIDENCE_ROOT:-$HOME/Desktop}

# Nesting a ticket workspace inside the reference checkout would make it untracked
# content that `git status`, eslint and prettier all walk into.
case "$TICKETS_ROOT/" in
  "$MAIN_REPO"/*) die "NX_TICKETS_ROOT must live outside $MAIN_REPO, not inside it" ;;
esac

BASE_SLUG=$(printf '%s' "$BASE" | tr -cd '[:alnum:]')
TICKET_SLUG=$(printf '%s' "$TICKET" | tr '[:upper:]' '[:lower:]')

TDIR=$TICKETS_ROOT/$TICKET/$BASE
WT=$TDIR/web-ui
EL=$TDIR/elements
CONTAINER=nx-$TICKET_SLUG-$BASE_SLUG
DIST_PATCHED=/tmp/dist-$TICKET_SLUG-$BASE_SLUG-patched
DIST_UNPATCHED=/tmp/dist-$TICKET_SLUG-$BASE_SLUG-unpatched
EVIDENCE=$EVIDENCE_ROOT/$TICKET

# ---------------------------------------------------------------------- ports

port_free() {
  python3 - "$1" <<'PY'
import socket, sys
sock = socket.socket()
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    sock.bind(("127.0.0.1", int(sys.argv[1])))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
}

# Ports already claimed by a sibling ticket workspace, even if nothing is
# listening on them yet (the container may not be started).
claimed_ports() {
  [ -d "$TICKETS_ROOT" ] || return 0
  find "$TICKETS_ROOT" -maxdepth 3 -name env.sh -print0 2>/dev/null |
    xargs -0 grep -h '^export NX_PORT=' 2>/dev/null |
    sed 's/.*=//' || true
}

allocate_port() {
  local start=$1 claimed p
  claimed=$(claimed_ports)
  p=$start
  while [ "$p" -lt 8999 ]; do
    if ! printf '%s\n' "$claimed" | grep -qx "$p" && port_free "$p"; then
      printf '%s\n' "$p"
      return 0
    fi
    p=$((p + 1))
  done
  die "no free host port found in ${start}..8998"
}

# Deterministic starting point so re-runs for the same ticket tend to reuse the
# same port, while different bases of one ticket never collide.
ticket_num=$(printf '%s' "$TICKET" | tr -cd '[:digit:]')
base_offset=0
case "$BASE" in
  maintenance-3.1.x) base_offset=1 ;;
  maintenance-3.0.x) base_offset=2 ;;
esac
# Three consecutive ports per ticket (one per base), kept inside 8100..8849.
PORT_START=$((8100 + (${ticket_num:-0} % 250) * 3 + base_offset))

# --------------------------------------------------------------------- output

# Reads only the NX_* variables, so it renders identically whether it is called
# right after creating the workspace or after sourcing an existing env.sh.
print_env() {
  local el=${NX_ELEMENTS:-}
  case "$el" in
    "") el="(none — @nuxeo packages come from npm)" ;;
    "$TICKETS_ROOT"/*) ;;
    *) el="$el (shared reference — do not git-write)" ;;
  esac
  cat <<EOF

Ticket workspace: $NX_TICKET on $NX_BASE
  work tree      $NX_WT
  elements       $el
  evidence       $NX_EVIDENCE
  container      $NX_CONTAINER
  host port      $NX_PORT   ->  $NX_URL/ui/
  build dirs     $NX_DIST_UNPATCHED (before)
                 $NX_DIST_PATCHED (after)

  source it:     . $TDIR/env.sh
  move the agent root to: $NX_WT

Parallel safety: run every command from \$NX_WT. Never 'git stash' — a stray stash
strands work and can cross-apply. Never git-write in the shared reference checkout
$MAIN_REPO.
EOF
}

# --------------------------------------------------------------------- remove

if [ "$ACTION" = remove ]; then
  step "Removing workspace for $TICKET ($BASE)"
  # `docker rm -f` exits 0 for a missing container, so probe first to report honestly.
  if command -v docker >/dev/null 2>&1; then
    if docker inspect "$CONTAINER" >/dev/null 2>&1; then
      docker rm -f "$CONTAINER" >/dev/null && note "removed container $CONTAINER"
    else
      note "no container $CONTAINER"
    fi
  fi
  rm -rf "$DIST_PATCHED" "$DIST_UNPATCHED"
  note "removed build dirs"
  if [ -d "$TDIR" ]; then
    if [ -d "$WT" ] && [ -n "$(git -C "$WT" status --porcelain 2>/dev/null)" ]; then
      note "WARNING: $WT has uncommitted changes"
      [ "$FORCE" = 1 ] || die "refusing to delete uncommitted work; re-run with --force"
    fi
    rm -rf "$TDIR"
    note "removed $TDIR"
  fi
  rmdir "$TICKETS_ROOT/$TICKET" 2>/dev/null || true
  note "evidence kept at $EVIDENCE"
  exit 0
fi

# ---------------------------------------------------------------------- print

if [ "$ACTION" = print ]; then
  [ -f "$TDIR/env.sh" ] || die "no workspace at $TDIR — create it first"
  # shellcheck disable=SC1091
  . "$TDIR/env.sh"
  print_env
  exit 0
fi

# --------------------------------------------------------------------- create

if [ -d "$TDIR" ] && [ "$FORCE" = 0 ]; then
  if [ -f "$TDIR/env.sh" ]; then
    # shellcheck disable=SC1091
    . "$TDIR/env.sh"
    step "Workspace already exists — reusing it"
    print_env
    exit 0
  fi
  die "$TDIR exists but has no env.sh; inspect it or re-run with --force"
fi
[ "$FORCE" = 0 ] || rm -rf "$TDIR"

mkdir -p "$TDIR"

# clone_repo <reference-clone> <destination> <base>
clone_repo() {
  local ref=$1 dest=$2 base=$3
  # --local hardlinks the object store: fast, and costs almost no disk.
  git clone --local --no-checkout --quiet "$ref" "$dest"
  git -C "$dest" remote set-url origin "$(git -C "$ref" remote get-url origin)"
  git -C "$dest" fetch --quiet origin "$base"
  git -C "$dest" checkout --quiet -B "$base" "origin/$base"
  git -C "$dest" branch --quiet --set-upstream-to="origin/$base" "$base"
  # husky v4 writes hooks into .git/hooks at install time; clone does not copy them.
  if [ -d "$ref/.git/hooks" ]; then
    find "$ref/.git/hooks" -type f ! -name '*.sample' -exec cp {} "$dest/.git/hooks/" \; 2>/dev/null || true
  fi
}

step "Cloning nuxeo-web-ui @ $BASE"
clone_repo "$MAIN_REPO" "$WT" "$BASE"
note "$WT"
if git -C "$MAIN_REPO" remote get-url fork >/dev/null 2>&1; then
  git -C "$WT" remote add fork "$(git -C "$MAIN_REPO" remote get-url fork)"
fi

MAIN_ELEMENTS=$PARENT/nuxeo-elements
ELEMENTS_TARGET=
if [ "$WITH_ELEMENTS" = 1 ] && [ -d "$MAIN_ELEMENTS/.git" ]; then
  el_base=$BASE
  git -C "$MAIN_ELEMENTS" rev-parse --verify --quiet "refs/remotes/origin/$el_base" >/dev/null ||
    el_base=lts-2025
  step "Cloning nuxeo-elements @ $el_base"
  clone_repo "$MAIN_ELEMENTS" "$EL" "$el_base"
  note "$EL"
  ELEMENTS_TARGET=$EL
elif [ -d "$MAIN_ELEMENTS" ]; then
  ELEMENTS_TARGET=$MAIN_ELEMENTS
fi

step "Populating node_modules"
if [ -d "$MAIN_REPO/node_modules" ]; then
  # -c asks APFS for a copy-on-write clone: seconds, and no real disk until written.
  if cp -Rc "$MAIN_REPO/node_modules" "$WT/node_modules" 2>/dev/null; then
    note "APFS clone of $MAIN_REPO/node_modules"
  else
    cp -R "$MAIN_REPO/node_modules" "$WT/node_modules"
    note "plain copy of $MAIN_REPO/node_modules (filesystem has no clonefile support)"
  fi
else
  note "no reference node_modules — running npm ci (this takes a few minutes)"
  (cd "$WT" && npm ci)
fi

# The @nuxeo dev links ship as relative symlinks (../../../nuxeo-elements/core),
# which resolve to the *shared* checkout from any depth. Repoint them at this
# ticket's own elements clone, by absolute path, so agents cannot cross-read.
if [ -n "$ELEMENTS_TARGET" ] && [ -L "$MAIN_REPO/node_modules/@nuxeo/nuxeo-elements" ]; then
  step "Repointing @nuxeo symlinks at $ELEMENTS_TARGET"
  for pair in nuxeo-elements:core nuxeo-ui-elements:ui nuxeo-dataviz-elements:dataviz; do
    pkg=${pair%%:*}
    sub=${pair##*:}
    [ -d "$ELEMENTS_TARGET/$sub" ] || continue
    rm -rf "$WT/node_modules/@nuxeo/$pkg"
    ln -s "$ELEMENTS_TARGET/$sub" "$WT/node_modules/@nuxeo/$pkg"
    note "@nuxeo/$pkg -> $ELEMENTS_TARGET/$sub"
  done
fi

if [ -n "$BRANCH" ]; then
  step "Creating feature branch $BRANCH"
  git -C "$WT" checkout --quiet -b "$BRANCH" "origin/$BASE"
  note "$BRANCH (off origin/$BASE)"
fi

# The base branches still track an older copy of these skills, so a fresh clone would
# present stale instructions to the agent working in it. Overlay the copy that ships
# with this script, and mark those paths skip-worktree so the overlay can never show up
# in `git status` or be committed into a fix PR. Drop this step once the skills are
# current on both bases. (Caveat: a cherry-pick that touches .cursor/skills needs
# `git update-index --no-skip-worktree` on those paths first.)
if [ -d "$SCRIPT_ROOT/.cursor/skills" ] && [ "$SCRIPT_ROOT" != "$WT" ]; then
  tracked=$(git -C "$WT" ls-files -- .cursor/skills)
  if [ -n "$tracked" ]; then
    step "Overlaying current skills (base still tracks an older copy)"
    printf '%s\n' "$tracked" | tr '\n' '\0' |
      xargs -0 git -C "$WT" update-index --skip-worktree
    # skip-worktree only covers tracked paths; the overlay also brings files the base
    # does not have at all, so exclude the whole tree from untracked listings too.
    echo '/.cursor/skills/' >> "$WT/.git/info/exclude"
    cp -R "$SCRIPT_ROOT/.cursor/skills/." "$WT/.cursor/skills/"
    if [ -z "$(git -C "$WT" status --porcelain -- .cursor/skills)" ]; then
      note "overlaid and hidden from git"
    else
      note "WARNING: the overlay is visible to git — keep it out of your commits"
    fi
  fi
fi

step "Allocating host port"
# Scanning for a free port and recording it must be atomic: two agents starting at the
# same moment would otherwise both see the port as unclaimed and both take it. `mkdir`
# is atomic on POSIX filesystems, so it serialises just this section.
LOCK=$TICKETS_ROOT/.port.lock
locked=0
for _ in $(seq 1 150); do
  if mkdir "$LOCK" 2>/dev/null; then
    locked=1
    trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
    break
  fi
  # Reap a lock abandoned by a killed run (older than 2 minutes).
  if [ -d "$LOCK" ] && [ -z "$(find "$LOCK" -maxdepth 0 -mmin -2 2>/dev/null)" ]; then
    rmdir "$LOCK" 2>/dev/null || true
  fi
  sleep 0.2
done
[ "$locked" = 1 ] || note "WARNING: could not take the port lock; another run may pick the same port"

PORT=$(allocate_port "$PORT_START")
note "$PORT"

mkdir -p "$EVIDENCE"

cat > "$TDIR/env.sh" <<EOF
# Generated by new-ticket-workspace.sh — source this before working on $TICKET.
export NX_TICKET=$TICKET
export NX_BASE=$BASE
export NX_WT=$WT
export NX_ELEMENTS=$ELEMENTS_TARGET
export NX_EVIDENCE=$EVIDENCE
export NX_CONTAINER=$CONTAINER
export NX_PORT=$PORT
export NX_URL=http://localhost:$PORT/nuxeo
export NX_DIST_PATCHED=$DIST_PATCHED
export NX_DIST_UNPATCHED=$DIST_UNPATCHED
EOF

# env.sh is written, so the port is now claimed and the lock can go.
if [ "$locked" = 1 ]; then
  trap - EXIT
  rmdir "$LOCK" 2>/dev/null || true
fi

# shellcheck disable=SC1091
. "$TDIR/env.sh"
print_env

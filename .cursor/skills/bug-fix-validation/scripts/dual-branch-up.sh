#!/usr/bin/env bash
#
# dual-branch-up.sh — run the buggy branch and the fixed branch of nuxeo-web-ui
# side by side, each on its own port, for before/after validation.
#
# A comparison is only trustworthy when the two sides differ by the fix alone, so
# both sides go through the same pipeline: own git worktree, own node_modules, own
# `npm run build`, own throwaway Nuxeo container, same NUXEO_PACKAGES. Comparing a
# marketplace bundle against a dev build proves nothing.
#
# Usage:
#   dual-branch-up.sh <TICKET-ID> --target <ref> --fixed <ref> [options]
#   dual-branch-up.sh WEBUI-1234 --target lts-2025 --fixed fix-WEBUI-1234-foo-lts-2025
#   dual-branch-up.sh WEBUI-1234 --target lts-2025~1 --fixed lts-2025      # fix already merged
#   dual-branch-up.sh WEBUI-1234 --target lts-2025 --fixed-pr 3259
#   dual-branch-up.sh WEBUI-1234 --print
#   dual-branch-up.sh WEBUI-1234 --remove
#
# Any git revision works for --target/--fixed: a branch, origin/<branch>, a tag or a sha.
#
# Options:
#   --target <ref>     Ref where the bug still exists (the "before" side).
#   --fixed <ref>      Ref containing the fix (the "after" side).
#   --fixed-pr <n>     Resolve --fixed from a PR number via the gh CLI.
#   --packages <list>  NUXEO_PACKAGES for the build and the server (default: "nuxeo-web-ui").
#   --image <image>    Nuxeo image (default: docker-private.packages.nuxeo.com/nuxeo/nuxeo:2025).
#   --clid <clid>      Nuxeo Connect CLID (default: reused from an existing nuxeo container).
#   --no-build         Reuse an existing dist/ in the worktrees instead of rebuilding.
#   --prepare-only     Create and build the worktrees; start no container (no Docker needed).
#   --only <role>      Bring up just one side: target | fixed.
#   --print            Print the runtime environment and exit.
#   --remove           Tear down containers and worktrees (evidence is kept).
#   --force            Recreate worktrees/containers even if they already exist.
#
# Environment overrides: NX_VAL_ROOT, NX_VAL_REPO (see validation-init.sh).

set -euo pipefail

die() { printf '\nerror: %s\n' "$*" >&2; exit 1; }
note() { printf '  %s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }
warn() { printf '  WARNING: %s\n' "$*"; }

# ---------------------------------------------------------------- arg parsing

[ $# -ge 1 ] || die "missing <TICKET-ID>. See the header of $0 for usage."

TICKET=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')
shift
case "$TICKET" in
  [A-Z]*-[0-9]*) ;;
  *) die "'$TICKET' is not a ticket id (expected e.g. WEBUI-1234)" ;;
esac

TARGET_REF=
FIXED_REF=
FIXED_PR=
PACKAGES=nuxeo-web-ui
IMAGE=docker-private.packages.nuxeo.com/nuxeo/nuxeo:2025
CLID=
BUILD=1
PREPARE_ONLY=0
ONLY=
ACTION=create
FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target) [ $# -ge 2 ] || die "--target needs a ref"; TARGET_REF=$2; shift 2 ;;
    --fixed) [ $# -ge 2 ] || die "--fixed needs a ref"; FIXED_REF=$2; shift 2 ;;
    --fixed-pr) [ $# -ge 2 ] || die "--fixed-pr needs a number"; FIXED_PR=$2; shift 2 ;;
    --packages) [ $# -ge 2 ] || die "--packages needs a value"; PACKAGES=$2; shift 2 ;;
    --image) [ $# -ge 2 ] || die "--image needs a value"; IMAGE=$2; shift 2 ;;
    --clid) [ $# -ge 2 ] || die "--clid needs a value"; CLID=$2; shift 2 ;;
    --only) [ $# -ge 2 ] || die "--only needs target|fixed"; ONLY=$2; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    --prepare-only) PREPARE_ONLY=1; shift ;;
    --print) ACTION=print; shift ;;
    --remove) ACTION=remove; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,40p' "$0"; exit 0 ;;
    *) die "unknown option '$1'" ;;
  esac
done

case "${ONLY:-both}" in both|target|fixed) ;; *) die "--only takes 'target' or 'fixed'" ;; esac

# ------------------------------------------------------------------- geometry

script_dir=$(cd "$(dirname "$0")" && pwd)
REPO=${NX_VAL_REPO:-$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)}
[ -n "$REPO" ] || die "could not locate the nuxeo-web-ui checkout; set NX_VAL_REPO"
ROOT=${NX_VAL_ROOT:-$HOME/Desktop/validation}
DIR=$ROOT/$TICKET
ENVFILE=$DIR/env.sh
RUNTIME=$DIR/runtime.sh
SLUG=$(printf '%s' "$TICKET" | tr '[:upper:]' '[:lower:]')

container_for() { printf 'nx-val-%s-%s\n' "$SLUG" "$1"; }
worktree_for() { printf '%s/src/%s\n' "$DIR" "$1"; }

# ---------------------------------------------------------------------- print

if [ "$ACTION" = print ]; then
  [ -f "$RUNTIME" ] || die "no runtime for $TICKET yet — bring the branches up first"
  cat "$RUNTIME"
  exit 0
fi

# --------------------------------------------------------------------- remove

if [ "$ACTION" = remove ]; then
  step "Tearing down the $TICKET validation runtime"
  for role in target fixed; do
    c=$(container_for "$role")
    if command -v docker >/dev/null 2>&1 && docker inspect "$c" >/dev/null 2>&1; then
      docker rm -f "$c" >/dev/null && note "removed container $c"
    else
      note "no container $c"
    fi
    wt=$(worktree_for "$role")
    if [ -d "$wt" ]; then
      git -C "$REPO" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
      note "removed worktree $wt"
    fi
  done
  git -C "$REPO" worktree prune 2>/dev/null || true
  rm -f "$RUNTIME"
  note "evidence kept at $DIR/Evidence"
  exit 0
fi

# --------------------------------------------------------------------- create

[ -n "$TARGET_REF" ] || [ "$ONLY" = fixed ] || die "--target <ref> is required"
if [ -z "$FIXED_REF" ] && [ -n "$FIXED_PR" ]; then
  command -v gh >/dev/null 2>&1 || die "--fixed-pr needs the gh CLI"
  FIXED_REF=$(gh pr view "$FIXED_PR" --repo nuxeo/nuxeo-web-ui --json headRefName -q .headRefName) ||
    die "could not resolve PR #$FIXED_PR"
  note "PR #$FIXED_PR -> $FIXED_REF"
fi
[ -n "$FIXED_REF" ] || [ "$ONLY" = target ] || die "--fixed <ref> (or --fixed-pr <n>) is required"

if [ "$PREPARE_ONLY" = 0 ]; then
  command -v docker >/dev/null 2>&1 || die "docker not found"
  docker info >/dev/null 2>&1 || die "the docker daemon is not running (try: open -a Docker)"
fi

if [ ! -f "$ENVFILE" ]; then
  step "Initialising the validation workspace first"
  bash "$script_dir/validation-init.sh" "$TICKET" >/dev/null
fi
# shellcheck disable=SC1090
. "$ENVFILE"

# ---------------------------------------------------------------------- ports

port_free() {
  python3 - "$1" <<'PY'
import socket, sys
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(("127.0.0.1", int(sys.argv[1])))
except OSError:
    sys.exit(1)
finally:
    s.close()
PY
}

# Ports another validation run has reserved but not yet bound (its container may
# still be starting), so two concurrent runs never collide. This run's own file is
# skipped: its ports are re-derived from the containers themselves.
claimed_ports() {
  local f
  [ -d "$ROOT" ] || return 0
  for f in "$ROOT"/*/runtime.sh; do
    [ -f "$f" ] || continue
    [ "$f" = "$RUNTIME" ] && continue
    grep -h '_PORT=' "$f" 2>/dev/null | sed 's/.*=//'
  done
}

allocate_port() {
  local p=$1 claimed
  claimed=$(claimed_ports)
  while [ "$p" -lt 8999 ]; do
    if ! printf '%s\n' "$claimed" | grep -qx "$p" && port_free "$p"; then
      printf '%s\n' "$p"
      return 0
    fi
    p=$((p + 1))
  done
  die "no free host port in ${1}..8998"
}

ticket_num=$(printf '%s' "$TICKET" | tr -cd '[:digit:]')
PORT_BASE=$((8100 + (${ticket_num:-0} % 250) * 3))

# ----------------------------------------------------------------------- CLID

if [ -z "$CLID" ] && [ "$PREPARE_ONLY" = 0 ]; then
  for c in $(docker ps -a --format '{{.Names}}' | grep -v "^nx-val-$SLUG-" || true); do
    CLID=$(docker inspect "$c" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null |
           sed -n 's/^NUXEO_CLID=//p' | head -1)
    [ -n "$CLID" ] && { note "reusing NUXEO_CLID from container $c"; break; }
  done
fi
[ -n "$CLID" ] || [ "$PREPARE_ONLY" = 1 ] ||
  warn "no NUXEO_CLID found — package download will fail with 'Registration required'"

# ------------------------------------------------------------------ worktrees

resolve_ref() {
  local ref=$1 c
  git -C "$REPO" fetch --quiet origin "$ref" 2>/dev/null || true
  for c in "$ref" "origin/$ref"; do
    if git -C "$REPO" rev-parse --verify --quiet "$c^{commit}" >/dev/null; then
      git -C "$REPO" rev-parse "$c^{commit}"
      return 0
    fi
  done
  return 1
}

# node_modules holds relative symlinks into the sibling nuxeo-elements checkout
# (../../../nuxeo-elements/ui). Those resolve by depth, so in a worktree at a
# different depth they dangle and the build silently picks up nothing. Rewrite
# every out-of-repo link as an absolute one.
absolutize_links() {
  python3 - "$REPO" "$1" <<'PY'
import os, sys

src_repo, dest = sys.argv[1], sys.argv[2]
src_nm = os.path.join(src_repo, "node_modules")
dest_nm = os.path.join(dest, "node_modules")


def package_paths(nm):
    """Top-level packages plus the members of each @scope — where npm puts links."""
    for name in sorted(os.listdir(nm)):
        p = os.path.join(nm, name)
        if name.startswith("@") and os.path.isdir(p) and not os.path.islink(p):
            for sub in sorted(os.listdir(p)):
                yield os.path.join(p, sub)
        else:
            yield p


repo_real = os.path.realpath(src_repo) + os.sep
fixed = 0
for p in package_paths(src_nm):
    if not os.path.islink(p):
        continue
    real = os.path.realpath(p)
    if real.startswith(repo_real):
        continue  # in-repo link: still resolves after the copy
    mirror = os.path.join(dest_nm, os.path.relpath(p, src_nm))
    if os.path.lexists(mirror):
        os.remove(mirror)
    os.makedirs(os.path.dirname(mirror), exist_ok=True)
    os.symlink(real, mirror)
    fixed += 1
print(f"repointed {fixed} out-of-repo symlink(s) to absolute paths")
PY
}

prepare_worktree() {
  local role=$1 ref=$2 wt sha
  wt=$(worktree_for "$role")

  sha=$(resolve_ref "$ref") || die "cannot resolve ref '$ref' (fetch it first?)"
  note "$role ref '$ref' -> ${sha:0:12}"

  if [ -d "$wt" ] && [ "$FORCE" = 1 ]; then
    git -C "$REPO" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
  fi
  if [ ! -d "$wt" ]; then
    # --detach: the same branch may already be checked out in the main clone.
    git -C "$REPO" worktree add --detach --quiet "$wt" "$sha"
    note "worktree $wt"
  else
    git -C "$wt" checkout --quiet --detach "$sha"
    note "worktree reused at ${sha:0:12}"
  fi

  if [ ! -d "$wt/node_modules" ]; then
    if [ -d "$REPO/node_modules" ]; then
      # -c asks APFS for a copy-on-write clone: seconds, and no real disk until written.
      cp -Rc "$REPO/node_modules" "$wt/node_modules" 2>/dev/null ||
        cp -R "$REPO/node_modules" "$wt/node_modules"
      note "$(absolutize_links "$wt")"
    else
      note "no reference node_modules — running npm ci (several minutes)"
      (cd "$wt" && npm ci >> "$NX_VAL_LOG" 2>&1) || die "npm ci failed in $wt (see $NX_VAL_LOG)"
    fi
  fi

  if [ "$BUILD" = 1 ]; then
    step "Building $role ($PACKAGES)"
    if ! (cd "$wt" && NUXEO_PACKAGES="$PACKAGES" npm run build >> "$NX_VAL_LOG" 2>&1); then
      die "build failed for $role — see $NX_VAL_LOG"
    fi
    note "$(find "$wt/dist" -name '*.bundle.js' | wc -l | tr -d ' ') bundles in $wt/dist"
  fi
  [ -d "$wt/dist" ] || die "no dist/ in $wt (drop --no-build)"
}

# ------------------------------------------------------------------ container

start_container() {
  local role=$1 port=$2 c
  c=$(container_for "$role")
  if docker inspect "$c" >/dev/null 2>&1; then
    if [ "$FORCE" = 1 ]; then
      docker rm -f "$c" >/dev/null
    else
      docker start "$c" >/dev/null 2>&1 || true
      note "reusing container $c"
      return 0
    fi
  fi
  docker run -d --name "$c" -p "$port:8080" \
    -e NUXEO_DEV_MODE=true -e NUXEO_PACKAGES="$PACKAGES" -e NUXEO_CLID="$CLID" \
    "$IMAGE" >/dev/null
  note "started $c on host port $port"
}

wait_ready() {
  local port=$1 role=$2 waited=0 code
  step "Waiting for $role to answer on :$port"
  while [ "$waited" -lt 1200 ]; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port/nuxeo/runningstatus" || true)
    if [ "$code" = 200 ]; then
      note "ready after ${waited}s"
      return 0
    fi
    sleep 5
    waited=$((waited + 5))
    [ $((waited % 60)) -eq 0 ] && note "still starting… ${waited}s (last status: ${code:-none})"
  done
  docker logs --tail 50 "$(container_for "$role")" >> "$NX_VAL_LOG" 2>&1 || true
  die "$role did not become ready within 1200s — last 50 log lines appended to $NX_VAL_LOG"
}

deploy_build() {
  local role=$1 port=$2 c wt ui
  c=$(container_for "$role")
  wt=$(worktree_for "$role")
  step "Deploying the $role build into $c"

  ui=$(docker exec "$c" sh -lc 'find /opt/nuxeo/server -type d -name ui -path "*nuxeo.war*"' |
       head -1 | tr -d '\r')
  [ -n "$ui" ] || die "could not locate the Web UI directory inside $c"
  docker cp "$wt/dist/." "$c:$ui/"

  # The dev build hardcodes <nuxeo-app base-url="/">, and it now shadows the
  # server's index.jsp. Left alone, every urlFor() link becomes root-relative and
  # navigates out of /nuxeo/ui/ into a 404.
  docker exec "$c" sh -lc "sed -i 's|base-url=\"/\"|base-url=\"/nuxeo/ui/\"|g' '$ui/index.html'"

  if curl -s "http://localhost:$port/nuxeo/ui/" | grep -q 'base-url="/nuxeo/ui/"'; then
    note "deployed to $ui (base-url verified)"
  else
    warn "base-url not confirmed in the served index.html — check before capturing evidence"
  fi
}

# A container recreated on a different port than the one it already publishes would
# leave the URLs in runtime.sh pointing at nothing, so an existing container always
# keeps its binding.
published_port() {
  docker inspect "$1" \
    --format '{{range $p, $conf := .HostConfig.PortBindings}}{{(index $conf 0).HostPort}}{{end}}' \
    2>/dev/null | head -1
}

# Sets ALLOCATED_PORT rather than printing it: the phase output belongs on stdout.
ALLOCATED_PORT=
bring_up() {
  local role=$1 ref=$2 port_base=$3 c port=
  step "Preparing the $role side ($ref)"
  prepare_worktree "$role" "$ref"
  if [ "$PREPARE_ONLY" = 1 ]; then
    ALLOCATED_PORT=
    return 0
  fi

  c=$(container_for "$role")
  if [ "$FORCE" = 0 ] && docker inspect "$c" >/dev/null 2>&1; then
    port=$(published_port "$c")
    [ -n "$port" ] && note "reusing the port $c already publishes: $port"
  fi
  [ -n "$port" ] || port=$(allocate_port "$port_base")

  start_container "$role" "$port"
  wait_ready "$port" "$role"
  deploy_build "$role" "$port"
  ALLOCATED_PORT=$port
}

TARGET_PORT=
FIXED_PORT=
if [ "$ONLY" != fixed ]; then bring_up target "$TARGET_REF" "$PORT_BASE"; TARGET_PORT=$ALLOCATED_PORT; fi
if [ "$ONLY" != target ]; then bring_up fixed "$FIXED_REF" $((PORT_BASE + 1)); FIXED_PORT=$ALLOCATED_PORT; fi

# ------------------------------------------------------------------- runtime

step "Recording the runtime environment"
# Emits the NX_VAL_<ROLE>_* block; the port/container/URL lines are skipped for a
# --prepare-only run, which has worktrees but nothing serving them yet.
emit_role() {
  local role=$1 ref=$2 port=$3 upper
  upper=$(printf '%s' "$role" | tr '[:lower:]' '[:upper:]')
  printf 'export NX_VAL_%s_REF=%s\n' "$upper" "$ref"
  printf 'export NX_VAL_%s_WT=%s\n' "$upper" "$(worktree_for "$role")"
  [ -n "$port" ] || return 0
  printf 'export NX_VAL_%s_PORT=%s\n' "$upper" "$port"
  printf 'export NX_VAL_%s_URL=http://localhost:%s/nuxeo\n' "$upper" "$port"
  printf 'export NX_VAL_%s_CONTAINER=%s\n' "$upper" "$(container_for "$role")"
}

{
  printf '# Generated by dual-branch-up.sh — sourced from env.sh.\n'
  [ "$ONLY" = fixed ] || emit_role target "$TARGET_REF" "$TARGET_PORT"
  [ "$ONLY" = target ] || emit_role fixed "$FIXED_REF" "$FIXED_PORT"
  printf 'export NX_VAL_IMAGE=%s\n' "$IMAGE"
  printf 'export NX_VAL_PACKAGES="%s"\n' "$PACKAGES"
} > "$RUNTIME"

# An `[ -f x ] && . x` one-liner would make env.sh exit non-zero once the runtime is
# torn down, which aborts any `set -e` script that sources it.
grep -q 'runtime.sh' "$ENVFILE" ||
  printf '\nif [ -f "%s" ]; then . "%s"; fi\n' "$RUNTIME" "$RUNTIME" >> "$ENVFILE"

printf '%s | dual-branch runtime up: target=%s:%s fixed=%s:%s\n' \
  "$(date -u +%FT%TZ)" "${TARGET_REF:--}" "${TARGET_PORT:--}" "${FIXED_REF:--}" "${FIXED_PORT:--}" \
  >> "$NX_VAL_LOG"

cat <<EOF

Validation runtime for $TICKET
  target (buggy)  ${TARGET_REF:-skipped}   ${TARGET_PORT:+http://localhost:$TARGET_PORT/nuxeo/ui/}
  fixed           ${FIXED_REF:-skipped}    ${FIXED_PORT:+http://localhost:$FIXED_PORT/nuxeo/ui/}
  packages        $PACKAGES
  image           $IMAGE

  source it:      . $ENVFILE
EOF

if [ "$PREPARE_ONLY" = 1 ]; then
  printf '  worktrees are built; re-run without --prepare-only to start the containers\n'
else
  cat <<EOF
  capture before: node "\$NX_VAL_HARNESS/before.js"
  capture after:  node "\$NX_VAL_HARNESS/after.js"
EOF
fi
printf '  tear down:      bash %s %s --remove\n' "$0" "$TICKET"

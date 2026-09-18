#!/usr/bin/env bash
# resolve-release.sh — work out which release you are writing, and everything derived from it.
#
# Usage:
#   scripts/resolve-release.sh                # auto-detect from the release branches
#   scripts/resolve-release.sh 2025.20.0      # pin either line's version, derive its pair
#   scripts/resolve-release.sh 3.1.35         # ... in either direction
#
# Run from the directory holding nuxeo-web-ui and nuxeo-elements as siblings, or set
# NX_WEBUI / NX_ELEMENTS. Prints, per LTS line: version, last stable tag, page filename,
# tree_item_index, docs branch, live URL.
#
# Nothing here touches Jira. Confirm the version against `unreleasedVersions()` yourself.
# bash 3.2 compatible (macOS default).
set -uo pipefail

WEBUI=${NX_WEBUI:-nuxeo-web-ui}
ELEMENTS=${NX_ELEMENTS:-nuxeo-elements}
fail=0
note() { printf '  %s\n' "$*"; }
bad()  { printf '  !! %s\n' "$*"; fail=1; }

# Reports the bare version, and whether package.json actually carried -SNAPSHOT. A branch
# holding a bare released version is mid-promotion: its version is the release that just
# shipped, not the next one.
snapshot() { # <repo> <branch> -> "<version> <SNAPSHOT|BARE>" ('' if unreadable)
  git -C "$1" show "origin/$2:package.json" 2>/dev/null \
    | python3 -c 'import json,sys
try:
    v = json.load(sys.stdin)["version"]
    print(v.replace("-SNAPSHOT",""), "SNAPSHOT" if v.endswith("-SNAPSHOT") else "BARE")
except Exception: pass' 2>/dev/null
}
lasttag() { # <repo> <glob> -> newest stable tag
  git -C "$1" tag --list "$2" --sort=-v:refname 2>/dev/null \
    | grep -vE -- '-(rc|alpha|beta|SNAPSHOT)' | head -1
}
# The release counter is the segment that increments every release: N in 2025.N.0, Z in 3.1.Z.
# NOT simply the last segment — the last segment of 2025.N.0 is always 0.
counter() { case "$1" in 2025.*) v=${1#2025.}; printf '%s' "${v%.0}" ;; *) printf '%s' "${1##*.}" ;; esac; }

for r in "$WEBUI" "$ELEMENTS"; do
  [ -d "$r/.git" ] || bad "not a git repo: $r (set NX_WEBUI / NX_ELEMENTS)"
done
[ "$fail" = 1 ] && exit 1

# The versions are read from origin/<branch>, so stale remote-tracking refs would silently
# resolve the PREVIOUS release pair. Refresh them first.
for r in "$WEBUI" "$ELEMENTS"; do
  git -C "$r" fetch origin lts-2025 maintenance-3.1.x --quiet 2>/dev/null || STALE=1
done

# A failed refresh must not be survivable in auto-detect mode: warning and then printing OK
# would produce exactly the wrong answer the refresh exists to prevent.
if [ "${STALE:-0}" = 1 ]; then
  if [ -n "${1:-}" ]; then
    printf '  !! could not fetch origin. The pinned version is unaffected; LAST-TAG may be stale.\n'
  elif [ "${NX_ALLOW_STALE:-0}" = 1 ]; then
    printf '  !! could not fetch origin, and NX_ALLOW_STALE=1 — continuing from possibly stale refs.\n'
    printf '     The resolved pair MAY BE THE PREVIOUS RELEASE. Confirm against Jira before drafting.\n'
  else
    bad "could not fetch origin in one or both repos, so auto-detection cannot be trusted: stale remote-tracking refs resolve the PREVIOUS release pair. Fix connectivity, pass the version explicitly (e.g. $(basename "$0") 2025.20.0), or set NX_ALLOW_STALE=1 to override deliberately."
    exit 1
  fi
fi

echo "== snapshot versions on the release branches"
read -r w25 w25k <<< "$(snapshot "$WEBUI" lts-2025)"
read -r w31 w31k <<< "$(snapshot "$WEBUI" maintenance-3.1.x)"
read -r e25 e25k <<< "$(snapshot "$ELEMENTS" lts-2025)"
read -r e31 e31k <<< "$(snapshot "$ELEMENTS" maintenance-3.1.x)"
# NOTE: do not use `set --` here; it would clear "$@" and discard a pinned version argument.
check_kind() { # <kind> <repo-label> <branch>
  if [ "${1:-}" = "BARE" ]; then
    bad "$2 $3: package.json holds a bare version, not <next>-SNAPSHOT — that branch is mid-promotion, so this is the release that just shipped. Stop and report it."
  fi
  return 0
}
check_kind "${w25k:-}" "$(basename "$WEBUI")"    lts-2025
check_kind "${w31k:-}" "$(basename "$WEBUI")"    maintenance-3.1.x
check_kind "${e25k:-}" "$(basename "$ELEMENTS")" lts-2025
check_kind "${e31k:-}" "$(basename "$ELEMENTS")" maintenance-3.1.x
printf '  %-16s %-18s %s\n' "$(basename "$WEBUI")"    lts-2025          "${w25:-<unreadable>}"
printf '  %-16s %-18s %s\n' "$(basename "$WEBUI")"    maintenance-3.1.x "${w31:-<unreadable>}"
printf '  %-16s %-18s %s\n' "$(basename "$ELEMENTS")" lts-2025          "${e25:-<unreadable>}"
printf '  %-16s %-18s %s\n' "$(basename "$ELEMENTS")" maintenance-3.1.x "${e31:-<unreadable>}"

[ -n "$w25" ] && [ "$w25" = "$e25" ] || bad "lts-2025: web-ui='$w25' elements='$e25' — the repos disagree or a value is missing. The promotion cycle is mid-flight: stop and report it, do not pick one."
[ -n "$w31" ] && [ "$w31" = "$e31" ] || bad "maintenance-3.1.x: web-ui='$w31' elements='$e31' — same: stop and report it."

V2025=$w25; V31=$w31
if [ -n "${1:-}" ]; then           # a pinned version: accept either line, derive the other
  # Anchored regex, not a glob: '3.1.[0-9]*' would accept 3.1.35.1 and silently yield 2025.-14.0.
  if [[ $1 =~ ^2025\.([0-9]+)\.0$ ]]; then
    V2025=$1; V31="3.1.$(( ${BASH_REMATCH[1]} + 15 ))"
  elif [[ $1 =~ ^3\.1\.([0-9]+)$ ]]; then
    V31=$1
    if [ "${BASH_REMATCH[1]}" -le 15 ]; then
      bad "'$1' predates the 2025 line (needs Z > 15); the LTS mapping page is authoritative"; exit 1
    fi
    V2025="2025.$(( ${BASH_REMATCH[1]} - 15 )).0"
  else
    bad "'$1' is not a release version — expected 2025.N.0 or 3.1.Z"; exit 1
  fi
fi
[ -n "$V2025" ] && [ -n "$V31" ] || { bad "could not resolve a version pair"; exit 1; }

n=$(counter "$V2025"); z=$(counter "$V31")
[ "$z" = "$((n + 15))" ] || bad "pair looks wrong: $V2025 <-> $V31 (expected 3.1.$((n + 15))). The LTS mapping Confluence page is authoritative — read it."

echo
echo "== resolved"
printf '  %-10s %-10s %-11s %-38s %-5s %s\n' LINE VERSION LAST-TAG PAGE IDX BRANCH
for spec in "LTS 2025|$V2025|v2025.*|2025" "LTS 2023|$V31|v3.1.*|2023"; do
  IFS='|' read -r line ver glob br <<< "$spec"
  printf '  %-10s %-10s %-11s %-38s %-5s %s\n' \
    "$line" "$ver" "$(lasttag "$WEBUI" "$glob")" \
    "web-ui-release-notes-${ver//./-}.md" "$((1001 - $(counter "$ver")))" "$br"
done

echo
echo "== next"
note "Confirm the version: project in (WEBUI, ELEMENTS) AND fixVersion in unreleasedVersions()"
note "Scope buckets:       fixVersion = \"$V2025\"   and   fixVersion = \"$V31\""
note "Live URLs:           https://doc.nuxeo.com/nxdoc/web-ui-release-notes-${V2025//./-}/"
note "                     https://doc.nuxeo.com/nxdoc/web-ui-release-notes-${V31//./-}/"

echo
if [ "$fail" = 0 ]; then echo OK; else echo "PROBLEMS ABOVE — resolve before drafting"; exit 1; fi

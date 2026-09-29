#!/usr/bin/env bash
# selftest.sh — run lint-page.sh and resolve-release.sh against inputs designed to break them.
#
# Why this exists: these two scripts are the only automated check in the release-notes
# pipeline, and nothing in the repo's CI executes them — prettier globs **/*.{js,html} and
# eslint matches only .cursor/skills/**/scripts/**/*.js, so a .sh file is never run. Every
# defect found in review so far has been a check that could not fail: a presence test where a
# count was needed, an alternation that always matched, a padded number read as octal that
# errored out while the script still printed "clean". Reading bash does not find those. Running
# it against hostile input does.
#
# Usage: scripts/selftest.sh            # exits 0 only if every case behaves as asserted
# bash 3.2 compatible. No network.
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
LINT="$HERE/lint-page.sh"
RESOLVE="$HERE/resolve-release.sh"

WORK=$(mktemp -d "${TMPDIR:-/tmp}/rnselftest.XXXXXX") || exit 3
trap 'rm -rf "$WORK"' EXIT INT TERM

pass=0; fail=0
# assert <description> <expected: clean|fails> [--because <text>] <file...>
# --because pins WHY it failed. A negative case that fails for an unrelated reason is a test
# that passes without testing anything.
assert() {
  local desc=$1 expect=$2; shift 2
  local reason=""
  if [ "${1:-}" = "--because" ]; then reason=$2; shift 2; fi
  local out rc
  out=$("$LINT" "$@" 2>&1); rc=$?
  local got=clean; [ "$rc" -ne 0 ] && got=fails
  if [ "$got" != "$expect" ]; then
    printf '  FAIL  %s — expected %s, got %s (exit %s)\n' "$desc" "$expect" "$got" "$rc"
    printf '%s\n' "$out" | sed 's/^/          /' | head -12
    fail=$((fail + 1)); return
  fi
  if [ -n "$reason" ] && ! printf '%s' "$out" | grep -qF "$reason"; then
    printf '  FAIL  %s — failed, but not for the expected reason (%s)\n' "$desc" "$reason"
    printf '%s\n' "$out" | sed 's/^/          /' | head -12
    fail=$((fail + 1)); return
  fi
  printf '  ok    %s\n' "$desc"; pass=$((pass + 1))
}
# assert_resolve <description> <expected: ok|rejected> <arg> [expected-reason]
# The reason matters: without two sibling repos the script exits 1 for EVERY argument, so an
# exit-code-only assertion would pass for the wrong cause — the very defect this file exists
# to catch.
assert_resolve() {
  local desc=$1 expect=$2 arg=$3 reason=${4:-}
  local out rc
  out=$(NX_WEBUI="$WORK/repo/nuxeo-web-ui" NX_ELEMENTS="$WORK/repo/nuxeo-elements" \
        "$RESOLVE" "$arg" 2>&1); rc=$?
  local got=ok; [ "$rc" -ne 0 ] && got=rejected
  if [ "$got" != "$expect" ]; then
    printf '  FAIL  %s — expected %s, got %s (exit %s)\n' "$desc" "$expect" "$got" "$rc"
    printf '%s\n' "$out" | sed 's/^/          /' | head -8
    fail=$((fail + 1)); return
  fi
  if [ -n "$reason" ] && ! printf '%s' "$out" | grep -qF "$reason"; then
    printf '  FAIL  %s — rejected, but not for the expected reason (%s)\n' "$desc" "$reason"
    printf '%s\n' "$out" | sed 's/^/          /' | head -8
    fail=$((fail + 1)); return
  fi
  printf '  ok    %s\n' "$desc"; pass=$((pass + 1))
}

# Two throwaway repos so the resolver has something real to read. The remote-tracking refs are
# written directly: there is no remote to fetch, which the script treats as "stale refs" and
# survives for a pinned version — the only mode these cases use.
mkrepo() { # <path> <lts-2025 version> <maintenance version>
  local p=$1
  mkdir -p "$p" && git -C "$p" init -q
  git -C "$p" config user.email selftest@example.com
  git -C "$p" config user.name selftest
  git -C "$p" config commit.gpgsign false
  printf '{"version":"%s"}\n' "$2" > "$p/package.json"
  git -C "$p" add package.json && git -C "$p" commit -qm lts
  git -C "$p" update-ref refs/remotes/origin/lts-2025 "$(git -C "$p" rev-parse HEAD)"
  printf '{"version":"%s"}\n' "$3" > "$p/package.json"
  git -C "$p" add package.json && git -C "$p" commit -qm mx
  git -C "$p" update-ref refs/remotes/origin/maintenance-3.1.x "$(git -C "$p" rev-parse HEAD)"
}

# --- fixtures -------------------------------------------------------------------
# A minimal page that must lint clean. Every negative case is this file, mutated once.
page() { # <dir> <slug> <ver> <line> <idx>
  mkdir -p "$1"
  cat > "$1/web-ui-release-notes-$2.md" <<EOF
---
title: Version $3
description: Discover what's new in Web UI $3.
review:
  comment: ''
  date: '2026-09-23'
  status: ok
toc: true
labels:
tree_item_index: $5
hidden: true
---

{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}

{{! multiexcerpt name='web-ui-updates'}}

## What’s New in Web UI for $4 (Version $3)

**User Experience Improvements**

- ***Improved Document Import:***
    - Users can now import documents without the dialog closing early.

<br/>
{{! /multiexcerpt}}
EOF
}
index() { # <dir> <extra-frontmatter-line>
  mkdir -p "$1"
  cat > "$1/web-ui-release-notes.md" <<EOF
---
title: Web UI Release Notes
description: Discover changes brought in our recent Nuxeo Web UI updates.
review:
  comment: ''
  date: '2026-09-23'
  status: ok
toc: true
labels:
tree_item_index: 500
${2:-}
---

{{{multiexcerpt 'web-ui-updates' page='web-ui-release-notes-2025-20-0'}}}

## Previous Release Notes

| Version | Summary |
| --- | --- |
| {{page page='web-ui-release-notes-2025-19-0'}} | Previous release. |
<!-- | {{page page='web-ui-release-notes-2025-20-0'}} | Next release. | -->
EOF
}

G="$WORK/good"; page "$G" 2025-20-0 2025.20.0 "LTS 2025" 981
page "$G" 3-1-35 3.1.35 "LTS 2023" 966

echo "== positive controls (these must stay clean, or every negative below is meaningless)"
assert "a valid 2025.20.0 page"            clean "$G/web-ui-release-notes-2025-20-0.md"
assert "the matching 2025.20.0 / 3.1.35 pair" clean "$G/web-ui-release-notes-2025-20-0.md" "$G/web-ui-release-notes-3-1-35.md"

echo
echo "== slug and version parsing"
D="$WORK/pad25"; page "$D" 2025-08-0 2025.08.0 "LTS 2025" 993
assert "zero-padded 2025 slug (octal trap)"  fails --because "no zero padding" "$D/web-ui-release-notes-2025-08-0.md"
D="$WORK/pad31"; page "$D" 3-1-035 3.1.035 "LTS 2023" 966
assert "zero-padded 3.1 slug (octal trap)"   fails --because "no zero padding" "$D/web-ui-release-notes-3-1-035.md"
D="$WORK/extra"; page "$D" 2025-20-1 2025.20.1 "LTS 2025" 981
assert "extra segment 2025-20-1"             fails --because "no zero padding" "$D/web-ui-release-notes-2025-20-1.md"
D="$WORK/junk";  page "$D" banana banana "LTS 2025" 981
assert "non-version slug"                    fails "$D/web-ui-release-notes-banana.md"

echo
echo "== frontmatter"
D="$WORK/nofence"; page "$D" 2025-20-0 2025.20.0 "LTS 2025" 981
sed '12d' "$G/web-ui-release-notes-2025-20-0.md" > "$D/web-ui-release-notes-2025-20-0.md"
assert "no closing frontmatter fence"        fails --because "no closing" "$D/web-ui-release-notes-2025-20-0.md"
D="$WORK/fmbody"; mkdir -p "$D"
grep -v '^labels:$' "$G/web-ui-release-notes-2025-20-0.md" > "$D/web-ui-release-notes-2025-20-0.md"
printf '\n```yaml\nlabels:\n```\n' >> "$D/web-ui-release-notes-2025-20-0.md"
assert "labels: only in the body, not frontmatter" fails --because "empty 'labels:' key must be present" "$D/web-ui-release-notes-2025-20-0.md"
D="$WORK/idx"; mkdir -p "$D"
sed 's/^tree_item_index: 981$/tree_item_index: 42/' "$G/web-ui-release-notes-2025-20-0.md" > "$D/web-ui-release-notes-2025-20-0.md"
assert "wrong tree_item_index"               fails --because "tree_item_index is 42" "$D/web-ui-release-notes-2025-20-0.md"

echo
echo "== body structure"
D="$WORK/h4"; mkdir -p "$D"
awk '/^\*\*User Experience/{print "#### Orphaned sub-theme"; print ""} {print}' \
  "$G/web-ui-release-notes-2025-20-0.md" > "$D/web-ui-release-notes-2025-20-0.md"
assert "'####' with no '###' above it"       fails --because "has no '###' above it" "$D/web-ui-release-notes-2025-20-0.md"
D="$WORK/mn2"; mkdir -p "$D"
awk "/{{! multiexcerpt name='web-ui-updates'}}/{print \"{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}\"; print \"\"} {print}" \
  "$G/web-ui-release-notes-2025-20-0.md" > "$D/web-ui-release-notes-2025-20-0.md"
assert "duplicate matching-notes transclusion" fails --because "found 2" "$D/web-ui-release-notes-2025-20-0.md"
D="$WORK/mnin"; mkdir -p "$D"
grep -vF "{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}" \
  "$G/web-ui-release-notes-2025-20-0.md" \
  | awk "/^## What’s New/{print \"{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}\"; print \"\"} {print}" \
  > "$D/web-ui-release-notes-2025-20-0.md"
assert "matching-notes inside the wrapper block" fails --because "must come after" "$D/web-ui-release-notes-2025-20-0.md"
D="$WORK/nobr"; mkdir -p "$D"
grep -v '^<br/>$' "$G/web-ui-release-notes-2025-20-0.md" > "$D/web-ui-release-notes-2025-20-0.md"
assert "missing trailing <br/>"              fails --because "must be '<br/>'" "$D/web-ui-release-notes-2025-20-0.md"
# The closing fence must come before the body, not merely exist: a '---' horizontal rule
# further down satisfies "a second fence" while the renderer swallows the whole page.
D="$WORK/fenceafter"; mkdir -p "$D"
sed '12d' "$G/web-ui-release-notes-2025-20-0.md" \
  | awk '/^<br\/>$/{print "---"; print ""} {print}' > "$D/web-ui-release-notes-2025-20-0.md"
assert "closing fence sits after the body"   fails --because "must come after" "$D/web-ui-release-notes-2025-20-0.md"
# Every adjacent pair in the skeleton, not just the ones that happened to be compared.
# fence AFTER the shared transclusion: the transclusion is then parsed as frontmatter.
D="$WORK/fenceafter_mn"; mkdir -p "$D"
grep -v '^---$' "$G/web-ui-release-notes-2025-20-0.md" | sed '1i\
---' | awk "/{{! multiexcerpt name='web-ui-updates'}}/{print \"---\"} {print}" \
  > "$D/web-ui-release-notes-2025-20-0.md"
assert "fence after the upgrade-notes line" fails --because "must come after" "$D/web-ui-release-notes-2025-20-0.md"
# closing directive before the opening one
D="$WORK/blockrev"; mkdir -p "$D"
sed -e "s|{{! multiexcerpt name='web-ui-updates'}}|@@OPEN@@|" \
    -e "s|{{! /multiexcerpt}}|{{! multiexcerpt name='web-ui-updates'}}|" \
    -e "s|@@OPEN@@|{{! /multiexcerpt}}|" \
    "$G/web-ui-release-notes-2025-20-0.md" > "$D/web-ui-release-notes-2025-20-0.md"
assert "block directives reversed"           fails --because "must come after" "$D/web-ui-release-notes-2025-20-0.md"
# The heading must be inside the transcluded block. Outside it, the index transcludes a body
# with no release heading.
D="$WORK/headout"; mkdir -p "$D"
hline=$(grep -m1 '^## What’s New' "$G/web-ui-release-notes-2025-20-0.md")
# cat -s collapses the blank pair the removed heading leaves behind, so the ONLY difference
# from a valid page is where the heading sits.
grep -v '^## What’s New' "$G/web-ui-release-notes-2025-20-0.md" | cat -s \
  | awk -v h="$hline" "/{{! multiexcerpt name='web-ui-updates'}}/{print h} {print}" \
  > "$D/web-ui-release-notes-2025-20-0.md"
assert "heading outside the wrapper block"   fails --because "must sit inside" "$D/web-ui-release-notes-2025-20-0.md"
# The heading is specified exactly, so trailing text on the line is not the heading.
D="$WORK/headextra"; mkdir -p "$D"
sed 's/^\(## What’s New .*\)$/\1 extra/' "$G/web-ui-release-notes-2025-20-0.md" \
  > "$D/web-ui-release-notes-2025-20-0.md"
assert "heading with trailing text"          fails --because "heading must be exactly" "$D/web-ui-release-notes-2025-20-0.md"

echo
echo "== twins"
D="$WORK/mismatch"; page "$D" 3-1-34 3.1.34 "LTS 2023" 967
assert "2025.20.0 paired with 3.1.34"        fails --because "not the matching LTS pair" "$G/web-ui-release-notes-2025-20-0.md" "$D/web-ui-release-notes-3-1-34.md"

echo
echo "== index mode"
I="$WORK/idxgood"; index "$I"; cp "$G/web-ui-release-notes-2025-20-0.md" "$I/"
cp "$G/web-ui-release-notes-2025-20-0.md" "$I/web-ui-release-notes-2025-19-0.md" 2>/dev/null
assert "valid index" clean --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"
I="$WORK/idxhidden"; index "$I" "hidden: true"
assert "index carrying a hidden key" fails --because "must not carry a 'hidden' key" --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"
I="$WORK/idx500"; index "$I"
sed -i.bak 's/^tree_item_index: 500$/tree_item_index: 501/' "$I/web-ui-release-notes.md" && rm -f "$I/web-ui-release-notes.md.bak"
assert "index with tree_item_index != 500" fails --because "tree_item_index must be 500" --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"
# A pre-staged row whose comment is never closed renders as broken content next release.
I="$WORK/idxtrunc"; index "$I"
sed -i.bak 's/ | Next release. | -->/ | Next release. |/' "$I/web-ui-release-notes.md" && rm -f "$I/web-ui-release-notes.md.bak"
assert "pre-staged row with no closing -->" fails --because "pre-staged commented row" --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"
# Index mode needs the same fence-before-body rule the page mode has: a '---' below the
# transclusion satisfies "a second fence" while the renderer eats the index.
I="$WORK/idxfence"; index "$I"
grep -v '^---$' "$I/web-ui-release-notes.md" | sed '1i\
---' | awk 'index($0,"multiexcerpt \47web-ui-updates\47"){print; print "---"; next} {print}' \
  > "$I/tmp" && mv "$I/tmp" "$I/web-ui-release-notes.md"
assert "index fence sits after the body" fails --because "must come before" --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"

echo
echo "== resolve-release.sh pinned versions"
mkrepo "$WORK/repo/nuxeo-web-ui"  2025.20.0-SNAPSHOT 3.1.35-SNAPSHOT
mkrepo "$WORK/repo/nuxeo-elements" 2025.20.0-SNAPSHOT 3.1.35-SNAPSHOT
assert_resolve "2025.20.0"        ok       2025.20.0
assert_resolve "3.1.35"           ok       3.1.35
assert_resolve "2025.08.0 padded" rejected 2025.08.0 "is not a release version"
assert_resolve "3.1.035 padded"   rejected 3.1.035   "is not a release version"
assert_resolve "3.1.35.1 extra"   rejected 3.1.35.1  "is not a release version"
assert_resolve "2025.19.1 extra"  rejected 2025.19.1 "is not a release version"
assert_resolve "3.1.9 pre-2025"   rejected 3.1.9     "predates 3.1.18"
assert_resolve "garbage"          rejected foo       "is not a release version"

# Auto-detect reads package.json directly and never went through the pinned-version pattern,
# so a padded version there reached the arithmetic unchecked.
mkrepo "$WORK/padrepo/nuxeo-web-ui"  2025.08.0-SNAPSHOT 3.1.23-SNAPSHOT
mkrepo "$WORK/padrepo/nuxeo-elements" 2025.08.0-SNAPSHOT 3.1.23-SNAPSHOT
out=$(NX_ALLOW_STALE=1 NX_WEBUI="$WORK/padrepo/nuxeo-web-ui" NX_ELEMENTS="$WORK/padrepo/nuxeo-elements" \
      "$RESOLVE" 2>&1); rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "no zero padding"; then
  printf '  ok    %s\n' "auto-detected 2025.08.0 from package.json"; pass=$((pass + 1))
else
  printf '  FAIL  %s — expected rejection naming the padding, got exit %s\n' "auto-detected 2025.08.0 from package.json" "$rc"
  printf '%s\n' "$out" | sed 's/^/          /' | head -8
  fail=$((fail + 1))
fi

echo
echo "== review block scoping, stray headings, index schema (Copilot round 10)"
# The three review children must be nested under 'review:', not merely present somewhere in the
# frontmatter. Here 'review:' is empty and the children hang off 'labels:' — different YAML,
# which satisfied three independent greps.
D="$WORK/revblock"; mkdir -p "$D"
cat > "$D/web-ui-release-notes-2025-20-0.md" <<'MALFORMED'
---
title: Version 2025.20.0
description: Discover what's new in Web UI 2025.20.0.
review:
toc: true
labels:
  comment: ''
  date: '2026-09-23'
  status: ok
tree_item_index: 981
hidden: true
---

{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}

{{! multiexcerpt name='web-ui-updates'}}

## What’s New in Web UI for LTS 2025 (Version 2025.20.0)

**User Experience Improvements**

- ***Improved Document Import:***
    - Users can now import documents without the dialog closing early.

<br/>
{{! /multiexcerpt}}
MALFORMED
assert "review children nested under another key" fails --because "inside the review block" "$D/web-ui-release-notes-2025-20-0.md"

# A second '##' renders as a sibling section wherever the block is transcluded; body() strips
# only the '## What's New' line, so the twins diff would not reveal it either.
D="$WORK/twoh2"; page "$D" 2025-20-0 2025.20.0 "LTS 2025" 981
awk '{print} /^## What/{print "";print "## Extra Section"}' "$D/web-ui-release-notes-2025-20-0.md" > "$D/t" && mv "$D/t" "$D/web-ui-release-notes-2025-20-0.md"
assert "a stray second H2 inside the wrapper" fails --because "exactly 1 '##' heading" "$D/web-ui-release-notes-2025-20-0.md"

I="$WORK/idxtoc"; index "$I"; sed -i.bak 's/^toc: true$/toc: false/' "$I/web-ui-release-notes.md"
assert "index with toc: false" fails --because "toc must be true" --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"

I="$WORK/idxnolabels"; index "$I"; sed -i.bak '/^labels:$/d' "$I/web-ui-release-notes.md"
assert "index with the labels key removed" fails --because "empty 'labels:' key" --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"

I="$WORK/idxnoreview"; index "$I"; sed -i.bak "/^review:$/,+3d" "$I/web-ui-release-notes.md"
assert "index with the review block removed" fails --because "missing 'review:' block" --index "$I/web-ui-release-notes.md" "$G/web-ui-release-notes-2025-20-0.md"

echo
echo "== resolver: worktrees and the pre-2025.3 mapping (Copilot round 10)"
# A linked worktree's '.git' is a FILE. A '-d' test rejected it, although every git command
# below works there — and this repo's agent workflows hand out worktrees.
mkrepo "$WORK/wt/nuxeo-web-ui"  2025.21.0-SNAPSHOT 3.1.36-SNAPSHOT
mkrepo "$WORK/wt/nuxeo-elements" 2025.21.0-SNAPSHOT 3.1.36-SNAPSHOT
git -C "$WORK/wt/nuxeo-web-ui"  worktree add -q --detach "$WORK/wt/linked-web-ui"  HEAD 2>/dev/null
git -C "$WORK/wt/nuxeo-elements" worktree add -q --detach "$WORK/wt/linked-elements" HEAD 2>/dev/null
if [ -f "$WORK/wt/linked-web-ui/.git" ]; then
  out=$(NX_ALLOW_STALE=1 NX_WEBUI="$WORK/wt/linked-web-ui" NX_ELEMENTS="$WORK/wt/linked-elements" \
        "$RESOLVE" 2>&1); rc=$?
  # Strictly exit 0. Accepting "no rejection message" instead would pass against the old
  # script too, whose wording differed — a case that passes without testing anything.
  if [ "$rc" -eq 0 ]; then
    printf '  ok    %s\n' "linked worktree (.git is a file) is accepted"; pass=$((pass + 1))
  else
    printf '  FAIL  %s — the resolver still rejects a linked worktree\n' "linked worktree (.git is a file) is accepted"
    printf '%s\n' "$out" | sed 's/^/          /' | head -6
    fail=$((fail + 1))
  fi
else
  printf '  ok    %s (skipped: git worktree unavailable)\n' "linked worktree"; pass=$((pass + 1))
fi

# SKILL.md only guarantees the +15 offset from 2025.3.0 / 3.1.18 onward, so anything below that
# must be referred to the mapping page rather than derived arithmetically.
assert_resolve "pinned 2025.2.0 (predates the +15 offset)" rejected 2025.2.0 "mapping page"
assert_resolve "pinned 3.1.17 (predates the +15 offset)"   rejected 3.1.17   "mapping page"
assert_resolve "pinned 2025.3.0 (first offset-backed pair)" ok       2025.3.0

echo
echo "== leak checks and single-branch clones (Copilot round 11)"
for probe in "--nuxeo-primary-color" "nuxeo-data-table" "#3384"; do
  D="$WORK/leak$(printf '%s' "$probe" | tr -cd 'a-z0-9')"; page "$D" 2025-20-0 2025.20.0 "LTS 2025" 981
  # drop it into a bullet, i.e. inside the wrapper where customer prose lives
  awk -v p="$probe" '{print} /^- \*\*\*Improved Document Import:\*\*\*$/{print "    - Now honours " p "."}' \
      "$D/web-ui-release-notes-2025-20-0.md" > "$D/t" && mv "$D/t" "$D/web-ui-release-notes-2025-20-0.md"
  assert "leaked '$probe' in customer prose" fails "$D/web-ui-release-notes-2025-20-0.md"
done
# 'Nuxeo Web UI' is the product name in ordinary prose and must NOT trip the element-name check.
D="$WORK/leakok"; page "$D" 2025-20-0 2025.20.0 "LTS 2025" 981
awk '{print} /^- \*\*\*Improved Document Import:\*\*\*$/{print "    - Nuxeo Web UI now keeps the dialog open."}' \
    "$D/web-ui-release-notes-2025-20-0.md" > "$D/t" && mv "$D/t" "$D/web-ui-release-notes-2025-20-0.md"
assert "the product name 'Nuxeo Web UI' is not an element name" clean "$D/web-ui-release-notes-2025-20-0.md"

# A single-branch clone configures a narrow refspec, so 'fetch origin <branch>' never creates
# the OTHER branch's remote-tracking ref and snapshot() reads nothing from it.
ORIGIN="$WORK/sb/origin.git"; mkdir -p "$WORK/sb" && git init -q --bare "$ORIGIN"
git clone -q "$ORIGIN" "$WORK/sb/seed" 2>/dev/null
( cd "$WORK/sb/seed" && git config user.email t@e && git config user.name t && git config commit.gpgsign false
  printf '{"version":"2025.21.0-SNAPSHOT"}\n' > package.json && git add package.json && git commit -qm a
  git branch -M lts-2025 && git push -q origin lts-2025
  git checkout -qb maintenance-3.1.x && printf '{"version":"3.1.36-SNAPSHOT"}\n' > package.json
  git commit -qam b && git push -q origin maintenance-3.1.x ) 2>/dev/null
for r in nuxeo-web-ui nuxeo-elements; do
  git clone -q --single-branch --branch lts-2025 "$ORIGIN" "$WORK/sb/$r" 2>/dev/null
done
if [ -d "$WORK/sb/nuxeo-web-ui" ]; then
  out=$(NX_WEBUI="$WORK/sb/nuxeo-web-ui" NX_ELEMENTS="$WORK/sb/nuxeo-elements" "$RESOLVE" 2>&1); rc=$?
  if [ "$rc" -eq 0 ] && printf '%s' "$out" | grep -q "3.1.36"; then
    printf '  ok    %s\n' "single-branch clone resolves both branches"; pass=$((pass + 1))
  else
    printf '  FAIL  %s — exit %s; the second branch ref was never created\n' "single-branch clone resolves both branches" "$rc"
    printf '%s\n' "$out" | sed 's/^/          /' | head -8
    fail=$((fail + 1))
  fi
else
  printf '  ok    %s (skipped: clone unavailable)\n' "single-branch clone"; pass=$((pass + 1))
fi

echo
printf -- '-----\n'
if [ "$fail" = 0 ]; then
  printf '%s case(s) passed\n' "$pass"
else
  printf '%s passed, %s FAILED\n' "$pass" "$fail"; exit 1
fi

#!/usr/bin/env bash
# lint-page.sh — mechanical checks on a pair of Web UI release-notes pages.
#
# Usage: scripts/lint-page.sh <lts-2025-page.md> <lts-2023-page.md>
#        scripts/lint-page.sh <page.md>                 # single page, skips the twin check
#        scripts/lint-page.sh --released <page.md> ...  # the OUTGOING page, flipped to false
#        scripts/lint-page.sh --index <index.md> <page.md> ...   # also check the index page
#
# Covers every mechanical item in the review rubric's "Structure and format fidelity"
# dimension, plus the twins rule. It does NOT judge prose — accuracy, framing and language
# are still the review skill's job.
#
# Exit 0 = clean. Exit 1 = at least one FAIL. bash 3.2 compatible.
set -uo pipefail

RELEASED=0; INDEX=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --released) RELEASED=1; shift ;;
    --index)    [ "$#" -ge 2 ] || { echo "error: --index needs a file argument." >&2; exit 2; }
                INDEX=$2; shift 2 ;;
    --) shift; break ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) break ;;
  esac
done

TMP=$(mktemp -d "${TMPDIR:-/tmp}/rnlint.XXXXXX") || exit 3
trap 'rm -rf "$TMP"' EXIT INT TERM

fails=0; warns=0
FAIL() { printf '  FAIL  %s\n' "$*"; fails=$((fails + 1)); }
WARN() { printf '  warn  %s\n' "$*"; warns=$((warns + 1)); }
OK()   { printf '  ok    %s\n' "$*"; }
# hits <fail-msg> <ok-msg> <command...> — FAIL and show up to 5 offenders, else OK
hits() {
  local bad_msg=$1 ok_msg=$2; shift 2
  local out; out=$("$@" 2>/dev/null | head -5)
  if [ -n "$out" ]; then FAIL "$bad_msg"; printf '%s\n' "$out" | sed 's/^/        /'
  elif [ -n "$ok_msg" ]; then OK "$ok_msg"; fi
}

fm() { # <file> <key> -> value from the frontmatter block
  awk -v k="$2" 'NR==1&&$0=="---"{f=1;next} f&&$0=="---"{exit}
                 f&&index($0,k": ")==1{sub("^"k": ",""); print; exit}' "$1"
}

check_page() {
  local f=$1 base ver slug seg line expect_line
  echo "== $f"
  [ -f "$f" ] || { FAIL "file does not exist"; return; }

  base=$(basename "$f" .md)
  slug=${base#web-ui-release-notes-}
  [ "$slug" != "$base" ] || { FAIL "filename must be web-ui-release-notes-<slug>.md"; return; }

  # slug -> version, and which LTS line it belongs to
  # Exact shapes only: 2025-N-0 and 3-1-Z. A prefix match would accept 2025-20-1.
  if [[ $slug =~ ^2025-([0-9]+)-0$ ]]; then
    seg=${BASH_REMATCH[1]}; ver="2025.$seg.0"; line="LTS 2025"
  elif [[ $slug =~ ^3-1-([0-9]+)$ ]]; then
    seg=${BASH_REMATCH[1]}; ver="3.1.$seg"; line="LTS 2023"
  else
    FAIL "slug '$slug' is neither a 2025-N-0 nor a 3-1-Z form"; return
  fi

  # --- frontmatter -------------------------------------------------------------
  [ "$(head -1 "$f")" = "---" ] || FAIL "file must open with the '---' frontmatter fence"
  for k in title description toc tree_item_index hidden; do
    [ -n "$(fm "$f" "$k")" ] || FAIL "frontmatter: missing '$k'"
  done
  grep -qE '^labels:[[:space:]]*$' "$f" || FAIL "frontmatter: the empty 'labels:' key must be present (do not tidy it away)"
  grep -qE '^review:$'             "$f" || FAIL "frontmatter: missing 'review:' block"
  grep -qE "^  comment: ''$"       "$f" || FAIL "frontmatter: review.comment must be ''"
  grep -qE "^  date: '[0-9]{4}-[0-9]{2}-[0-9]{2}'$" "$f" || FAIL "frontmatter: review.date must be a quoted YYYY-MM-DD"
  grep -qE '^  status: ok$'        "$f" || FAIL "frontmatter: review.status must be ok"
  [ "$(fm "$f" toc)" = "true" ]         || FAIL "frontmatter: toc must be true"
  [ "$(fm "$f" title)" = "Version $ver" ] || FAIL "frontmatter: title is '$(fm "$f" title)', expected 'Version $ver'"
  [ "$(fm "$f" description)" = "Discover what's new in Web UI $ver." ] \
    || FAIL "frontmatter: description is '$(fm "$f" description)', expected \"Discover what's new in Web UI $ver.\" (straight apostrophe)"
  if [ "$RELEASED" = 1 ]; then
    [ "$(fm "$f" hidden)" = "false" ] \
      || FAIL "frontmatter: --released was passed, so hidden must be false; found '$(fm "$f" hidden)'"
  else
    [ "$(fm "$f" hidden)" = "true" ] \
      || FAIL "frontmatter: hidden is '$(fm "$f" hidden)' — the incoming release's page must be true. The outgoing page is flipped to false in this same PR; lint that one with --released."
  fi

  # tree_item_index = 1001 - the segment that increments per release
  # (N in 2025.N.0, Z in 3.1.Z — NOT the trailing 0 of the 2025 form)
  local idx want=$((1001 - seg))
  idx=$(fm "$f" tree_item_index)
  [ "$idx" = "$want" ] || FAIL "tree_item_index is $idx, expected $want (1001 - $seg)"

  # --- multiexcerpt wrappers ---------------------------------------------------
  grep -qF "{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}" "$f" \
    || FAIL "missing the shared upgrade-notes transclusion: {{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}"
  local o c
  o=$(grep -cF "{{! multiexcerpt name='web-ui-updates'}}" "$f")
  c=$(grep -cF "{{! /multiexcerpt}}" "$f")
  [ "$o" = 1 ] || FAIL "expected exactly 1 opening {{! multiexcerpt name='web-ui-updates'}}, found $o"
  [ "$c" = 1 ] || FAIL "expected exactly 1 closing {{! /multiexcerpt}}, found $c"
  if [ "$o" = 1 ] && [ "$c" = 1 ]; then
    local ol cl
    ol=$(grep -nF "{{! multiexcerpt name='web-ui-updates'}}" "$f" | cut -d: -f1)
    cl=$(grep -nF "{{! /multiexcerpt}}" "$f" | cut -d: -f1)
    [ "$ol" -lt "$cl" ] || FAIL "the closing multiexcerpt directive (line $cl) precedes the opening one (line $ol)"
    # Must be the LAST nonblank line before the close, not merely present somewhere.
    last=$(awk -v o="$ol" -v c="$cl" 'NR>o&&NR<c&&NF{l=$0} END{print l}' "$f")
    [ "$last" = "<br/>" ] \
      || FAIL "the last line before the closing multiexcerpt must be '<br/>', found '${last:-<nothing>}'"
  fi

  # --- heading ------------------------------------------------------------------
  expect_line="## What’s New in Web UI for $line (Version $ver)"
  if grep -qF "$expect_line" "$f"; then OK "heading: $expect_line"
  else
    FAIL "heading must be exactly: $expect_line"
    grep -n '^## ' "$f" | sed 's/^/        found: /'
    grep -q "What's New" "$f" && FAIL "  ^ that heading uses a STRAIGHT apostrophe; the published pages use the curly ’"
  fi

  # --- body hygiene -------------------------------------------------------------
  hits "trailing whitespace" "no trailing whitespace" grep -nE '[[:space:]]+$' "$f"
  local dbl
  dbl=$(awk 'p==""&&$0==""{print NR; exit} {p=$0}' "$f")
  # Measured across published pages: 2025.15.0=1, .16.0=0, .17.0=0, .18.0=1, .19.0=1 run each.
  # Isolated strays, not a convention — the rule is one blank line, and the review skill deducts
  # on it, so fail here rather than spend a review round on it.
  [ -n "$dbl" ] && FAIL "double blank line at line $dbl" || OK "no double blank lines"
  [ -n "$(tail -c 1 "$f")" ] && FAIL "file must end with a newline" || OK "ends with a newline"
  [ -z "$(tail -c 2 "$f" | tr -d '\n')" ] && FAIL "file ends with more than one newline" || true
  hits "tab characters in the page" "" grep -n "$(printf '\t')" "$f"

  # nested prose bullets must be indented exactly four spaces
  hits "nested bullet indentation must be exactly four spaces" "nested bullet indentation" \
    grep -nE '^( {1,3}| {5,})- ' "$f"

  # code fences must balance — an unclosed fence swallows the rest of the page
  local fences
  fences=$(grep -cE '^[[:space:]]*```' "$f")
  [ $((fences % 2)) -eq 0 ] || FAIL "$fences code-fence markers — an odd count means one is unclosed"

  # item titles carry a trailing colon inside the bold-italic wrapper
  hits "item title must end with ':' inside the ***…*** wrapper" "" \
    grep -nE '^- \*\*\*[^*]*[^:*]\*\*\*:?[[:space:]]*$' "$f"

  # legacy Era-2 layout: prose on the line AFTER the bullet, unindented (do not write it)
  hits "legacy Era-2 layout — put the prose in a four-space nested bullet instead" "" \
    awk '/^- \*\*\*/{t=NR; next} t&&NR==t+1&&/^[A-Za-z]/{print NR": "$0} {t=0}' "$f"

  # one layout only
  local a b
  a=$(awk '/^\*\*[A-Z].*\*\*$/{want=1; next}
            want&&/^$/{next}
            want{ if ($0 ~ /^- /) n++; want=0 }
            END{print n+0}' "$f")
  b=$(grep -cE '^### ' "$f")
  if [ "$a" -gt 0 ] && [ "$b" -gt 0 ]; then
    FAIL "layout mix: $a bold category lines (Layout A) and $b '###' headings (Layout B) — pick one"
  else
    OK "single layout ($([ "$b" -gt 0 ] && echo 'B — sectioned' || echo 'A — compact'))"
  fi
  # heading levels not skipped
  grep -qE '^#### ' "$f" && ! grep -qE '^### ' "$f" && FAIL "'####' used with no '###' above it" || true
  grep -qE '^# [^#]' "$f" && FAIL "a top-level '#' heading in the body (the H2 is the page title)" || true

  # --- leaks --------------------------------------------------------------------
  awk -v o="${ol:-1}" -v c="${cl:-99999}" 'NR>o&&NR<c' "$f" > "$TMP/body"
  hits "Jira key in customer prose" "no Jira keys in prose" \
    grep -noiE '(WEBUI|ELEMENTS|NXDOC|NXENG|NXP)-[0-9]+' "$TMP/body"
  hits "scanner name in customer prose — security work is one sentence, never named" "no scanner names" \
    grep -noiE '(sonar|sonarqube|sonarcloud|veracode|dependabot)' "$TMP/body"
  hits "CVE id in customer prose" "no CVE ids" \
    grep -noE 'CVE-[0-9]{4}-[0-9]+' "$TMP/body"
  echo
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  awk 'NR>1{ if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
  echo "error: pass one page, or both pages of the pair." >&2
  exit 2
fi

for f in "$@"; do check_page "$f"; done

# --- twins ---------------------------------------------------------------------
# The customer-facing body only: inside the web-ui-updates block, minus the heading line.
# Frontmatter legitimately differs between the lines (title, description, tree_item_index).
body() {
  awk "/{{! multiexcerpt name='web-ui-updates'}}/{f=1;next} /{{! \\/multiexcerpt}}/{f=0}
       f&&\$0!~/^## What’s New/" "$1"
}
if [ "$#" -eq 2 ]; then
  echo "== twins (the customer-facing body must be identical apart from the heading line)"
  # The pair must be the matching LTS pair. Without this, a 2025.20.0 page and a 3.1.34 page
  # with identical bodies pass, approving the wrong release combination.
  n25=""; n31=""
  for f in "$1" "$2"; do
    b=$(basename "$f" .md); b=${b#web-ui-release-notes-}
    if [[ $b =~ ^2025-([0-9]+)-0$ ]]; then n25=${BASH_REMATCH[1]}
    elif [[ $b =~ ^3-1-([0-9]+)$ ]]; then n31=${BASH_REMATCH[1]}; fi
  done
  if [ -z "$n25" ] || [ -z "$n31" ]; then
    FAIL "the twin check needs one 2025-N-0 page and one 3-1-Z page; got '$(basename "$1")' and '$(basename "$2")'"
  elif [ "$n31" -ne "$((n25 + 15))" ]; then
    FAIL "these are not the matching LTS pair: 2025.$n25.0 pairs with 3.1.$((n25 + 15)), not 3.1.$n31"
  else
    OK "matching LTS pair (2025.$n25.0 / 3.1.$n31)"
  fi
  # -B: the real published pair 2025.18.0 / 3.1.33 differs by blank-line placement only.
  # Content parity is the rule; whitespace drift between the two branches is not a defect.
  if diff -B <(body "$1") <(body "$2") > "$TMP/twin"; then
    OK "the two bodies are identical"
  else
    FAIL "the two bodies differ — always a defect in the notes, never a real per-line difference:"
    sed 's/^/        /' "$TMP/twin" | head -20
  fi
  echo
fi

# --- index page ----------------------------------------------------------------
if [ -n "$INDEX" ]; then
  echo "== $INDEX (index page)"
  if [ ! -f "$INDEX" ]; then FAIL "index page does not exist: $INDEX"; else
    newslug=$(basename "$1" .md); newslug=${newslug#web-ui-release-notes-}
    newver=$(echo "$newslug" | sed 's/^2025-/2025./; s/-/./g')
    if grep -qF "{{{multiexcerpt 'web-ui-updates' page='web-ui-release-notes-$newslug'}}}" "$INDEX"; then
      OK "'Recently Released Changes' transcludes web-ui-release-notes-$newslug"
    else
      FAIL "the 'Recently Released Changes' transclusion is not repointed at web-ui-release-notes-$newslug"
      grep -n "multiexcerpt 'web-ui-updates'" "$INDEX" | sed 's/^/        /'
    fi
    # the incoming version is 'recent', so it must not also sit in the Previous table
    hits "the incoming version already has an uncommented row in Previous Release Notes — it belongs in 'Recently Released Changes' until it is superseded" "" \
      grep -nE "^\|.*web-ui-release-notes-$newslug'" "$INDEX"
    # ... but it should have the pre-staged commented row ready for next time
    grep -qE "^<!--[[:space:]]*\|.*web-ui-release-notes-$newslug'" "$INDEX" \
      && OK "pre-staged commented row present for $newver" \
      || FAIL "no pre-staged commented row for $newver — format-template.md requires one, ready to uncomment next release"
    hits "raw URL in the Previous Release Notes table — use {{page page='…'}}" "" \
      grep -nE '^\|.*https?://' "$INDEX"
    grep -qE '^##[[:space:]]+Previous Release Notes[[:space:]]*$' "$INDEX" \
      || FAIL "no '## Previous Release Notes' heading in the index"

    # The inverse half of the index update: the OUTGOING version must now sit in the table,
    # uncommented. Derived from the incoming version; skipped when there is no predecessor.
    prevslug=""
    if [[ $newslug =~ ^2025-([0-9]+)-0$ ]]; then
      [ "${BASH_REMATCH[1]}" -gt 1 ] && prevslug="2025-$((BASH_REMATCH[1] - 1))-0"
    elif [[ $newslug =~ ^3-1-([0-9]+)$ ]]; then
      [ "${BASH_REMATCH[1]}" -gt 1 ] && prevslug="3-1-$((BASH_REMATCH[1] - 1))"
    fi
    if [ -n "$prevslug" ] && [ -f "$(dirname "$1")/web-ui-release-notes-$prevslug.md" ]; then
      if grep -qE "^\|.*web-ui-release-notes-$prevslug'" "$INDEX"; then
        OK "outgoing version $prevslug moved into Previous Release Notes"
      else
        FAIL "the outgoing version $prevslug is not an uncommented row in Previous Release Notes — Step 7 moves it there as this release becomes 'recent'"
        grep -nE "web-ui-release-notes-$prevslug'" "$INDEX" | head -3 | sed 's/^/        /'
      fi
    fi
  fi
  echo
fi

printf '%s\n' "-----"
if [ "$fails" = 0 ]; then
  printf 'clean — %s warning(s)\n' "$warns"
else
  printf '%s FAIL(s), %s warning(s) — fix before the review skill sees it\n' "$fails" "$warns"; exit 1
fi

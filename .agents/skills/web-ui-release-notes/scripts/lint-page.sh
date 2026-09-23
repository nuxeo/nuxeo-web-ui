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
  local f=$1 base ver slug seg line expect_line fmend
  echo "== $f"
  [ -f "$f" ] || { FAIL "file does not exist"; return; }

  base=$(basename "$f" .md)
  slug=${base#web-ui-release-notes-}
  [ "$slug" != "$base" ] || { FAIL "filename must be web-ui-release-notes-<slug>.md"; return; }

  # slug -> version, and which LTS line it belongs to
  # Exact shapes only: 2025-N-0 and 3-1-Z. A prefix match would accept 2025-20-1.
  # [1-9][0-9]* not [0-9]+: slugs carry no zero padding (format-template.md), and a padded
  # segment would reach the arithmetic below as an octal literal.
  if [[ $slug =~ ^2025-([1-9][0-9]*)-0$ ]]; then
    seg=${BASH_REMATCH[1]}; ver="2025.$seg.0"; line="LTS 2025"
  elif [[ $slug =~ ^3-1-([1-9][0-9]*)$ ]]; then
    seg=${BASH_REMATCH[1]}; ver="3.1.$seg"; line="LTS 2023"
  else
    FAIL "slug '$slug' is neither a 2025-N-0 nor a 3-1-Z form (no zero padding)"; return
  fi

  # --- frontmatter -------------------------------------------------------------
  [ "$(head -1 "$f")" = "---" ] || FAIL "file must open with the '---' frontmatter fence"
  # Both fences, not just the opener: without the closing one the renderer treats the whole
  # page as frontmatter and publishes nothing. Nothing below can be trusted either, so stop.
  fmend=$(awk 'NR>1&&/^---$/{print NR; exit}' "$f")
  if [ -z "$fmend" ]; then
    FAIL "frontmatter has no closing '---' fence — the renderer would swallow the page body and publish a blank page"
    return
  fi
  for k in title description toc tree_item_index hidden; do
    [ -n "$(fm "$f" "$k")" ] || FAIL "frontmatter: missing '$k'"
  done
  # Match inside the block only: the same line in the body or a code sample would otherwise
  # stand in for a key that is actually missing from the frontmatter.
  awk 'NR==1&&$0=="---"{f=1;next} f&&$0=="---"{exit} f' "$f" > "$TMP/frontmatter"
  grep -qE '^labels:[[:space:]]*$' "$TMP/frontmatter" || FAIL "frontmatter: the empty 'labels:' key must be present (do not tidy it away)"
  grep -qE '^review:$'             "$TMP/frontmatter" || FAIL "frontmatter: missing 'review:' block"
  grep -qE "^  comment: ''$"       "$TMP/frontmatter" || FAIL "frontmatter: review.comment must be ''"
  grep -qE "^  date: '[0-9]{4}-[0-9]{2}-[0-9]{2}'$" "$TMP/frontmatter" || FAIL "frontmatter: review.date must be a quoted YYYY-MM-DD"
  grep -qE '^  status: ok$'        "$TMP/frontmatter" || FAIL "frontmatter: review.status must be ok"
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
  # 10# forces base 10: belt and braces, so a future slip in the slug pattern cannot turn a
  # padded segment into an octal literal, which errors out without recording a failure.
  local idx want=$((1001 - 10#$seg))
  idx=$(fm "$f" tree_item_index)
  [ "$idx" = "$want" ] || FAIL "tree_item_index is $idx, expected $want (1001 - $seg)"

  # --- page structure ------------------------------------------------------------
  # The landmarks are resolved ONCE and validated as a single ordered chain. Comparing
  # selected pairs instead — fence before block, transclusion before block — leaves the
  # unchecked pairs free to be wrong, which is how a fence sitting after the shared
  # transclusion passed. The whole skeleton is one order, so assert it as one.
  local mn o c mnl ol cl
  # -o not -c: grep -c counts matching LINES, so two directives sharing one physical line
  # would count as one and slip past the exactly-one checks below.
  mn=$(grep -oF "{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}" "$f" | wc -l | tr -d ' ')
  o=$(grep -oF "{{! multiexcerpt name='web-ui-updates'}}" "$f" | wc -l | tr -d ' ')
  c=$(grep -oF "{{! /multiexcerpt}}" "$f" | wc -l | tr -d ' ')
  [ "$mn" = 1 ] \
    || FAIL "expected exactly 1 shared upgrade-notes transclusion {{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}, found $mn"
  [ "$o" = 1 ] || FAIL "expected exactly 1 opening {{! multiexcerpt name='web-ui-updates'}}, found $o"
  [ "$c" = 1 ] || FAIL "expected exactly 1 closing {{! /multiexcerpt}}, found $c"
  if [ "$mn" = 1 ] && [ "$o" = 1 ] && [ "$c" = 1 ]; then
    mnl=$(grep -nF "{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}" "$f" | cut -d: -f1)
    ol=$(grep -nF "{{! multiexcerpt name='web-ui-updates'}}" "$f" | cut -d: -f1)
    cl=$(grep -nF "{{! /multiexcerpt}}" "$f" | cut -d: -f1)
    local prev_name prev_line item name pos ordered=1
    prev_name="frontmatter closing fence"; prev_line=$fmend
    for item in "shared upgrade-notes transclusion|$mnl" \
                "opening web-ui-updates directive|$ol" \
                "closing multiexcerpt directive|$cl"; do
      name=${item%|*}; pos=${item##*|}
      if [ "$prev_line" -ge "$pos" ]; then
        FAIL "page skeleton out of order: the $name (line $pos) must come after the $prev_name (line $prev_line)"
        ordered=0; break
      fi
      prev_name=$name; prev_line=$pos
    done
    if [ "$ordered" = 1 ]; then
      OK "skeleton in order: fence $fmend < upgrade-notes $mnl < block $ol-$cl"
      # Must be the LAST nonblank line before the close, not merely present somewhere.
      last=$(awk -v o="$ol" -v c="$cl" 'NR>o&&NR<c&&NF{l=$0} END{print l}' "$f")
      [ "$last" = "<br/>" ] \
        || FAIL "the last line before the closing multiexcerpt must be '<br/>', found '${last:-<nothing>}'"
    fi
  fi

  # --- heading ------------------------------------------------------------------
  # Scoped to the transcluded block: a heading outside it leaves the index transcluding a body
  # with no release heading at all.
  expect_line="## What’s New in Web UI for $line (Version $ver)"
  # Full-line equality, not a substring: '… (Version 2025.20.0) extra' is not the heading.
  if awk -v o="${ol:-0}" -v c="${cl:-999999}" -v want="$expect_line" \
         'NR>o&&NR<c&&$0==want{found=1} END{exit !found}' "$f"; then
    OK "heading: $expect_line"
  elif grep -qxF "$expect_line" "$f"; then
    FAIL "the heading is present but must sit inside the web-ui-updates block (lines ${ol:-?}-${cl:-?})"
    grep -nF "$expect_line" "$f" | sed 's/^/        found at: /'
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
  # heading levels not skipped — a '###' must come BEFORE the first '####', not merely exist
  local h3 h4
  h3=$(grep -nE '^### '  "$f" | head -1 | cut -d: -f1)
  h4=$(grep -nE '^#### ' "$f" | head -1 | cut -d: -f1)
  if [ -n "$h4" ] && { [ -z "$h3" ] || [ "$h4" -lt "$h3" ]; }; then
    FAIL "'####' at line $h4 has no '###' above it"
  fi
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
    if [[ $b =~ ^2025-([1-9][0-9]*)-0$ ]]; then n25=${BASH_REMATCH[1]}
    elif [[ $b =~ ^3-1-([1-9][0-9]*)$ ]]; then n31=${BASH_REMATCH[1]}; fi
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
  ixfmend=$(awk 'NR>1&&/^---$/{print NR; exit}' "$INDEX" 2>/dev/null)
  ixbody=$(grep -nF "multiexcerpt 'web-ui-updates'" "$INDEX" 2>/dev/null | head -1 | cut -d: -f1)
  if [ ! -f "$INDEX" ]; then FAIL "index page does not exist: $INDEX"
  elif [ "$(head -1 "$INDEX")" != "---" ] || [ -z "$ixfmend" ]; then
    # Same failure mode as a release page: without both fences the renderer swallows the
    # index body, so the transclusion never resolves.
    FAIL "the index page's frontmatter is missing its opening or closing '---' fence"
  elif [ -n "$ixbody" ] && [ "$ixfmend" -ge "$ixbody" ]; then
    # And the fence must come before the body, for the same reason it must on a page: a later
    # '---' is a horizontal rule, not the fence.
    FAIL "the index page's frontmatter closing fence (line $ixfmend) must come before the 'web-ui-updates' transclusion (line $ixbody)"
  else
    # format-template.md: the index carries tree_item_index: 500 and NO hidden key. Without
    # these the navigation metadata can be wrong and still reach a PR.
    awk 'NR==1&&$0=="---"{f=1;next} f&&$0=="---"{exit} f' "$INDEX" > "$TMP/indexfm"
    grep -qE '^tree_item_index: 500$' "$TMP/indexfm" \
      || FAIL "index frontmatter: tree_item_index must be 500, found '$(fm "$INDEX" tree_item_index)'"
    grep -qE '^hidden:' "$TMP/indexfm" \
      && FAIL "index frontmatter: the index must not carry a 'hidden' key (format-template.md)" || true
    for k in title description toc; do
      [ -n "$(fm "$INDEX" "$k")" ] || FAIL "index frontmatter: missing '$k'"
    done

    newslug=$(basename "$1" .md); newslug=${newslug#web-ui-release-notes-}
    newver=$(echo "$newslug" | sed 's/^2025-/2025./; s/-/./g')
    if grep -qF "{{{multiexcerpt 'web-ui-updates' page='web-ui-release-notes-$newslug'}}}" "$INDEX"; then
      OK "'Recently Released Changes' transcludes web-ui-release-notes-$newslug"
    else
      FAIL "the 'Recently Released Changes' transclusion is not repointed at web-ui-release-notes-$newslug"
      grep -n "multiexcerpt 'web-ui-updates'" "$INDEX" | sed 's/^/        /'
    fi
    # Repointing means REPLACING. Adding the new line without removing the old one stacks two
    # releases under "Recently Released Changes", and a presence check alone would pass.
    txcount=$(grep -oF "multiexcerpt 'web-ui-updates'" "$INDEX" | wc -l | tr -d ' ')
    [ "$txcount" -eq 1 ] \
      || FAIL "expected exactly 1 'web-ui-updates' transclusion in the index, found $txcount — the previous one was not removed"
    # the incoming version is 'recent', so it must not also sit in the Previous table
    hits "the incoming version already has an uncommented row in Previous Release Notes — it belongs in 'Recently Released Changes' until it is superseded" "" \
      grep -nE "^\|.*web-ui-release-notes-$newslug'" "$INDEX"
    # ... but it should have the pre-staged commented row ready for next time
    # The comment must be closed: an unterminated <!-- swallows everything after it, so the
    # row renders as broken content rather than waiting to be uncommented.
    grep -qE "^<!--[[:space:]]*\|.*web-ui-release-notes-$newslug'.*-->[[:space:]]*$" "$INDEX" \
      && OK "pre-staged commented row present for $newver" \
      || FAIL "no complete pre-staged commented row for $newver — format-template.md requires one, opened with '<!--' and closed with '-->', ready to uncomment next release"
    hits "raw URL in the Previous Release Notes table — use {{page page='…'}}" "" \
      grep -nE '^\|.*https?://' "$INDEX"
    grep -qE '^##[[:space:]]+Previous Release Notes[[:space:]]*$' "$INDEX" \
      || FAIL "no '## Previous Release Notes' heading in the index"

    # The inverse half of the index update: the OUTGOING version must now sit in the table,
    # uncommented. Derived from the incoming version; skipped when there is no predecessor.
    # Walk back to the newest predecessor that actually exists. A blind N-1 would silently
    # disable this check if a release number were ever skipped.
    prevslug=""; pagedir=$(dirname "$1")
    if [[ $newslug =~ ^2025-([1-9][0-9]*)-0$ ]]; then
      i=$(( ${BASH_REMATCH[1]} - 1 ))
      while [ "$i" -ge 1 ]; do
        [ -f "$pagedir/web-ui-release-notes-2025-$i-0.md" ] && { prevslug="2025-$i-0"; break; }
        i=$((i - 1))
      done
    elif [[ $newslug =~ ^3-1-([1-9][0-9]*)$ ]]; then
      i=$(( ${BASH_REMATCH[1]} - 1 ))
      while [ "$i" -ge 1 ]; do
        [ -f "$pagedir/web-ui-release-notes-3-1-$i.md" ] && { prevslug="3-1-$i"; break; }
        i=$((i - 1))
      done
    fi
    if [ -n "$prevslug" ]; then
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

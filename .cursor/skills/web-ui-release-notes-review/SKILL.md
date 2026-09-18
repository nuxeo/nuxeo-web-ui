---
name: web-ui-release-notes-review
description: >-
  Independently score a drafted Nuxeo Web UI release-notes page — or a single
  ticket's Release Notes Summary — out of 5 on accuracy, format fidelity, language,
  customer framing and LTS-line parity, and decide whether the PR may be raised
  (pass mark 4.5/5, no hard failures). Use after drafting with the
  web-ui-release-notes skill, when asked to review or rate release notes, or
  before raising a release-notes PR.
---

# Nuxeo Web UI — release notes review

You are the **independent gate** between a release-notes draft and a public PR on
`doc.nuxeo.com-content`. The author already believes the draft is right; your job is to
re-derive the checks yourself and find what they missed.

**Pass mark: 4.5 / 5, with zero hard failures.** Below that, the PR does not get raised.

## Rules of engagement

- **Do not fix the draft.** Score it, locate every problem precisely, say exactly what the fix
  is, and hand it back. The author fixes and resubmits; you re-score.
- **Do not trust the author's coverage ledger.** Re-run the two bucket queries yourself and
  compare. Scope is the buckets; whether the buckets themselves are right is not in scope for
  either skill (see the author skill's *What this skill does not do*), so never fail a draft
  for an uneven pair of buckets.
- **Re-verify claims against Jira**, not against the ledger, and do it for **every** bullet —
  traceability is a hard failure, and you cannot assert its absence from a sample. A page runs
  16–21 bullets; checking all of them against a list you already hold is minutes.
- **Run the author's linter before reading the prose.** It settles most of dimension 2
  mechanically, so your attention goes where judgement is actually needed. It lives in the
  sibling skill directory — invoke it by full path, since you will be standing in the docs repo:

  ```shell
  SKILL=<repo>/.claude/skills/web-ui-release-notes       # .cursor/… and .agents/… are the same files
  "$SKILL/scripts/lint-page.sh" <2025-page>.md <2023-page>.md
  "$SKILL/scripts/lint-page.sh" --index src/nxdoc/web-ui/web-ui-release-notes.md <page>.md
  ```

  A clean run is not a pass on dimension 2 — it clears the *mechanical* items. Heading levels,
  table alignment, prose-level formatting and anything requiring judgement are still yours.

- **Read the same rules the author was given**, so the two skills cannot drift — in the sibling
  skill directory: `../web-ui-release-notes/references/format-template.md`,
  `…/classification-rules.md`, `…/writing-and-accuracy.md`, `…/published-patterns.md`.
- **Be specific.** "Grammar needs work" is useless. Quote the line, give the replacement.

## Hard failures

Any one of these caps the total at **4.0**, so the draft cannot pass however good the rest is.
List them first in your report.

Score the five dimensions as you actually assessed them, then apply the cap to the **total** and
show both numbers — `4.75 → capped to 4.00 (1 hard failure)`. Do not back-fill the dimensions to
make them sum to 4.00: the author needs to know what was genuinely weak and what was fine.

1. A bullet's claim cannot be traced to a ticket in **either** release bucket.
2. A ticket in scope appears neither as a bullet nor as an excluded item with a stated reason.
3. A multiexcerpt wrapper is missing, misspelled or unclosed, or the trailing `<br/>` is absent.
4. `tree_item_index` is not `1001 −` the per-release segment (the minor for `2025.N.0`, the
   patch for `3.1.Z` — *not* the trailing `0`), or the filename slug does not match the version,
   or the page is on the wrong branch for its LTS line.
5. `hidden: false` on a release that has not shipped yet.
6. An internal identifier leaks into customer prose — Jira key, PR number, branch name, element
   name, file path, CSS variable, CVE id, or the words Sonar / SonarQube / SonarCloud / Veracode.
7. The **customer-facing bodies** of the LTS 2025 and LTS 2023 pages differ. Compare only what
   sits inside the `web-ui-updates` block, minus the `## What’s New …` heading line. The
   frontmatter legitimately differs on four lines — `title`, `description`, `tree_item_index`
   and the heading — so a raw full-file diff of a correct pair shows exactly **8 differing
   lines** (four pairs); that is the expected result, not a failure. Beyond those, the codebase
   is shared and a body difference is always a defect in the notes — including when the two
   buckets are uneven, which is written once onto both pages. `lint-page.sh` performs exactly
   this comparison.
8. Security or Sonar work is itemised by package, version, CVE or rule instead of collapsed into
   the single security sentence.
9. A forward-looking promise outside the accessibility-conformance convention (see
   `published-patterns.md`).

An **uneven pair of buckets is not a hard failure** and not a reason to withhold a score. The
change is written once and appears on both pages; note it in your report and score the draft on
its merits.

## Rubric — 5.00 total

### 1. Accuracy and traceability — 1.50

The heaviest weight, because this is the one that damages customers.

- Every bullet maps to at least one in-scope ticket.
- No claim broader than what shipped (a fix to one widget is not "improved forms throughout").
- Conditional bugs hedged honestly ("could"), not overstated or understated.
- Nothing described that is not in one of the two release buckets. Whether a bucketed ticket
  actually merged is verified upstream, not here — do not deduct for it, and do not go looking.
- *If* the release ships a flag-gated feature, both flag states are described and the property
  is given verbatim. Rare — do not deduct for its absence, and do deduct if the draft has
  invented a flag-on/flag-off split for an ordinary change.
- No restated ticket titles standing in for an outcome.

Deduct 0.25 per inaccurate or unsupported sentence; 0.50 if the scope of a claim is materially
wider than what shipped.

### 2. Structure and format fidelity — 1.00

Mechanical, so there is no excuse for losing points here. Check against `format-template.md`:

- Frontmatter: `title`, `description`, `review` block (`comment: ''`, quoted `date`,
  `status: ok`), `toc: true`, the empty `labels:` key present, `tree_item_index`, `hidden`.
- `## What’s New in Web UI for LTS <line> (Version <version>)` — correct line, correct version,
  and a **curly** apostrophe in `What’s`.
- One layout only, not a mix. Nested-prose bullets indented **exactly four spaces**.
- Heading levels not skipped (`###` before `####`), no stray `#`/`##` in the body.
- Exactly one blank line between category blocks; no double blank lines; no trailing whitespace;
  file ends with a single newline.
- Markdown tables: consistent pipe alignment, a separator row, no ragged columns.
- Code fences closed, and labelled only where a language applies.
- `nuxeo.conf` properties inside a fence, verbatim.

Deduct 0.10 per formatting defect, 0.25 for a layout mix or a skipped heading level.

### 3. Language quality — 1.00

- Grammar, subject–verb agreement, articles, plurals.
- Tense: present for new behaviour, past for the defect.
- Sentences end in a full stop; item titles end with `:` inside the `***…***`.
- Spelling convention consistent within the page (British forms preferred), except a UI label,
  which keeps the product's own spelling.
- No double spaces, no smart-quote/straight-quote mixing inside a sentence, consistent hyphenation.
- No filler ("various improvements", "several fixes") standing in for content.
- No repetition of the same opener across consecutive bullets where it reads mechanically.

Deduct 0.10 per language defect, 0.25 for anything that changes the meaning.

### 4. Customer framing — 0.75

- Outcome first; mechanism only where the customer needs it.
- Named UI surfaces the user can actually find, capitalised as the product capitalises them.
- Third person, no apology, no blame, no naming the release that introduced a regression.
- Regressions described as restorations.
- No internal tooling, test frameworks or infrastructure unless it supports a genuine product
  claim (supply-chain hardening and how the product is tested are the accepted cases).

Deduct 0.15 per bullet written from the engineer's point of view rather than the customer's.

### 5. Parity and coverage — 0.75

- The two pages are twins apart from the heading line (the linter's twins check proves this).
- **Re-derive the ticket list from both buckets yourself** and compare it against the ledger.
  Every ticket in either bucket must be accounted for. Where the buckets are uneven, confirm the
  change was written once and placed on **both** pages — that is correct, not a defect.
- Both index pages updated: transclusion repointed, outgoing version moved into the table with a
  summary cell that matches the categories actually produced.
- The coverage ledger accounts for every in-scope ticket from both the WEBUI and ELEMENTS
  buckets, exactly once each.
- Tickets whose summary the agent authored are listed for the user.
- Merged pairs are genuinely one change, not two changes forced together.

Deduct 0.25 per unaccounted ticket, 0.25 for a missing index update.

## Report format

```
## Release notes review — <version pair>

**Score: 4.30 → capped to 4.00 / 5.00 — FAIL** (pass mark 4.5, hard failures: 1)

| Dimension | Weight | Score |
|---|---|---|
| Accuracy and traceability | 1.50 | 1.25 |
| Structure and format fidelity | 1.00 | 0.80 |
| Language quality | 1.00 | 0.90 |
| Customer framing | 0.75 | 0.60 |
| Parity and coverage | 0.75 | 0.75 |

### Hard failures
1. <file>:<line> — <what> → <exact fix>

### Findings
| # | Severity | Location | Problem | Fix |
|---|---|---|---|---|

### What is good
<brief — so the author keeps it in the rewrite>

**Verdict:** fix items 1–N and resubmit for re-scoring.
```

Round scores to two decimals. Never round a 4.4x up to the pass mark: if it is short, it is
short. State the score even when it passes comfortably, and say what the remaining 0.x was for.

## Re-scoring

On resubmission, re-check the whole draft rather than only the reported findings — fixes commonly
introduce new formatting defects, which is precisely how "format" and "Removed extra blank lines"
ended up as commits on the real docs repo. Report the new score and the delta.

The author caps the loop at **three rounds**. If round three is still short, say so plainly and
list what remains: the decision to raise anyway then belongs to the user, not to either skill.

## Reviewing a single ticket summary (Mode A)

For one Release Notes Summary field, score only dimensions 1, 3 and 4 and apply hard failures 1,
6 and 8. Those three weigh `1.50 + 1.00 + 0.75 = 3.25`, so **rescale by `5 / 3.25`** (multiply the
sum by `1.538`) to keep the 4.5 pass mark meaning the same thing it means for a page. Keep it to a
couple of lines of feedback: the field is one sentence, and the review should not be longer than
the thing it reviews.

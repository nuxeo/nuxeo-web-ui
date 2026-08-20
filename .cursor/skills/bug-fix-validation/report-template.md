# Validation report template (Phase 16)

Write the filled report to `Evidence/Reports/validation-report.md`, print the Executive Summary and Final
Recommendation in chat, and post the whole thing as a Jira comment (`contentFormat:"markdown"`).

Rules for filling it in:
- Every `Pass` needs an evidence reference. No evidence → the status is `Blocked`, not `Pass`.
- Tag claims as **Verified** (observed), **Inferred** (from code/diff), or **Assumed** (unchecked).
- The acceptance criteria are the ones **you derived** in Phase 3, not the ticket's. Report the delta.
- The four mandatory areas always appear, even when the answer is "not applicable because …".
- Keep unknowns as unknowns. Never invent a PR link, a test result, or an attachment.
- Drop a section only if it genuinely does not apply, and say why in one line.

---

```markdown
# Validation report — <TICKET-ID>: <summary>

## Executive summary

| | |
|---|---|
| **Ticket** | [<TICKET-ID>](https://hyland.atlassian.net/browse/<TICKET-ID>) — <summary> |
| **Severity / Priority** | <severity> / <priority> |
| **Build validated** | <commit sha(s)>, built <date> |
| **Branches tested** | target `<base>` @ `<sha>` · fixed `<branch>` @ `<sha>` |
| **Pull requests** | <PR links, one per base> |
| **Environment** | Nuxeo <image tag>, Docker, ports <target>/<fixed>, `NUXEO_PACKAGES=<…>` |
| **Browsers** | Chrome <version>, Firefox <version>, Safari <version> |
| **Locales exercised** | en, <long-word locale>, <CJK locale>, ar (RTL) |
| **Tester** | Test Engineer 3 (automated validation run) |
| **Validation status** | <Pass / Pass with observations / Fail / Blocked> |

<Two or three sentences: what was validated, what the outcome was, what a reader must act on.>

## Bug understanding

- **Root cause** — <the actual cause: file / function / code path and why> *(Verified | Inferred)*
- **Expected behavior** — <what the UI should do>
- **Actual behavior (before the fix)** — <what the target branch does, with evidence reference>
- **Reproduction preconditions** — <environment changes, seed data, roles; or "none required">

## Acceptance criteria (derived)

Criteria written for this validation from the defect, the diff, product norms and the four mandatory
areas — not copied from the ticket.

| ID | Criterion (Given / When / Then) | Source | Status | Evidence |
|---|---|---|---|---|
| AC-01 | Given …, when …, the UI shows … | defect | Pass / Fail / Blocked | `Evidence/After/…png` |

**Gaps vs the ticket** — <criteria the ticket omitted (typically RTL, long translations, keyboard
access) or stated differently, and why yours is the right bar. If the ticket had none, say so.>

## Fix analysis (UI)

- **Files modified** — <path — what changed>
- **Elements / layouts affected** — <components and screens>
- **Styling & theming** — <CSS, theme variables, direction-sensitive rules, or "none">
- **i18n keys** — <added / renamed / removed, and whether all 16 locales carry them>
- **Accessibility-relevant markup** — <roles, aria-*, tabindex, focus handling, or "none">
- **Backport coverage** — <PR per base; flag any base missing a PR>

## Validation summary

| Activity | Result | Notes |
|---|---|---|
| Bug reproduced on the target branch | <Yes / No / Blocked> | <evidence ref> |
| Fix verified on the fixed branch | <Yes / No> | <evidence ref> |
| Derived acceptance criteria met | <n/n> | <list any unmet> |
| Translations | <Pass / Fail / N-A + reason> | <locales checked> |
| RTL support | <Pass / Fail / N-A + reason> | <ar/he screens checked> |
| Different browsers | <Pass / Fail / Partial> | <browsers checked> |
| Accessibility | <Pass / Fail / Partial> | <keyboard, focus, names, contrast> |
| Regression suite completed | <Yes / Partial> | <scope> |
| Blast radius validated | <Yes / Partial> | <screens covered> |
| Residual risk | <Low / Medium / High> | <why> |

## Test execution summary

| Test ID | Covers | Scenario | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| TC-01 | AC-01 | <scenario> | <expected> | <actual> | Pass / Fail / Blocked | `Evidence/After/01-….png` |

Totals: <n> executed · <n> passed · <n> failed · <n> blocked · <n> skipped.

## Mandatory areas

### Translations
| Locale | Screens checked | Raw keys leaked | Truncation / overflow | Status | Evidence |
|---|---|---|---|---|---|
| en / de / ja / ar | <screens> | <none / list> | <none / where> | Pass / Fail | <ref> |

Missing keys per locale file: <none, or `messages-xx.json: key.a, key.b`>.

### RTL support
| Screen | `dir` resolved | Mirroring | Directional icons | Overflow / clipping | Status | Evidence |
|---|---|---|---|---|---|---|
| <screen> | rtl | correct / issues | correct / wrong | none / where | Pass / Fail | <ref> |

### Different browsers
| Browser | Version | Scenario run | Result | Evidence |
|---|---|---|---|---|
| Chrome | <v> | <core + areas> | Pass / Fail | <ref> |
| Firefox | <v> | <core> | Pass / Fail | <ref> |
| Safari | <v> | <core, manual> | Pass / Fail / Not run (<reason>) | <ref> |

### Accessibility
| Check | Result | Detail | Evidence |
|---|---|---|---|
| Keyboard reachability & order | Pass / Fail | <tab path> | <ref> |
| Visible focus indicator | Pass / Fail | <where> | <ref> |
| Accessible names & roles | Pass / Fail | <controls checked> | <ref> |
| Colour contrast (WCAG AA) | Pass / Fail | <measured ratio> | <ref> |
| Probe findings (`a11yProbe`) | <counts> | <images w/o alt, unnamed controls, unlabelled inputs> | <ref> |
| 200% zoom / text spacing | Pass / Fail | <observation> | <ref> |

## Regression coverage

| # | Area | Check performed | Status | Evidence |
|---|---|---|---|---|
| R-01 | <area> | <what was exercised> | Pass / Fail / Blocked / Skipped (<reason>) | <ref> |

**Residual risks** — <areas not exercised and why that is acceptable, or what QA should still cover.>

## Blast radius report

| Screen / element | Why affected | Likelihood | Impact | Risk | Validation done | Confidence |
|---|---|---|---|---|---|---|
| <screen> | shared behavior / i18n key / style variable | H/M/L | H/M/L | H/M/L | TC-xx | High/Med/Low |

- **Shared components / styles touched** — <list, or "none beyond the changed element">
- **Explicitly unaffected (checked)** — <what was verified as untouched, and how>

## Evidence index

| Artifact | Path |
|---|---|
| Before screenshots | `~/Desktop/validation/<TICKET-ID>/Evidence/Before/` |
| After screenshots | `.../Evidence/After/` |
| Locale / RTL / browser shots | `.../Evidence/After/` (labelled by locale and browser) |
| Videos | `.../Evidence/Videos/<TICKET-ID>-before.mp4`, `-after.mp4` |
| Console logs | `.../Evidence/Console/` |
| Diff images | `.../Evidence/Reports/*-diff.png` |
| Acceptance criteria | `.../Evidence/Reports/acceptance-criteria.md` |
| Test cases | `.../Evidence/Reports/test-cases.md` |
| Execution log | `~/Desktop/validation/<TICKET-ID>/run.log` |

Attached to the ticket: <list only files whose upload returned OK, or "none yet">.

## Defects found

| ID | Title | Severity | Impact | Reproduction | Recommended action |
|---|---|---|---|---|---|
| D-01 | <title> | Blocker/Critical/Major/Minor | <who is affected, how often> | 1. … 2. … | <fix in this PR / new ticket / accept> |

State clearly whether each defect is **caused by the fix** (regression) or **pre-existing**.
If none: "No new defects found during validation."

## Root cause validation

- **Verdict** — <root cause fixed / symptom masked / partially fixed>
- **Justification** — <the code path traced, and why the guard sits in the right place>
- **Other screens reaching the same state** — <searched; found none / found these>

## Code quality review

| Area | Observation | Severity | Recommendation |
|---|---|---|---|
| <readability / architecture / naming / rendering performance / error handling / compatibility> | <what you saw> | Blocking / Non-blocking | <concrete change> |

## Observations

<Anything worth the team's attention that is not a defect: risky patterns, missing translations in
unrelated keys noticed along the way, screens that would benefit from coverage. One line each.>

## Final recommendation

**<one of:>**
- ✅ Ready for QA Sign-off
- ✅ Ready for Release
- ⚠ Requires Additional Testing
- ❌ Fix Incomplete
- ❌ Regression Detected
- ❌ Blocked (reason: <…>)

<One paragraph justifying the verdict, plus the concrete next action and its owner.>
```

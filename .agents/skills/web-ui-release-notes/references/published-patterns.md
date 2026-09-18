# What the published pages actually look like

Derived by reading every LTS 2025 Web UI release-notes page from 2025.2.0 to 2025.19.0. Use this
to calibrate: the conventions **changed several times**, so "match the published style" is
ambiguous unless you know which era you are copying. Copy the most recent era, and recognise the
older ones as legacy when you read them.

## Measured shape

| Page | Top-level bullets | Words | Categories |
|---|---|---|---|
| 2025.2.0 | 4 | 59 | 1 |
| 2025.4.0 | 14 | 419 | 1 |
| 2025.5.0 | 11 | 253 | 1 |
| 2025.6.0 | 7 | 168 | 4 |
| 2025.7.0 | 36 | 599 | 10 |
| 2025.8.0 | 7 | 253 | 3 |
| 2025.9.0 | 6 | 159 | 3 |
| 2025.10.0 | 8 | 218 | 2 |
| 2025.11.0 | 11 | 379 | 3 |
| 2025.12.0 | 7 | 282 | 3 |
| 2025.13.0 | 11 | 318 | 4 |
| 2025.14.0 | 8 | 404 | 3 |
| 2025.15.0 | 11 | 370 | 4 |
| 2025.16.0 | 19 | 385 | 4 |
| 2025.17.0 | 21 | 524 | 4 |
| 2025.18.0 | 16 | 510 | 5 |
| 2025.19.0 | 44 | 851 | 9 |

Median: **11 bullets, 370 words, 3 categories**. The trend is clearly upward — recent releases
run 16–21 bullets in 4–5 categories, around 400–550 words. If your draft for a normal release is
under ~8 bullets, you have probably lost tickets in Step 2; if it is over ~25, you have probably
failed to merge duplicate pairs.

## The four layout eras

### Era 1 — plain bullets (2025.2.0 – 2025.8.0)

Flat `- ` bullets, sometimes with a `**Bold category**` line, no per-item titles. Several of these
pages end with a trailing `### Other Noteworthy Changes` H3 holding leftovers — workarounds,
missing layouts, server-side configuration notes.

### Era 2 — titled items, prose on the next line (2025.9.0 – 2025.14.0)

Six consecutive releases, the longest-running style:

```markdown
**Security Improvements**

- ***Prototype Pollution Fix:***
Addressed risks in deep-merge logic by blocking unsafe keys …
```

The prose sits on the line *after* the bullet with **no indentation**, so it renders as part of
the list item. It works, but it is fragile and easy to get wrong. **Legacy — do not write new
pages this way.**

### Era 3 — titled items, prose as an indented sub-bullet (2025.15.0 – 2025.18.0)

```markdown
**User Experience Improvements**

- ***Improved Document Import:***
    - Users can now import documents without …
```

Four-space indent, prose as a nested bullet. This is **Layout A** in `format-template.md` and the
default choice for a normal release.

### Era 4 — sectioned with `###`/`####` (2025.19.0)

The largest page to date (44 bullets, 9 sections) uses real heading levels, an introductory
sentence under the H2, `###` per theme and `####` per sub-theme, with flat bullets underneath.
This is **Layout B** — use it when the release is big enough that bold category lines stop
navigating usefully, roughly 20+ bullets. It also gets `toc: true` working for you.

**Choosing:** Layout A for a normal release, Layout B for a large or thematic one. Never mix them
on one page.

## Category vocabulary that has actually been used

There is no fixed taxonomy. Both of these families are legitimate:

*Change-type grouping (older):* `Enhancements`, `Bug Fixes`, `Bug Fixes & Upgrades`,
`Other features/Improvements`, `Other Noteworthy Changes`, `Security Improvements`,
`Security & Quality Improvements`, `Performance, Security, and Reliability`,
`Engineering & Reliability Improvements`, `Accessibility Enhancements`

*Product-area grouping (2025.18.0 onward, preferred):* `User Experience Improvements`,
`Search and Export Improvements`, `Workflow Improvements`,
`Workflow & Document Management`, `Document Management Improvements`,
`Administration & Directory Management`, `Accessibility Improvements`,
`Storage and Integration Improvements`, `Platform & Build Improvements`

**Prefer product-area grouping**, which tells a customer where in the product to look, over
change-type grouping, which tells them how the team files work. Reuse an existing name wherever
one fits rather than coining a new one; each new name makes the series less consistent.

Ordering is stable across all eras: **most user-visible first, accessibility next, platform /
security / build last.**

## Security wording — the convention changed, follow the new one

Older pages itemised security work in detail. 2025.10.0 named packages, versions and vulnerability
classes:

> ***jsondiffpatch Vulnerability:*** Resolved XSS vulnerability in jsondiffpatch (via
> HtmlFormatter) by upgrading from version 0.3.11 to version 0.7.3 …

2025.7.0 went further and named an internal scanner ("Optimised Veracode scans for the Nuxeo
WebUI project").

**Do not copy that.** The current convention, and the one this skill requires, is a single
sentence, as in 2025.19.0:

> Security updates have been implemented to address identified vulnerabilities and strengthen
> platform protection.

Rationale in `classification-rules.md`: an itemised list is a shopping list for anyone attacking
an un-upgraded instance, and it dates badly. Sonar and other code-quality remediation folds into
the same sentence and is never named.

## The accessibility exception

2025.7.0 is the one page that legitimately looks forward, because it is written as an
accessibility conformance report rather than a change list. It carries, in order:
grouped improvements → **Known Accessibility Issues** → **Coming up next** → **Evaluation
Methods Used** (WCAG 2.2 A/AA, macOS + VoiceOver + Chrome, Windows + NVDA + Chrome).

That is a deliberate convention for accessibility reporting: conformance statements are expected
to disclose known gaps and planned remediation. It is **the only sanctioned place for
forward-looking content.** Everywhere else, the no-promises rule in `writing-and-accuracy.md`
holds. Do not introduce a "Coming up next" into an ordinary release page.

## Small recurring details

- Every page ends with `<br/>` before the closing multiexcerpt comment.
- Some pages separate every bullet with a blank line, others are compact. Be consistent within a
  page; compact matches the recent pages.
- Bold is used inside prose to name UI surfaces (**"Skip to Main Content"**, **Datepicker
  Widget**) — useful, and worth keeping, but do not bold whole sentences.
- `nuxeo.conf` properties appear in a fenced block, verbatim, with the enable/disable behaviour
  spelled out either side (see the 2025.19.0 branding flag).
- Server-side prerequisites are stated plainly when a Web UI feature depends on one.

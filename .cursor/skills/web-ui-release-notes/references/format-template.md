# Page format — exact skeleton

Everything here is taken from the published pages in `nuxeo/doc.nuxeo.com-content`. The docs
site is Handlebars-templated, so the wrapper directives are load-bearing: drop one and the
index page stops transcluding the release.

## Where the files live

| | LTS 2025 | LTS 2023 |
|---|---|---|
| Repo | `nuxeo/doc.nuxeo.com-content` | `nuxeo/doc.nuxeo.com-content` |
| Branch | `2025` | `2023` |
| Version form | `2025.N.0` | `3.1.Z` (`Z = N + 15`) |
| Page | `src/nxdoc/web-ui/web-ui-release-notes/web-ui-release-notes-2025-19-0.md` | `…/web-ui-release-notes-3-1-34.md` |
| Index | `src/nxdoc/web-ui/web-ui-release-notes.md` | same path on its own branch |
| Live URL | `https://doc.nuxeo.com/nxdoc/web-ui-release-notes-2025-19-0/` | `…/web-ui-release-notes-3-1-34/` |

**Filename slug** = the version with every `.` replaced by `-`: `2025.19.0` → `2025-19-0`,
`3.1.34` → `3-1-34`. No `v` prefix, no zero padding.

## Frontmatter

```yaml
---
title: Version 2025.19.0
description: Discover what's new in Web UI 2025.19.0.
review:
  comment: ''
  date: '2026-08-28'
  status: ok
toc: true
labels:
tree_item_index: 982
hidden: true
---
```

- `title` — `Version <version>`, nothing else.
- `description` — `Discover what's new in Web UI <version>.` with a straight apostrophe.
- `review.date` — the date the page is written, `YYYY-MM-DD`, quoted. `status: ok`,
  `comment: ''`.
- `labels` — present but empty. Keep the key.
- `tree_item_index` — **`1001 −` the segment that increments every release**: the **minor** for
  the 2025 line (`N` in `2025.N.0`) and the **patch** for the 3.1 line (`Z` in `3.1.Z`). Not
  simply "the last segment" — the last segment of `2025.N.0` is always `0`. Lower means newer, so
  the navigation sorts newest-first:

  | Version | Index | | Version | Index |
  |---|---|---|---|---|
  | `2025.2.0` | 999 | | `3.1.32` | 969 |
  | `2025.17.0` | 984 | | `3.1.33` | 968 |
  | `2025.18.0` | 983 | | `3.1.34` | 967 |
  | `2025.19.0` | 982 | | | |

  The two lines live on separate branches, so their index ranges overlapping is fine.

- `hidden` — **`true` while the release is in flight, `false` once it has shipped.** Verified
  across both lines: every released version is `false`; only the current in-flight one is
  `true`.

  **The flip is done by the *next* release's PR, not by a separate post-release commit.** Each
  release PR adds its own page as `hidden: true` and, in the same commit, sets the outgoing
  version's page to `hidden: false` — which is what makes the new **Previous Release Notes** row
  point at a visible page. Confirmed in `ab2cba8e` (2025.19.0's PR flipping 2025.18.0) and the
  two PRs before it. Use `lint-page.sh --released <outgoing-page>` to check that half.

The index page (`web-ui-release-notes.md`) uses the same frontmatter shape with
`tree_item_index: 500` and **no** `hidden` key. Do not add one.

## Body skeleton

```markdown
{{{multiexcerpt 'matching-notes' page='web-ui-release-notes'}}}

{{! multiexcerpt name='web-ui-updates'}}

## What’s New in Web UI for LTS 2025 (Version 2025.19.0)

<body — see the two layouts below>

<br/>

{{! /multiexcerpt}}
```

- The first directive pulls in the shared "refer to the upgrade notes" callout from the index.
- `{{! multiexcerpt name='web-ui-updates'}}` … `{{! /multiexcerpt}}` is the block the index
  transcludes as "Recently Released Changes". Everything customer-facing must sit inside it.
- The `##` heading uses a **curly apostrophe** in `What’s`, and names the LTS line:
  `for LTS 2025 (Version 2025.19.0)` / `for LTS 2023 (Version 3.1.34)`.
- Close with a blank line, `<br/>`, blank line, then the closing directive.

## Layout A — compact (small and medium releases)

Bold category label, then one bullet per change whose title is wrapped in `***…***` and whose
prose sits in a nested bullet indented **four spaces**. This is the majority of published pages
(2025.18.0 and earlier).

```markdown
**User Experience Improvements**
- ***Improved comment author display:***
    - Comments now display the author's full name instead of their username, providing a more
      user-friendly experience and aligning with the behaviour found in the legacy JSF UI.
- ***Improved avatar rendering:***
    - User avatars now display only the first and last name initials, preventing initials from
      overflowing the avatar circle for users with multi-part names.

**Accessibility Improvements**
- Improved keyboard accessibility in modal dialogs by keeping focus within the active window.
- Date picker dropdowns can now be dismissed using the Esc key.
```

Note the mixed usage: a category may use titled items *or* plain bullets. Plain bullets suit
short, self-explanatory accessibility and quality items (as in 2025.17.0); titled items suit
anything a customer might need to recognise by name.

### Legacy variant — recognise it, do not write it

2025.9.0 through 2025.14.0 put the prose on the line *after* the bullet with **no indentation**
instead of in a nested bullet:

```markdown
- ***Prototype Pollution Fix:***
Addressed risks in deep-merge logic by blocking unsafe keys …
```

Six consecutive releases shipped this way, so you will meet it whenever you read a page from that
era. It renders acceptably but is fragile — one stray blank line breaks the list item. **Use the
four-space nested form above for anything new.** If you are editing an existing legacy page, keep
its own style rather than half-converting it.

## Layout B — sectioned (large releases)

Used from 2025.19.0 / 3.1.34 onward, when the release is too big for a flat list. An intro
sentence, `###` categories, `####` sub-groups, flat bullets.

```markdown
## What’s New in Web UI for LTS 2025 (Version 2025.19.0)

This release introduces an optional Hyland-branded experience for Web UI along with a wide
range of navigation, browsing, search, workflow, accessibility, and reliability improvements.

### User Experience Improvements

#### Improved Navigation Experience

- Web UI now preserves the user's scroll position when navigating back from a document to a
  folder or search results.
- Navigation across multiple repositories is more seamless, helping users move between
  repositories without losing context.

### Accessibility Improvements

This release includes several enhancements designed to improve usability for keyboard and
assistive technology users.

#### Improved Navigation and Screen Reader Support

- More consistent and descriptive page titles.
```

Pick Layout B when the release has roughly 20+ bullets or spans more than about five
categories; otherwise Layout A. Never mix the two on one page.

### Documenting a flag-gated feature — rare

This is **not** a routine pattern. It applies to a deliberate, flag-gated feature rollout where
the customer has a real decision to make. The only published precedent is the Hyland branding
work in 2025.19.0, and those bullets were written specifically for that release. Most releases
contain no flag-gated change at all.

So: **do not manufacture a flag-on/flag-off split for an ordinary change.** Use this shape only
when the release genuinely ships a feature behind a property and the customer must choose. When
it does apply, state both states explicitly and give the property verbatim — this is the one
place a `nuxeo.conf` property belongs in customer-facing notes:

````markdown
**When the flag is off**

The default experience remains classic Nuxeo. …

**When the flag is on**

Customers receive the full Hyland-branded experience …

To enable the Hyland-branded experience, add the following property to `nuxeo.conf`:

```
org.nuxeo.web.ui.branding.rebrand=true
```
````

## Index page update

On each branch, `src/nxdoc/web-ui/web-ui-release-notes.md` has three parts to touch:

1. **Recently Released Changes** — repoint the transclusion at the new version:

   ```markdown
   ## Recently Released Changes

   {{{multiexcerpt 'web-ui-updates' page='web-ui-release-notes-2025-19-0'}}}
   ```

2. **A pre-staged commented row** for the version that is currently "recent", sitting just
   above the table, ready to be uncommented when it is superseded:

   ```markdown
   <!-- | [Web UI 2025.19.0]({{page page='web-ui-release-notes-2025-19-0'}}) |Optional Hyland-branded experience for Web UI along with a wide range of navigation, browsing, search, workflow, accessibility, and reliability improvements| -->
   ```

3. **Previous Release Notes** — newest first, one row per release:

   ```markdown
   | [Web UI 2025.18.0]({{page page='web-ui-release-notes-2025-18-0'}}) |User Experience Improvements, Accessibility Improvements, Workflow & Document Management and Platform & Build Improvements.|
   ```

   The summary cell is a short phrase — either the category list for that release or its
   headline theme. Use `{{page page='…'}}` links, never raw URLs.

So a release does two things to the index: the outgoing version's commented row is
uncommented into the table, and a new commented row plus a new transclusion target are put in
place for the incoming one.

## Checks before opening the PR

Run the linter first — it covers every mechanical item in this list:

```shell
SKILL=<repo>/.claude/skills/web-ui-release-notes
"$SKILL/scripts/lint-page.sh" <2025-page>.md <2023-page>.md
"$SKILL/scripts/lint-page.sh" --index src/nxdoc/web-ui/web-ui-release-notes.md <page>.md
```

- Filename slug matches the version, on the right branch for that LTS line.
- `tree_item_index` = `1001 −` the per-release segment (minor for 2025.N.0, patch for 3.1.Z),
  and unique on that branch.
- `hidden: true` for an unshipped release.
- Both multiexcerpt directives present and correctly closed; `<br/>` before the close.
- Heading names the right LTS line and version, with the curly apostrophe.
- The two lines' pages describe the same set of changes.
- Index page updated on both branches.
- One layout only, indentation exactly four spaces, no double blank lines, no trailing
  whitespace, file ends with a single newline.
- Scored at **4.5/5 or better** by the `web-ui-release-notes-review` skill, with no hard
  failures. This is a gate, not advice.
- Only release-notes paths touched — see `doc-repo.md` for the branch, PR-naming and scope rules
  of the shared public docs repo.

# Acceptance criteria, test design & regression (Phases 3, 8–11)

Reference for the `bug-fix-validation` skill. Everything here is **UI validation** — no automated test
assets, no API/database/backend test design. Generate only the cases the change can plausibly break: a
200-row table of irrelevant scenarios is worse than 25 targeted ones.

## Deriving acceptance criteria (Phase 3)

The criteria are **yours to write**, not the ticket's to dictate. Ticket criteria are typically vague,
incomplete, or silent about locales, direction, browsers and keyboard use. Derive from four sources:

| Source | Question it answers | Example criterion |
|---|---|---|
| **The defect** | Is the exact reported behaviour gone, under the exact trigger conditions? | `AC-01 Given a document with no thumbnail, when the grid renders, a placeholder tile is shown instead of a broken image icon.` |
| **The diff** | Is every branch the change introduced exercised — both sides of each new guard, each new state, each style variant? | `AC-02 When the title is empty, the tooltip is not rendered at all (no empty tooltip box).` |
| **Product norms** | Does it behave like the sibling components that already do this correctly? | `AC-03 The new button shows the same hover, focus and disabled styling as the adjacent action buttons.` |
| **Mandatory areas** | Translations, RTL, browsers, accessibility — always. | `AC-04 In Arabic the action row is right-aligned and the chevron points left.` |

Rules for writing them:

- **Observable in the UI.** "The state is cleaned up" is not a criterion; "the dialog closes and the
  selection count returns to 0" is.
- **Binary.** Each one can only pass or fail, with a screenshot as proof.
- **One behaviour per criterion.** Split compound statements so a partial failure is visible.
- **Include the negative.** For every "shows X when Y", add "does not show X when not Y".
- **Cover the mandatory areas explicitly**, even when the ticket is silent about them.

Write `Evidence/Reports/acceptance-criteria.md` as:

```markdown
| ID | Criterion (Given / When / Then) | Source | Rationale |
|---|---|---|---|
| AC-01 | Given …, when …, the UI shows … | defect | The reported symptom. |
| AC-04 | Given locale `ar`, when … , the layout mirrors … | mandatory-area | RTL is always validated. |
```

**Report the delta.** Where your criteria extend or contradict the ticket's, list it under
*Acceptance criteria — gaps vs the ticket* in the report. A criterion the ticket forgot (usually RTL,
a long-translation overflow, or keyboard access) is a finding in its own right.

## Test case format (Phase 8)

Write `Evidence/Reports/test-cases.md` before executing, so IDs stay stable across iterations.

```markdown
| ID | Type | Covers | Scenario | Preconditions | Steps | Expected result |
|---|---|---|---|---|---|---|
| TC-01 | Functional/positive | AC-01 | … | … | 1. … 2. … | … |
```

Types: `Functional/positive`, `Functional/negative`, `Boundary`, `Workflow`, `Permission-UI`, `Layout`,
`Theme`, `i18n`, `RTL`, `Browser`, `A11y`, `Corner`, `Regression`.

## UI functional catalog

Pick what applies to the change; skip the rest and say so.

| Class | What to cover in Web UI |
|---|---|
| **Positive** | The happy path for each acceptance criterion, on the fixed branch. |
| **Negative** | Invalid input and its inline error, cancelled dialogs, an action on a document that no longer exists, an unsupported document type, a failed request rendered as a UI error state. |
| **Boundary** | Empty list, exactly 1 item, a full page of results and one more (`nuxeo-page-provider` default 40), maximum field length, minimum viewport width. |
| **Workflow paths** | Every route into and out of the affected screen: deep link, breadcrumb, back button, drawer, search result, in-app link. |
| **Permission-driven UI** | Administrator vs member vs reader: which actions are hidden, disabled, or read-only. Locked and archived documents. (UI state only — not the permission model.) |
| **Layout** | 1280×800 and a narrow viewport, drawer open and closed, long titles, dense lists, zoom at 200%. |
| **Theme** | Default (light), dark, hyland-light and hyland-dark themes — new colours must come from theme variables, not hardcoded values. |

## Corner cases

Generate automatically, then keep the ones the diff can reach:

- **Values** — empty string, whitespace-only, null/undefined property, `0`, boolean false.
- **Content** — Unicode and emoji titles, RTL text inside an LTR layout, very long names (>255 chars),
  names containing `/`, `#`, `?`, quotes, and HTML (must render as text, never as markup).
- **Scale** — empty state, 1 item, a page boundary, several hundred items, deeply nested folders.
- **Interaction** — double-click a submit control, rapid pagination clicks, click during a loading
  state, navigate away mid-render, resize while a dialog is open.
- **State** — stale view after another tab changed the document, trashed or moved document opened from
  an old link, selection kept across pagination, session expiry surfacing as a redirect to login.

## Mandatory areas (Phase 9)

Validated on every run. Each produces its own screenshots and an explicit Pass/Fail/N-A with a reason.

### Translations

The UI language is read once at bootstrap: `i18n/i18n.js` sets `window.nuxeo.I18n.language` from
`navigator.language`, and `nuxeo-i18n-behavior` loads the matching bundle. The harness forces it with
`session({ locale: 'de' })`.

- Run the affected screens in **English**, a **long-word locale** (`de` or `fr`), and a **CJK locale**
  (`ja` or `zh-CN`). Add `ar`/`he` — they double as the RTL pass.
- Every new or changed key exists in **all 16 locale files**:
  ```bash
  rg -n "i18n\('<key>'\)|\[\[i18n\('<key>'\)\]\]" elements/ addons/   # who uses it
  for f in i18n/messages*.json; do rg -q "\"<key>\"" "$f" || echo "MISSING in $f"; done
  ```
- No raw key leaks into the UI: `await s.rawI18nKeys()` must return `[]` on every screen visited.
- Longer translations must not truncate, clip, wrap mid-word, or push controls out of their container —
  German and French are the usual offenders. Compare the same screenshot across locales.
- Parameterised messages keep their placeholders filled (no literal `{0}`), and counts/dates render in
  the locale's format.

### RTL support

`index.js` maps `ar`, `he`, `fa`, `ur` to `document.documentElement.dir = 'rtl'` at bootstrap, so the
whole app mirrors through CSS logical direction. Run with `session({ locale: 'ar' })` and confirm
`await s.direction()` reports `dir: 'rtl'` before judging anything.

Check on the affected screens:

- Text alignment, and block order (labels, values, action rows) mirrored.
- Padding/margins mirrored — hardcoded `left`/`right`, `margin-left`, `padding-right`, `float`,
  `text-align: left` and absolute offsets in the diff are the highest-risk input. Prefer flagging them
  from the diff *before* testing.
- Directional icons: chevrons, back/forward arrows, expand/collapse, breadcrumb separators, and drawer
  toggle point the correct way.
- Drawer, dialogs, tooltips and menus open on the mirrored side and stay within the viewport.
- No horizontal scrollbar, no clipped or overlapping text.
- Mixed content: an LTR document title inside an RTL layout still reads correctly.

### Different browsers

Chrome is the baseline; the core scenario plus each mandatory area gets at least one other engine.

| Browser | How | Notes |
|---|---|---|
| Chrome | `session({ browser: 'chrome' })` | Baseline. Video and HAR available. |
| Firefox | `validation-init.sh <TICKET-ID> --with-firefox` once, then `session({ browser: 'firefox', video: false })` | Screenshots and console only — no CDP, so no video/HAR. |
| Safari | Manual on macOS: open `$NX_VAL_FIXED_URL/ui/`, run the scenario, save shots into `Evidence/After/` | Puppeteer cannot drive it. WebKit-specific CSS and focus behaviour differ most here. |
| Edge | Chromium engine — parity with Chrome. Only test explicitly when the diff uses a browser-specific API. | State the assumption in the report. |

Watch for: CSS the diff relies on (`:focus-visible`, `gap`, `inset`, container queries, `-webkit-`
prefixes), font metrics changing line wrapping, date/number formatting, file input and drag-and-drop
behaviour, and scrollbar sizing shifting the layout.

### Accessibility

Mechanical checks come from `await s.a11yProbe()` (images without `alt`, controls with no accessible
name, inputs with no label, positive `tabindex`, missing `lang`/`dir`). The rest is hands-on:

- **Keyboard** — every new or changed control is reachable by Tab in a sensible order, operable with
  Enter/Space, and dismissible with Escape where a dialog or menu is involved. No keyboard trap.
- **Focus** — a visible focus indicator on each control; focus moves into a dialog when it opens and
  returns to the trigger when it closes.
- **Names and roles** — buttons, links and icons expose a meaningful accessible name (not "button" or
  an icon token); `user-playwright`'s `browser_snapshot` shows the accessibility tree, which is the
  fastest way to read them.
- **Contrast** — new or restyled text, icons and focus rings meet WCAG AA (4.5:1 for body text, 3:1 for
  large text and UI boundaries). Note the measured pair when reporting a failure.
- **Structure** — headings and landmarks unchanged or improved; error messages associated with their
  field so they are announced.
- **Text spacing / zoom** — the layout survives 200% zoom and increased text spacing without clipping.

## Blast radius heuristics (Phase 10)

Run these against the changed files/symbols before claiming anything is isolated.

```bash
# 1. Who imports the changed element / behavior / style module?
rg -l "nuxeo-<changed-element>" elements/ addons/ themes/

# 2. Who calls the changed method or binds the changed property?
rg -n "\b<changedMethod>\b|<changed-property>" elements/ addons/

# 3. Which screens use a changed i18n key — and is it translated everywhere?
rg -n "i18n\('<key>'\)" elements/ addons/
rg -l '"<key>"' i18n/                       # must be all 16 locale files

# 4. Is the change in shared code (nuxeo-elements) consumed by every layout?
rg -n "<symbol>" node_modules/@nuxeo/nuxeo-ui-elements node_modules/@nuxeo/nuxeo-elements

# 5. Which document types / layouts render the changed widget?
rg -l "<widget-tag>" elements/document/ elements/search/ elements/bulk/

# 6. Which theme variables did the change touch?
rg -n "--nuxeo-<var>" elements/ themes/
```

A change inside `node_modules/@nuxeo/*` (the sibling `nuxeo-elements` repo) is **maximum blast radius** —
every layout using the widget is in scope, and the fix needs its own `ELEMENTS-<id>` PR.

## Risk matrix

| Screen / element | Why it is affected | Likelihood | Impact | Risk | Validation done |
|---|---|---|---|---|---|
| `<screen>` | shares the changed behavior | High/Med/Low | High/Med/Low | H/M/L | TC-xx, TC-yy |

Depth rule: **High** → full scenario set with evidence; **Medium** → smoke path executed; **Low** →
visually confirmed or explicitly deferred with a reason.

## Regression checklist (Phase 11)

Execute the rows the risk matrix flags, plus the always-on core. Every row gets a status
(`Pass`/`Fail`/`Blocked`/`Skipped` + reason) in the report. All checks are performed through the UI.

| # | Area | Concrete UI check |
|---|---|---|
| R-01 | Login | Log in, log out, log back in after the session expires |
| R-02 | Navigation | Drawer, breadcrumb, browser back/forward, deep link to a document |
| R-03 | Document tree | Expand, collapse, select, lazy-loaded children |
| R-04 | Create | Create File / Folder / Note; required-field validation and inline errors |
| R-05 | Edit | Edit metadata, save, cancel, unsaved-changes guard |
| R-06 | Delete | Trash, untrash, permanent delete, confirmation dialogs |
| R-07 | Search | Quick search, saved search, facets and aggregates, pagination, empty state |
| R-08 | Upload | Single and batch upload, drop zone, progress, cancel |
| R-09 | Download / export | Blob download, export action, CSV export dialog |
| R-10 | Versioning | Create version, version list, restore |
| R-11 | Preview | Picture, PDF and video preview; unsupported-type fallback |
| R-12 | Workflow / tasks | Start a review, act on a task, task counters |
| R-13 | Permissions UI | Grant and revoke, inheritance block, read-only presentation |
| R-14 | Metadata layouts | View / edit / metadata layouts per document type |
| R-15 | Bulk actions | Select-all, bulk edit, bulk delete, selection toolbar |
| R-16 | Collections & favorites | Add, remove, listing |
| R-17 | Comments & activity | Add a comment, reply, activity feed |
| R-18 | Publication | Publish, unpublish, publication tree |
| R-19 | Admin screens | Users, groups, vocabularies, audit views |
| R-20 | Home & dashboards | Home widgets, recent documents |
| R-21 | Cross-cutting | All four themes, locale switch, RTL, no new console errors |

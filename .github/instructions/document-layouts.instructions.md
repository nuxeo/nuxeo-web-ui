---
applyTo: "elements/document/**"
---

# Document Type Layouts

## File Convention

Each document type has a subdirectory under `elements/document/<doctype>/` containing up to 5 layout files:

```
elements/document/<doctype>/
  nuxeo-<doctype>-view-layout.html       → Read-only display
  nuxeo-<doctype>-edit-layout.html       → Edit form
  nuxeo-<doctype>-create-layout.html     → Creation form
  nuxeo-<doctype>-metadata-layout.html   → Sidebar metadata
  nuxeo-<doctype>-import-layout.html     → Bulk import form
```

## Existing Document Types

audio, collection, collections, domain, favorites, file, folder, note, orderedfolder, picture, picturebook, root, section, sectionroot, template, templateroot, userworkspacesroot, video, workspace, workspaceroot

## Layout Structure

Layout files come in two formats depending on file type:

### HTML Layouts (`.html` — most document type layouts)

These use `<dom-module>` with inline `<script>`. The `Polymer` and `Nuxeo` globals are available without imports:

```html
<!--
`nuxeo-file-view-layout`
@group Nuxeo UI
@element nuxeo-file-view-layout
-->
<dom-module id="nuxeo-file-view-layout">
  <template>
    <style include="nuxeo-styles">
      :host {
        @apply --paper-card;
      }
    </style>
    <nuxeo-document-viewer role="widget" document="[[document]]"></nuxeo-document-viewer>
  </template>

  <script>
    Polymer({
      is: 'nuxeo-file-view-layout',
      behaviors: [Nuxeo.LayoutBehavior],
      properties: {
        /**
         * @doctype File
         */
        document: Object,
      },
    });
  </script>
</dom-module>
```

### JS Shared Components (`.js` — layout containers and pages)

These use Polymer 3 ES module imports:

```javascript
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';

Polymer({
  is: 'nuxeo-document-page',
  _template: html`
    <style include="nuxeo-styles">
      :host { display: block; }
    </style>
    <nuxeo-document-layout document="[[document]]" layout="view"></nuxeo-document-layout>
  `,
  behaviors: [LayoutBehavior],
  properties: {
    document: { type: Object, notify: true },
  },
});
```

**Note**: Per-doctype layout files (`nuxeo-<doctype>-<mode>-layout.html`) always use the HTML format. The JS format is only used for shared infrastructure components in `elements/document/`.

## Read-only name/value pairs (metadata and view layouts)

Metadata layouts render a field name next to a read-only value. There is no form control involved, so
**do not use `<label>`** — `for` may only reference a labelable form element, and a `<div>` is not one.
A `<label>` with no association is reported by SonarCloud as `Web:S6853` and is announced by a screen
reader as loose text with no relationship to the value beside it.

Use a `<span class="label">` with an `id`, and give the value element `role="definition"` and
`aria-labelledby` pointing at that `id`:

```html
<div role="widget">
  <span class="label" id="title-label">[[i18n('label.dublincore.title')]]</span>
  <div role="definition" aria-labelledby="title-label" name="title">[[document.properties.dc:title]]</div>
</div>
```

The same applies when the value is a custom element rather than a `<div>`:

```html
<div role="widget" hidden$="[[!document.properties.dc:expired]]">
  <span class="label" id="expire-label">[[i18n('label.dublincore.expire')]]</span>
  <nuxeo-date role="definition" aria-labelledby="expire-label" name="expired" datetime="[[document.properties.dc:expired]]"></nuxeo-date>
</div>
```

Notes:

- `id` values are scoped to the layout's shadow root, so `<field>-label` is enough; never use a bare
  `id="label"`.
- Do not put `aria-label` or `aria-labelledby` on an element with no role — a bare `<div>` is generic and
  author-supplied names on it are ignored by browsers and flagged by axe. That is why the value element
  carries `role="definition"`.
- `themes/base.js` styles both `label` and `.label` with `--nuxeo-label`, so the bare element selector
  still works for customer-authored layouts written against the older pattern.
- Values carrying `class="multiline"` are styled `white-space: pre-line`. Keep the binding on the same
  source line as the tags (with a `<!-- prettier-ignore -->` above it if the line exceeds the print
  width) — otherwise the source indentation renders as a blank line.

For **genuinely interactive** controls that need a visible label in markup (a `paper-toggle-button`,
a `paper-button`), keep the `<span class="label" id="…">` and point the control's `aria-labelledby`
at it. Prefer passing `label="…"` into `nuxeo-input`, `nuxeo-textarea` and friends, which handle the
association internally and need no markup label at all.

## Key Patterns

- **Behavior**: Always use `Nuxeo.LayoutBehavior` — it provides `document`, `i18n`, and layout lifecycle methods
- **Document binding**: Properties are bound to `document.properties['schema:field']` via `[[document.properties.dc:title]]` or `{{document.properties.dc:title}}`
- **Widgets**: Use `role="widget"` attribute on form fields so the layout system can discover them
- **Two-way binding**: Edit and create layouts use `{{...}}` for form fields; view and metadata layouts use `[[...]]`
- **Nuxeo elements**: Use `<nuxeo-input>`, `<nuxeo-textarea>`, `<nuxeo-date-picker>`, `<nuxeo-select>`, `<nuxeo-directory-suggestion>`, `<nuxeo-user-suggestion>`, `<nuxeo-tag-suggestion>` for form fields
- **JSDoc `@doctype`**: The `@doctype` annotation in the `document` property declaration associates the layout with a document type

## Shared Components

Several `.js` files in `elements/document/` provide shared layout infrastructure:

| File | Purpose |
|---|---|
| `nuxeo-document-page.js` | Base page layout for documents (view mode wrapper) |
| `nuxeo-collapsible-document-page.js` | Collapsible sidebar variant |
| `nuxeo-picture-document-page.js` | Picture-specific page with EXIF/IPTC panels |
| `nuxeo-document-view.js` | View layout container |
| `nuxeo-document-edit.js` | Edit layout container |
| `nuxeo-document-metadata.js` | Metadata sidebar container |
| `nuxeo-document-create.js` | Creation wizard container |
| `nuxeo-document-import.js` | Import layout container |
| `nuxeo-document-form-layout.js` | Form layout wrapper with validation |

## Rules

- Follow the naming convention strictly: `nuxeo-<doctype>-<mode>-layout.html`
- Always include `Nuxeo.LayoutBehavior` — layouts will not work without it
- View and metadata layouts should be read-only (use `[[...]]` binding)
- Edit and create layouts should use two-way binding (`{{...}}`) for form fields
- Include `<style include="nuxeo-styles">` for consistent styling
- Keep layouts simple — delegate complex logic to dedicated elements
- Never hand-roll a `<label>` in a layout; use `<span class="label">` plus `role="definition"` /
  `aria-labelledby` on the value, or a widget that takes a `label` attribute

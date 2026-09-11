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
    <nuxeo-document-viewer data-widget document="[[document]]"></nuxeo-document-viewer>
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

## Key Patterns

- **Behavior**: Always use `Nuxeo.LayoutBehavior` — it provides `document`, `i18n`, and layout lifecycle methods
- **Document binding**: Properties are bound to `document.properties['schema:field']` via `[[document.properties.dc:title]]` or `{{document.properties.dc:title}}`
- **Widgets**: Use the `data-widget` attribute on form fields so the layout system can discover them. The older `role="widget"` marker is still supported and existing layouts keep working, but it is not a valid ARIA role, so new layouts must use `data-widget` (see WEBUI-2229)
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

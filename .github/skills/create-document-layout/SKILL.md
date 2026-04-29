---
name: create-document-layout
description: Generate document type layout HTML files for Nuxeo Web UI. Use this skill
  when the user wants to create view, edit, metadata, or create layouts for a document
  type. Generates up to 4 HTML files under elements/document/<doctype>/ following Nuxeo
  layout conventions with LayoutBehavior, schema-driven forms, and standard widgets.
  Also use when the user mentions document forms, document views, doctype layouts, or
  content type layouts.
---

# Create Document Layout

Generate layout HTML files for a Nuxeo document type. Each document type can have
up to 4 layout modes: **view**, **edit**, **metadata**, and **create**.

## Workflow

1. Ask for the document type name (PascalCase, e.g., `Contract`, `Invoice`)
2. Ask which modes are needed (default: all 4)
3. Ask about custom schemas/properties beyond Dublin Core
4. Generate the layout files
5. Add i18n keys to `i18n/messages.json`

## File Locations

```
elements/document/<doctype>/nuxeo-<doctype>-view-layout.html
elements/document/<doctype>/nuxeo-<doctype>-edit-layout.html
elements/document/<doctype>/nuxeo-<doctype>-metadata-layout.html
elements/document/<doctype>/nuxeo-<doctype>-create-layout.html
```

Where `<doctype>` is lowercase (e.g., `contract`, `invoice`, `file`).

## Template: View Layout

The view layout displays document properties in read-only mode.

```html
<!--
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<!--
`nuxeo-<doctype>-view-layout`
@group Nuxeo UI
@element nuxeo-<doctype>-view-layout
-->
<dom-module id="nuxeo-<doctype>-view-layout">
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
      is: 'nuxeo-<doctype>-view-layout',
      behaviors: [Nuxeo.LayoutBehavior],
      properties: {
        /**
         * @doctype <DocType>
         */
        document: Object,
      },
    });
  </script>
</dom-module>
```

## Template: Edit Layout

The edit layout provides form widgets for editing document properties.

```html
<dom-module id="nuxeo-<doctype>-edit-layout">
  <template>
    <style include="nuxeo-styles">
      :host {
        @apply --paper-card;
      }
    </style>

    <nuxeo-input
      role="widget"
      label="[[i18n('label.dublincore.title')]]"
      value="{{document.properties.dc:title}}"
    ></nuxeo-input>

    <nuxeo-textarea
      role="widget"
      label="[[i18n('label.dublincore.description')]]"
      value="{{document.properties.dc:description}}"
    ></nuxeo-textarea>

    <nuxeo-directory-suggestion
      role="widget"
      label="[[i18n('label.dublincore.nature')]]"
      directory-name="nature"
      value="{{document.properties.dc:nature}}"
      min-chars="0"
    ></nuxeo-directory-suggestion>

    <nuxeo-tag-suggestion
      role="widget"
      label="[[i18n('label.dublincore.tags')]]"
      value="{{document.properties.nxtag:tags}}"
      allow-new-tags
      min-chars="1"
    ></nuxeo-tag-suggestion>
  </template>

  <script>
    Polymer({
      is: 'nuxeo-<doctype>-edit-layout',
      behaviors: [Nuxeo.LayoutBehavior],
      properties: {
        /**
         * @doctype <DocType>
         */
        document: Object,
      },
    });
  </script>
</dom-module>
```

## Template: Metadata Layout

The metadata layout shows document metadata in a card format (sidebar/info panel).

```html
<dom-module id="nuxeo-<doctype>-metadata-layout">
  <template>
    <style include="nuxeo-styles"></style>

    <nuxeo-data-table-row
      role="widget"
      label="[[i18n('label.dublincore.title')]]"
      value="[[document.properties.dc:title]]"
    ></nuxeo-data-table-row>

    <nuxeo-data-table-row
      role="widget"
      label="[[i18n('label.dublincore.description')]]"
      value="[[document.properties.dc:description]]"
    ></nuxeo-data-table-row>

    <nuxeo-data-table-row
      role="widget"
      label="[[i18n('label.dublincore.created')]]"
      value="[[formatDate(document.properties.dc:created)]]"
    ></nuxeo-data-table-row>

    <nuxeo-data-table-row
      role="widget"
      label="[[i18n('label.dublincore.lastModified')]]"
      value="[[formatDate(document.properties.dc:modified)]]"
    ></nuxeo-data-table-row>

    <nuxeo-data-table-row
      role="widget"
      label="[[i18n('label.dublincore.contributors')]]"
      value="[[formatContributors(document.properties.dc:contributors)]]"
    ></nuxeo-data-table-row>
  </template>

  <script>
    Polymer({
      is: 'nuxeo-<doctype>-metadata-layout',
      behaviors: [Nuxeo.LayoutBehavior],
      properties: {
        /**
         * @doctype <DocType>
         */
        document: Object,
      },
    });
  </script>
</dom-module>
```

## Template: Create Layout

The create layout provides a form for creating new documents of this type.

```html
<dom-module id="nuxeo-<doctype>-create-layout">
  <template>
    <style include="nuxeo-styles">
      :host {
        @apply --paper-card;
      }
    </style>

    <nuxeo-input
      role="widget"
      label="[[i18n('label.dublincore.title')]]"
      value="{{document.properties.dc:title}}"
      required
    ></nuxeo-input>

    <nuxeo-textarea
      role="widget"
      label="[[i18n('label.dublincore.description')]]"
      value="{{document.properties.dc:description}}"
    ></nuxeo-textarea>
  </template>

  <script>
    Polymer({
      is: 'nuxeo-<doctype>-create-layout',
      behaviors: [Nuxeo.LayoutBehavior],
      properties: {
        /**
         * @doctype <DocType>
         */
        document: Object,
      },
    });
  </script>
</dom-module>
```

## Rules

- All layout files are `.html` with `<dom-module>` and inline `<script>`
- Always include the **Hyland license header** as an HTML comment
- Always use `Nuxeo.LayoutBehavior` (it includes I18nBehavior)
- The `document` property with `@doctype` JSDoc tag is required
- Use `role="widget"` on form widgets for layout rendering
- Data binding: `[[…]]` for one-way (view/metadata), `{{…}}` for two-way (edit/create)
- Available widgets from `@nuxeo/nuxeo-ui-elements`:
  - `nuxeo-input` — Text input
  - `nuxeo-textarea` — Multi-line text
  - `nuxeo-date-picker` — Date selection
  - `nuxeo-directory-suggestion` — Directory/vocabulary lookup
  - `nuxeo-user-suggestion` — User/group picker
  - `nuxeo-tag-suggestion` — Tag input
  - `nuxeo-selectivity` — Generic selection (operations, collections)
  - `nuxeo-document-suggestion` — Document picker
  - `nuxeo-checkbox-aggregation` — Checkbox facet filter
  - `nuxeo-dropdown-aggregation` — Dropdown facet filter
  - `nuxeo-document-viewer` — Full document preview
- i18n keys for Dublin Core fields already exist as `label.dublincore.*`
- Custom schema properties need new i18n keys in `i18n/messages.json`

## Common Dublin Core Properties

| Property | i18n Key | Widget |
|---|---|---|
| `dc:title` | `label.dublincore.title` | `nuxeo-input` |
| `dc:description` | `label.dublincore.description` | `nuxeo-textarea` |
| `dc:nature` | `label.dublincore.nature` | `nuxeo-directory-suggestion` (dir: `nature`) |
| `dc:subjects` | `label.dublincore.subjects` | `nuxeo-directory-suggestion` (dir: `l10nsubjects`) |
| `dc:coverage` | `label.dublincore.coverage` | `nuxeo-directory-suggestion` (dir: `l10ncoverage`) |
| `dc:created` | `label.dublincore.created` | Read-only with `formatDate()` |
| `dc:modified` | `label.dublincore.lastModified` | Read-only with `formatDate()` |
| `dc:contributors` | `label.dublincore.contributors` | `nuxeo-user-suggestion` or read-only |
| `nxtag:tags` | `label.dublincore.tags` | `nuxeo-tag-suggestion` |

## Existing Document Types for Reference

Browse `elements/document/` to see existing layouts: `file`, `picture`, `video`,
`audio`, `note`, `workspace`, `folder`, `collection`, `domain`, and many more.

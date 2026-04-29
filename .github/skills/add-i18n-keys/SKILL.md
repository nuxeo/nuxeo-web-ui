---
name: add-i18n-keys
description: Add or update internationalization (i18n) message keys for Nuxeo Web UI.
  Use this skill when the user wants to add translations, localization strings, message
  keys, or labels. Updates i18n/messages.json (English only); other locale files are
  managed by Crowdin and should not be modified manually. Also use when the user
  mentions adding labels, text strings, or translated content to the UI.
---

# Add i18n Keys

Add internationalization message keys to Nuxeo Web UI. The primary file is
`i18n/messages.json` (English). There are 16 locale files total.

## Workflow

1. Determine the message key name (follow existing naming conventions)
2. Determine the English value
3. Add to `i18n/messages.json`
4. Do **not** modify other locale files — translations are managed by Crowdin

## File Locations

```
i18n/messages.json          ← English (primary, always update)
i18n/messages-fr.json       ← French
i18n/messages-de.json       ← German
i18n/messages-es-ES.json    ← Spanish
i18n/messages-it.json       ← Italian
i18n/messages-pt-PT.json    ← Portuguese
i18n/messages-nl.json       ← Dutch
i18n/messages-sv-SE.json    ← Swedish
i18n/messages-ja.json       ← Japanese
i18n/messages-pl.json       ← Polish
i18n/messages-zh-CN.json    ← Chinese (Simplified)
i18n/messages-ar.json       ← Arabic
i18n/messages-cs.json       ← Czech
i18n/messages-eu.json       ← Basque
i18n/messages-he.json       ← Hebrew
i18n/messages-id.json       ← Indonesian
```

## Key Naming Conventions

Keys follow a hierarchical dot-notation pattern. Match the existing conventions:

```
<component>.<purpose>           → "documentActions.delete": "Delete"
<area>.<field>                  → "defaultSearch.fullText": "Full Text"
<area>.<field>.<detail>         → "defaultSearch.fullText.placeholder": "Search..."
label.dublincore.<property>     → "label.dublincore.title": "Title"
command.<action>                → "command.confirm": "Confirm"
app.<section>                   → "app.administration": "Administration"
```

General rules:
- Use **camelCase** for multi-word segments: `fullText`, `modifiedDate`
- Use **dot separators** between hierarchy levels
- Group related keys by prefix (e.g., all search keys start with `defaultSearch.`)
- Common suffixes: `.placeholder`, `.tooltip`, `.heading`, `.label`, `.confirm`, `.cancel`

## How to Use in Elements

In HTML templates (Polymer data binding):
```html
<span>[[i18n('myComponent.title')]]</span>
<nuxeo-input label="[[i18n('myComponent.name')]]"></nuxeo-input>
<paper-button aria-label$="[[i18n('myComponent.submit')]]">
  [[i18n('myComponent.submit')]]
</paper-button>
```

In JavaScript:
```javascript
this.i18n('myComponent.title')
```

## Rules

- **Always add to `i18n/messages.json` first** — this is the source of truth
- Keys are sorted alphabetically in the JSON files — insert in the correct position
- The JSON files are flat objects (no nesting) — keys use dot notation
- Values are plain strings — no HTML; positional placeholders like `{0}`, `{1}`, etc. are allowed; do not use unsupported templating syntax
- For addon-specific translations, use the addon's own `i18n/` directory instead
- At build time, `scripts/merge-messages.js` merges addon + nuxeo-ui-elements messages
  into `.tmp/i18n/`

## Adding a Key

1. Open `i18n/messages.json`
2. Find the correct alphabetical position
3. Insert the key-value pair
4. Do **not** modify other locale files — Crowdin handles translations automatically

Example — adding keys for a new "contracts" feature:

```json
"contracts.heading": "Contracts",
"contracts.create": "Create Contract",
"contracts.search.placeholder": "Search contracts...",
"contracts.status": "Status",
"contracts.expirationDate": "Expiration Date",
```

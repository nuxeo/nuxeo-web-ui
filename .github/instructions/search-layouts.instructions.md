---
applyTo: "elements/search/**"
---

# Search Layouts

## File Convention

Each named search lives in `elements/search/<name>/` with two files:

```
elements/search/<name>/
  nuxeo-<name>-search-form.html      → Search form (filter widgets)
  nuxeo-<name>-search-results.html   → Results display (grid/list)
```

## Existing Searches

| Directory | Search Name | Purpose |
|---|---|---|
| `default/` | Default Search | Main full-text + faceted search |
| `expired/` | Expired Search | Documents past expiration date |
| `trash/` | Trash Search | Trashed documents |
| `nxql/` | NXQL Search | Raw NXQL query search |
| `document_picker/` | Document Picker | Document selection dialog |
| `assets/` | Assets Search | DAM asset search |

## Search Form Structure

```html
<dom-module id="nuxeo-<name>-search-form">
  <template>
    <style include="nuxeo-styles"></style>

    <!-- Widgets bound to params and aggregations -->
    <nuxeo-input data-widget value="{{searchTerm}}" label="[[i18n('...')]]"></nuxeo-input>

    <div data-widget>
      <nuxeo-checkbox-aggregation
        data="[[aggregations.dc_modified_agg]]"
        value="{{params.dc_modified_agg}}"
        label="[[i18n('...')]]"
      ></nuxeo-checkbox-aggregation>
    </div>
  </template>
  <script>
    Polymer({
      is: 'nuxeo-<name>-search-form',
      behaviors: [Nuxeo.LayoutBehavior],
      properties: {
        params: { type: Object },
        aggregations: { type: Object },
        searchTerm: { type: String },
      },
    });
  </script>
</dom-module>
```

## Search Results Structure

```html
<dom-module id="nuxeo-<name>-search-results">
  <template>
    <nuxeo-results
      name="<name>"
      nx-provider="[[nxProvider]]"
      selected-items="{{selectedItems}}"
      display-mode="list"
    >
      <nuxeo-data-grid name="grid" ...>
        <template>
          <nuxeo-document-grid-thumbnail ...></nuxeo-document-grid-thumbnail>
        </template>
      </nuxeo-data-grid>
      <nuxeo-data-table name="list" ...>
        <!-- column definitions -->
      </nuxeo-data-table>
    </nuxeo-results>
  </template>
</dom-module>
```

## Key Patterns

- **Aggregation widgets**: Bind `data` to `[[aggregations.<agg_name>]]` and `value` to `{{params.<agg_name>}}`
- **Widget marker**: Use `data-widget` on form elements for layout discovery. The older `role="widget"` marker is still supported but is not a valid ARIA role, so new layouts must use `data-widget` (see WEBUI-2229)
- **i18n keys**: Search-specific keys follow `<searchName>Search.<field>` pattern (e.g., `defaultSearch.fullText`)
- **Page provider**: Results use `<nuxeo-results>` bound to `nxProvider` with `<nuxeo-data-grid>` and `<nuxeo-data-table>` display modes
- **Sort options**: Pass `sort-options` to `<nuxeo-results>` for sortable columns

## Shared Components

| File | Purpose |
|---|---|
| `nuxeo-search-form.js` | Search form container and page provider wiring |
| `nuxeo-saved-search-actions.js` | Save/load search actions |

## Rules

- Follow naming: `nuxeo-<name>-search-form.html` and `nuxeo-<name>-search-results.html`
- Always include `Nuxeo.LayoutBehavior`
- Use `data-widget` on all search form fields
- Use two-way binding (`{{...}}`) for `params` and `searchTerm` in forms
- Use one-way binding (`[[...]]`) for `aggregations` data
- Results must provide both grid and list display modes via `<nuxeo-data-grid>` and `<nuxeo-data-table>`

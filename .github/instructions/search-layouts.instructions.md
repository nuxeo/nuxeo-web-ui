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
    <nuxeo-input role="widget" value="{{searchTerm}}" label="[[i18n('...')]]"></nuxeo-input>

    <div role="widget">
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

## Labelling filter widgets

Widgets that accept a `label` attribute (`nuxeo-input`, `nuxeo-textarea`, `nuxeo-select`,
`nuxeo-path-suggestion`, `nuxeo-checkbox-aggregation`) associate the label with their internal control
themselves — pass the label in and add no markup label.

Where a filter needs a visible label in markup, use a `<span class="label">` rather than a `<label>`:
a `<label>` with no `for` and no nested control is reported as SonarCloud `Web:S6853` and gives a
screen-reader user no relationship to the control beside it.

```html
<div role="widget">
  <span class="label" id="authors-label">[[i18n('defaultSearch.authors')]]</span>
  <nuxeo-dropdown-aggregation
    placeholder="[[i18n('defaultSearch.authors.placeholder')]]"
    data="[[aggregations.dc_creator_agg]]"
    value="{{params.dc_creator_agg}}"
    multiple="true"
    aria-label$="[[i18n('defaultSearch.authors')]]"
  >
  </nuxeo-dropdown-aggregation>
</div>
```

`nuxeo-dropdown-aggregation` does not forward a `label`, so the control keeps its own `aria-label$`
to give the inner input an accessible name.

## Key Patterns

- **Aggregation widgets**: Bind `data` to `[[aggregations.<agg_name>]]` and `value` to `{{params.<agg_name>}}`
- **Widget role**: Use `role="widget"` on form elements for layout discovery
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
- Use `role="widget"` on all search form fields
- Use two-way binding (`{{...}}`) for `params` and `searchTerm` in forms
- Use one-way binding (`[[...]]`) for `aggregations` data
- Results must provide both grid and list display modes via `<nuxeo-data-grid>` and `<nuxeo-data-table>`

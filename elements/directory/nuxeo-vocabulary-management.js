/**
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
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-form/iron-form.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-aggregation/nuxeo-dropdown-aggregation.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '../nuxeo-app/nuxeo-page.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

const schemaDataCache = {};

/**
`nuxeo-vocabulary-management`
@group Nuxeo UI
@element nuxeo-vocabulary-management
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      nuxeo-data-table {
        min-height: calc(200vh - 280px);
      }

      /* Allow long values (e.g. labels) to wrap onto multiple lines instead of being truncated */
      nuxeo-data-table-cell:not([header]) {
        white-space: normal;
        word-break: break-word;
        overflow-x: visible;
        overflow-y: visible;
        align-items: flex-start;
        padding-top: 12px;
        padding-bottom: 12px;
      }

      .top.actions {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-end-justified;
        margin: 1em 0 1em 0;
      }

      nuxeo-dialog {
        min-width: 480px;
      }

      @media (max-width: 1024px) {
        nuxeo-dialog {
          min-width: 0;
          width: 90%;
        }
      }

      nuxeo-dialog .buttons {
        @apply --layout-horizontal;
        @apply --layout-justified;
        margin-top: 16px;
      }

      paper-item span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Make the dropdown filter visually align with the default header cell
         and match the typography used elsewhere in the app. */
      .filter-dropdown {
        width: 100%;
        --paper-input-container: {
          font-size: inherit;
          margin: 12px 2px 9px 2px;
          margin-top: 3px;
        }
        --paper-input-container-input: {
          min-height: 2em;
          padding: 0;
          font-size: inherit;
          font-weight: 600;
        }
        --paper-input-container-color: {
          color: var(--nuxeo-text-default, #3a3a54);
        }
        --paper-input-container-label: {
          font-size: inherit;
          color: #606978;
          font-weight: 600;
          padding: 0;
        }
      }

      .actions-header {
        font-size: 1rem;
        font-weight: 600;
      }
    </style>

    <nuxeo-resource id="directory" path="/directory" params='{"pageSize": 0}'></nuxeo-resource>
    <nuxeo-resource id="schema"></nuxeo-resource>

    <nuxeo-page>
      <div slot="header">
        <span>[[i18n('vocabularyManagement.heading')]]</span>
      </div>

      <div>
        <nuxeo-card>
          <nuxeo-select
            label="[[i18n('vocabularyManagement.vocabulary')]]"
            placeholder="[[i18n('vocabularyManagement.select')]]"
            selected="{{selectedVocabulary}}"
            attr-for-selected="name"
          >
            <template is="dom-repeat" items="[[vocabularies]]" as="vocabulary">
              <paper-item name$="[[vocabulary.name]]"
                ><span title="[[vocabulary.name]]">[[vocabulary.name]]</span></paper-item
              >
            </template>
          </nuxeo-select>
        </nuxeo-card>

        <template is="dom-if" if="[[_isVocabularySelected(selectedVocabulary)]]">
          <div class="top actions">
            <paper-button id="addEntry" class="text" on-tap="_createEntry" aria-labelledby="addEntryLabel">
              <span id="addEntryLabel">+ [[i18n('vocabularyManagement.addEntry')]]</span>
            </paper-button>
          </div>
          <nuxeo-data-table
            id="table"
            items="[[entries]]"
            empty-label="[[i18n('vocabularyManagement.noEntry')]]"
            empty-label-when-filtered="[[i18n('vocabularyManagement.noEntryWhenFiltered')]]"
            style$="[[_visibleDataTableStyle(entries, _allEntries, _filters)]]"
            caption-text="[[i18n('table.caption.vocabulary')]]"
            column-resize-enabled
          >
            <template is="dom-repeat" items="[[colDef]]" as="col">
              <nuxeo-data-table-column name="[[i18n(col.name)]]" key="[[col.key]]" filter-by$="[[_filterByFor(col)]]">
                <template is="header">
                  <template is="dom-if" if="[[!_entryActions(column.key)]]">
                    <nuxeo-dropdown-aggregation
                      class="filter-dropdown"
                      placeholder="[[column.name]]"
                      aria-label$="[[column.name]]"
                      data="[[_aggregationData(_aggregations, column.key)]]"
                      value="{{column.filterValue}}"
                      sort-by-label
                    >
                    </nuxeo-dropdown-aggregation>
                  </template>
                  <template is="dom-if" if="[[_entryActions(column.key)]]">
                    <span class="actions-header">[[column.name]]</span>
                  </template>
                </template>
                <template>
                  <template is="dom-if" if="[[!_entryActions(column.key)]]">
                    [[_cellValue(item, column.key)]]
                  </template>
                  <template is="dom-if" if="[[_entryActions(column.key)]]">
                    <paper-icon-button
                      id="edit-button-[[index]]"
                      icon="nuxeo:edit"
                      on-tap="_editEntry"
                      aria-labelledby="editButtonTooltip"
                    ></paper-icon-button>
                    <nuxeo-tooltip for="edit-button-[[index]]" id="editButtonTooltip"
                      >[[i18n('vocabularyManagement.editEntry')]]</nuxeo-tooltip
                    >
                    <paper-icon-button
                      id="delete-button-[[index]]"
                      name="delete"
                      icon="nuxeo:delete"
                      on-tap="_deleteEntry"
                      aria-labelledby="deleteButtonTooltip"
                    ></paper-icon-button>
                    <nuxeo-tooltip for="delete-button-[[index]]" id="deleteButtonTooltip"
                      >[[i18n('vocabularyManagement.deleteEntry')]]</nuxeo-tooltip
                    >
                  </template>
                </template>
              </nuxeo-data-table-column>
            </template>
          </nuxeo-data-table>
        </template>
      </div>
    </nuxeo-page>

    <nuxeo-dialog id="vocabularyEditDialog" with-backdrop>
      <h2>[[_computeDialogHeading(_new)]]</h2>
      <iron-form id="form">
        <form>
          <nuxeo-layout
            id="layout"
            href="[[_layoutHref(_selectedSchema)]]"
            model="[[_layoutModel(_selectedEntry)]]"
            error="[[i18n('documentVocabularyManagement.layoutNotFound', _selectedSchema)]]"
            on-element-changed="_elementChanged"
          >
          </nuxeo-layout>
        </form>
      </iron-form>
      <div class="buttons">
        <paper-button name="cancel" noink class="secondary" dialog-dismiss>[[i18n('command.cancel')]]</paper-button>
        <paper-button name="save" noink class="primary" on-tap="_save">[[i18n('command.save')]]</paper-button>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-vocabulary-management',
  behaviors: [NotifyBehavior, I18nBehavior],
  importMeta: import.meta,
  properties: {
    vocabularies: Array,
    selectedVocabulary: String,
    entries: {
      type: Array,
      value: [],
    },
    _allEntries: {
      type: Array,
      value: () => [],
    },
    _filters: {
      type: Object,
      value() {
        return {};
      },
    },
    _aggregations: {
      type: Object,
      computed: '_computeAggregations(_allEntries, colDef)',
    },
    colDef: {
      type: Object,
      notify: true,
    },
    visible: {
      type: Boolean,
      observer: '_visibleChanged',
    },
    _selectedEntry: {
      type: Object,
    },
    _selectedSchema: {
      type: String,
      computed: '_schemaFor(selectedVocabulary)',
    },
  },

  observers: ['_refresh(selectedVocabulary)', '_syncFilterDropdowns(_aggregations)'],

  listeners: {
    'column-filter-changed': '_onColumnFilterChanged',
  },

  // After the aggregation buckets are (re)computed (e.g. when an entry is
  // created or deleted), push the fresh `data` onto each rendered filter
  // dropdown. Relying solely on the templated `data` binding is unreliable
  // because `_aggregations` is a host property and the dropdown lives inside
  // the templatized column header, so the binding does not always re-evaluate
  // when the host property changes.
  _syncFilterDropdowns(aggregations) {
    if (!aggregations || !this.$.table) {
      return;
    }
    this.async(() => {
      const dropdowns = this.$.table.querySelectorAll('nuxeo-dropdown-aggregation');
      dropdowns.forEach((dd) => {
        const cell = dd.parentNode?.host || dd.closest?.('nuxeo-data-table-cell') || dd.parentNode;
        const key = cell?.column?.key;
        if (key && aggregations[key]) {
          dd.data = aggregations[key];
        }
      });
    });
  },

  // The data-table-column dispatches `column-filter-changed` (composed + bubbling)
  // whenever its `filterValue` updates. We listen at the host and re-derive the
  // visible entries from the unfiltered source.
  _onColumnFilterChanged(e) {
    const detail = e?.detail;
    if (!detail) {
      return;
    }
    const key = detail.filterBy;
    if (!key || key === 'actions') {
      return;
    }
    const { value } = detail;
    const next = { ...this._filters };
    if (value == null || (Array.isArray(value) && value.length === 0)) {
      delete next[key];
    } else {
      next[key] = value;
    }
    this._filters = next;
    this._applyFilters();
  },

  _visibleDataTableStyle(entries, allEntries, filters) {
    const hasFilter = filters && Object.keys(filters).length > 0;
    // show the table when there are visible entries, or when a filter is active but matches
    // nothing (so the table's empty-when-filtered label is rendered instead of hiding the table)
    if (entries?.length || (hasFilter && allEntries?.length)) {
      return 'display: block;';
    }
    return 'display: none;';
  },

  _visibleChanged() {
    if (this.visible && !this.vocabularies) {
      this.$.directory.get().then((response) => {
        this.vocabularies = response.entries.sort((a, b) => a.name.localeCompare(b.name));
      });
    }
  },

  /**
   * Returns the href for the current layout element
   */
  _layoutHref(schema) {
    const lowerCaseSchema = schema.toLowerCase();
    return this.resolveUrl(`${lowerCaseSchema}/nuxeo-${lowerCaseSchema}-edit-layout.html`);
  },

  _layoutModel() {
    return {
      entry: this._selectedEntry,
      directory: this.selectedVocabulary,
      parentDirectory: this._getParentDirectoryFor(this._selectedEntry),
      // Pass the unfiltered list so edit layouts (e.g. parent/children pickers
      // for hierarchical vocabularies) always see every entry, regardless of
      // any active table filter.
      entries: this._allEntries,
      new: this._new,
    };
  },

  _schemaFor() {
    if (!this._isVocabularySelected()) {
      return;
    }
    let schema = '';
    Object.keys(this.vocabularies).some((i) => {
      if (this.vocabularies[i].name === this.selectedVocabulary) {
        ({ schema } = this.vocabularies[i]);
        return true;
      }
      return false;
    });
    if (!schema || schema.length === 0) {
      return 'vocabulary';
    }
    return schema;
  },

  _getParentDirectoryFor(entry) {
    let parent = '';
    Object.keys(this.vocabularies).some((i) => {
      if (this.vocabularies[i].name === entry.directoryName) {
        ({ parent } = this.vocabularies[i]);
        return true;
      }
      return false;
    });
    return parent;
  },

  _entryActions(o) {
    return o === 'actions';
  },

  _refresh() {
    if (this._isVocabularySelected()) {
      this.$.directory.path = `/directory/${this.selectedVocabulary}`;
      this.entries = [];
      this._allEntries = [];
      this._filters = {};
      this.colDef = [];
      this.$.directory.get().then((resp) => {
        let tmp = [];
        if (resp.entries.length > 0) {
          tmp = Object.keys(resp.entries[0].properties).map((key) => {
            return {
              key,
              name: `vocabularyManagement.edit.${key}`,
              pos: this._computeColPos(key),
            };
          });
        }
        tmp.push({
          key: 'actions',
          name: 'vocabularyManagement.edit.actions',
          pos: 1000,
          actions: true,
        });
        tmp.sort((a, b) => a.pos - b.pos);
        this.colDef = tmp;
        this._allEntries = resp.entries;
        this._applyFilters();
      });
    }
  },

  _formattedFilterableValue(entry, key) {
    const val = entry?.properties?.[key];
    if (val == null) {
      return '';
    }
    if (key === 'obsolete') {
      return val > 0 ? this.i18n('label.yes') : this.i18n('label.no');
    }
    return String(val);
  },

  _applyFilters() {
    const filters = this._filters || {};
    const keys = Object.keys(filters);
    const all = this._allEntries || [];
    if (keys.length === 0) {
      this.entries = all.slice();
    } else {
      this.entries = all.filter((entry) => {
        if (!entry?.properties) {
          return false;
        }
        return keys.every((k) => {
          const filterVal = filters[k];
          const cell = this._formattedFilterableValue(entry, k);
          if (Array.isArray(filterVal)) {
            // dropdown multi-select: match when the cell value is one of the
            // selected bucket keys (empty selection is treated as no filter).
            return filterVal.length === 0 || filterVal.includes(cell);
          }
          return cell.toLowerCase().indexOf(String(filterVal).toLowerCase()) === 0;
        });
      });
    }
    // iron-data-table caches stamped rows by reference and does not always
    // rebuild them when `items` is reassigned via data binding. Force a full
    // re-stamp by clearing and re-setting `items` imperatively, mirroring the
    // pre-filter behaviour of `_refresh`. Without this, deleted/edited entries
    // can remain visible in the DOM (see WEBUI-1683).
    const table = this.$ && this.$.table ? this.$.table : this.$$('#table');
    if (table) {
      table.items = [];
      table.items = this.entries;
    }
  },

  // Build the aggregation buckets consumed by `nuxeo-dropdown-aggregation` for
  // every filterable column out of the unfiltered source list. Shape mirrors
  // what a `nuxeo-page-provider` would return for an aggregation:
  //   { extendedBuckets: [{ key, label, docCount }, ...], selection: [] }
  _computeAggregations(allEntries, colDef) {
    if (!Array.isArray(allEntries) || !Array.isArray(colDef)) {
      return {};
    }
    const result = {};
    colDef.forEach((col) => {
      if (!col || col.key === 'actions') {
        return;
      }
      const counts = new Map();
      allEntries.forEach((entry) => {
        const v = this._formattedFilterableValue(entry, col.key);
        if (v === '') {
          return;
        }
        counts.set(v, (counts.get(v) || 0) + 1);
      });
      const extendedBuckets = Array.from(counts.entries()).map(([key, docCount]) => {
        return { key, label: key, docCount };
      });
      extendedBuckets.sort((a, b) => String(a.label).localeCompare(String(b.label)));
      result[col.key] = { extendedBuckets, selection: [] };
    });
    return result;
  },

  _aggregationData(aggregations, key) {
    return aggregations && key ? aggregations[key] : undefined;
  },

  _filterByFor(col) {
    // Only set `filter-by` on non-action columns so the data-table-column emits
    // `column-filter-changed` events for those columns.
    return col?.key && col.key !== 'actions' ? col.key : '';
  },

  _cellValue(item, prop) {
    if (item?.properties && prop) {
      if (prop === 'obsolete') {
        return item.properties[prop] > 0 ? this.i18n('label.yes') : this.i18n('label.no');
      }
      return item.properties[prop];
    }
    return 'N/A';
  },

  _computeColPos(key) {
    if (key === 'parent') {
      return 1;
    }
    if (key === 'id') {
      return 2;
    }
    if (key === 'obsolete') {
      return 98;
    }
    if (key === 'ordering') {
      return 99;
    }
    return 50;
  },

  _deleteEntry(e) {
    if (window.confirm(this.i18n('vocabularyManagement.confirmDelete'))) {
      const { item } = e.target.parentNode;
      this.$.directory.path = `/directory/${item.directoryName}/${item.properties.id}`;
      this.$.directory.remove().then(
        () => {
          this._refresh();
          this.notify({ message: this.i18n('vocabularyManagement.successfullyDeleted') });
        },
        (err) => {
          if (err.status === 409) {
            this.notify({
              message: `${this.i18n('label.error').toUpperCase()}: ${this.i18n(
                'vocabularyManagement.cannotDelete.referencedEntry',
              )}`,
            });
          } else {
            this.notify({
              message: `${this.i18n('label.error').toUpperCase()}: ${this.i18n(
                'vocabularyManagement.cannotDelete.error',
              )}`,
            });
          }
        },
      );
    }
  },

  _editEntry(e) {
    this._new = false;
    this._selectedEntry = e.target.parentNode.item;
    this.$.vocabularyEditDialog.toggle();
  },

  _elementChanged() {
    if (this.$.vocabularyEditDialog.opened) {
      this.async(this.$.vocabularyEditDialog.notifyResize.bind(this.$.vocabularyEditDialog));
    }
  },

  _save() {
    if (!this.$.layout.validate()) {
      return;
    }
    // XXX convert ordering from string to number, as this is required after NXP-30680.
    // See WEBUI-638 for more information.
    if (
      this._selectedEntry &&
      this._selectedEntry.properties &&
      ![null, undefined, ''].includes(this._selectedEntry.properties.ordering)
    ) {
      try {
        this._selectedEntry.properties.ordering = Number(this._selectedEntry.properties.ordering);
      } catch (_) {
        console.warn(`unable to convert ${this._selectedEntry.properties.ordering} to a number`);
      }
    }
    this.$.directory.data = this._selectedEntry;
    if (this._new) {
      this.$.directory.path = `/directory/${this._selectedEntry.directoryName}`;
      this.$.directory.post().then(
        () => {
          this.$.vocabularyEditDialog.toggle();
          this.notify({ message: this.i18n('vocabularyManagement.successfullyCreated') });
          this._refresh();
        },
        (err) => {
          this.notify({
            message: `${this.i18n('label.error').toUpperCase()}: ${
              err.message && err.message.length > 0 ? err.message : this.i18n('vocabularyManagement.cannotCreate')
            }`,
          });
        },
      );
    } else {
      this.$.directory.path = `/directory/${this._selectedEntry.directoryName}/${this._selectedEntry.properties.id}`;
      this.$.directory.put().then(
        () => {
          this.$.vocabularyEditDialog.toggle();
          this.notify({ message: this.i18n('vocabularyManagement.successfullyEdited') });
          this._refresh();
        },
        (err) => {
          this.notify({
            message: `${this.i18n('label.error').toUpperCase()}: ${
              err.message && err.message.length > 0 ? err.message : this.i18n('vocabularyManagement.cannotEdit')
            }`,
          });
        },
      );
    }
  },

  _isVocabularySelected() {
    return this.selectedVocabulary && this.selectedVocabulary.length > 0;
  },

  _createEntry() {
    const emptyEntry = {
      'entity-type': 'directoryEntry',
      directoryName: this.selectedVocabulary,
      id: undefined,
      properties: {},
    };
    this._getSchemaFields().then((response) => {
      response.forEach((field) => {
        emptyEntry.properties[field] = undefined;
      });
      this._new = true;
      this._selectedEntry = emptyEntry;
      this.$.vocabularyEditDialog.toggle();
    });
  },

  _getSchemaFields() {
    const schema = this._selectedSchema;
    if (schemaDataCache[schema]) {
      return Promise.resolve(schemaDataCache[schema]);
    }
    if (this._allEntries && this._allEntries.length > 0) {
      const fields = Object.keys(this._allEntries[0].properties);
      schemaDataCache[schema] = fields;
      return Promise.resolve(fields);
    }
    this.$.schema.path = `/config/schemas/${schema}`;
    return this.$.schema
      .get()
      .then((response) => {
        const fields = Object.keys(response.fields);
        schemaDataCache[schema] = fields;
        return fields;
      })
      .catch(function (error) {
        this.notify({ message: this.i18n('vocabularyManagement.cannotGetSchema') });
        if (error.status !== 404) {
          throw error;
        }
      });
  },

  _computeDialogHeading(_new) {
    return this.i18n(_new ? 'vocabularyManagement.popup.addEntry' : 'vocabularyManagement.popup.editEntry');
  },
});

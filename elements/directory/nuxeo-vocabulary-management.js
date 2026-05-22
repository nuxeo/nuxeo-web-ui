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
              <nuxeo-data-table-column name="[[i18n(col.name)]]" key="[[col.key]]">
                <template is="header">
                  <template is="dom-if" if="[[!_entryActions(column.key)]]">
                    <paper-input
                      no-label-float
                      placeholder="[[column.name]]"
                      aria-label$="[[column.name]]"
                      data-key$="[[column.key]]"
                    ></paper-input>
                  </template>
                  <template is="dom-if" if="[[_entryActions(column.key)]]"> [[column.name]] </template>
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

  observers: ['_refresh(selectedVocabulary)'],

  listeners: {
    input: '_onAnyInput',
  },

  // Delegate filter input changes from inside the data-table (which
  // templatizes header templates, so `on-*` annotations may not bind reliably
  // to the host, and Polymer notify events like `value-changed` don't bubble).
  _onAnyInput(e) {
    const path = e.composedPath ? e.composedPath() : [];
    const keyed = path.find((n) => n && n.dataset && n.dataset.key);
    if (!keyed) {
      return;
    }
    const key = keyed.dataset.key;
    if (!key || key === 'actions') {
      return;
    }
    // Due to shadow DOM event retargeting `e.target` is the paper-input (the
    // shadow host) whose `value` hasn't been synced yet. `composedPath()[0]`
    // is the real native <input> which always has the current value.
    const nativeInput = path[0];
    const value = nativeInput && 'value' in nativeInput ? nativeInput.value : keyed.value;
    const next = Object.assign({}, this._filters);
    if (value == null || value === '') {
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
    if ((entries && entries.length) || (hasFilter && allEntries && allEntries.length)) {
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
    const val = entry && entry.properties ? entry.properties[key] : undefined;
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
        if (!entry || !entry.properties) {
          return false;
        }
        return keys.every((k) => {
          const term = String(filters[k]).toLowerCase();
          const cell = this._formattedFilterableValue(entry, k).toLowerCase();
          // starts-with matching, same UX as the workspace table
          return cell.indexOf(term) === 0;
        });
      });
    }
  },

  _cellValue(item, prop) {
    if (item && item.properties && prop) {
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

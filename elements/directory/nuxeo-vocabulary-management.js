/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

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
/**
`nuxeo-vocabulary-management`
@group Nuxeo UI
@element nuxeo-vocabulary-management
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-form/iron-form.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '../nuxeo-app/nuxeo-page.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
var schemaDataCache = {};
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      nuxeo-data-table {
        min-height: calc(100vh - 280px);
      }

      .top.actions {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-end-justified;
        margin: 1em 0 1em 0;
      }

      nuxeo-select {
        max-width: 223px;
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
        background-color: var(--nuxeo-dialog-buttons-bar, white);
      }
    </style>

    <nuxeo-resource id="directory" path="/directory" params="{&quot;pageSize&quot;: 0}"></nuxeo-resource>
    <nuxeo-resource id="schema"></nuxeo-resource>

    <nuxeo-page>
      <div slot="header">
        <span>[[i18n('vocabularyManagement.heading')]]</span>
      </div>

      <div>
        <nuxeo-card>
          <nuxeo-select label="[[i18n('vocabularyManagement.vocabulary')]]" placeholder="[[i18n('vocabularyManagement.select')]]" selected="{{selectedVocabulary}}" attr-for-selected="name">
            <template is="dom-repeat" items="[[vocabularies]]" as="vocabulary">
              <paper-item name\$="[[vocabulary.name]]">[[vocabulary.name]]</paper-item>
            </template>
          </nuxeo-select>
        </nuxeo-card>

        <template is="dom-if" if="[[_isVocabularySelected(selectedVocabulary)]]">
          <div class="top actions">
            <paper-button id="addEntry" class="primary" on-tap="_createEntry">
              <span>+ [[i18n('vocabularyManagement.addEntry')]]</span>
            </paper-button>
          </div>
          <nuxeo-data-table id="table" empty-label="[[i18n('vocabularyManagement.noEntry')]]" empty-label-when-filtered="[[i18n('vocabularyManagement.noEntryWhenFiltered')]]">
            <template is="dom-repeat" items="[[colDef]]" as="col">
              <nuxeo-data-table-column name="[[i18n(col.name)]]" key="[[col.key]]">
                <template>
                  <template is="dom-if" if="[[!_entryActions(column.key)]]">
                    [[_value(index, column.key)]]
                  </template>
                  <template is="dom-if" if="[[_entryActions(column.key)]]">
                    <paper-icon-button id="edit-button-[[index]]" icon="nuxeo:edit" on-tap="_editEntry"></paper-icon-button>
                    <nuxeo-tooltip for="edit-button-[[index]]">[[i18n('vocabularyManagement.editEntry')]]</nuxeo-tooltip>
                    <paper-icon-button id="delete-button-[[index]]" name="delete" icon="nuxeo:delete" on-tap="_deleteEntry"></paper-icon-button>
                    <nuxeo-tooltip for="delete-button-[[index]]">[[i18n('vocabularyManagement.deleteEntry')]]</nuxeo-tooltip>
                  </template>
                </template>
              </nuxeo-data-table-column>
            </template>
          </nuxeo-data-table>
        </template>
      </div>
    </nuxeo-page>

    <nuxeo-dialog id="vocabularyEditDialog" with-backdrop="">
      <h2>[[i18n('vocabularyManagement.popup.editEntry')]]</h2>
      <iron-form id="form">
        <form>
          <nuxeo-layout id="layout" href="[[_layoutHref(_selectedSchema)]]" model="[[_layoutModel(_selectedEntry)]]" error="[[i18n('documentVocabularyManagement.layoutNotFound', _selectedSchema)]]" on-element-changed="_elementChanged">
          </nuxeo-layout>
        </form>
      </iron-form>
      <div class="buttons">
        <paper-button name="cancel" noink="" dialog-dismiss="">[[i18n('command.cancel')]]</paper-button>
        <paper-button name="save" noink="" class="primary" on-tap="_save">[[i18n('command.save')]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-vocabulary-management',
  behaviors: [I18nBehavior],

  properties: {
    vocabularies: Array,
    selectedVocabulary: String,
    entries: {
      type: Array,
      value: []
    },
    colDef: {
      type: Object,
      notify: true
    },
    visible: {
      type: Boolean,
      observer: '_visibleChanged'
    },
    _selectedEntry: {
      type: Object
    },
    _selectedSchema: {
      type: String,
      computed: '_schemaFor(selectedVocabulary)'
    }
  },

  observers: [
    '_refresh(selectedVocabulary)'
  ],

  _visibleChanged: function() {
    if (this.visible && !this.vocabularies) {
      this.$.directory.get().then(function(response) {
        this.vocabularies = response.entries.sort(function(a, b) {
          return a.name.localeCompare(b.name);
         });
      }.bind(this));
    }
  },

  /**
   * Returns the href for the current layout element
   */
  _layoutHref: function(schema) {
    var lowerCaseSchema = schema.toLowerCase();
    return this.resolveUrl(lowerCaseSchema + '/nuxeo-' + lowerCaseSchema + '-edit-layout.html');
  },

  _layoutModel: function() {
    return {
      entry: this._selectedEntry,
      directory: this.selectedVocabulary,
      parentDirectory: this._getParentDirectoryFor(this._selectedEntry),
      entries: this.entries,
      new: this._new
    };
  },

  _schemaFor: function() {
    if (!this._isVocabularySelected()) {
      return;
    }
    var schema = '';
    for (var i in this.vocabularies) {
      if (this.vocabularies[i].name === this.selectedVocabulary) {
        schema = this.vocabularies[i].schema;
        break;
      }
    }
    if (!schema || schema.length === 0) {
      return 'vocabulary';
    }
    return schema;
  },

  _getParentDirectoryFor: function(entry) {
    var parent = '';
    for (var i in this.vocabularies) {
      if (this.vocabularies[i].name === entry.directoryName) {
        parent = this.vocabularies[i].parent;
        break;
      }
    }
    return parent;
  },

  _entryActions: function(o) {
    return o  === 'actions';
  },

  _refresh: function() {
    if (this._isVocabularySelected()) {
      this.$.directory.path = '/directory/' + this.selectedVocabulary;
      this.entries = [];
      this.colDef = [];
      this.$.directory.get().then(function(resp) {
        var tmp = [];
        if (resp.entries.length > 0) {
          tmp = Object.keys(resp.entries[0].properties).map(function(key) {
            return {key: key, name: 'vocabularyManagement.edit.' + key, pos: this._computeColPos(key)};
          }.bind(this));
        }
        tmp.push({key: 'actions', name: 'vocabularyManagement.edit.actions', pos: 1000, actions: true});
        tmp.sort(function(a, b) {
          return a.pos - b.pos;
        });
        this.colDef = tmp;
        this.entries = resp.entries;

        var table = this.$$('#table');
        table.items = [];
        table.items = this.entries;
      }.bind(this));
    }
  },

  _value: function(index, prop) {
    var entry = this.entries[index];
    if (entry && entry.properties && prop) {
      if (prop === 'obsolete') {
        return entry.properties[prop] > 0 ? this.i18n('label.yes') : this.i18n('label.no');
      }
      return entry.properties[prop];
    } else {
      return 'N/A';
    }
  },

  _computeColPos: function(key) {
    if (key === 'parent') {
      return 1;
    } else if (key === 'id') {
      return 2;
    } else if (key === 'obsolete') {
      return 98;
    } else if (key === 'ordering') {
      return 99;
    } else {
      return 50;
    }
  },

  _deleteEntry: function(e) {
    if (confirm(this.i18n('vocabularyManagement.confirmDelete'))) {
      var item = e.target.parentNode.item;
      this.$.directory.path = '/directory/' + item.directoryName + '/' + item.properties.id;
      this.$.directory.remove().then(function() {
        this._refresh();
        this.fire('notify', {message: this.i18n('vocabularyManagement.successfullyDeleted')});
      }.bind(this), function(err) {
        if (err.status === 401) {
          this.fire('notify', {message: this.i18n('label.error').toUpperCase() + ': ' +
              this.i18n('vocabularyManagement.cannotDelete.referencedEntry')});
        } else {
          this.fire('notify', {message: this.i18n('label.error').toUpperCase() + ': ' +
              this.i18n('vocabularyManagement.cannotDelete.error')});
        }
      }.bind(this));
    }
  },

  _editEntry: function(e) {
    this._new = false;
    this._selectedEntry = e.target.parentNode.item;
    this.$.vocabularyEditDialog.toggle();
  },

  _elementChanged: function() {
    if (this.$.vocabularyEditDialog.opened) {
      this.async(this.$.vocabularyEditDialog.notifyResize.bind(this.$.vocabularyEditDialog));
    }
  },

  _save: function() {
    if (!this.$.layout.validate()) {
      return;
    }
    this.$.directory.data = this._selectedEntry;
    if (this._new) {
      this.$.directory.path = '/directory/' + this._selectedEntry.directoryName;
      this.$.directory.post().then(function() {
        this.$.vocabularyEditDialog.toggle();
        this.fire('notify', {message: this.i18n('vocabularyManagement.successfullyCreated')});
        this._refresh();
      }.bind(this),
        function(err) {
          this.fire('notify', {message: this.i18n('label.error').toUpperCase() + ': ' +
              (err.message && err.message.length > 0 ? err.message :
                this.i18n('vocabularyManagement.cannotCreate'))});
        }.bind(this));
    } else {
      this.$.directory.path = '/directory/' + this._selectedEntry.directoryName +
        '/' + this._selectedEntry.properties.id;
      this.$.directory.put().then(function() {
        this.$.vocabularyEditDialog.toggle();
        this.fire('notify', {message: this.i18n('vocabularyManagement.successfullyEdited')});
        this._refresh();
      }.bind(this),
        function(err) {
          this.fire('notify', {message: this.i18n('label.error').toUpperCase() + ': ' +
              (err.message && err.message.length > 0 ? err.message :
                this.i18n('vocabularyManagement.cannotEdit'))});
        }.bind(this));
    }
  },

  _isVocabularySelected: function() {
    return this.selectedVocabulary && this.selectedVocabulary.length > 0;
  },

  _createEntry: function() {
    var emptyEntry = {
      'entity-type': 'directoryEntry',
      directoryName: this.selectedVocabulary,
      id: undefined,
      properties: {}
    };
    this._getSchemaFields().then(function(response) {
      response.forEach(function(field) {
        emptyEntry.properties[field] = undefined;
      });
      this._new = true;
      this._selectedEntry = emptyEntry;
      this.$.vocabularyEditDialog.toggle();
    }.bind(this));
  },

  _getSchemaFields: function() {
    var schema = this._selectedSchema;
    if (schemaDataCache[schema]) {
      return Promise.resolve(schemaDataCache[schema]);
    } else if (this.entries.length > 0) {
      var fields = Object.keys(this.entries[0].properties);
      schemaDataCache[schema] = fields;
      return Promise.resolve(fields);
    } else {
      this.$.schema.path = '/config/schemas/' + schema;
      return this.$.schema.get()
        .then(function(response) {
          var fields = Object.keys(response.fields);
          schemaDataCache[schema] = fields;
          return fields;
        }).catch(function(error) {
          this.fire('notify', {message: this.i18n('vocabularyManagement.cannotGetSchema')});
          if (error.status !== 404) {
            throw error;
          }
        });
    }
  }
});

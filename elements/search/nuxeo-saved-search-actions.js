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
`nuxeo-saved-search-actions`
@group Nuxeo UI
@element nuxeo-saved-search-actions
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex">
      paper-item {
        @apply --layout-horizontal;
        @apply --layout-center;
        cursor: pointer;
      }
      iron-icon {
        margin-right: 16px;
      }
      paper-menu-button[hidden] {
        display: none !important;
      }
    </style>

    <nuxeo-document auto="" doc-id="[[searchId]]" enrichers="permissions" response="{{searchDoc}}"></nuxeo-document>
    <div class="horizontal layout center">
      <paper-button on-tap="_saveSearchAs" hidden\$="[[!_showSaveAs(searchDoc, isSavedSearch, _dirty)]]">
        <iron-icon icon="nuxeo:filter-edit"></iron-icon>[[i18n('app.saveNewSearch')]]
      </paper-button>
      <paper-button on-tap="_saveSearch" hidden\$="[[!_showSave(searchDoc, isSavedSearch, _dirty)]]">
        <iron-icon icon="nuxeo:filter-add"></iron-icon>[[i18n('app.savedSearch')]]
      </paper-button>
      <paper-menu-button no-animations="" horizontal-align="right" vertical-offset="40" hidden\$="[[!_showOtherSearchActions(searchDoc, isSavedSearch, _dirty)]]">
        <paper-icon-button icon="icons:more-vert" slot="dropdown-trigger" alt="menu"></paper-icon-button>
        <paper-listbox slot="dropdown-content">
          <paper-item on-tap="_renameSearch">
            <iron-icon icon="nuxeo:edit"></iron-icon>[[i18n('app.renameSearch')]]
          </paper-item>
          <paper-item on-tap="_shareSearch">
            <iron-icon icon="nuxeo:share"></iron-icon>[[i18n('app.shareSearch')]]
          </paper-item>
          <paper-item on-tap="_deleteSearch">
            <iron-icon icon="nuxeo:delete"></iron-icon>[[i18n('app.deleteSearch')]]
          </paper-item>
        </paper-listbox>
      </paper-menu-button>
    </div>
`,

  is: 'nuxeo-saved-search-actions',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    searchId: String,
    searchDoc: Object,
    searchForm: {
      type: Object,
      observer: '_searchFormChanged'
    },
    _dirty: Boolean
  },

  _searchFormChanged: function() {
    this._dirty = this.searchForm && this.searchForm.dirty;
    if (this.searchForm) {
      this.searchForm.addEventListener('dirty-changed', function() {
        this._dirty = this.searchForm.dirty;
      }.bind(this));
      this.searchForm.addEventListener('selected-search-changed', function() {
        if (this.searchForm.selectedSearch) {
          this.searchId = this.searchForm.selectedSearch.id;
          this.isSavedSearch = !!this.searchId;
        }
      }.bind(this));

      if (this.searchForm.selectedSearch) {
        this.searchId = this.searchForm.selectedSearch.id;
      }
    }
    this.isSavedSearch = !!this.searchId;
  },

  _saveSearch: function() {
    this.searchForm.save();
  },

  _saveSearchAs: function() {
    this.searchForm.saveAs();
  },

  _renameSearch: function() {
    this.searchForm.rename();
  },

  _shareSearch: function() {
    this.searchForm.share();
  },

  _deleteSearch: function() {
    this.searchForm.delete();
  },

  _showSaveAs: function() {
    return this.isSavedSearch || (!this.isSavedSearch && this.searchForm && this._dirty);
  },

  _showSave: function() {
    return this.isSavedSearch && this._dirty && this._hasPermissions();
  },

  _showOtherSearchActions: function() {
    return this.isSavedSearch && this._hasPermissions();
  },

  _hasPermissions: function() {
    return this.searchDoc ? (this.searchDoc.contextParameters.permissions.indexOf('Write') > -1 ||
            this.searchDoc.contextParameters.permissions.indexOf('Everything') > -1) : false;
  }
});

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
`nuxeo-document-create-popup`
@group Nuxeo UI
@element nuxeo-document-create-popup
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/iron-pages/iron-pages.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '../document/nuxeo-document-create.js';
import '../document/nuxeo-document-import.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex">

      :host {
        --paper-tabs-selection-bar-color: var(--nuxeo-primary-color);
        display: block;
      }

      paper-tabs {
        border-bottom: 1px solid var(--divider-color);
      }

      paper-tab {
        text-transform: uppercase;
      }

      paper-tabs,
      #holder {
        margin: 0;
        padding: 0;
      }

      iron-pages,
      nuxeo-document-import {
        /*Firefox fix (NXP-22349)*/
        min-height: 100%;
      }

      #holder {
        height: 80vh;
        width: 65vw;
      }

      iron-pages {
        @apply --layout-flex;
        @apply --layout-horizontal;
      }

      /* IE11 fix (NXP-23550) */
      *::-ms-backdrop, iron-pages * {
        height: 80vh;
      }
    </style>

    <nuxeo-document id="defaultDoc" doc-path="[[parentPath]]" enrichers="permissions, subtypes" response="{{parent}}">
    </nuxeo-document>

    <paper-dialog id="createDocDialog" opened="{{opened}}" modal="" no-auto-focus="">

      <paper-tabs hidden\$="[[!_showTabs]]" selected="{{selectedTab}}" attr-for-selected="name" noink="">
        <nuxeo-slot slot="CREATE_POPUP_ITEMS" model="[[importContext]]"></nuxeo-slot>
      </paper-tabs>
      <div id="holder" class="vertical layout flex">
        <iron-pages selected="[[selectedTab]]" attr-for-selected="name" selected-attribute="visible">
          <nuxeo-slot slot="CREATE_POPUP_PAGES" model="[[importContext]]"></nuxeo-slot>
          <nuxeo-document-create id="simpleCreation" name="create" parent="[[parent]]" target-path="{{parentPath}}" suggester-children="{{suggesterChildren}}"></nuxeo-document-create>
          <nuxeo-document-import id="bulkCreation" name="import" parent="[[parent]]" target-path="{{parentPath}}" suggester-children="{{suggesterChildren}}"></nuxeo-document-import>
        </iron-pages>
      </div>
    </paper-dialog>
`,

  is: 'nuxeo-document-create-popup',
  behaviors: [I18nBehavior],

  properties: {
    parent: {
      type: Object
    },

    _showTabs: {
      type: Boolean,
      value: true
    },
    selectedTab: {
      type: String,
      value: ''
    },
    parentPath: {
      type: String
    },
    defaultPath: {
      type: String
    },
    opened: {
      type: Boolean,
      value: false,
      observer: '_openedChanged'
    },
    importContext: {
      type: Object,
      computed: '_importContext(parent, i18n)'
    }
  },

  listeners: {
    'nx-creation-wizard-hide-tabs': '_hideTabs',
    'nx-creation-wizard-show-tabs': '_displayTabs',
    'nx-document-creation-finished': '_close',
    'nx-document-creation-suggester-parent-changed': '_parentPathChanged'
  },

  _hideTabs: function() {
    this._showTabs = false;
  },

  _displayTabs: function() {
    this._showTabs = true;
  },

  _close: function() {
    if (this.$.createDocDialog.opened) {
      this.$.createDocDialog.toggle();
      this._showTabs = true;
    }
  },

  toggleDialogCreate: function(type) {
    this.selectedTab = 'create';
    this._showTabs = false;
    this._fetchParent().then(function() {
      if (this._noPermission) {
        this.fire('notify', {message: this.i18n('documentCreationBehavior.error.noPermission')});
      } else {
        this.$$('#simpleCreation').init(type);
        this.$$('#bulkCreation').init();
        this.$.createDocDialog.toggle();
      }
    }.bind(this));
  },

  toggleDialogImport: function(files) {
    this.selectedTab = 'import';
    this._fetchParent().then(function() {
      if (this._noPermission) {
        this.fire('notify', {message: this.i18n('documentCreationBehavior.error.noPermission')});
      } else {
        this.$$('#bulkCreation').init(files);
        this.$.createDocDialog.toggle();
      }
    }.bind(this));
  },

  toggleDialog: function() {
    this._fetchParent().then(function() {
      if (this._noPermission) {
        this.fire('notify', {message: this.i18n('documentCreationBehavior.error.noPermission')});
      } else {
        this.$$('#bulkCreation').init();
        this.$.createDocDialog.toggle();
      }
    }.bind(this));
  },

  _fetchParent: function() {
    this._noPermission = false;
    if (!this.parentPath) {
      this.set('parentPath', this.defaultPath);
    }
    if (!this.parent || !this.parent.contextParameters) {
      return this.$.defaultDoc.get().catch(function(err) {
        if (err && err.status === 403) {
          this._noPermission = true;
        } else {
          throw err;
        }
      }.bind(this));
    } else {
      return Promise.resolve();
    }
  },

  _parentPathChanged: function(e) {
    if (e.detail.isValidTargetPath &&
      (!this.parent || (this.parentPath && this.parent.path !== this.parentPath.replace(/(.+)\/$/, "$1")))) {
      this.$.defaultDoc.get();
    }
  },

  _openedChanged: function() {
    if (this.opened) {
      if (this.selectedTab === '') {
        this.selectedTab = 'create';
      }
    } else {
      this.selectedTab = '';
    }
  },

  _importContext: function() {
    return {parent: this.parent, i18n: this.i18n};
  }
});

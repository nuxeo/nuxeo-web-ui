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
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/iron-pages/iron-pages.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '../document/nuxeo-document-create.js';
import '../document/nuxeo-document-import.js';

/**
`nuxeo-document-create-popup`
@group Nuxeo UI
@element nuxeo-document-create-popup
*/
Polymer({
  _template: html`
    <style include="iron-flex">
      :host {
        --paper-tabs-selection-bar-color: var(--nuxeo-primary-color);
        display: block;
      }

      nuxeo-dialog {
        display: flex;
        flex-direction: column;
        height: var(--nuxeo-document-create-popup-height, 80vh);
        width: var(--nuxeo-document-create-popup-width, 65vw);
        margin: 0;
        z-index: 200;
      }

      paper-tabs {
        border-bottom: 1px solid var(--divider-color);
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
        height: 100%;
        width: 100%;
      }

      iron-pages {
        @apply --layout-flex;
        @apply --layout-horizontal;
      }
    </style>

    <nuxeo-document id="defaultDoc" doc-path="[[parentPath]]" enrichers="permissions, subtypes" response="{{parent}}">
    </nuxeo-document>

    <nuxeo-dialog id="createDocDialog" opened="{{opened}}" modal>
      <paper-tabs hidden$="[[!_showTabs]]" selected="{{selectedTab}}" attr-for-selected="name" noink>
        <nuxeo-slot name="CREATE_POPUP_ITEMS" model="[[importContext]]"></nuxeo-slot>
      </paper-tabs>
      <div id="holder" class="vertical layout flex">
        <iron-pages selected="[[selectedTab]]" attr-for-selected="name" selected-attribute="visible">
          <nuxeo-slot name="CREATE_POPUP_PAGES" model="[[importContext]]"></nuxeo-slot>
          <nuxeo-document-create
            id="simpleCreation"
            name="create"
            parent="[[parent]]"
            target-path="{{parentPath}}"
            suggester-children="{{suggesterChildren}}"
          ></nuxeo-document-create>
          <nuxeo-document-import
            id="bulkCreation"
            name="import"
            parent="[[parent]]"
            target-path="{{parentPath}}"
            suggester-children="{{suggesterChildren}}"
          ></nuxeo-document-import>
        </iron-pages>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-document-create-popup',
  behaviors: [NotifyBehavior, I18nBehavior],

  properties: {
    parent: {
      type: Object,
    },

    _showTabs: {
      type: Boolean,
      value: true,
    },
    selectedTab: {
      type: String,
      value: '',
    },
    parentPath: {
      type: String,
    },
    defaultPath: {
      type: String,
    },
    opened: {
      type: Boolean,
      value: false,
      observer: '_openedChanged',
    },
    importContext: {
      type: Object,
      computed: '_importContext(parent, i18n)',
    },
  },

  listeners: {
    'nx-creation-wizard-hide-tabs': '_hideTabs',
    'nx-creation-wizard-show-tabs': '_displayTabs',
    'nx-document-creation-finished': '_close',
    'nx-document-creation-suggester-parent-changed': '_parentPathChanged',
  },

  _hideTabs() {
    this._showTabs = false;
  },

  _displayTabs() {
    this._showTabs = true;
  },

  _close() {
    if (this.$.createDocDialog.opened) {
      this.$.createDocDialog.toggle();
      this._showTabs = true;
    }
  },

  toggleDialogCreate(type) {
    this.selectedTab = 'create';
    this._showTabs = false;
    this._fetchParent().then(() => {
      if (this._noPermission) {
        this.notify({ message: this.i18n('documentCreationBehavior.error.noPermission') });
      } else {
        this.$$('#simpleCreation').init(type);
        this.$$('#bulkCreation').init();
        this.$.createDocDialog.toggle();
      }
    });
  },

  toggleDialogImport(files) {
    this.selectedTab = 'import';
    this._fetchParent().then(() => {
      if (this._noPermission) {
        this.notify({ message: this.i18n('documentCreationBehavior.error.noPermission') });
      } else {
        this.$$('#simpleCreation').init();
        this.$$('#bulkCreation').init(files);
        this.$.createDocDialog.toggle();
      }
    });
  },

  toggleDialog() {
    this._fetchParent().then(() => {
      if (this._noPermission) {
        this.notify({ message: this.i18n('documentCreationBehavior.error.noPermission') });
      } else {
        this.$$('#simpleCreation').init();
        this.$$('#bulkCreation').init();
        this.$.createDocDialog.toggle();
      }
    });
  },

  _fetchParent() {
    this._noPermission = false;
    if (!this.parentPath) {
      this.set('parentPath', this.defaultPath);
    }
    if (!this.parent || !this.parent.contextParameters) {
      return this.$.defaultDoc.get().catch((err) => {
        if (err && err.status === 403) {
          this._noPermission = true;
        } else {
          throw err;
        }
      });
    }
    return Promise.resolve();
  },

  _parentPathChanged(e) {
    if (
      e.detail.isValidTargetPath &&
      (!this.parent || (e.detail.parentPath && this.parent.path !== e.detail.parentPath.replace(/(.+)\/$/, '$1')))
    ) {
      this.parentPath = e.detail.parentPath;
      this.suggesterChildren = e.detail.suggesterChildren;
      this.$.defaultDoc.get();
    }
  },

  _openedChanged() {
    if (this.opened) {
      if (this.selectedTab === '') {
        this.selectedTab = 'create';
      }
    } else {
      this.selectedTab = '';
    }
  },

  _importContext() {
    return { parent: this.parent, i18n: this.i18n };
  },
});

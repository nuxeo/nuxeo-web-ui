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

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '../document/nuxeo-document-form-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-form-button`
@group Nuxeo UI
@element nuxeo-document-form-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      nuxeo-dialog {
        height: 100%;
        max-height: var(--nuxeo-document-form-popup-max-height, 60vh);
        min-width: var(--nuxeo-document-form-popup-min-width, 915px);
        margin: 0;
      }

      .container {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
      }
    </style>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="action" on-tap="_openDialog">
        <paper-icon-button noink id="[[layout]]-button" icon="[[icon]]" aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[i18n(label)]]</span>
        <nuxeo-tooltip>[[i18n(label)]]</nuxeo-tooltip>
      </div>
    </template>

    <nuxeo-dialog id="[[layout]]-dialog" with-backdrop modal>
      <div class="container">
        <nuxeo-document-form-layout
          id="layout"
          document="[[document]]"
          layout="[[layout]]"
          on-document-updated="_closeDialog"
        ></nuxeo-document-form-layout>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-document-form-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    /**
     * Input document.
     */
    document: {
      type: Object,
    },

    /**
     * Document form layout to load (default is `edit`)
     */
    layout: {
      type: String,
      value: 'edit',
    },

    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    label: {
      type: String,
    },

    icon: {
      type: String,
      value: 'nuxeo:edit',
    },
  },

  observers: ['_cancelEdit(document)'],

  get dialog() {
    return this.root.getElementById(`${this.layout}-dialog`);
  },

  get button() {
    return this.root.getElementById(`${this.layout}-button`);
  },

  connectedCallback() {
    this.addEventListener('iron-overlay-opened', this._formLayoutOpened);
  },

  disconnectedCallback() {
    this.removeEventListener('iron-overlay-opened', this._formLayoutOpened);
  },

  _isAvailable(doc) {
    return doc && doc.type !== 'Root' && this.hasPermission(doc, 'WriteProperties') && this._isMutable(doc);
  },

  _isMutable(doc) {
    return doc && !this.hasFacet(doc, 'Immutable') && doc.type !== 'Root' && !this.isTrashed(doc);
  },

  _cancelEdit(doc) {
    if (!this._isAvailable(doc)) {
      this._closeDialog();
    }
  },

  _openDialog() {
    this.dialog.open();
  },

  _closeDialog() {
    this.dialog.close();
  },

  _formLayoutOpened(e) {
    const multipleDialogs =
      e.composedPath().filter((el) => el.tagName === 'NUXEO-DIALOG' || el.tagName === 'PAPER-DIALOG').length > 1;
    if (!multipleDialogs) {
      const { layout } = this.$.layout.$;
      layout.applyAutoFocus();
    }
  },
});

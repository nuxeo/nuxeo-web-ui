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

import '@polymer/iron-form/iron-form.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@polymer/paper-button/paper-button.js';
import './nuxeo-document-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-document-form-layout`
@group Nuxeo UI
@element nuxeo-document-form-layout
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      #form,
      form {
        @apply --layout-vertical;
        height: 100%;
      }

      .scrollable {
        margin-top: 24px;
        padding: 0 24px;
        @apply --layout-scroll;
        @apply --layout-flex;
        @apply --layout-vertical;
      }

      .actions {
        @apply --buttons-bar;
        @apply --layout-horizontal;
        @apply --layout-justified;
      }

      nuxeo-document-layout {
        margin-bottom: 24px;
      }
    </style>

    <nuxeo-document
      id="doc"
      doc-id="[[document.uid]]"
      response="{{document}}"
      headers="[[headers]]"
      sync-indexing
    ></nuxeo-document>

    <iron-form id="form">
      <form>
        <div class="scrollable">
          <nuxeo-document-layout id="layout" document="{{document}}" layout="[[layout]]"></nuxeo-document-layout>
        </div>
        <div class="actions">
          <paper-button on-tap="cancel" noink>[[i18n('command.cancel')]]</paper-button>
          <paper-button id="save" on-tap="save" noink class="primary">[[i18n('command.save')]]</paper-button>
        </div>
      </form>
    </iron-form>
  `,

  is: 'nuxeo-document-form-layout',
  behaviors: [IronResizableBehavior, I18nBehavior],

  properties: {
    document: {
      type: Object,
      notify: true,
    },

    layout: {
      type: String,
      value: 'edit',
    },

    headers: {
      type: Object,
    },
  },

  observers: ['_documentChanged(document.*)'],

  _validate() {
    // run our custom validation function first to allow setting custom native validity
    const result = this._doNativeValidation(this.$.form) && this.$.form.validate();
    if (result) {
      return result;
    }
    const { layout } = this.$.layout.$;
    const nodes = layout._getValidatableElements(layout.element.root);
    const invalidField = nodes.find((node) => node.invalid);
    invalidField.scrollIntoView();
    invalidField.focus();
  },

  _doSave() {
    if (!this.document.uid) {
      // create
      this.$.doc.data = this.document;
      return this.$.doc.post();
    } // edit
    this.$.doc.data = {
      'entity-type': 'document',
      uid: this.document.uid,
      properties: this._dirtyProperties,
    };
    return this.$.doc.put();
  },

  save() {
    if (!this._validate()) {
      return;
    }
    this._doSave().then(this._refresh.bind(this), (err) => {
      if (err && err['entity-type'] === 'validation_report') {
        this.$.layout.reportValidation(err);
      } else {
        this.fire('notify', { message: this.i18n('documentEdit.saveError') });
        console.error(err);
      }
    });
  },

  cancel() {
    this._refresh();
    this.document = undefined;
  },

  _refresh() {
    this.fire('document-updated');
  },

  _documentChanged(e) {
    if (e.path === 'document') {
      this._dirtyProperties = {};
    } else {
      // copy dirty properties (cannot patch complex or list properties)
      const match = e.path.match(/^document\.properties\.([^.]*)/);
      if (match) {
        const prop = match[1];
        this._dirtyProperties[prop] = this.document.properties[prop];
      }
    }
  },

  // trigger native browser invalid-form UI
  _doNativeValidation(/* form */) {
    /* var fakeSubmit = document.createElement('input');
    fakeSubmit.setAttribute('type', 'submit');
    fakeSubmit.style.display = 'none';
    form._form.appendChild(fakeSubmit);
    fakeSubmit.click();
    form._form.removeChild(fakeSubmit);
    return form._form.checkValidity(); */
    return true;
  },
});

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
import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-layout.js';
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

      .saving-label {
        margin-right: 8px;
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
          <paper-button on-tap="cancel" noink class="secondary">[[i18n('command.cancel')]]</paper-button>
          <paper-button
            id="save"
            on-tap="_save"
            noink
            class="primary"
            disabled$="[[saving]]"
            aria-label$="[[i18n('command.save')]]"
          >
            <template is="dom-if" if="[[!saving]]">
              [[i18n('command.save')]]
            </template>
            <template is="dom-if" if="[[saving]]">
              <span class="saving-label">[[i18n('command.save')]]</span>
              <paper-spinner-lite active></paper-spinner-lite>
            </template>
          </paper-button>
        </div>
      </form>
    </iron-form>
  `,

  is: 'nuxeo-document-form-layout',
  behaviors: [NotifyBehavior, IronResizableBehavior, I18nBehavior],
  importMeta: import.meta,

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

    saving: {
      type: Boolean,
      value: false,
      readOnly: true,
    },
  },

  observers: ['_documentChanged(document.*)'],

  async _save() {
    const innerLayout = this.$.layout.$.layout;
    this._setSaving(true);
    const valid = await innerLayout.validate();
    if (!valid) {
      const elementsToValidate = innerLayout._getValidatableElements(innerLayout.element.root);
      const invalidField = elementsToValidate.find((node) => node.invalid);
      if (invalidField) {
        invalidField.scrollIntoView();
        invalidField.focus();
      }
      this._setSaving(false);
      return;
    }
    let action;
    if (!this.document.uid) {
      // create
      this.$.doc.data = this.document;
      action = this.$.doc.post();
    } else {
      // edit
      this.$.doc.data = {
        'entity-type': 'document',
        uid: this.document.uid,
        properties: this._dirtyProperties,
      };
      action = this.$.doc.put();
    }
    action
      .then(() => {
        this._refresh(this);
      })
      .catch((err) => {
        if (err && err['entity-type'] === 'validation_report') {
          this.$.layout.reportValidation(err);
        } else {
          this.notify({ message: this.i18n('documentEdit.saveError') });
          console.error(err);
        }
      })
      .finally(() => this._setSaving(false));
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
});

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
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '@polymer/iron-form/iron-form.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-spinner/paper-spinner-lite.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-a11y-keys/iron-a11y-keys.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-path-suggestion/nuxeo-path-suggestion.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '../nuxeo-document-creation-stats/nuxeo-document-creation-stats.js';
import './nuxeo-document-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { DocumentCreationBehavior } from '../nuxeo-document-creation/nuxeo-document-creation-behavior.js';

/**
`nuxeo-document-create`
@group Nuxeo UI
@element nuxeo-document-create
*/
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment nuxeo-styles">
      :host {
        display: block;
        @apply --layout-flex;
        @apply --layout-horizontal;
        --paper-dialog-scrollable: {
          padding: 0;
          overflow-x: hidden;
        }
      }

      paper-dialog-scrollable {
        display: block;
        @apply --layout-flex;
      }

      .typeSelection {
        margin: 1rem 0;
        @apply --layout-wrap;
        @apply --layout-flex;
        @apply --layout-horizontal;
      }

      .typeSelection paper-button {
        min-width: 128px;
        max-width: 128px;
        height: 128px;
        margin: 4px;
        border: none;
        text-align: center;
        box-shadow: none;
        background-color: var(--nuxeo-dialog-buttons-bar);
      }

      .typeSelection paper-button:hover {
        color: var(--nuxeo-link-hover-color);
        filter: brightness(102%);
        -webkit-filter: brightness(102%);
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3), 0 -3px 0 var(--nuxeo-link-hover-color) inset;
      }

      .typeSelection iron-icon {
        width: var(--nuxeo-document-creation-form-icon-width, 42px);
        height: var(--nuxeo-document-creation-form-icon-height, 42px);
      }

      .container {
        margin: 0 2rem;
        padding: 0 1rem 0 0;
        display: inline-block;
        @apply --layout-flex;
        @apply --layout-vertical;
      }

      #form {
        @apply --layout-flex;
        @apply --layout-horizontal;
      }

      #document-create {
        margin-bottom: 2.5em;
      }

      .heading {
        text-transform: uppercase;
        font-size: 1.1rem;
        padding: 1.7rem 2.5rem;
      }

      .heading iron-icon {
        width: 1.2rem;
        height: 1.2rem;
        margin-right: 8px;
      }

      .typeSelection div {
        margin-top: 1em;
        word-break: break-word;
      }

      .buttons {
        @apply --buttons-bar;
      }

      .error {
        border-left: 4px solid var(--nuxeo-warn-text);
        color: var(--nuxeo-text-default);
        padding-left: 8px;
      }

      .suggester {
        background-color: var(--nuxeo-dialog-buttons-bar);
        padding: 8px 16px;
        margin: 1rem 0;
        z-index: 100;
      }

      .importing-label {
        margin-right: 8px;
      }

      .vertical {
        @apply --layout-flex;
        @apply --layout-vertical;
      }

      iron-pages {
        @apply --layout-flex;
        @apply --layout-horizontal;
      }
    </style>

    <nuxeo-document
      id="docRequest"
      doc-path="[[targetPath]]"
      data="[[document]]"
      sync-indexing
      enrichers="permissions, subtypes"
      response="{{createResponse}}"
    ></nuxeo-document>

    <iron-pages selected="[[stage]]" attr-for-selected="name">
      <!--Stage: allow user to choose a doc type-->
      <div name="choose" class="vertical">
        <div class="container">
          <div class="suggester">
            <nuxeo-path-suggestion
              id="pathSuggesterChoose"
              value="{{targetPath}}"
              label="[[i18n('documentCreationForm.location')]]"
              parent="{{suggesterParent}}"
              children="{{suggesterChildren}}"
              disabled
              always-float-label
            ></nuxeo-path-suggestion>
            <span class$="horizontal layout [[_formatErrorMessage(errorMessage)]]">[[errorMessage]]</span>
          </div>
          <paper-dialog-scrollable>
            <div name="typeSelection" class="typeSelection">
              <template is="dom-repeat" items="[[subtypes]]" as="type">
                <paper-button
                  noink
                  name$="[[type.type]]"
                  class="docTypeButton vertical layout"
                  on-tap="_selectType"
                  data-args$="[[type]]"
                >
                  <iron-icon src="[[_getTypeIcon(type)]]"></iron-icon>
                  <div>[[_getTypeLabel(type)]]</div>
                </paper-button>
              </template>
            </div>
          </paper-dialog-scrollable>
        </div>
        <div class="buttons horizontal end-justified layout">
          <div class="flex start-justified">
            <paper-button noink dialog-dismiss on-tap="_cancel">[[i18n('command.cancel')]]</paper-button>
          </div>
        </div>
      </div>

      <!--Stage: allow user to fill in the properties for the selected type and create a new document-->
      <div name="edit" class="vertical layout flex">
        <div class="horizontal layout heading center">
          <iron-icon src="[[_getTypeIcon(selectedDocType)]]"></iron-icon>
          <span>[[_newDocumentLabel(selectedDocType)]]</span>
        </div>
        <div id="editor" class="container">
          <div class="suggester">
            <nuxeo-path-suggestion
              id="pathSuggesterEdit"
              value="{{targetPath}}"
              label="[[i18n('documentCreationForm.location')]]"
              parent="{{suggesterParent}}"
              children="{{suggesterChildren}}"
              disabled
              always-float-label
            ></nuxeo-path-suggestion>
            <span class$="horizontal layout [[_formatErrorMessage(errorMessage)]]">[[errorMessage]]</span>
          </div>
          <paper-dialog-scrollable id="editScrollable">
            <iron-form id="form">
              <form class="form vertical layout flex">
                <iron-a11y-keys keys="enter" on-keys-pressed="_submitKeyHandler"></iron-a11y-keys>
                <nuxeo-document-layout
                  id="document-create"
                  layout="create"
                  document="[[document]]"
                ></nuxeo-document-layout>
              </form>
            </iron-form>
          </paper-dialog-scrollable>
        </div>
        <div class="buttons horizontal end-justified layout">
          <div class="flex start-justified">
            <paper-button noink dialog-dismiss on-tap="_cancel" disabled$="[[creating]]"
              >[[i18n('command.cancel')]]</paper-button
            >
          </div>
          <paper-button noink on-tap="_back" disabled$="[[creating]]">[[i18n('command.back')]]</paper-button>
          <paper-button
            id="create"
            noink
            class="primary"
            on-tap="_create"
            disabled$="[[!_canCreate(canCreate,creating)]]"
          >
            <template is="dom-if" if="[[!creating]]">
              [[i18n('command.create')]]
            </template>
            <template is="dom-if" if="[[creating]]">
              <span class="importing-label">[[i18n('documentImport.creating')]]</span>
              <paper-spinner-lite active></paper-spinner-lite>
            </template>
          </paper-button>
        </div>
      </div>
    </iron-pages>

    <nuxeo-document-creation-stats id="creationStats"></nuxeo-document-creation-stats>
  `,

  is: 'nuxeo-document-create',
  behaviors: [IronResizableBehavior, DocumentCreationBehavior],

  properties: {
    stage: {
      type: String,
      value: 'choose',
    },

    visible: {
      type: Boolean,
    },

    creating: {
      type: Boolean,
      value: false,
    },
  },

  observers: ['_visibleOnStage(visible,stage)'],

  ready() {
    this.addEventListener('element-changed', this._layoutUpdated.bind(this), true);
  },

  init(typeId) {
    if (typeId) {
      const typeObj = this.subtypes.find((type) => type.id === typeId);
      if (typeObj) {
        this.selectedDocType = typeObj;
      }
    }
  },

  /**
   * Retrieves and creates the layout for the current document type
   */
  _updateDocument() {
    if (!this._isValidType(this.selectedDocType) || !this.parent) {
      this.document = null;
      return;
    }

    this.newDocument(this.selectedDocType.type, this._getDocumentProperties()).then((document) => {
      document.parentRef = this.parent.uid;
      this.document = document;
      this.stage = 'edit';
      this.$.editScrollable.scrollTarget.scrollTop = 0;
    });
  },

  _selectType(e) {
    this.selectedDocType = e.model.type;
    this.fire('nx-creation-wizard-hide-tabs');
  },

  _validate() {
    const layout = this.$['document-create'];
    const result =
      layout.validate() &&
      this._doNativeValidation(this.$.form) &&
      this.$.form.validate() &&
      this._isValidType(this.selectedDocType);
    if (result) {
      return result;
    }
    const innerLayout = layout.$.layout;
    const nodes = innerLayout._getValidatableElements(innerLayout.element.root);
    const invalidField = nodes.find((node) => node.invalid);
    invalidField.scrollIntoView();
    invalidField.focus();
  },

  _create() {
    if (!this._validate() || !this.canCreate) {
      return;
    }
    this.document.name = this.document.name || this._sanitizeName(this.document.properties['dc:title']);
    this.set('creating', true);
    this.$.docRequest
      .post()
      .then((response) => {
        this.$.creationStats.storeType(this.selectedDocType.id);
        this._clear();
        this.navigateTo('browse', response.path);
        this._notify(response);
        this.set('creating', false);
      })
      .catch((err) => {
        this.set('creating', false);
        this.fire('notify', { message: this.i18n('documentCreationForm.createError') });
        console.error(err);
      });
  },

  _back() {
    this._clear();
    this.fire('nx-creation-wizard-show-tabs');
  },

  _cancel() {
    this._clear();
    this.document = undefined;
    this.fire('nx-creation-wizard-show-tabs');
  },

  _newDocumentLabel() {
    return this.i18n('documentCreationForm.newDoc.heading', this._getTypeLabel(this.selectedDocType));
  },

  _clear() {
    this.stage = 'choose';
    this.selectedDocType = {};
  },

  _visibleOnStage() {
    this.$.pathSuggesterChoose.disabled = !this.visible || this.stage !== 'choose';
    this.$.pathSuggesterEdit.disabled = !this.visible || this.stage !== 'edit';
  },

  _layoutUpdated(e) {
    this.async(() => {
      const input = e.detail.value.querySelector('[autofocus]');
      if (input) {
        input.focus();
      }
    });
  },

  _submitKeyHandler(e) {
    if (e.detail.keyboardEvent.target.tagName === 'INPUT') {
      this._create();
    }
  },

  _canCreate() {
    return this.canCreate && !this.creating;
  },

  // trigger native browser invalid-form UI
  _doNativeValidation(/* form */) {
    const fakeSubmit = document.createElement('input');
    fakeSubmit.setAttribute('type', 'submit');
    fakeSubmit.style.display = 'none';
    // TODO: this breaks fields bound to multivalued nuxeo-directory-suggestion
    /* form._form.appendChild(fakeSubmit);
    fakeSubmit.click();
    form._form.removeChild(fakeSubmit);
    return form._form.checkValidity(); */
    return true;
  },
});

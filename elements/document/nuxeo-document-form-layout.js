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
`nuxeo-document-form-layout`
@group Nuxeo UI
@element nuxeo-document-form-layout
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
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
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      .actions {
        @apply --buttons-bar;
        @apply --layout-horizontal;
        @apply --layout-flex;
        @apply --layout-justified;
      }

      .scrollable {
        padding: 0 24px;
        max-height: 60vh;
        @apply --layout-scroll;
      }
    </style>

    <nuxeo-document id="doc" doc-id="[[document.uid]]" response="{{document}}" headers="[[headers]]" sync-indexing=""></nuxeo-document>

    <iron-form id="form">
      <form>
        <div class="scrollable">
          <nuxeo-document-layout id="layout" document="{{document}}" layout="[[layout]]"></nuxeo-document-layout>
        </div>
        <div class="actions">
          <paper-button on-tap="cancel" noink="">[[i18n('command.cancel')]]</paper-button>
          <paper-button id="save" on-tap="save" noink="" class="primary">[[i18n('command.save')]]</paper-button>
        </div>
      </form>
    </iron-form>
`,

  is: 'nuxeo-document-form-layout',
  behaviors: [IronResizableBehavior, I18nBehavior],

  properties: {
    document: {
      type: Object,
      notify: true
    },

    layout: {
      type: String,
      value: 'edit'
    },

    headers: {
      type: Object
    }
  },

  observers: [
    '_documentChanged(document.*)'
  ],

  _validate: function() {
    // run our custom validation function first to allow setting custom native validity
    var result = this.$.layout.validate() && this._doNativeValidation(this.$.form) && this.$.form.validate();
    if (result) {
      return result;
    } else {
      var layout = this.$.layout.$.layout;
      var nodes = layout._getValidatableElements(layout.element.root);
      var invalidField = nodes.find(function(node) {
        return node.invalid;
      });
      invalidField.scrollIntoView();
      invalidField.focus();
    }
  },

  _doSave: function() {
    if (!this.document.uid) { // create
      this.$.doc.data = this.document;
      return this.$.doc.post()
    } else { // edit
      this.$.doc.data = {
        'entity-type': 'document',
        uid: this.document.uid,
        properties: this._dirtyProperties
      };
      return this.$.doc.put();
    }
  },

  save: function() {
    if (!this._validate()) {
      return;
    }
    this._doSave().then(this._refresh.bind(this), function(err) {
      this.fire('notify', {message: this.i18n('document.saveError')});
      console.error(err);
    }.bind(this));
  },

  cancel: function() {
    this._refresh();
    this.document = undefined;
  },

  _refresh: function() {
    this.fire('document-updated');
  },

  _documentChanged: function(e) {
    if (e.path === 'document') {
      this._dirtyProperties = {};
    } else {
      // copy dirty properties (cannot patch complex or list properties)
      var match = e.path.match(/^document\.properties\.([^\.]*)/);
      if (match) {
        var prop = match[1];
        this._dirtyProperties[prop] = this.document.properties[prop];
      }
    }
  },

  // trigger native browser invalid-form UI
  _doNativeValidation: function(/*form*/) {
    /*var fakeSubmit = document.createElement('input');
    fakeSubmit.setAttribute('type', 'submit');
    fakeSubmit.style.display = 'none';
    form._form.appendChild(fakeSubmit);
    fakeSubmit.click();
    form._form.removeChild(fakeSubmit);
    return form._form.checkValidity();*/
    return true;
  }
});

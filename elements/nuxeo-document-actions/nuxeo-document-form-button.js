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
`nuxeo-document-form-button`
@group Nuxeo UI
@element nuxeo-document-form-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
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
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      .container {
        margin: 0;
        padding: 24px 0 0 0;
      }
      @media (min-width: 1024px) {
        nuxeo-dialog {
          min-width: 915px;
        }
      }
    </style>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="action" on-tap="_openDialog">
        <paper-icon-button noink="" id="[[layout]]-button" icon="[[icon]]"></paper-icon-button>
        <span class="label" hidden\$="[[!showLabel]]">[[i18n(label)]]</span>
      </div>
      <nuxeo-tooltip for="[[layout]]-button">[[i18n(label)]]</nuxeo-tooltip>
    </template>

    <nuxeo-dialog id="[[layout]]-dialog" no-auto-focus="" with-backdrop="" modal="">
      <div class="container">
        <nuxeo-document-form-layout id="layout" document="[[document]]" layout="[[layout]]" on-document-updated="_closeDialog"></nuxeo-document-form-layout>
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
      type: Object
    },

    /**
     * Document form layout to load (default is `edit`)
     */
    layout: {
      type: String,
      value: 'edit'
    },

    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    label: {
      type: String
    },

    icon: {
      type: String,
      value: 'nuxeo:edit'
    },
  },

  get dialog() {
    return this.root.getElementById(this.layout + '-dialog');
  },

  get button() {
    return this.root.getElementById(this.layout + '-button');
  },

  _isAvailable: function(doc) {
    return doc && doc.type !== 'Root' && this.hasPermission(doc, 'Write') && this._isMutable(doc);
  },

  _isMutable: function(doc) {
    return doc && !this.hasFacet(doc, 'Immutable') && doc.type !== 'Root' && !this.isTrashed(doc);
  },

  _openDialog: function() {
    this.dialog.open();
  },

  _closeDialog: function() {
    this.dialog.close();
  }
});

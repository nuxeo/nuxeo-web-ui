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
import '@polymer/iron-flex-layout/iron-flex-layout.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/social-icons.js';
import '@polymer/iron-pages/iron-pages.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
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
      #container {
        margin: 0;
        padding: 0;
      }

      iron-pages,
      nuxeo-document-import {
        /*Firefox fix (NXP-22349)*/
        min-height: 100%;
      }

      #container {
        height: 250px;
        min-width: 50vw;
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

    <template is="dom-if" if="[[_isAvailable(document, documents.splices)]]">
      <div class="action" on-tap="_toggleDialog">
        <paper-icon-button id="publishButton" icon="[[icon]]" noink=""></paper-icon-button>
        <span class="label" hidden\$="[[!showLabel]]">[[_label]]</span>
        <nuxeo-tooltip>[[_label]]</nuxeo-tooltip>
      </div>
    </template>

    <nuxeo-dialog id="publishDialog" modal="" opened="{{opened}}" no-auto-focus="">
      <paper-tabs selected="{{selectedTab}}" attr-for-selected="name" noink="">
        <nuxeo-slot slot="PUBLISH_ITEMS" model="[[publishContext]]"></nuxeo-slot>
      </paper-tabs>
      <div id="container" class="vertical layout flex">
        <iron-pages selected="[[selectedTab]]" attr-for-selected="name" selected-attribute="visible">
          <nuxeo-slot slot="PUBLISH_PAGES" model="[[publishContext]]"></nuxeo-slot>
        </iron-pages>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-publish-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    /**
     * Input document.
     */
    document: Object,

    /**
     * Input documents.
     */
    documents: Object,

    /**
      * Icon to use (iconset_name:icon_name).
      */
    icon: {
      type: String,
      value: 'editor:publish',
    },

    selectedTab: {
      type: String,
      value: 'internal'
    },
    publishContext: {
      type: Object,
      computed: '_publishContext(document, documents.splices, i18n, opened)'
    },
    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },
    _label: {
      type: String,
      computed: '_computeLabel(i18n)'
    }
  },

  listeners: {
    'nx-publish-success': '_close',
    'cancel': '_close'
  },

  _toggleDialog: function() {
    this.$.publishDialog.toggle();
  },

  _close: function() {
    this.$.publishDialog.close();
  },

  _publishContext: function() {
    return this.opened ? {document: this.document, documents: this.documents, i18n: this.i18n} : {};
  },

  _computeLabel: function() {
    return this.i18n('publication.button.tooltip');
  },

  _isAvailable: function() {
    return (this.document && this.isPublishable(this.document)) || (this.documents && this.documents.every(
      function(doc) {
        return this.isPublishable(doc);
      }.bind(this)));
  },

  _checkDocsPermissions: function() {
    this.docsHavePermissions = this.documents && !(this.documents.some(
      function(document) {
        return !this._docHasPermissions(document);
      }.bind(this)));
    return this.docsHavePermissions;
  }
});

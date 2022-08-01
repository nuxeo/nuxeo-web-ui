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

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';

import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import './nuxeo-document-form-button.js';

/**
`nuxeo-parent-inspector-button`
@group Nuxeo UI
@element nuxeo-parent-inspector-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      nuxeo-dialog {
        height: 100%;
        top: 173px;
        max-height: var(--nuxeo-document-form-popup-max-height, 60vh);
        min-width: var(--nuxeo-document-form-popup-min-width, 915px);
        margin: 0;
        overflow: scroll;
      }

      .container {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        position: absolute;
      }

      .header {
        margin-left: 10px;
        margin-top: 10px;
      }
      .header p {
        line-height: 0;
        font-size: 16px;
        font-family: sans-serif;
      }

      h3 {
        margin-left: 10px;
        margin-top: 30px;
        line-height: 0;
      }

      .scrollable {
        padding: 0 24px;
        @apply --layout-scroll;
        @apply --layout-flex;
        @apply --layout-vertical;
      }

      .buttons {
        @apply --buttons-bar;
        @apply --layout-horizontal;
        @apply --layout-end-justified;
      }
      .papar-button {
        justify-content: unset;
        margin: 0;
        padding: 0;
      }
      .papar-icon-button {
        border: 2px solid #0066ff;
        color: #0066ff;
        margin: 12px;
        padding: 15px;
      }

      .parent-sub-folder {
        margin: 10px;
        margin-top: 22px;
        line-height: 18px;
      }
      .parent-sub-folder > div {
        max-width: 100%;
        display: flex;
      }
      .parent-sub-folder > div span {
        font-weight: bold;
        padding: 0.1rem;
        width: 45px;
      }
      .parent-sub-folder > div label {
        font-weight: 400;
      }
      .parent-facets {
        display: flex;
        flex-wrap: wrap;
      }
      .parent-schemas {
        display: flex;
        flex-wrap: wrap;
      }
      .parent-items {
        margin: 8px;
        color: black;
        width: 37%;
        padding: 5px 40px;
        border: 2px solid;
        border-radius: 30px;
        text-align: center;
      }
      paper-button.secondary {
        margin-top: 15px;
        border: var(--nx-button-secondary_-_border);
        background-color: var(--nx-button-secondary_-_background-color);
        color: var(--nx-button-secondary_-_color);
      }
      paper-button.secondary:hover,
      paper-button.secondary:focus {
        border: var(--nx-button-secondary-hover_-_border);
        color: var(--nx-button-secondary-hover_-_color);
      }
    </style>

    <nuxeo-connection id="nxcon" user="{{currentUser}}" url="{{url}}"></nuxeo-connection>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="action" on-tap="_openDialog">
        <paper-icon-button icon="[[icon]]" aria-labelledby="label"></paper-icon-button>
        <nuxeo-tooltip>[[i18n('parent.inspector.label')]]</nuxeo-tooltip>
      </div>
    </template>

    <nuxeo-dialog id="dialog" with-backdrop modal>
      <div class="container">
        <div class="scrollable">
          <div class="header">
            <h2>Parent Inspector</h2>
            <p>[[i18n('parent.inspector.text')]]</p>
          </div>
          <div class="parent-sub-folder">
            <div>
              <span>Title:</span>
              <label>[[document.title]]</label>
            </div>
            <div>
              <span>Path:</span>
              <label>[[document.path]]</label>
            </div>
            <div style="[[_isAdmin]]">
              <span>UID:</span>
              <label>[[document.uid]]</label>
            </div>
          </div>

          <div>
            <h3>Facets:</h3>
            <div class="parent-facets">
              <template is="dom-repeat" items="[[_facets]]" as="facets">
                <div class="parent-items">[[facets]]</div>
              </template>
            </div>
          </div>

          <template is="dom-if" if="[[currentUser.isAdministrator]]">
            <div>
              <h3>Schemas:</h3>
              <div class="parent-schemas">
                <template is="dom-repeat" items="[[_schemas]]" as="schemas">
                  <div class="parent-items">[[schemas.prefix]]:[[schemas.name]]</div>
                </template>
              </div>
            </div>
          </template>

          <div class="buttons papar-button">
            <paper-button class="secondary" dialog-dismiss>Cancel</paper-button>
          </div>
        </div>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-parent-inspector-button',
  behaviors: [I18nBehavior, Nuxeo.LayoutBehavior],

  properties: {
    /**
     * Input document.
     */
    document: {
      type: Object,
    },

    _schemas: {
      type: Array,
      value: [],
    },

    _facets: {
      type: Array,
      value: [],
    },

    _isAdmin: {
      type: Boolean,
    },

    icon: {
      type: String,
      value: 'account-box',
    },
  },

  get dialog() {
    this._isAdmin = !this.currentUser.isAdministrator ? 'display:none' : 'display:flex';
    this._facets =
      this.document &&
      this.document.contextParameters &&
      this.document.contextParameters.firstAccessibleAncestor.facets &&
      this.document.contextParameters.firstAccessibleAncestor.facets
        ? this.document.contextParameters.firstAccessibleAncestor.facets
        : [];
    this._schemas =
      this.document &&
      this.document.contextParameters &&
      this.document.contextParameters.firstAccessibleAncestor.schemas &&
      this.document.contextParameters.firstAccessibleAncestor.schemas
        ? this.document.contextParameters.firstAccessibleAncestor.schemas
        : [];
    return this.$.dialog;
  },

  _isAvailable(doc) {
    return !!doc;
  },

  _openDialog() {
    this.dialog.open();
  },

  _closeDialog() {
    this.dialog.close();
  },
});

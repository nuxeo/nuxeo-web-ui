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

import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';

/**
`nuxeo-document-edit-button`
@group Nuxeo UI
@element nuxeo-parent-inspector-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      nuxeo-dialog {
        height: 90%;
        margin: 0;
      }

      .container {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
      }
      .facetschema {
        display: flex;
        flex-wrap: wrap;
        width: 645px;
      }
      .actions {
        @apply --buttons-bar;
        @apply --layout-horizontal;
        @apply --layout-justified;
      }
      .show-items {
        margin: 10px;
        color: black;
        width: 33%;
        padding: 5px 40px;
        border: 2px solid;
        border-radius: 30px;
        text-align: center;
      }
      .childscroll {
        margin-top: 24px;
        padding: 0 24px;
        @apply --layout-scroll;
        @apply --layout-flex;
        @apply --layout-vertical;
      }
      .scroll {
        height: 100%;
        @apply --layout-vertical;
      }
      .schemas {
        display: flex;
        flex-wrap: wrap;
        width: 645px;
      }
      .table {
        width: 100%;
      }
      td:first-child {
        font-weight: bold;
      }
      .firstELementFont {
        font-weight: bold;
      }
      paper-button.secondary {
        margin-top: 15px;
        border: var(--nx-button-secondary_-_border);
        background-color: var(--nx-button-secondary_-_background-color);
        color: var(--nx-button-secondary_-_color);
      }
    </style>
    <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>
    <div on-tap="_openDialog">
      <template is="dom-if" if="[[_isAvailableAndNotTrashed(document)]]">
        <paper-icon-button icon="[[icon]]" label="parent" aria-labelledby="Parent Inspector"> </paper-icon-button>
        <nuxeo-tooltip>This is a parent inspector</nuxeo-tooltip>
      </template>
    </div>

    <nuxeo-dialog id="dialog" with-backdrop modal>
      <div class="container">
        <div class="scroll">
          <div class="childscroll">
            <div>
              <h1>Parent Inspector</h1>
              <div>
                <p>This is the parent inspector. It displays information about the parent of this document.</p>
                <table class="table">
                  <tr>
                    <td>Title:</td>
                    <td>[[document.contextParameters.firstAccessibleAncestor.title]]</td>
                  </tr>
                  <tr>
                    <td>Path:</td>
                    <td>[[document.contextParameters.firstAccessibleAncestor.path]]</td>
                  </tr>
                  <template is="dom-if" if="[[currentUser.isAdministrator]]">
                    <tr>
                      <td>UID:</td>
                      <td>[[document.contextParameters.firstAccessibleAncestor.uid]]</td>
                    </tr>
                  </template>
                </table>
              </div>
            </div>
            <div>
              <h1 class="firstELementFont">Facets:</h1>
              <div class="facetschema">
                <template is="dom-repeat" items="[[_facets]]" as="facets">
                  <div class="show-items">[[facets]]</div>
                </template>
              </div>
            </div>
            <template is="dom-if" if="[[currentUser.isAdministrator]]">
              <div>
                <h1>Schemas:</h1>
                <div class="facetschema">
                  <template is="dom-repeat" items="[[_schemas]]" as="schemas">
                    <div class="show-items">[[schemas.prefix]]:[[schemas.name]]</div>
                  </template>
                </div>
              </div>
            </template>
          </div>
          <div class="actions">
            <paper-button class="secondary" on-tap="_closeDialog" role="button" tabindex="0"
              >[[i18n('command.close')]]</paper-button
            >
          </div>
        </div>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-parent-inspector-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    /**
     * Input document.
     */
    document: {
      type: Object,
    },
    icon: {
      type: String,
      value: 'icons:info',
    },
    _facets: {
      type: Array,
      value: [],
    },
    _schemas: {
      type: Array,
      value: [],
    },
  },
  _openDialog() {
    this.dialog.open();
  },
  _closeDialog() {
    this.dialog.close();
    /*  this.root.getElementById(`dialog`).close(); */
  },
  _isAvailableAndNotTrashed(docs) {
    return !!docs && !document.isTrashed;
  },
  get dialog() {
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
    return this.root.getElementById(`dialog`);
  },
});

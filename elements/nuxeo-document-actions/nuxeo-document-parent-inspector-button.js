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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import './nuxeo-document-form-button.js';
/**
`nuxeo-document-parent-inspector-button`
@group Nuxeo UI
@element nuxeo-document-parent-inspector-button
*/
class NuxeoDocumentParentInspectorButton extends mixinBehaviors([I18nBehavior, FiltersBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-action-button-styles">
        nuxeo-dialog {
          height: 100%;
          max-height: var(--nuxeo-document-form-popup-max-height, 60vh);
          min-width: var(--nuxeo-document-form-popup-min-width, 915px);
          margin: 0;
        }
        .parentscroll {
          height: 100%;
          @apply --layout-vertical;
        }
        .container {
          height: 100%;
          background: var(
            --paper-dialog_-_background,
            var(--paper-dialog-background-color, var(--primary-background-color))
          );
        }
        .table {
          width: 100%;
        }
        td:first-child {
          font-weight: bold;
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
        .facets {
          display: flex;
          flex-wrap: wrap;
          width: 645px;
        }
        .schemas {
          display: flex;
          flex-wrap: wrap;
          width: 645px;
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
      </style>
      <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>
      <template is="dom-if" if="[[_isAvailable(document)]]">
        <div class="action" on-tap="_openDialog">
          <paper-icon-button icon="[[icon]]" noink aria-labelledby="label"></paper-icon-button>
          <nuxeo-tooltip>[[i18n('parentInspectorButton.tooltip')]]</nuxeo-tooltip>
        </div>
      </template>
      <nuxeo-dialog id="dialog" with-backdrop modal>
        <div class="container">
          <div class="parentscroll">
            <div class="scrollable">
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
              <div class="facetscontainer">
                <h1>Facets:</h1>
                <div class="facets">
                  <template is="dom-repeat" items="[[_facets]]" as="facets">
                    <div class="show-items">[[facets]]</div>
                  </template>
                </div>
              </div>
              <template is="dom-if" if="[[currentUser.isAdministrator]]">
                <div class="schemascontainer">
                  <h1>Schemas:</h1>
                  <div class="schemas">
                    <template is="dom-repeat" items="[[_schemas]]" as="schemas">
                      <div class="show-items">[[schemas.prefix]]:[[schemas.name]]</div>
                    </template>
                  </div>
                </div>
              </template>
            </div>
            <div class="actions">
              <paper-button noink class="secondary" on-tap="_closeDialog" role="button" tabindex="0"
                >[[i18n('command.close')]]</paper-button
              >
            </div>
          </div>
        </div>
      </nuxeo-dialog>
    `;
  }

  static get is() {
    return 'nuxeo-document-parent-inspector-button';
  }

  static get properties() {
    return {
      document: {
        type: Object,
        notify: true,
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
    };
  }

  _isAvailable(docs) {
    return !!docs;
  }

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
    return this.$.dialog;
  }

  _openDialog() {
    this.dialog.open();
  }

  _closeDialog() {
    this.dialog.close();
  }
}

window.customElements.define(NuxeoDocumentParentInspectorButton.is, NuxeoDocumentParentInspectorButton);

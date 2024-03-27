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
      .inspector-container {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        position: absolute;
      }

      .inspector-header {
        margin-left: 10px;
        margin-top: 10px;
      }

      .inspector-header p {
        line-height: 0;
        font-size: 16px;
        font-family: sans-serif;
      }

      .inspector-h3 {
        margin-left: 10px;
        margin-top: 30px;
        line-height: 0;
      }

      .inspector-scrollable {
        padding: 20px 50px;
      }

      .inspector-paper-button {
        justify-content: unset;
        margin: 0;
        padding: 0;
      }

      .sub-folder {
        margin: 10px;
        margin-top: 22px;
        line-height: 18px;
      }

      .sub-folder > div {
        max-width: 100%;
        display: flex;
      }

      .sub-folder > div span {
        font-weight: bold;
        padding: 0.1rem;
        width: 45px;
      }

      .sub-folder > div label {
        font-weight: 400;
      }

      .inspector-facets,
      .inspector-schemas {
        display: flex;
        flex-wrap: wrap;
      }

      .inspector-items {
        margin: 8px;
        color: black;
        width: 37%;
        padding: 5px 40px;
        border: 2px solid;
        border-radius: 30px;
        text-align: center;
      }

      .secondary-button {
        margin-top: 15px;
        border: 2px solid #0066ff;
      }

      .inspector-parent-button {
        cursor: pointer;
      }

      nuxeo-dialog {
        height: 100%;
        top: 173px;
        max-height: var(--nuxeo-document-form-popup-max-height, 60vh);
        min-width: var(--nuxeo-document-form-popup-min-width, 915px);
        margin: 0;
        overflow: scroll;
      }
    </style>

    <nuxeo-connection id="nxcon" user="{{currentUser}}" url="{{url}}"></nuxeo-connection>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="inspector-action" on-tap="_openDialog">
        <button class="inspector-parent-button" aria-labelledby="label">Parent Inspector Button</button>
        <nuxeo-tooltip>[[i18n('parent.inspector.label')]]</nuxeo-tooltip>
      </div>
    </template>

    <nuxeo-dialog id="dialog" with-backdrop modal>
      <div class="inspector-container">
        <div class="inspector-scrollable">
          <div class="inspector-header">
            <h2>Parent Inspector</h2>
            <p>[[i18n('parent.inspector.text')]]</p>
          </div>
          <div class="sub-folder">
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
            <h3 class="inspector-h3">Facets:</h3>
            <div class="inspector-facets">
              <template is="dom-repeat" items="[[_facets]]" as="facets">
                <div class="inspector-items">[[facets]]</div>
              </template>
            </div>
          </div>
          <template is="dom-if" if="[[currentUser.isAdministrator]]">
            <div>
              <h3 class="inspector-h3">Schemas:</h3>
              <div class="inspector-schemas">
                <template is="dom-repeat" items="[[_schemas]]" as="schemas">
                  <div class="inspector-items">[[schemas.prefix]]:[[schemas.name]]</div>
                </template>
              </div>
            </div>
          </template>
          <div class="inspector-buttons inspector-paper-button">
            <paper-button class="secondary-button" dialog-dismiss>Cancel</paper-button>
          </div>
        </div>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-parent-inspector-button',
  behaviors: [I18nBehavior, Nuxeo.LayoutBehavior],

  properties: {
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
  },

  get dialog() {
    this._isAdmin = this.currentUser.isAdministrator ? 'display:flex' : 'display:none';

    this._facets =
      this.document && this.document.contextParameters && this.document.contextParameters.firstAccessibleAncestor.facets
        ? this.document.contextParameters.firstAccessibleAncestor.facets
        : [];
    this._schemas =
      this.document &&
      this.document.contextParameters &&
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

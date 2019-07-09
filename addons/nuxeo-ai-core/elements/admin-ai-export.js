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
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';

/**
`nuxeo-ai-admin`
@group Nuxeo UI
@element nuxeo-admin-ai-export
*/
class AdminAIExport extends mixinBehaviors([I18nBehavior], Nuxeo.Element, LayoutBehavior) {
  static get template() {
    return html`
      <style>
        .page {
          @apply --layout-horizontal;
        }

        .main {
          @apply --layout-vertical;
          @apply --layout-flex-3;
          padding: 2em 1em 0 2em;
          overflow: hidden;
        }

        .mainCard {
          padding: 1em;
        }

        .sideCard {
          padding: 1em 2em;
        }

        .side {
          @apply --layout-vertical;
          @apply --layout-flex-2;
          position: relative;
          margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
          min-height: 60vh;
          padding: 2em 2em 0 0;
        }

        .totalLabel {
          padding-right: 20px;
        }

        .row-container {
          @apply --layout-horizontal;
          @apply --layout-wrap;
        }

        /* #exportDatasetBtn {
            color: var(--nuxeo-button-primary-text);
            background-color: var(--nuxeo-button-primary-focus);
        } */
      </style>

      <nuxeo-operation id="aiExport" op="AI.DatasetExport"></nuxeo-operation>
      <nuxeo-operation id="aiExportStatus" op="AI.ExportStatus" on-response="_statusReceived"> </nuxeo-operation>
      <div class="page">
        <div class="main">
          <nuxeo-card heading="[[i18n('admin.ai.model.selection')]]">
            <div class="mainCard">
              <nuxeo-input class="widget" value="{{typeName}}" label="Document Type" type="text"> </nuxeo-input>
              <nuxeo-document-suggestion
                on-selected-item-changed="_updateItem"
                label=""
                placeholder="[[i18n('admin.ai.model.listing')]]"
                min-chars="0"
                role="widget"
                operation="AI.GetModel"
              >
              </nuxeo-document-suggestion>

              <paper-button id="exportDatasetBtn" noink on-tap="_export"
                >[[i18n('admin.ai.export.action')]]
              </paper-button>
            </div>
          </nuxeo-card>
        </div>
        <div class="side">
          <nuxeo-card heading="[[i18n('admin.ai.export')]]">
            <div class="sideCard">
              <div>
                <template is="dom-repeat" items="[[statuses]]">
                  <nuxeo-ai-export-progress status="[[item]]"></nuxeo-ai-export-progress>
                </template>
              </div>
            </div>
          </nuxeo-card>
        </div>
      </div>
    `;
  }

  static get is() {
    return 'nuxeo-admin-ai-export';
  }

  static get properties() {
    return {
      /**
       * Type to be used in query for export
       */
      typeName: {
        type: String,
        value: '',
      },
      /**
       * Document received from AI Cloud
       */
      currentDoc: {
        type: Object,
      },
      /**
       * A list of statuses from BAF
       */
      statuses: {
        type: Array,
        value: [],
      },
      /**
       * Flag to determine visibility of this element
       */
      visible: {
        type: Boolean,
        value: false,
        observer: '_visibleChanged',
      },
      /**
       * reference for scheduled call
       */
      _timeOut: {
        type: Number,
      },
    };
  }

  _visibleChanged(newVal) {
    if (newVal) {
      this.$.aiExportStatus.execute();
    } else if (!newVal && this._timeOut) {
      clearTimeout(this._timeOut);
    }
  }

  _statusReceived(resp) {
    this.statuses = resp.detail.response.value;
    // defines if the tab is currently active if so, we want to poll more often
    if (this.visible) {
      this._timeOut = setTimeout(this._poll, 2000, this.$.aiExportStatus);
    }
  }

  _poll(func) {
    return func.execute();
  }

  _updateItem(e) {
    this.$.currentDoc = e.detail.value;
  }

  _export() {
    if (!this._canExport()) {
      this.fire('notify', { message: 'Type and Model are required parameters' });
      return;
    }
    const props = this.$.currentDoc.properties;
    const inputs = props['ai_model:inputs'];
    const input = inputs.map((e) => e.name).join(',');

    const outputs = props['ai_model:outputs'];
    const output = outputs.map((e) => e.name).join(',');

    const query =
      `SELECT * FROM Document WHERE ecm:isProxy = 0` +
      ` AND ecm:isVersion = 0 AND ecm:isTrashed = 0 AND ecm:primaryType = '${this.typeName}'`;
    this.$.aiExport.params = {
      query,
      inputs: input,
      outputs: output,
    };

    this.$.aiExport
      .execute()
      .then((response) => {
        this.fire('notify', { message: this.i18n('admin.ai.export.success') });
        return response.value;
      })
      .catch(() => {
        this.fire('notify', { message: this.i18n('admin.ai.export.error') });
      });
  }

  _canExport() {
    return this.typeName.length !== 0 && this.$.currentDoc != null;
  }
}

customElements.define(AdminAIExport.is, AdminAIExport);
Nuxeo.AdminAIExport = AdminAIExport;

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
import { IronFormElementBehavior } from '@polymer/iron-form-element-behavior';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import './nuxeo-ai-icons.js';

/**
 * `nuxeo-ai-export-progress` an export progress template.
 *
 *     <nuxeo-ai-export-progress status="{{status}}">
 *     </nuxeo-ai-export-progress>
 *
 * @memberof Nuxeo
 */
class AIExportProgress extends mixinBehaviors([I18nBehavior, IronFormElementBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style>
        .model_title {
          margin: 0;
        }

        .progress_counter {
          /* margin: 0; */
          font-style: italic;
          font-size: 85%;
        }

        .inlineElements {
          display: flex;
          justify-content: left;
        }

        .progressAction {
          margin: -1em 0 0 1em;
        }

        .progress_bar {
          width: 100%;
        }

        .secondary_error_label {
          opacity: 0.5;
        }

        .page {
          @apply --layout-horizontal;
        }

        .main {
          @apply --layout-vertical;
          @apply --layout-flex-3;
          overflow: hidden;
        }

        .side {
          @apply --layout-vertical;
          @apply --layout-flex-2;
          margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
          min-height: 60vh;
        }

        paper-progress {
          --paper-progress-active-color: var(--paper-blue-600);
          --paper-progress-secondary-color: var(--paper-orange-400);
        }
      </style>

      <nuxeo-operation id="aiExportInterrupt" op="AI.ExportInterrupt"></nuxeo-operation>
      <nuxeo-operation id="aiExportRestart" op="AI.ExportRestart"></nuxeo-operation>
      <div class="progress">
        <p class="model_title">[[_modelName]]</p>
        <div class="page">
          <div class="widget main">
            <paper-progress
              class="progress_bar"
              value="[[_progress]]"
              secondary-progress="[[_errorProgress]]"
            ></paper-progress>
            <p class="progress_counter">
              [[_processed]]/[[_total]] documents <i class="secondary_error_label">[[_errorCount]] errors</i>
            </p>
          </div>

          <paper-icon-button
            icon="[[_actionName]]"
            id="progressAction"
            class="progressAction"
            on-tap="_run"
            class="side"
          ></paper-icon-button>
        </div>
      </div>
    `;
  }

  static get is() {
    return 'nuxeo-ai-export-progress';
  }

  static get properties() {
    return {
      status: {
        type: Object,
        observer: '_statusUpdated',
      },
      _id: {
        type: String,
      },
      _modelName: {
        type: String,
        value: 'NONAME',
      },
      _state: {
        type: String,
        value: 'UNKNOWN',
        observer: '_stateChanged',
      },
      _processed: {
        type: Number,
        value: -1,
        observer: '_processedUpdated',
      },
      _total: {
        type: Number,
        value: -1,
      },
      _progress: {
        type: Number,
        value: 0,
      },
      _errorProgress: {
        type: Number,
        value: 0,
      },
      _errorCount: {
        type: Number,
        value: 0,
      },
      _actionName: {
        type: String,
        value: 'Unknown',
      },
    };
  }

  _statusUpdated(newVal) {
    this._id = newVal.id;
    this._modelName = newVal.name;
    this._state = newVal.state;
    this._setActionName(newVal.state);
    this._total = newVal.total;
    this._errorCount = newVal.errorCount;
    this._processed = newVal.processed;
  }

  _processedUpdated(newVal) {
    if (this._total < 1 || newVal < 1) {
      return 0;
    }

    this._progress = (newVal * 100) / this._total - this._errorCount;
    this._errorProgress = this._progress + this._errorCount;
  }

  _stateChanged(newVal) {
    switch (newVal) {
      case 'SCHEDULED':
      case 'SCROLLING_RUNNING':
      case 'RUNNING':
      case 'COMPLETED':
        this.$.progressAction.disabled = false;
        break;
      case 'ABORTED':
        this.$.progressAction.disabled = true;
        break;
      default:
      /* NOP */
    }

    this._setActionName(newVal);
  }

  _setActionName(state) {
    switch (state) {
      case 'SCHEDULED':
      case 'SCROLLING_RUNNING':
      case 'RUNNING':
        this._actionName = 'cancel';
        break;
      case 'COMPLETED':
      case 'ABORTED':
        this._actionName = 'autorenew';
        break;
      default:
      /* NOP */
    }
  }

  _run() {
    let action = null;
    let op = null;
    switch (this._state) {
      case 'SCHEDULED':
      case 'SCROLLING_RUNNING':
      case 'RUNNING':
        op = this.$.aiExportInterrupt;
        action = 'Interrupt';
        break;
      case 'COMPLETED':
        action = 'Restart';
        op = this.$.aiExportRestart;
        break;
      default:
      /* NOP */
    }

    if (op == null) {
      this.fire('notify', { message: `Cannot run an operation with state: ${this._state}` });
      return;
    }

    op.params = {
      commandId: this._id,
    };

    op.execute()
      .then((response) => {
        this.fire('notify', { message: `Successfully performed ${action}` });
        return response.value;
      })
      .catch(() => {
        this.fire('notify', `Could not perform ${action}`);
      });
  }
}

customElements.define(AIExportProgress.is, AIExportProgress);
Nuxeo.AIExportProgress = AIExportProgress;

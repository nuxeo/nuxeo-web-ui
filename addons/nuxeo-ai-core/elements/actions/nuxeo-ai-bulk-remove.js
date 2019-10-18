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
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '../nuxeo-ai-icons.js';

/**
 * `nuxeo-ai-bulk-remove` an export progress template.
 *
 *     <nuxeo-ai-bulk-remove provider=[[provider]]>
 *     </nuxeo-ai-bulk-remove>
 *
 * @memberof Nuxeo
 */

class BulkRemoveButton extends mixinBehaviors([I18nBehavior, FiltersBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <nuxeo-operation-button
        id="aiBulkRemoveOpBtn"
        operation="Bulk.RunAction"
        input="[[provider]]"
        params="[[_params(modelId, xpaths)]]"
        icon="icons:speaker-notes-off"
        label="ai.bulkRemoveButton.label"
        show-label$="[[showLabel]]"
        error-label="ai.bulkRemoveButton.action.error"
        on-response="_responseReceived"
      >
      </nuxeo-operation-button>
    `;
  }

  static get is() {
    return 'nuxeo-ai-bulk-remove-button';
  }

  static get properties() {
    return {
      /**
       * Page provider from which results are to be exported.
       */
      provider: {
        type: Object,
      },
      /**
       * The interval to poll for the result, in milliseconds.
       */
      pollInterval: {
        type: Number,
        value: 1000,
      },
      /**
       * A custom modelId for which all suggestions will be removed.
       */
      modelId: {
        type: String,
      },
      /**
       * A comma separated list of xpaths for which all suggestions will be removed.
       */
      xpaths: {
        type: String,
      },
      /**
       * `true` if the action should display the label, `false` otherwise.
       */
      showLabel: {
        type: Boolean,
        value: false,
      },
      /**
       * Current action status.
       */
      status: {
        type: Object,
        notify: true,
      },
    };
  }

  _params() {
    const actionParams = {};
    if (this.modelId) {
      actionParams.modelId = this.modelId.split(',').map((s) => s.trim());
    }
    if (this.xpaths) {
      actionParams.xpaths = this.xpaths.split(',').map((s) => s.trim());
    }
    return {
      action: 'bulkEnrichRemove',
      parameters: JSON.stringify(actionParams),
    };
  }

  _responseReceived() {
    this.fire('notify', { message: this.i18n('ai.bulkRemoveButton.action.poll') });
  }
}

customElements.define(BulkRemoveButton.is, BulkRemoveButton);
Nuxeo.AI = Nuxeo.AI || {};
Nuxeo.AI.BulkRemoveButton = BulkRemoveButton;

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
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';

/**
`nuxeo-move-contents-to-coldstorage-button`
@group Nuxeo UI
@element nuxeo-move-contents-to-coldstorage-button
*/
class BulkMoveToColdStorage extends mixinBehaviors([FiltersBehavior, FormatBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-action-button-styles nuxeo-styles"></style>
      <nuxeo-operation id="opMove" op="Document.MoveToColdStorage"></nuxeo-operation>
      <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>

      <dom-if if="[[_isAvailable(documents, currentUser)]]">
        <template>
          <div class="action" on-click="_toggleDialog">
            <paper-icon-button icon="nuxeo:coldstorage" noink></paper-icon-button>
            <nuxeo-tooltip>[[i18n('moveDocumentsContentsToColdStorage.tooltip')]]</nuxeo-tooltip>
          </div>
        </template>
      </dom-if>

      <nuxeo-dialog id="contentsToMoveDialog" with-backdrop>
        <h2>[[i18n('moveDocumentsContentsToColdStorage.ask.confirmation')]]</h2>
        <p>
          [[i18n('moveDocumentsContentsToColdStorage.description')]]
        </p>

        <div class="buttons">
          <paper-button id="cancel" name="cancel" noink dialog-dismiss>
            [[i18n('moveDocumentsContentsToColdStorage.cancel')]]
          </paper-button>
          <paper-button id="confirm" name="confirm" class="primary" noink dialog-confirm on-click="_toggle">
            [[i18n('moveDocumentsContentsToColdStorage.confirm')]]
          </paper-button>
        </div>
      </nuxeo-dialog>
    `;
  }

  static get is() {
    return 'nuxeo-move-contents-to-coldstorage-button';
  }

  static get properties() {
    return {
      /**
       * Input documents.
       */
      documents: {
        type: Array,
        notify: true,
        value: [],
      },

      /**
       * Current user.
       */
      currentUser: Object,
    };
  }

  _toggleDialog() {
    this.$.contentsToMoveDialog.toggle();
  }

  _canMoveDocument(doc) {
    return (
      (this.hasAdministrationPermissions(this.currentUser) || this.hasPermission(doc, 'WriteColdStorage')) &&
      !this.hasFacet(doc, 'ColdStorage') &&
      this.hasContent(doc)
    );
  }

  _isAvailable(documents) {
    return documents.length > 0 && documents.every((doc) => this._canMoveDocument(doc));
  }

  _toggle() {
    const uids = this.documents.map((doc) => doc.uid).join(',');
    this.$.opMove.input = `docs:${uids}`;
    this.$.opMove
      .execute()
      .then(() => {
        this.documents = [];
        this.dispatchEvent(
          new CustomEvent('refresh', {
            composed: true,
            bubbles: true,
          }),
        );

        this.dispatchEvent(
          new CustomEvent('notify', {
            composed: true,
            bubbles: true,
            detail: { message: this.i18n('moveDocumentsContentsToColdStorage.success') },
          }),
        );
      })
      .catch((error) => {
        this.dispatchEvent(
          new CustomEvent('notify', {
            composed: true,
            bubbles: true,
            detail: { message: this.i18n('moveDocumentsContentsToColdStorage.error') },
          }),
        );
        throw error;
      });
  }
}

customElements.define(BulkMoveToColdStorage.is, BulkMoveToColdStorage);

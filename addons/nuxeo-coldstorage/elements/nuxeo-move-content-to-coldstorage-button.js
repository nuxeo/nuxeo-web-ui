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
`nuxeo-move-content-to-coldstorage-button`
@group Nuxeo UI
@element nuxeo-move-content-to-coldstorage-button
*/
class MoveToColdStorage extends mixinBehaviors([FiltersBehavior, FormatBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-action-button-styles nuxeo-styles"></style>
      <nuxeo-operation id="opMove" op="Document.MoveToColdStorage" input="[[document.uid]]"></nuxeo-operation>
      <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>

      <dom-if if="[[_isAvailable(document, currentUser)]]">
        <template>
          <div class="action" on-click="_toggleDialog">
            <paper-icon-button icon="nuxeo:coldstorage" noink></paper-icon-button>
            <span class="label">[[i18n('documentContentView.moveToColdStorage.label')]]</span>
            <nuxeo-tooltip>[[i18n('documentContentView.moveToColdStorage.tooltip')]]</nuxeo-tooltip>
          </div>
        </template>
      </dom-if>

      <nuxeo-dialog id="contentToMoveDialog" with-backdrop>
        <h2>[[i18n('documentContentView.moveToColdStorage.ask.confirmation')]]</h2>
        <p>
          [[i18n('documentContentView.moveToColdStorage.description')]]
        </p>

        <div class="buttons">
          <paper-button id="cancel" name="cancel" noink dialog-dismiss>
            [[i18n('documentContentView.moveToColdStorage.cancel')]]
          </paper-button>
          <paper-button id="confirm" name="confirm" class="primary" noink dialog-confirm on-click="_toggle">
            [[i18n('documentContentView.moveToColdStorage.confirm')]]
          </paper-button>
        </div>
      </nuxeo-dialog>
    `;
  }

  static get is() {
    return 'nuxeo-move-content-to-coldstorage-button';
  }

  static get properties() {
    return {
      /**
       * Input document.
       */
      document: Object,

      /**
       * Current user.
       */
      currentUser: Object,
    };
  }

  _toggleDialog() {
    this.$.contentToMoveDialog.toggle();
  }

  _isAvailable(document, currentUser) {
    return (
      !this.hasFacet(document, 'ColdStorage') &&
      (this.hasAdministrationPermissions(currentUser) || this.hasPermission(document, 'WriteColdStorage')) &&
      this.hasContent(document)
    );
  }

  _toggle() {
    this.$.opMove
      .execute()
      .then((doc) => {
        this.dispatchEvent(
          new CustomEvent('document-updated', {
            composed: true,
            bubbles: true,
            detail: { doc },
          }),
        );

        this.dispatchEvent(
          new CustomEvent('notify', {
            composed: true,
            bubbles: true,
            detail: { message: [[this.i18n('documentContentView.moveToColdStorage.success')]] },
          }),
        );
      })
      .catch((error) => {
        this.dispatchEvent(
          new CustomEvent('notify', {
            composed: true,
            bubbles: true,
            detail: { message: [[this.i18n('documentContentView.moveToColdStorage.error')]] },
          }),
        );
        throw error;
      });
  }
}

customElements.define(MoveToColdStorage.is, MoveToColdStorage);

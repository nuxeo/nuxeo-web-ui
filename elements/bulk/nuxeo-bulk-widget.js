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
import '@polymer/paper-item/paper-item.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-bulk-widget`
 This element is meant to be used in the context of the `<nuxeo-edit-documents-button>`, to transform the normal widgets
 in the loaded layout into bulk widgets (via injection). It is NOT meant to be used as a standalone element.
@group Nuxeo UI
@element nuxeo-bulk-widget
*/
class NuxeoBulkWidget extends mixinBehaviors([I18nBehavior], Nuxeo.Element) {
  static get is() {
    return 'nuxeo-bulk-widget';
  }

  static get template() {
    return html`
      <style>
        :host {
          display: flex;
          flex-direction: column;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .warning,
        .error {
          /* ensures that the bulk widget takes the same vertical space regardless of having a message or not */
          min-height: 20px;
        }
        .warning {
          color: var(--nuxeo-text-default, #3a3a54);
        }
        .error {
          color: var(--nuxeo-warn-text, #de350b);
        }
        label,
        span {
          @apply --nuxeo-label;
        }
        nuxeo-select {
          /* disable underline */
          --paper-input-container-underline: {
            display: none;
          }
          /* disable underline (focused) */
          --paper-input-container-underline-focus: {
            display: none;
          }
          /* remove padding on the paper-dropdown-menu */
          --nuxeo-select-dropdown-menu-padding: 0;
          /* remove padding on the paper-input */
          --nuxeo-select-input-container-padding: 0;
          /* tweak text inside the paper-input element */
          --paper-input-container-input: {
            font-size: 12px;
            text-align: end;
          }
          /* tweak text inside paper-items */
          --paper-item: {
            font-size: 12px;
          }
        }
        paper-item[disabled] {
          @apply --nx-button-text-disabled;
        }
      </style>
      <div class="header">
        <label for="options">[[label]]</label>
        <nuxeo-select selected="{{updateMode}}" attr-for-selected="id" id="options">
          <paper-item id="keep" label="[[i18n('bulkWidget.mode.keep')]]">
            [[i18n('bulkWidget.mode.keep')]]
          </paper-item>
          <paper-item id="replace" label="[[i18n('bulkWidget.mode.replace')]]">
            [[i18n('bulkWidget.mode.replace')]]
          </paper-item>
          <paper-item id="addValues" label="[[i18n('bulkWidget.mode.addValues')]]" disabled$="[[!_isMultivalued]]">
            [[i18n('bulkWidget.mode.addValues')]]
          </paper-item>
          <paper-item id="remove" label="[[i18n('bulkWidget.mode.remove')]]" disabled$="[[_required]]">
            [[i18n('bulkWidget.mode.remove')]]
          </paper-item>
        </nuxeo-select>
      </div>
      <slot></slot>
      <span class$="[[_messageClass]]">[[_message]]</span>
    `;
  }

  static get properties() {
    return {
      /**
       * Label of the widget. Usually the `label` of the wrapped element is removed and this one is used instead,
       * ensuring a consistent and more compact view of the bulk widgets.
       */
      label: String,
      /**
       * The mode used to update the value of the fields:
       * - `keep`: The field value is not changed.
       * - `replace`: The field value is replaced with another value.
       * - `remove`: The field value is cleared. Note: This mode is disabled if `_required` is `true`.
       */
      updateMode: {
        type: String,
        value: 'keep',
        observer: '_updateModeChanged',
      },
      /**
       * The text value of the message to be shown below the wrapped widget. Can be a warning or an error.
       */
      _message: String,
      /**
       * The CSS class to be used to style the message. Can be `warning` or `error`.
       */
      _messageClass: {
        type: String,
        value: 'warning',
      },
      /**
       * A flag to specify that the field should have a value, meaning that it cannot be cleared. Usually the `required`
       * of the wrapped element is removed and this one is used instead, making it so that the form can still be
       * submitted if the `keep` mode is selected and the wrapped widget is empty.
       */
      _required: Boolean,

      _isMultivalued: {
        type: Boolean,
        value: false,
      },
    };
  }

  static get observers() {
    return ['_updateMessage(_required, updateMode)'];
  }

  /**
   * Required to be considered a validatable element.
   */
  validate() {
    return true;
  }

  /**
   * Sets the `_message` with a specific value and styles it as a warning.
   */
  _setWarning(message) {
    this._message = message;
    this._messageClass = 'warning';
  }

  /**
   * Sets the `_message` with a specific value and styles it as an error.
   */
  _setError(message) {
    this._message = message;
    this._messageClass = 'error';
  }

  /**
   * Dispatches an event upwards when `updateMode` changes, containing `this` instance.
   */
  _updateModeChanged() {
    this.dispatchEvent(
      new CustomEvent('update-mode-changed', {
        bubbles: true,
        composed: true,
        detail: {
          bulkWidget: this,
        },
      }),
    );
  }

  /**
   * Updates the `_message` according to `_required` and `updateMode`.
   */
  _updateMessage() {
    if (this._required) {
      this._setWarning(this.i18n('bulkWidget.warning.required'));
    } else if (this.updateMode === 'remove') {
      this._setWarning(this.i18n('bulkWidget.warning.remove'));
    } else {
      this._setWarning();
    }
  }
}
window.customElements.define(NuxeoBulkWidget.is, NuxeoBulkWidget);

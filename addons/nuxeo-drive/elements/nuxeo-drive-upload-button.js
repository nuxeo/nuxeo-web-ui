/**
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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

import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { navigateTo } from './nuxeo-drive-protocol-handler.js';
import './nuxeo-drive-icons.js';

window.nuxeo = window.nuxeo || {};
const baseUrl = window.nuxeo.baseUrl || window.location.origin + window.location.pathname;

class NuxeoDriveUploadButton extends mixinBehaviors([I18nBehavior, FiltersBehavior], PolymerElement) {
  static get is() {
    return 'nuxeo-drive-upload-button';
  }

  static get properties() {
    return {
      document: Object,
      /**
       * `true` if the action should display the label, `false` otherwise.
       */
      showLabel: {
        type: Boolean,
        reflectToAttribute: true,
        value: false,
      },

      _showInstall: {
        type: Boolean,
        value: false,
      },

      _launched: {
        type: Boolean,
        value: false,
      },

      _driveOpened: {
        type: Boolean,
        value: false,
      },

      _hasToken: {
        type: Boolean,
        value: false,
      },
    };
  }

  static get template() {
    return html`
      <style include="nuxeo-action-button-styles"></style>

      <nuxeo-resource id="token" path="/token" params='{"application": "Nuxeo Drive"}'></nuxeo-resource>

      <template is="dom-if" if="[[_isAvailable(document)]]">
        <div class="action" on-click="_go">
          <paper-icon-button
            noink
            icon="nuxeo-drive:transfer"
            id="driveBtn"
            aria-labelledby="label"
          ></paper-icon-button>
          <span class="label" hidden$="[[!showLabel]]" id="label">[[i18n('driveUploadButton.tooltip')]]</span>
          <nuxeo-tooltip>[[i18n('driveUploadButton.tooltip')]]</nuxeo-tooltip>
        </div>
      </template>

      <nuxeo-dialog id="dialog" with-backdrop no-cancel-on-outside-click>
        <style>
          #dialog {
            margin-top: 0;
            top: 50%;
            transform: translateY(-50%);
            max-height: 80vh;
          }

          .dialog-content {
            text-align: center;
            padding: 24px 32px;
          }

          .dialog-content h1 {
            margin: 0 0 12px;
            font-size: 1.6em;
          }

          .dialog-content p {
            color: var(--secondary-text-color, #666);
            margin: 0 0 32px;
          }

          .launch-btn {
            display: block;
            background-color: var(--nuxeo-primary-color, #0066ff);
            color: #fff;
            text-transform: uppercase;
            margin: 0 auto 16px;
            width: fit-content;
            min-width: 200px;
          }

          .launch-btn[disabled] {
            background-color: var(--disabled-text-color, #9e9e9e);
          }

          .install-link {
            display: block;
            text-align: center;
            margin-top: 4px;
            font-size: 0.9em;
          }

          .dialog-content .failure-msg {
            color: var(--secondary-text-color, #666);
            margin: 12px 0 0;
            font-size: 0.9em;
          }

          .dialog-content .install-prompt {
            color: var(--secondary-text-color, #666);
            margin: 4px 0 8px;
            font-size: 0.9em;
          }

          .buttons {
            justify-content: center;
          }
        </style>
        <div class="dialog-content">
          <h1>[[i18n('driveButton.dialog.heading')]]</h1>
          <p>[[i18n('driveButton.dialog.description')]]</p>
          <paper-button class="launch-btn" on-click="_launchDrive" noink disabled$="[[_launched]]"
            >[[i18n('driveButton.dialog.open')]]</paper-button
          >
          <template is="dom-if" if="[[_showFailure(_launched, _driveOpened)]]">
            <p class="failure-msg">[[i18n('driveButton.dialog.couldNotOpen')]]</p>
          </template>
          <template is="dom-if" if="[[_showInstall]]">
            <p class="install-prompt">[[i18n('driveButton.dialog.install.prompt')]]</p>
            <nuxeo-drive-desktop-packages></nuxeo-drive-desktop-packages>
          </template>
          <template is="dom-if" if="[[!_showInstall]]">
            <a class="install-link" href="#" on-click="_toggleInstall">[[i18n('driveButton.dialog.install.link')]]</a>
          </template>
        </div>
        <div class="buttons">
          <paper-button dialog-dismiss class="secondary">[[i18n('command.close')]]</paper-button>
        </div>
      </nuxeo-dialog>

      <paper-toast id="toast"></paper-toast>
    `;
  }

  _isAvailable(doc) {
    if (!doc) return false;

    return (
      this.hasPermission &&
      this.hasFacet &&
      this.isProxy &&
      this.hasPermission(doc, 'Write') &&
      this.hasFacet(doc, 'Folderish') &&
      !this.isProxy(doc)
    );
  }

  _go() {
    if (this.$.dialog.opened) {
      return;
    }

    this._showInstall = false;
    this._launched = false;
    this._driveOpened = false;
    this._hasToken = false;
    this.$.token
      .get()
      .then((response) => {
        const tokens = response.entries.map((token) => token.id);
        if (tokens && tokens.length) {
          this._hasToken = true;
        }
      })
      .catch(() => {});

    this.$.dialog.toggle();
  }

  _launchDrive() {
    this._launched = true;
    this._driveOpened = false;
    const onBlur = () => {
      window.removeEventListener('blur', onBlur);
      this._driveOpened = true;
    };
    window.addEventListener('blur', onBlur);
    navigateTo(this.directTransferUrl);
  }

  _showFailure(launched, driveOpened) {
    return launched && !driveOpened;
  }

  _toggleInstall(e) {
    e.preventDefault();
    this._showInstall = true;
  }

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
  }

  get directTransferUrl() {
    return this._compressUploadUrl();
  }

  _compressUploadUrl() {
    const cleanBaseUrl = baseUrl.split('/ui/')[0].replace(/\/$/, '');
    const isHttps = cleanBaseUrl.startsWith('https') ? 1 : 0;
    const serverHost = cleanBaseUrl.replace('://', '/').split('/').slice(1).join('/');

    const serverBytes = new TextEncoder().encode(serverHost);
    if (serverBytes.length > 255) {
      const msg = this.i18n('driveUpload.serverUrlTooLong');
      this._showError(msg);
      throw new Error(msg);
    }

    const docPath = this.document.path.startsWith('/') ? this.document.path.slice(1) : this.document.path;
    const pathBytes = new TextEncoder().encode(docPath);

    const payload = new Uint8Array([isHttps, serverBytes.length, ...serverBytes, ...pathBytes]);
    const b64 = this._base64UrlSafeEncode(payload);
    return `nxdrive://direct-transfer/${b64}`;
  }

  _base64UrlSafeEncode(bytes) {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCodePoint(byte);
    });
    let b64 = btoa(binary);
    return b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }
}

customElements.define(NuxeoDriveUploadButton.is, NuxeoDriveUploadButton);

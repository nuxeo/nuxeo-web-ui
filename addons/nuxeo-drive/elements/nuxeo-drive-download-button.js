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
import { isPageProviderDisplayBehavior } from '../../../elements/select-all-helpers.js';
import './nuxeo-drive-icons.js';
import { base64UrlSafeEncode, navigateAndShowFallback } from './nuxeo-drive-utils.js';

window.nuxeo = window.nuxeo || {};
const baseUrl = window.nuxeo.baseUrl || window.location.origin + window.location.pathname;
const MAX_DIRECT_DOWNLOAD_DOCS = 25;

class NuxeoDriveDownloadButton extends mixinBehaviors([I18nBehavior], PolymerElement) {
  static get is() {
    return 'nuxeo-drive-download-button';
  }

  static get properties() {
    return {
      document: Object,

      documents: {
        type: Array,
        value: () => [],
      },

      showLabel: {
        type: Boolean,
        reflectToAttribute: true,
        value: false,
      },

      _installExpanded: {
        type: Boolean,
        value: false,
      },
    };
  }

  static get template() {
    return html`
      <style include="nuxeo-action-button-styles"></style>

      <div
        class="action"
        on-tap="_download"
        hidden$="[[!_isAvailable(documents.splices, documents.items.splices, documents.items.length, documents.selectedItems.splices, documents.selectedItems.length)]]"
      >
        <paper-icon-button noink icon="nuxeo-drive:download" id="driveBtn" aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[i18n('driveDownloadButton.tooltip')]]</span>
        <nuxeo-tooltip>[[i18n('driveDownloadButton.tooltip')]]</nuxeo-tooltip>
      </div>

      <nuxeo-dialog id="dialog" with-backdrop>
        <style>
          #dialog {
            margin-top: 0;
            top: 50%;
            transform: translateY(-50%);
            max-height: 80vh;
          }

          .dialog-content {
            padding: 16px 24px;
          }

          .dialog-content h1 {
            margin: 0 0 12px;
            font-size: 1.6em;
          }

          .dialog-content p {
            color: var(--primary-text-color, #333);
            margin: 0 0 16px;
          }

          .close-btn {
            border: 1px solid var(--nuxeo-primary-color, #0066ff);
            color: var(--nuxeo-primary-color, #0066ff);
            text-transform: uppercase;
            font-size: 0.9em;
            padding: 0.5em 1em;
          }

          .buttons {
            justify-content: flex-end;
          }

          .install-link {
            display: inline-block;
            margin-top: 4px;
            font-size: 0.9em;
          }
        </style>
        <div class="dialog-content">
          <h1>[[i18n('driveButton.dialog.heading')]]</h1>
          <p>[[i18n('driveButton.dialog.description')]]</p>
          <template is="dom-if" if="[[_installExpanded]]">
            <p>[[i18n('driveButton.dialog.install.prompt')]]</p>
            <nuxeo-drive-desktop-packages></nuxeo-drive-desktop-packages>
          </template>
          <template is="dom-if" if="[[!_installExpanded]]">
            <a class="install-link" href="#" on-click="_toggleInstall">[[i18n('driveButton.install.dialog.hint')]]</a>
          </template>
        </div>
        <div class="buttons">
          <paper-button dialog-dismiss class="close-btn">[[i18n('command.close')]]</paper-button>
        </div>
      </nuxeo-dialog>

      <paper-toast id="toast"></paper-toast>
    `;
  }

  _isAvailable() {
    return isPageProviderDisplayBehavior(this.documents)
      ? (this.documents.selectedItems || this.documents.items || []).length > 0
      : this.documents?.length > 0;
  }

  _download() {
    const uids = this._getSelectedDocumentUids();

    if (uids.length === 0) {
      this._showError(this.i18n('driveDownload.noDocumentsSelected'));
      return;
    }

    if (uids.length > MAX_DIRECT_DOWNLOAD_DOCS) {
      this._showError(this.i18n('driveDownload.tooManyDocuments', MAX_DIRECT_DOWNLOAD_DOCS));
      return;
    }

    try {
      this._installExpanded = false;
      navigateAndShowFallback(this, this.directDownloadUrl);
    } catch (e) {
      this._showError(e.userMessage || e.message);
    }
  }

  _toggleInstall(e) {
    e.preventDefault();
    this._installExpanded = true;
  }

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
  }

  _getSelectedDocumentUids() {
    if (isPageProviderDisplayBehavior(this.documents)) {
      return (this.documents.selectedItems || this.documents.items || []).map((doc) => doc.uid);
    }

    if (this.documents?.length > 0) {
      return this.documents.map((doc) => doc.uid);
    }

    if (this.document?.uid) {
      return [this.document.uid];
    }

    return [];
  }

  get directDownloadUrl() {
    const originalUrl = this._buildOriginalUrl();
    const compressedUrl = this._compressFromOriginalUrl(originalUrl);
    return compressedUrl;
  }

  _buildOriginalUrl() {
    const uids = this._getSelectedDocumentUids();
    const cleanBaseUrl = baseUrl.split('/ui/')[0].replace(/\/$/, '');
    const serverPath = cleanBaseUrl.replace('://', '/');
    const uuidStr = uids.join(' | ');

    return `nxdrive://direct-download/${serverPath}/${uuidStr}`;
  }

  _compressFromOriginalUrl(originalUrl) {
    const path = originalUrl.replace('nxdrive://direct-download/', '');
    const parts = path.split(' | ');
    const firstPart = parts[0];

    const segments = firstPart.split('/');
    const scheme = segments[0] === 'https' ? 1 : 0;
    const server = segments.slice(1, -1).join('/');
    const firstUuid = segments[segments.length - 1].replaceAll('-', '');

    const allUuidHex = [firstUuid];
    for (let i = 1; i < parts.length; i++) {
      allUuidHex.push(parts[i].trim().replaceAll('-', ''));
    }

    const uuidBinary = [];
    allUuidHex.forEach((hexStr) => {
      for (let i = 0; i < hexStr.length; i += 2) {
        uuidBinary.push(Number.parseInt(hexStr.substr(i, 2), 16));
      }
    });

    const serverBytes = new TextEncoder().encode(server);
    if (serverBytes.length > 255) {
      const userMessage = this.i18n('driveDownload.serverUrlTooLong');
      const err = new Error(userMessage);
      err.userMessage = userMessage;
      throw err;
    }
    const payload = new Uint8Array([scheme, serverBytes.length, ...serverBytes, allUuidHex.length, ...uuidBinary]);

    const b64 = base64UrlSafeEncode(payload);
    return `nxdrive://direct-download/${b64}`;
  }
}

customElements.define(NuxeoDriveDownloadButton.is, NuxeoDriveDownloadButton);

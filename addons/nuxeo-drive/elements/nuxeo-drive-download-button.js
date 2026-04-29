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
    };
  }

  static get template() {
    return html`
      <style include="nuxeo-action-button-styles"></style>

      <nuxeo-resource id="token" path="/token" params='{"application": "Nuxeo Drive"}'></nuxeo-resource>
      <div class="action" on-tap="_download" hidden$="[[!_isAvailable(documents.splices, documents.items.splices, documents.items.length)]]">
        <paper-icon-button noink icon="nuxeo-drive:download" id="driveBtn" aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[i18n('driveDownloadButton.tooltip')]]</span>
        <nuxeo-tooltip>[[i18n('driveDownloadButton.tooltip')]]</nuxeo-tooltip>
      </div>

      <nuxeo-dialog id="dialog" with-backdrop>
        <div class="vertical layout">
          <h1>[[i18n('driveEditButton.dialog.heading')]]</h1>
          <nuxeo-drive-desktop-packages></nuxeo-drive-desktop-packages>
        </div>
        <div class="buttons">
          <paper-button dialog-dismiss class="secondary">[[i18n('command.close')]]</paper-button>
        </div>
      </nuxeo-dialog>

      <paper-toast id="toast"></paper-toast>
    `;
  }

  _isAvailable() {
    return isPageProviderDisplayBehavior(this.documents)
      ? this.documents.items && this.documents.items.length > 0
      : this.documents && this.documents.length > 0;
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

    this.$.token
      .get()
      .then((response) => {
        const tokens = response.entries.map((token) => token.id);

        if (!tokens || !tokens.length) {
          this.$.dialog.toggle();
          return;
        }

        window.open(this.directDownloadUrl, '_top');
      })
      .catch(() => {
        this._showError(this.i18n('driveDownload.directTransfer.failed'));
      });
  }

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
  }

  _getSelectedDocumentUids() {
    if (isPageProviderDisplayBehavior(this.documents)) {
      return (this.documents.items || []).map((doc) => doc.uid);
    }

    if (this.documents && this.documents.length > 0) {
      return this.documents.map((doc) => doc.uid);
    }

    if (this.document && this.document.uid) {
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
    const firstUuid = segments[segments.length - 1].replace(/-/g, '');

    const allUuidHex = [firstUuid];
    for (let i = 1; i < parts.length; i++) {
      allUuidHex.push(parts[i].trim().replace(/-/g, ''));
    }

    const uuidBinary = [];
    allUuidHex.forEach((hexStr) => {
      for (let i = 0; i < hexStr.length; i += 2) {
        uuidBinary.push(parseInt(hexStr.substr(i, 2), 16));
      }
    });

    const serverBytes = new TextEncoder().encode(server);
    if (serverBytes.length > 255) {
      this._showError(this.i18n('driveDownload.serverUrlTooLong'));
      throw new Error(`Server URL is too long to encode (${serverBytes.length} bytes, max 255).`);
    }
    const payload = new Uint8Array([scheme, serverBytes.length, ...serverBytes, allUuidHex.length, ...uuidBinary]);

    const b64 = this._base64UrlSafeEncode(payload);
    return `nxdrive://direct-download/${b64}`;
  }

  _base64UrlSafeEncode(bytes) {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    let b64 = btoa(binary);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

customElements.define(NuxeoDriveDownloadButton.is, NuxeoDriveDownloadButton);

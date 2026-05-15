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
    };
  }

  static get template() {
    return html`
      <style include="nuxeo-action-button-styles"></style>

      <nuxeo-resource id="token" path="/token" params='{"application": "Nuxeo Drive"}'></nuxeo-resource>

      <template is="dom-if" if="[[_isAvailable(document)]]">
        <div class="action" on-tap="_go">
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

      <nuxeo-dialog id="dialog" with-backdrop>
        <div class="vertical layout">
          <h1>[[i18n('driveEditButton.dialog.heading')]]</h1>
          <nuxeo-drive-desktop-packages></nuxeo-drive-desktop-packages>
        </div>
        <div class="buttons">
          <paper-button dialog-dismiss class="secondary">[[i18n('command.close')]]</paper-button>
        </div>
      </nuxeo-dialog>

      <paper-toast id="toast">[[i18n('driveUpload.directTransfer.failed')]]</paper-toast>
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
    this.$.token
      .get()
      .then((response) => {
        const tokens = response.entries.map((token) => token.id);
        if (!tokens || !tokens.length) {
          this.$.dialog.toggle();
          return;
        }
        window.open(this.directTransferUrl, '_top');
      })
      .catch((error) => {
        console.error('Token fetch failed:', error);
        this.$.toast.toggle();
      });
  }

  get directTransferUrl() {
    const cleanBaseUrl = baseUrl.split('/ui/')[0].replace(/\/$/, '');
    const serverPath = cleanBaseUrl.replace('://', '/');
    const docPath = this.document.path.slice(1);
    const originalUrl = `nxdrive://direct-transfer/${serverPath}/${docPath}`;
    console.log('Original Direct Transfer URL:', originalUrl);
    return this._compressDirectTransferUrl(originalUrl);
  }

  _compressDirectTransferUrl(originalUrl) {
    const path = originalUrl.replace('nxdrive://direct-transfer/', '');
    const segments = path.split('/');
    const scheme = segments[0] === 'https' ? 1 : 0;
    const server = segments.slice(1).join('/');

    const serverBytes = new TextEncoder().encode(server);
    const payload = new Uint8Array([
        scheme,
        serverBytes.length,
        ...serverBytes
    ]);

    const b64 = this._base64UrlSafeEncode(payload);
    console.log('Compressed Direct Transfer URL:', `nxdrive://direct-transfer/${b64}`);
    return `nxdrive://direct-transfer/${b64}`;
}

  _base64UrlSafeEncode(bytes) {
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    let b64 = btoa(binary);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


}

customElements.define(NuxeoDriveUploadButton.is, NuxeoDriveUploadButton);

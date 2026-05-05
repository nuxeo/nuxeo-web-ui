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
      <div
        class="action"
        on-tap="_download"
        hidden$="[[!_isAvailable(documents.splices, documents.items.splices, documents.items.length)]]"
      >
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
      ? (this.documents.selectedItems || this.documents.items || []).length > 0
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

        this._openDriveUrl(this.directDownloadUrl);
      })
      .catch((err) => {
        this._showError(err && err.userMessage ? err.userMessage : this.i18n('driveDownload.directTransfer.failed'));
      });
  }

  // Invokes a nxdrive:// URL; shows the install dialog if Drive did not handle it.
  // Chrome/Edge/Safari: blur+debounce heuristic. Firefox: primary timeout only (no blur when Drive absent).
  _openDriveUrl(url) {
    let appOpened = false;
    let dialogShown = false;
    let blurDebounceTimer = null;
    let hardCapTimer = null;
    let debounceSettledAt = null;

    // Firefox never fires blur when Drive is absent, so onFocusAfterOpened must be
    // skipped for Firefox to avoid showing the install dialog when the user later
    // switches back to the browser after Drive opened successfully.
    const isFirefox = /firefox|fxios/i.test(navigator.userAgent);

    const cleanup = () => {
      clearTimeout(blurDebounceTimer);
      clearTimeout(hardCapTimer);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('focus', onFocusAfterOpened);
    };

    // Chrome/Edge/Safari only: called when focus returns after the blur debounce.
    // Quick return (< DRIVE_OPEN_TIMEOUT_MS) → OS "no handler" dialog dismissed → show install dialog.
    // Slow return (≥ DRIVE_OPEN_TIMEOUT_MS) → user switched back from Drive → suppress / auto-dismiss.
    const onFocusAfterOpened = () => {
      const elapsed = debounceSettledAt !== null ? Date.now() - debounceSettledAt : Infinity;
      if (elapsed < NuxeoDriveDownloadButton.DRIVE_OPEN_TIMEOUT_MS) {
        if (!dialogShown) {
          dialogShown = true;
          this.$.dialog.toggle();
        }
      } else if (dialogShown) {
        this.$.dialog.toggle();
        dialogShown = false;
      }
      cleanup();
    };

    // Focus returned quickly (< BLUR_DEBOUNCE_MS) — Drive handled the URL as a
    // background app and immediately returned focus. Mark handled so the primary
    // timeout does not show the install dialog.
    const onFocus = () => {
      clearTimeout(blurDebounceTimer);
      appOpened = true;
      if (dialogShown) {
        this.$.dialog.toggle();
        dialogShown = false;
      }
    };

    const onBlur = () => {
      blurDebounceTimer = setTimeout(() => {
        appOpened = true;
        debounceSettledAt = Date.now();
        window.removeEventListener('focus', onFocus);
        if (!isFirefox) {
          window.addEventListener('focus', onFocusAfterOpened, { once: true });
        }
        if (dialogShown) {
          // Primary timeout fired before the blur debounce — auto-dismiss since
          // a blur confirms Drive (or an OS dialog) was involved.
          this.$.dialog.toggle();
          dialogShown = false;
          window.removeEventListener('blur', onBlur);
          window.removeEventListener('focus', onFocusAfterOpened);
          clearTimeout(hardCapTimer);
          hardCapTimer = setTimeout(cleanup, 10000);
        }
      }, NuxeoDriveDownloadButton.BLUR_DEBOUNCE_MS);

      window.addEventListener('focus', onFocus, { once: true });
    };

    window.addEventListener('blur', onBlur);

    this._navigate(url);

    // Primary timeout: main "not installed" path for Firefox (no blur fires),
    // and fallback for Chrome/Safari if the OS dialog was never dismissed.
    setTimeout(() => {
      if (!appOpened) {
        dialogShown = true;
        this.$.dialog.toggle();
      }
    }, NuxeoDriveDownloadButton.DRIVE_OPEN_TIMEOUT_MS);

    hardCapTimer = setTimeout(cleanup, NuxeoDriveDownloadButton.DRIVE_OPEN_TIMEOUT_MS + 3000);
  }

  _navigate(url) {
    const a = document.createElement('a');
    a.href = url;
    a.style.cssText = 'display:none;position:absolute;left:-9999px;';
    a.setAttribute('aria-hidden', 'true');
    a.setAttribute('tabindex', '-1');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
  }

  _getSelectedDocumentUids() {
    if (isPageProviderDisplayBehavior(this.documents)) {
      return (this.documents.selectedItems || this.documents.items || []).map((doc) => doc.uid);
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
      const userMessage = this.i18n('driveDownload.serverUrlTooLong');
      const err = new Error(userMessage);
      err.userMessage = userMessage;
      throw err;
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

// How long (ms) to wait for window.blur before concluding Drive is not installed.
NuxeoDriveDownloadButton.DRIVE_OPEN_TIMEOUT_MS = 1500;

// How long (ms) the window must stay blurred to be treated as Drive having opened.
NuxeoDriveDownloadButton.BLUR_DEBOUNCE_MS = 300;

customElements.define(NuxeoDriveDownloadButton.is, NuxeoDriveDownloadButton);
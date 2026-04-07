/**
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
*/

import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import './nuxeo-drive-icons.js';

window.nuxeo = window.nuxeo || {};
const baseUrl = window.nuxeo.baseUrl || window.location.origin + window.location.pathname;

class NuxeoDriveDownloadButton extends mixinBehaviors([I18nBehavior, FiltersBehavior], PolymerElement) {
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

      <div class="action" on-tap="_download">
        <paper-icon-button noink icon="nuxeo-drive:transfer" id="driveBtn" aria-labelledby="label"></paper-icon-button>
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

  _download() {
    const uids = this._getSelectedDocumentUids();
    
    if (uids.length === 0) {
      this._showError('No documents selected for download');
      return;
    }
    
    if (uids.length > 25) {
      this._showError(this.i18n('driveDownload.tooManyDocuments', 25));
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
      .catch((error) => {
        console.error('Token fetch failed:', error);
        this._showError(this.i18n('driveDownload.directTransfer.failed'));
      });
  }

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
  }

  _getSelectedDocumentUids() {
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
    
    console.log('[Drive Download] Original URL:', originalUrl);
    console.log('[Drive Download] Original Length:', originalUrl.length);
    console.log('[Drive Download] Compressed URL:', compressedUrl);
    console.log('[Drive Download] Compressed Length:', compressedUrl.length);
    console.log('[Drive Download] Savings:', Math.round((1 - compressedUrl.length / originalUrl.length) * 100) + '%');
    
    // 🔥 Test decompression to verify correctness
    this._testDecompression(compressedUrl, originalUrl);
    
    return compressedUrl;
  }

  _buildOriginalUrl() {
    const uids = this._getSelectedDocumentUids();
    
    // Remove trailing slash from baseUrl before processing
    const cleanBaseUrl = baseUrl.split('/ui/')[0].replace(/\/$/, '');
    const serverPath = cleanBaseUrl.replace('://', '/');
    
    const uuidStr = uids.join(' || ');
    
    return `nxdrive://direct-download/${serverPath}/${uuidStr}`;
  }

  _compressFromOriginalUrl(originalUrl) {
    const path = originalUrl.replace('nxdrive://direct-download/', '');
    const parts = path.split(' || ');
    const firstPart = parts[0];
    
    const segments = firstPart.split('/');
    const scheme = segments[0] === 'https' ? 1 : 0;
    const server = segments[1];
    const firstUuid = segments[2].replace(/-/g, '');
    
    const allUuidHex = [firstUuid];
    for (let i = 1; i < parts.length; i++) {
      allUuidHex.push(parts[i].trim().replace(/-/g, ''));
    }
    
    const uuidBinary = [];
    allUuidHex.forEach(hexStr => {
      for (let i = 0; i < hexStr.length; i += 2) {
        uuidBinary.push(parseInt(hexStr.substr(i, 2), 16));
      }
    });
    
    const serverBytes = new TextEncoder().encode(server);
    const payload = new Uint8Array([
      scheme,
      serverBytes.length,
      ...serverBytes,
      allUuidHex.length,
      ...uuidBinary
    ]);
    
    const b64 = this._base64UrlSafeEncode(payload);
    return `nxdrive://direct-download/${b64}`;
  }

  _base64UrlSafeEncode(bytes) {
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    
    let b64 = btoa(binary);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // 🔥 Test decompression to verify the compression is correct
  _testDecompression(compressedUrl, expectedOriginalUrl) {
    try {
      const compressed = compressedUrl.replace('nxdrive://direct-download/', '');
      
      // Add padding if needed
      let padded = compressed.replace(/-/g, '+').replace(/_/g, '/');
      const padding = 4 - (padded.length % 4);
      if (padding !== 4) {
        padded += '='.repeat(padding);
      }
      
      // Decode Base64
      const binaryString = atob(padded);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log('[Decompression Test] Payload bytes:', Array.from(bytes));
      
      // Parse binary payload
      const scheme = bytes[0] === 1 ? 'https' : 'http';
      const serverLen = bytes[1];
      const serverBytes = bytes.slice(2, 2 + serverLen);
      const server = new TextDecoder().decode(serverBytes);
      const uuidCount = bytes[2 + serverLen];
      const uuidStart = 3 + serverLen;
      
      console.log('[Decompression Test] Scheme:', scheme);
      console.log('[Decompression Test] Server length:', serverLen);
      console.log('[Decompression Test] Server:', server);
      console.log('[Decompression Test] UUID count:', uuidCount);
      
      // Extract UUIDs
      const uuids = [];
      for (let i = 0; i < uuidCount; i++) {
        const offset = uuidStart + (i * 16);
        const uuidBytes = bytes.slice(offset, offset + 16);
        let hex = '';
        uuidBytes.forEach(byte => {
          hex += byte.toString(16).padStart(2, '0');
        });
        const uuid = `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20)}`;
        uuids.push(uuid);
        console.log('[Decompression Test] UUID', i + 1, ':', uuid);
      }
      
      const uuidStr = uuids.join(' || ');
      const decompressedUrl = `nxdrive://direct-download/${scheme}/${server}/${uuidStr}`;
      
      console.log('[Decompression Test] Decompressed URL:', decompressedUrl);
      console.log('[Decompression Test] Expected URL:', expectedOriginalUrl);
      console.log('[Decompression Test] Match:', decompressedUrl === expectedOriginalUrl ? '✅ SUCCESS' : '❌ FAILED');
      
    } catch (error) {
      console.error('[Decompression Test] Error:', error);
    }
  }
}

customElements.define(NuxeoDriveDownloadButton.is, NuxeoDriveDownloadButton);

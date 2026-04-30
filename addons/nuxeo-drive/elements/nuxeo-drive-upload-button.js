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
    this.$.token
      .get()
      .then((response) => {
        const tokens = response.entries.map((token) => token.id);
        if (!tokens || !tokens.length) {
          this.$.dialog.toggle();
          return;
        }
        this._openDriveUrl(this.directTransferUrl);
      })
      .catch((error) => {
        console.error('Token fetch failed:', error);
        this._showError(this.i18n('driveUpload.directTransfer.failed'));
      });
  }

  /**
   * Invokes a nxdrive:// URL and detects whether the Drive desktop app
   * handled it by listening for a window blur event (the browser loses focus
   * when the OS hands off the protocol to a native app).
   *
   * If the window does not blur within DRIVE_OPEN_TIMEOUT_MS it is safe to
   * assume no app is registered for the nxdrive:// scheme, so we show the
   * "Download Nuxeo Drive Client" install dialog instead of failing silently.
   */
  _openDriveUrl(url) {
    let appOpened = false;

    const onBlur = () => {
      appOpened = true;
    };
    window.addEventListener('blur', onBlur, { once: true });

    window.location.href = url;

    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      if (!appOpened) {
        this.$.dialog.toggle();
      }
    }, NuxeoDriveUploadButton.DRIVE_OPEN_TIMEOUT_MS);
  }

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
  }

  get directTransferUrl() {
    const finalUrl = [
      'nxdrive://direct-transfer',
      baseUrl.split('/ui/')[0].replace('://', '/'),
      this.document.path.slice(1),
    ].join('/');
    return finalUrl;
  }
}

// How long (ms) to wait for the browser window to blur after invoking the
// nxdrive:// URL before concluding that no Drive app is installed/registered.
NuxeoDriveUploadButton.DRIVE_OPEN_TIMEOUT_MS = 1500;

customElements.define(NuxeoDriveUploadButton.is, NuxeoDriveUploadButton);

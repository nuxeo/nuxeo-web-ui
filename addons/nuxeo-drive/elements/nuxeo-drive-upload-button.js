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

  // Invokes a nxdrive:// URL; shows the install dialog if Drive did not handle it.
  // Chrome/Edge/Safari: blur+debounce heuristic. Firefox: primary timeout only (no blur when Drive absent).
  _openDriveUrl(url) {
    let appOpened = false;
    let dialogShown = false;
    let blurDebounceTimer = null;
    let hardCapTimer = null;
    let debounceSettledAt = null;

    // Firefox never fires blur when Drive is absent — skip onFocusAfterOpened to
    // avoid showing the install dialog when the user switches back after Drive opened.
    const isFirefox = /firefox|fxios/i.test(navigator.userAgent);

    const cleanup = () => {
      clearTimeout(blurDebounceTimer);
      clearTimeout(hardCapTimer);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('focus', onFocusAfterOpened);
    };

    // Chrome/Edge/Safari only: quick return → "no handler" dialog dismissed → install dialog.
    // Slow return → user switched back from Drive → suppress / auto-dismiss.
    const onFocusAfterOpened = () => {
      const elapsed = debounceSettledAt !== null ? Date.now() - debounceSettledAt : Infinity;
      if (elapsed < NuxeoDriveUploadButton.DRIVE_OPEN_TIMEOUT_MS) {
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

    // Focus returned quickly — Drive handled the URL as a background app.
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
          // Primary timeout fired before blur — auto-dismiss; blur confirms Drive
          // or an OS dialog was involved.
          this.$.dialog.toggle();
          dialogShown = false;
          window.removeEventListener('blur', onBlur);
          window.removeEventListener('focus', onFocusAfterOpened);
          clearTimeout(hardCapTimer);
          hardCapTimer = setTimeout(cleanup, 10000);
        }
      }, NuxeoDriveUploadButton.BLUR_DEBOUNCE_MS);

      window.addEventListener('focus', onFocus, { once: true });
    };

    window.addEventListener('blur', onBlur);

    this._navigate(url);

    // Primary timeout: main "not installed" path for Firefox (no blur fires).
    setTimeout(() => {
      if (!appOpened) {
        dialogShown = true;
        this.$.dialog.toggle();
      }
    }, NuxeoDriveUploadButton.DRIVE_OPEN_TIMEOUT_MS);

    // Hard-cap: give up listening after an extended window.
    hardCapTimer = setTimeout(cleanup, NuxeoDriveUploadButton.DRIVE_OPEN_TIMEOUT_MS + 3000);
  }

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
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

  get directTransferUrl() {
    const finalUrl = [
      'nxdrive://direct-transfer',
      baseUrl.split('/ui/')[0].replace('://', '/'),
      this.document.path.slice(1),
    ].join('/');
    return finalUrl;
  }
}

// How long (ms) to wait for window.blur before concluding Drive is not installed.
NuxeoDriveUploadButton.DRIVE_OPEN_TIMEOUT_MS = 1500;

// How long (ms) the window must stay blurred to be treated as Drive having opened.
NuxeoDriveUploadButton.BLUR_DEBOUNCE_MS = 300;

customElements.define(NuxeoDriveUploadButton.is, NuxeoDriveUploadButton);

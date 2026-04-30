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

Contributors:
  Nelson Silva <nsilva@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';

// How long (ms) to wait for a window blur event (Drive app opening) before
// concluding Drive is not installed and showing the install dialog.
const DRIVE_OPEN_TIMEOUT_MS = 1500;

// How long (ms) the window must stay blurred before we treat it as Drive
// having opened (vs. a Chrome false-positive blur from the protocol prompt).
const BLUR_DEBOUNCE_MS = 300;

/**
`nuxeo-drive-edit-button`
@group Nuxeo UI
@element nuxeo-drive-edit-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-resource id="token" path="/token" params='{"application": "Nuxeo Drive"}'></nuxeo-resource>

    <template is="dom-if" if="[[_isAvailable(document,blob)]]">
      <div class="action" on-tap="_go">
        <paper-icon-button noink icon="icons:open-in-new" id="driveBtn" aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[i18n('driveEditButton.tooltip')]]</span>
        <nuxeo-tooltip>[[i18n('driveEditButton.tooltip')]]</nuxeo-tooltip>
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
  `,

  is: 'nuxeo-drive-edit-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    user: Object,
    document: Object,
    blob: Object,
    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      reflectToAttribute: true,
      value: false,
    },
  },

  _isAvailable(doc, blob) {
    return (
      this.hasPermission(doc, 'Write') && !this.isProxy(doc) && blob && (!blob.appLinks || blob.appLinks.length === 0)
    );
  },

  _go() {
    this.$.token
      .get()
      .then((response) => {
        const tokens = response.entries.map((token) => token.id);
        if (!tokens || !tokens.length) {
          this.$.dialog.toggle();
          return;
        }
        this._openDriveUrl(this.driveEditURL);
      })
      .catch(() => {
        this._showError(this.i18n('driveEditButton.directTransfer.failed'));
      });
  },

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
  },

  /**
   * Invokes a nxdrive:// URL and detects whether the Drive desktop app
   * handled it using a blur + debounce heuristic.
   *
   * Chrome fires a window blur event even when no protocol handler is
   * registered (the browser briefly shows a permission/protocol prompt).
   * However, if no app opens, the window regains focus almost immediately.
   * When Drive DOES open, the window stays blurred (Drive is in foreground).
   *
   * Strategy:
   *  - On blur: start a short debounce timer (BLUR_DEBOUNCE_MS).
   *  - If focus returns before the debounce fires → false positive, ignore.
   *  - If the debounce fires while still blurred → Drive opened; mark as
   *    handled and auto-dismiss any false-alarm dialog.
   *  - If neither blur nor debounce triggers within DRIVE_OPEN_TIMEOUT_MS →
   *    Drive is not installed; show the install dialog.
   */
  _openDriveUrl(url) {
    let appOpened = false;
    let dialogShown = false;
    let blurDebounceTimer = null;

    const cleanup = () => {
      clearTimeout(blurDebounceTimer);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };

    const onFocus = () => {
      // Focus returned quickly after blur — Chrome false-positive, no Drive handler.
      clearTimeout(blurDebounceTimer);
    };

    const onBlur = () => {
      blurDebounceTimer = setTimeout(() => {
        // Still blurred after debounce — Drive really opened.
        appOpened = true;
        window.removeEventListener('focus', onFocus);
        if (dialogShown) {
          // Dialog was a false alarm (slow system) — auto-dismiss it.
          this.$.dialog.toggle();
          dialogShown = false;
          cleanup();
        }
      }, BLUR_DEBOUNCE_MS);

      window.addEventListener('focus', onFocus, { once: true });
    };

    window.addEventListener('blur', onBlur);

    this._navigate(url);

    // Primary timeout: show install dialog if Drive hasn't been detected yet.
    setTimeout(() => {
      if (!appOpened) {
        dialogShown = true;
        this.$.dialog.toggle();
        // Keep blur+focus listeners alive so auto-dismiss still works if Drive
        // opens late (slow system hit the timeout but Drive is still launching).
      } else {
        cleanup();
      }
    }, DRIVE_OPEN_TIMEOUT_MS);

    // Hard-cap: give up listening after an extended window.
    setTimeout(cleanup, DRIVE_OPEN_TIMEOUT_MS + 3000);
  },

  _navigate(url) {
    window.location.href = url;
  },

  get driveEditURL() {
    if (!this.blob) {
      return '';
    }

    const parts = this.blob.data.split('/nxfile/');
    const baseUrl = parts[0];
    const downloadUrl = `nxfile/${parts[1]}`;

    return [
      'nxdrive://edit',
      baseUrl.replace('://', '/'), // XXX replaceFirst
      'user',
      this.user.id,
      'repo',
      this.document.repository,
      'nxdocid',
      this.document.uid,
      'filename',
      encodeURIComponent(this.blob.name),
      'downloadUrl',
      downloadUrl,
    ].join('/');
  },
});
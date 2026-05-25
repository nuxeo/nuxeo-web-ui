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
      <div class="action" on-click="_go">
        <paper-icon-button noink icon="icons:open-in-new" id="driveBtn" aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[i18n('driveEditButton.tooltip')]]</span>
        <nuxeo-tooltip>[[i18n('driveEditButton.tooltip')]]</nuxeo-tooltip>
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

        .launch-btn {
          background-color: var(--nuxeo-primary-color, #0066ff);
          color: #fff;
          text-transform: uppercase;
          font-size: 0.9em;
          padding: 0.5em 1em;
        }

        .launch-btn[disabled] {
          background-color: var(--disabled-text-color, #9e9e9e);
        }

        .close-btn {
          border: 1px solid var(--nuxeo-primary-color, #0066ff);
          color: var(--nuxeo-primary-color, #0066ff);
          text-transform: uppercase;
          font-size: 0.9em;
          padding: 0.5em 1em;
        }

        .install-link {
          display: block;
          margin-top: 4px;
          font-size: 0.9em;
        }

        .dialog-content .failure-msg {
          color: var(--nuxeo-warn-text, #d32f2f);
          margin: 12px 0 16px;
          font-size: 0.9em;
        }

        .dialog-content .install-prompt {
          color: var(--primary-text-color, #333);
          margin: 4px 0 8px;
          font-size: 0.9em;
        }

        .buttons {
          justify-content: space-between;
        }
      </style>
      <div class="dialog-content">
        <h1>[[i18n('driveButton.dialog.heading')]]</h1>
        <p>[[i18n('driveButton.dialog.description')]]</p>
        <template is="dom-if" if="[[_failureVisible]]">
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
        <paper-button dialog-dismiss class="close-btn">[[i18n('command.close')]]</paper-button>
        <paper-button class="launch-btn" on-click="_launchDrive" noink disabled$="[[_launched]]"
          >[[i18n('driveButton.dialog.open')]]</paper-button
        >
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

    _failureVisible: {
      type: Boolean,
      value: false,
    },

    _hasToken: {
      type: Boolean,
      value: false,
    },
  },

  _isAvailable(doc, blob) {
    return (
      this.hasPermission(doc, 'Write') && !this.isProxy(doc) && blob && (!blob.appLinks || blob.appLinks.length === 0)
    );
  },

  _go() {
    if (this.$.dialog.opened) {
      return;
    }

    this._showInstall = false;
    this._launched = false;
    this._driveOpened = false;
    this._failureVisible = false;
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
  },

  _launchDrive() {
    this._launched = true;
    this._driveOpened = false;
    const onBlur = () => {
      window.removeEventListener('blur', onBlur);
      this._driveOpened = true;
    };
    window.addEventListener('blur', onBlur);
    this._navigateTo(this.driveEditURL);
    this._failureVisible = true;
  },

  /**
   * Triggers a custom protocol URL (nxdrive://) via a hidden anchor click.
   */
  _navigateTo(url) {
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  _showFailure(launched, driveOpened) {
    return launched && !driveOpened;
  },

  _toggleInstall(e) {
    e.preventDefault();
    this._showInstall = true;
  },

  _showError(message) {
    this.$.toast.text = message;
    this.$.toast.open();
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

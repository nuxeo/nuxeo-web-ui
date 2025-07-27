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
import './nuxeo-drive-icons.js';

window.nuxeo = window.nuxeo || {};
const baseUrl = window.nuxeo.baseUrl || window.location.origin + window.location.pathname;
/**
`nuxeo-drive-upload-button`
@group Nuxeo UI
@element nuxeo-drive-upload-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-resource id="token" path="/token" params='{"application": "Nuxeo Drive"}'></nuxeo-resource>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <div class="action" on-tap="_go">
        <paper-icon-button noink icon="nuxeo-drive:transfer" id="driveBtn" aria-labelledby="label"></paper-icon-button>
        <span class="label" id="label">[[i18n('driveUploadButton.tooltip')]]</span>
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
  `,

  is: 'nuxeo-drive-upload-button',
  behaviors: [I18nBehavior],

  properties: {
    document: Object,
  },

  _isAvailable(doc) {
    return this.hasPermission(doc, 'Write') && this.hasFacet(doc, 'Folderish') && !this.isProxy(doc);
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
        window.open(this.directTransferUrl, '_top');
      })
      .catch((error) => {
        console.error('Token fetch failed:', error);
        this.$.toast.toggle();
      });
  },

  get directTransferUrl() {
    const finalUrl = ['nxdrive://direct-transfer', baseUrl.replace('://', '/'), this.document.path.slice(1)].join('/');
    return finalUrl;
  },
});

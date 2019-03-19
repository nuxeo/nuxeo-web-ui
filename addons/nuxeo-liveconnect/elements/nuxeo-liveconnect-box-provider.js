/**
(C) Copyright 2016 Nuxeo SA (http://nuxeo.com/) and others.

icensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
  Gabriel Barata <gbarata@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LiveConnectBehavior } from './nuxeo-liveconnect-behavior.js';

// load Box picker
const script = document.createElement('script');
script.src = 'https://app.box.com/js/static/select.js';
document.head.appendChild(script); /* global BoxSelect */

/**
`nuxeo-liveconnect-box-provider`
@group Nuxeo UI
@element nuxeo-liveconnect-box-provider
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: none;
      }
    </style>
    <nuxeo-resource id="oauth2"></nuxeo-resource>
  `,

  is: 'nuxeo-liveconnect-box-provider',
  behaviors: [LiveConnectBehavior],

  properties: {
    providerId: {
      value: 'box',
    },
  },

  openPicker() {
    this.updateProviderInfo().then(this._init.bind(this));
  },

  _init() {
    if (!this.isUserAuthorized) {
      this.openPopup(this.authorizationURL, {
        onMessageReceive: this._parseMessage.bind(this),
        onClose: this._onOAuthPopupClose.bind(this),
      });
    } else {
      this._showPicker();
    }
  },

  _parseMessage(event) {
    const data = JSON.parse(event.data);
    this.accessToken = data.token;
  },

  _onOAuthPopupClose() {
    if (this.accessToken) {
      if (!this.userId) {
        this.updateProviderInfo().then(() => {
          if (!this.userId) {
            throw new Error('No username available.');
          }
          this._showPicker();
        });
      } else {
        this._showPicker();
      }
    }
  },

  _showPicker() {
    const options = {
      clientId: this.clientId,
      linkType: 'direct',
      multiselect: true,
    };
    const boxSelect = new BoxSelect(options);

    boxSelect.success((response) => {
      const blobs = [];
      response.forEach((file) => {
        blobs.push({
          providerId: this.providerId,
          providerName: 'Box',
          user: this.userId,
          fileId: file.id.toString(),
          name: file.name,
          size: file.size,
          key: this.generateBlobKey(file.id),
        });
      });
      this.notifyBlobPick(blobs);
    });

    // open picker
    boxSelect.launchPopup();
  },
});

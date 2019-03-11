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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LiveConnectBehavior } from './nuxeo-liveconnect-behavior.js';

import '../vendor/onedrive/onedrive-file-picker.css';
import * as OneDriveFilePicker from '../vendor/onedrive/onedrive-file-picker.js';

Polymer({
  _template: html`
    <style>
      :host {
        display: none;
      }
    </style>
    <nuxeo-resource id="oauth2"></nuxeo-resource>
`,

  is: 'nuxeo-liveconnect-onedrive-provider',
  behaviors: [LiveConnectBehavior],

  properties: {
    providerId: {
      value: 'onedrive'
    }
  },

  openPicker: function() {
    this.updateProviderInfo().then(function() {
      if (this.isUserAuthorized) {
        return this.getToken().then(function(response) {
          this.accessToken = response.token;
          this._handleAuthResult(response.token);
        }.bind(this));
      } else {
        this.openPopup(this.authorizationURL, {
          onMessageReceive: this._parseMessage.bind(this),
          onClose: this._onOAuthPopupClose.bind(this)
        });
      }
    }.bind(this));
  },

  _parseMessage: function(event) {
    var data = JSON.parse(event.data);
    this.accessToken = data.token;
  },

  _onOAuthPopupClose: function() {
    if (this.accessToken) {
      if (!this.userId) {
        this.updateProviderInfo().then(function() {
          if (!this.userId) {
            throw 'No username available.';
          }
          this._handleAuthResult(this.accessToken);
        }.bind(this));
      } else {
        this._handleAuthResult(this.accessToken);
      }
    }
  },

  _handleAuthResult: function(token) {
    var options = {
      accessToken: token
    };
    var filePicker = new OneDriveFilePicker(options);

    // open picker and handle result
    filePicker.select().then(function(result) {
      if (result.action === 'select') {
        var files = [];
        files.push({
          providerId: this.providerId,
          providerName: 'One Drive',
          user: this.userId,
          fileId: result.item.id,
          name: result.item.name,
          size: result.item.size,
          key: this.generateBlobKey(result.item.id)
        });
        this.notifyBlobPick(files);
      }
    }.bind(this));
  }
});

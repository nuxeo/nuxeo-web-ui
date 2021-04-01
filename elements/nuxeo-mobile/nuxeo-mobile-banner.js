/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

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
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style>
      #mobileBanner {
        display: flex;
        justify-content: space-between;
        position: fixed;
        z-index: 110;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: rgba(255, 255, 255, 0.8);
        padding: 1vh;
      }

      .mobileAppLinkContainer {
        display: flex;
        align-items: center;
      }

      a.mobileAppLink,
      a.mobileAppLink:hover {
        background-color: #00adff;
        border-radius: 3em;
        padding: 0.4em 1.5em;
        font-size: 2.5vh;
        color: #fff !important;
      }
    </style>

    <nuxeo-connection id="nxcon"></nuxeo-connection>

    <template is="dom-if" if="[[_displayBanner(document, dismiss)]]">
      <div id="mobileBanner">
        <paper-icon-button
          icon="icons:close"
          on-tap="_dismiss"
          aria-label$="[[i18n('command.close')]]"
        ></paper-icon-button>
        <div class="mobileAppLinkContainer">
          <template is="dom-if" if="[[isAndroid]]">
            <a class="mobileAppLink" href$="[[_computeUrl(document)]]">[[i18n('label.mobile.openInApp')]]</a>
          </template>
          <template is="dom-if" if="[[isIOS]]">
            <a class="mobileAppLink" on-tap="_openIOSAppOrAppStore">[[i18n('label.mobile.openInApp')]]</a>
          </template>
        </div>
      </div>
    </template>
  `,

  is: 'nuxeo-mobile-banner',

  behaviors: [I18nBehavior],

  properties: {
    document: Object,

    isMobile: {
      type: Boolean,
      value: false,
      notify: true,
    },

    isAndroid: Boolean,
    isIOS: Boolean,

    baseUrl: String,

    dismiss: {
      type: Boolean,
      value: false,
    },
  },

  ready() {
    this.isAndroid = /Android/.test(window.navigator.userAgent);
    this.isIOS = /iPhone|iPad|iPod/.test(window.navigator.userAgent);
    this.isMobile = this.isAndroid || this.isIOS;

    const re = new RegExp(`(.*${this.$.nxcon.url}).*`);
    const match = window.location.href.match(re);
    if (match && match.length === 2) {
      [, this.baseUrl] = match;
    }
  },

  _computeUrl() {
    if (this.baseUrl) {
      let appUrl = this.baseUrl.replace('://', '/');
      if (this.document) {
        appUrl += `/${this.document.repository}/id/${this.document.uid}`;
      }
      if (this.isAndroid) {
        return `android-app://com.nuxeomobile/nuxeo/${appUrl}`;
      }
      if (this.isIOS) {
        return `nuxeo://${appUrl}`;
      }
    }
  },

  _openIOSAppOrAppStore() {
    const appUrl = this._computeUrl(this.document);
    const storeUrl = 'https://itunes.apple.com/app/id1103802613';
    if (!appUrl) {
      window.location = storeUrl;
      return;
    }

    let openIOSAppTimer;
    let openAppStoreTimer;

    function clearTimers() {
      clearInterval(openIOSAppTimer);
      clearInterval(openAppStoreTimer);
    }

    window.location = appUrl;
    const click = Date.now();
    openIOSAppTimer = setInterval(() => {
      if (document.hidden || document.webkitHidden) {
        clearTimers();
      }
    }, 200);
    openAppStoreTimer = setInterval(() => {
      if (!document.hidden && !document.webkitHidden && Date.now() - click > 2000) {
        clearTimers();
        window.location = storeUrl;
      }
    }, 200);
  },

  _displayBanner() {
    return this.isMobile && !this.dismiss;
  },

  _dismiss() {
    this.dismiss = true;
  },
});

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
/**
`nuxeo-offline-banner`
@group Nuxeo UI
@element nuxeo-offline-banner
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        @apply --layout-horizontal;
        @apply --layout-center;
        background: var(--nuxeo-offline-banner-background, #fee066);
        box-shadow: var(--nuxeo-app-header-box-shadow);
        color: var(--nuxeo-offline-banner-text, #3a3a54);
        height: var(--nuxeo-drawer-header-height);
        padding-left: 16px;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        visibility: hidden;
        transform: translateY(-100%);
        -webkit-transform: translateY(-100%);
        transition-duration: .5s;
        transition-property: visibility, -webkit-transform, opacity;
        transition-property: visibility, transform, opacity;
        will-change: transform;
      }

      :host([offline]) {
        visibility: visible;
        transform: translateY(0);
        -webkit-transform: translateY(0);
      }
    </style>

    <span>[[message]]</span>
`,

  is: 'nuxeo-offline-banner',

  properties: {
    offline: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },

    message: {
      type: String,
      value: 'Your network is unavailable. Please check your connection.'
    }
  },

  ready: function() {
    window.addEventListener('online', function() {
      this.offline = false;
    }.bind(this));
    window.addEventListener('offline', function() {
      this.offline = true;
    }.bind(this));
  }
});

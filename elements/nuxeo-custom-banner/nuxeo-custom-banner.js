/**
@license
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
import '@polymer/polymer/polymer-legacy.js';

import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-custom-banner`
@group Nuxeo UI
@element nuxeo-custom-banner
*/
Polymer({
  _template: html`
    <style>
      :host {
        @apply --layout-horizontal;
        @apply --layout-center;
        background: var(--nuxeo-custom-banner-background, #ffffff);
        box-shadow: var(--nuxeo-app-header-box-shadow);
        color: var(--nuxeo-custom-banner-text, #3a3a54);
        height: var(--nuxeo-drawer-header-height);
        padding-left: 16px;
        position: fixed;
        top: var(--nuxeo-app-top, 0);
        left: 0;
        right: 0;
        z-index: 1000;
        visibility: hidden;
        transform: translateY(calc(- (100% + var(--nuxeo-app-top, 0))));
        transition-duration: 0.5s;
        transition-property: visibility, -webkit-transform, opacity;
        transition-property: visibility, transform, opacity;
        will-change: transform;
      }

      :host([banneron]) {
        visibility: visible;
        transform: translateY(0);
        -webkit-transform: translateY(0);
      }
    </style>

    <template is="dom-if" if="{{banneron}}">
      <p>{{bannerval}}</p>
      <template is="dom-if" if="{{bannerlink}}">
        <a href$="{{bannerlink}}" target="_blank">Click for more info</a>
      </template></template
    >
  `,

  is: 'nuxeo-custom-banner',

  properties: {
    banneron: {
      type: Boolean,
    },
    bannerval: {
      type: String,
      value: '',
    },
    bannerlink: {
      type: String,
      value: '',
    },
  },

  ready() {
    this._update();
    window.addEventListener('storage', this._update.bind(this));
  },
  _update() {
    this.banneron = localStorage.getItem('banneron') === 'true';
    this.bannerval = localStorage.getItem('bannerval');
    this.bannerlink = localStorage.getItem('bannerlink');
  },
});

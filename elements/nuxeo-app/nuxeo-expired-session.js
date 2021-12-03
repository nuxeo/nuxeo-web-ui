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

import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-expired-session`
@group Nuxeo UI
@element nuxeo-expired-session
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        @apply --layout-horizontal;
        @apply --layout-center;
        background: var(--nuxeo-expired-session-background, #fee066);
        box-shadow: var(--nuxeo-app-header-box-shadow);
        color: var(--nuxeo-expired-session-text, #3a3a54);
        height: var(--nuxeo-drawer-header-height);
        padding-left: 16px;
        position: fixed;
        top: var(--nuxeo-app-top, 0px);
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

      :host([open]) {
        visibility: visible;
        transform: translateY(0);
        -webkit-transform: translateY(0);
      }

      button.link {
        color: var(--nuxeo-link-color, #3a3a54)
        padding: 0;
        background: none;
        border: none;
        cursor: pointer;
        font: inherit;
        @apply --nuxeo-expired-session-link;
      }
      button.link:hover {
        text-decoration: underline;
        color: unset;
        font: inherit;
        @apply --nuxeo-expired-session-link-hover;
      }
    </style>

    <button class="link" on-click="_reload">[[message]]</button>
  `,

  is: 'nuxeo-expired-session',

  properties: {
    open: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
    },

    message: {
      type: String,
      value: 'Your session has expired! Click here to login again.',
    },
  },

  ready() {
    document.addEventListener('unauthorized-request', () => {
      this.open = true;
    });
  },

  _reload() {
    window.location.reload();
  },
});

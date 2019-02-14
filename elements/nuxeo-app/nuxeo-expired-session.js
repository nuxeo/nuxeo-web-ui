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
`nuxeo-expired-session`
@group Nuxeo UI
@element nuxeo-expired-session
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

      :host([open]) {
        visibility: visible;
        transform: translateY(0);
        -webkit-transform: translateY(0);
      }

      a, a:active, a:visited, a:focus {
        @apply --nuxeo-expired-session-link;
      }
      a:hover {
        text-decoration: underline;
        color: unset;
        @apply --nuxeo-expired-session-link-hover;
      }
    </style>

    <a href="javascript:window.location.reload();">[[message]]</a>
`,

  is: 'nuxeo-expired-session',

  properties: {
    open: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },

    message: {
      type: String,
      value: 'Your session has expired! Click here to login again.'
    }
  },

  ready: function() {
    document.addEventListener('unauthorized-request', function() {
      this.open = true;
    }.bind(this));
  }
});

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

import '@polymer/paper-header-panel/paper-header-panel.js';
import '@polymer/paper-toolbar/paper-toolbar.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-page`
@group Nuxeo UI
@element nuxeo-page
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      .page {
        height: calc(100vh - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
        display: flex;
        flex-direction: column;
      }

      #content {
        flex: 1 1 auto;
        position: relative;
        overflow-y: auto;
        padding: 16px 16px 0 16px;

        /*
         * Reserve the strip covered by the floating document create button, published by nuxeo-app
         * as --nuxeo-page-content-safe-area-bottom and 0 wherever no button floats over this
         * region. padding-bottom extends the scrollable range so the last row can be scrolled
         * clear of the button instead of staying permanently underneath it, and
         * scroll-padding-bottom keeps anything scrolled into view - keyboard focus in particular -
         * out from under it.
         */
        padding-bottom: var(--nuxeo-page-content-safe-area-bottom, 0px);
        scroll-padding-bottom: var(--nuxeo-page-content-safe-area-bottom, 0px);
      }

      .toolbar {
        flex: 0 0 auto;
        @apply --layout-horizontal;
        @apply --layout-center;
        height: var(--nuxeo-drawer-header-height);
        color: var(--nuxeo-app-header);
        background: var(--nuxeo-app-header-background);
        box-shadow: var(--nuxeo-app-header-box-shadow);
        overflow-x: auto;
      }

      :host([dir='rtl']) .toolbar {
        border-right: 1px solid var(--divider-color);
      }

      #tabs {
        flex: 0 0 auto;
        background: var(--nuxeo-app-header-background);
        box-shadow: var(--nuxeo-app-header-box-shadow);
        margin-top: 1px;
        overflow-x: auto;
        z-index: 1;
      }

      :host([dir='rtl']) #tabs {
        border-right: 1px solid var(--divider-color);
      }

      #header::slotted(*) {
        overflow-x: hidden;
      }

      #header::slotted(*), /* chrome, safari */
      #toolbar::slotted(*) {
        /* firefox */
        @apply --layout-horizontal;
        @apply --layout-center;
        width: 100%;
        padding-right: 64px;
        padding-left: 16px;
      }

      :host([dir="rtl"]) #header::slotted(*), /* Chrome, Safari */
      :host([dir="rtl"]) #toolbar::slotted(*) {
        padding-right: 16px;
        padding-left: 64px;
      }

      @media (max-width: 720px) {
        #header::slotted(*), /* chrome, safari */
        #toolbar::slotted(*) {
          /* firefox */
          overflow-y: scroll;
          padding-left: 48px;
        }

        :host([dir="rtl"]) #header::slotted(*), /* Chrome, Safari */
        :host([dir="rtl"]) #toolbar::slotted(*) {
          padding-right: 48px;
        }
      }
    </style>

    <div class="page">
      <div class="toolbar" id="toolbar">
        <slot id="header" slot="header" name="header"></slot>
      </div>
      <div id="tabs" role="navigation">
        <slot name="tabs"></slot>
      </div>
      <div id="content">
        <slot></slot>
      </div>
    </div>
  `,

  is: 'nuxeo-page',
  ready() {
    if (!this.hasAttribute('dir')) {
      const direction = document.documentElement.getAttribute('dir');
      this.setAttribute('dir', direction);
    }
  },
});

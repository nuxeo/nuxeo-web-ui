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
`nuxeo-page`
@group Nuxeo UI
@element nuxeo-page
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-header-panel/paper-header-panel.js';
import '@polymer/paper-toolbar/paper-toolbar.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      .page {
        height: calc(100vh - var(--nuxeo-app-top));
        display: flex;
        flex-direction: column;
      }

      #content {
        flex: 1 1 auto;
        position: relative;
        overflow-y: auto;
        padding: 16px 16px 0 16px;
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

      #tabs {
        flex: 0 0 auto;
        background: var(--nuxeo-app-header-background);
        box-shadow: var(--nuxeo-app-header-box-shadow);
        margin-top: 1px;
        overflow-x: auto;
        z-index: 1;
      }

      #header::slotted(*), /* chrome, safari */
      #toolbar::slotted(*){ /* firefox */
        @apply --layout-horizontal;
        @apply --layout-center;
        width: 100%;
        padding-right: 64px;
        padding-left: 16px;
      }

      @media (max-width: 720px) {
        #header::slotted(*), /* chrome, safari */
        #toolbar::slotted(*){ /* firefox */
          overflow-y: scroll;
          padding-left: 48px;
        }
      }

    </style>

    <div class="page">
      <div class="toolbar" id="toolbar">
        <slot id="header" slot="header" name="header"></slot>
      </div>
      <div id="tabs">
        <slot name="tabs"></slot>
      </div>
      <div id="content">
        <slot></slot>
      </div>
    </div>
`,

  is: 'nuxeo-page'
});

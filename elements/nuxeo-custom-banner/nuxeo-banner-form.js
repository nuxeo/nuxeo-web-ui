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

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '../nuxeo-app/nuxeo-page.js';
import '../nuxeo-app/nuxeo-page-item.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-banner-form`
@group Nuxeo UI
@element nuxeo-banner-form
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex">
      /* document views items (pills) */
      #documentViewsItems {
        @apply --layout-horizontal;
        --paper-listbox-background-color: transparent;
      }

      paper-tabs {
        height: auto;
        display: flex;
        padding: 0;
        border-bottom: none transparent 0px;
        font-size: inherit;
        font-weight: 400;
        --paper-tabs-selection-bar-color: transparent;
      }

      @media (max-width: 1024px) {
        paper-listbox {
          padding-right: 7rem;
        }
      }
    </style>
    <nuxeo-page>
      <div slot="header">
        <span class="flex">[[i18n('cloudServices.heading')]]</span>
      </div>
    </nuxeo-page>
  `,

  is: 'nuxeo-banner-form',
  behaviors: [I18nBehavior],

  properties: {
    x: {
      type: String,
    },

    page: {
      type: Object,
    },
  },
  ready() {
    this.x = '';
  },
});

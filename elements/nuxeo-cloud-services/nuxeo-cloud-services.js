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

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '../nuxeo-app/nuxeo-page.js';
import '../nuxeo-app/nuxeo-page-item.js';
import './nuxeo-cloud-consumers.js';
import './nuxeo-cloud-providers.js';
import './nuxeo-cloud-tokens.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-cloud-services`
@group Nuxeo UI
@element nuxeo-cloud-services
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
      <div slot="tabs">
        <paper-tabs
          autoselect
          attr-for-selected="name"
          id="documentViewsItems"
          noink
          no-slide
          selected="{{selectedTab}}"
          selectable="nuxeo-page-item"
        >
          <nuxeo-page-item name="providers" label="cloudServices.providers"></nuxeo-page-item>
          <nuxeo-page-item name="tokens" label="cloudServices.tokens"></nuxeo-page-item>
          <nuxeo-page-item name="consumers" label="cloudServices.consumers"></nuxeo-page-item>
        </paper-tabs>
      </div>
      <div>
        <iron-pages selected="[[selectedTab]]" attr-for-selected="name" selected-item="{{page}}">
          <nuxeo-cloud-providers id="providers" name="providers"></nuxeo-cloud-providers>
          <nuxeo-cloud-tokens id="tokens" name="tokens"></nuxeo-cloud-tokens>
          <nuxeo-cloud-consumers id="consumers" name="consumers"></nuxeo-cloud-consumers>
        </iron-pages>
      </div>
    </nuxeo-page>
  `,

  is: 'nuxeo-cloud-services',
  behaviors: [I18nBehavior],

  properties: {
    visible: {
      type: Boolean,
    },

    selectedTab: {
      type: String,
      value: 'providers',
    },

    page: {
      type: Object,
    },
  },

  observers: ['refresh(visible, page)'],

  refresh() {
    if (this.page && this.visible) {
      this.page.refresh();
    }
  },
});

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
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '../nuxeo-app/nuxeo-page.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-analytics`
@group Nuxeo UI
@element nuxeo-analytics
*/
Polymer({
  _template: html`
    <style>
      .flex {
        @apply --layout-flex;
      }
      paper-listbox {
        @apply --layout-horizontal;
        --paper-listbox-background-color: transparent;
        padding: 0;
      }
    </style>

    <nuxeo-page>
      <div slot="header">
        <span class="flex">[[i18n('analytics.heading')]]</span>
      </div>
      <div slot="tabs">
        <paper-listbox selected="{{selected}}" attr-for-selected="name">
          <nuxeo-slot name="ANALYTICS_ITEMS"></nuxeo-slot>
        </paper-listbox>
      </div>
      <div>
        <template is="dom-if" if="[[visible]]">
          <iron-pages selected="[[selected]]" attr-for-selected="name" selected-attribute="visible">
            <nuxeo-slot name="ANALYTICS_PAGES"></nuxeo-slot>
          </iron-pages>
        </template>
      </div>
    </nuxeo-page>
  `,

  is: 'nuxeo-analytics',
  behaviors: [I18nBehavior],

  properties: {
    visible: Boolean,
    selected: String,
  },
});

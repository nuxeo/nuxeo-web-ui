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
`nuxeo-collapsible-document-page`
@group Nuxeo UI
@element nuxeo-collapsible-document-page
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '../nuxeo-document-info-bar/nuxeo-document-info-bar.js';
import '../nuxeo-document-info/nuxeo-document-info.js';
import '../nuxeo-collections/nuxeo-document-collections.js';
import '../nuxeo-document-activity/nuxeo-document-activity.js';
import './nuxeo-document-view.js';
import './nuxeo-document-metadata.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      .page {
        @apply --layout-vertical;
      }

      .details {
        @apply --layout-horizontal;
        @apply --layout-wrap;
        @apply --layout-justified;
      }

      .details .section {
        @apply --layout-flex;
        margin: 16px;
        min-width: 256px;
        max-width: 320px;
      }

      paper-icon-button {
        @apply --nuxeo-action;
      }

      paper-icon-button:hover {
        @apply --nuxeo-action-hover;
      }

      nuxeo-document-view {
        --nuxeo-document-content-min-height: calc(100vh - 237px - var(--nuxeo-app-top));
      }
    </style>

    <nuxeo-document-info-bar document="[[document]]"></nuxeo-document-info-bar>

    <div class="page">
      <nuxeo-card id="detailsCard" heading="[[i18n('documentPage.details')]]" collapsible="">
        <div class="details">
          <div class="section">
            <h3>[[i18n('documentPage.info')]]</h3>
            <nuxeo-document-info document="[[document]]"></nuxeo-document-info>
          </div>

          <!-- metadata -->
          <div class="section">
            <h3>[[i18n('documentPage.metadata')]]</h3>
            <nuxeo-document-metadata document="[[document]]"></nuxeo-document-metadata>
          </div>

          <!-- collections -->
          <div class="section" hidden\$="[[!_hasCollections(document)]]">
            <h3>[[i18n('documentPage.collections')]]</h3>
            <nuxeo-document-collections document="[[document]]"></nuxeo-document-collections>
          </div>

          <!-- tags -->
          <template is="dom-if" if="[[hasFacet(document, 'NXTag')]]">
            <div class="section">
              <h3>[[i18n('documentPage.tags')]]</h3>
              <nuxeo-tag-suggestion document="[[document]]" allow-new-tags="" placeholder="[[i18n('documentPage.tags.placeholder')]]" readonly="[[!hasPermission(document, 'Write')]]">&gt;
              </nuxeo-tag-suggestion>
            </div>
          </template>

          <!-- activity -->
          <div class="section">
            <h3>[[i18n('documentPage.activity')]]</h3>
            <nuxeo-document-activity document="[[document]]"></nuxeo-document-activity>
          </div>
        </div>
      </nuxeo-card>

      <div class="main">
        <nuxeo-document-view document="[[document]]"></nuxeo-document-view>
      </div>
    </div>
`,

  is: 'nuxeo-collapsible-document-page',
  behaviors: [LayoutBehavior],

  properties: {
    document: {
      type: Object
    }
  },

  _hasCollections: function (doc) {
    return this.hasCollections(doc);
  }
});

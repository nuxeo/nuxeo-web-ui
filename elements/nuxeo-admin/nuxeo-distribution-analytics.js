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
`nuxeo-distribution-analytics`
@group Nuxeo UI
@element nuxeo-distribution-analytics
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-slider/paper-slider.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-path-suggestion/nuxeo-path-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/dataviz/nuxeo-document-distribution-chart.js';
import './nuxeo-chart-data-behavior.js';
import './nuxeo-mime-types.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
Polymer({
  _template: html`
    <style include="iron-flex">
      :host {
        display: block;
      }

      .suggestion-wrapper {
        border-radius: 2px;
        border: 1px solid var(--nuxeo-border);
        padding: 0 8px;
      }

      .suggestion-wrapper iron-icon {
        color: var(--dark-primary-color);
        margin-right: 8px;
      }

      paper-slider {
        width: 100%;
      }

      nuxeo-path-suggestion {
        --nuxeo-path-suggestion-results: {
           z-index: 2;
         };
         --paper-input-container-underline: {
           display: none;
         };
         --paper-input-container-underline-focus: {
           display: none;
         };
      }

    </style>

    <div class="flex-layout">

      <nuxeo-card>
        <div class="suggestion-wrapper horizontal layout center">
          <iron-icon icon="icons:folder"></iron-icon>
          <div class="flex">
            <nuxeo-path-suggestion id="pathSuggester" value="{{path}}"></nuxeo-path-suggestion>
          </div>
        </div>

        <nuxeo-document-distribution-chart id="chart" index="_all" path="[[path]]" mode="count" include-version="" include-hidden="" include-deleted="">
        </nuxeo-document-distribution-chart>

        <div class="horizontal layout center">
          <div>
            <iron-icon icon="icons:track-changes"></iron-icon>
          </div>
          <div class="flex">
            <paper-slider id="ratings" pin="" snaps="" max="20" max-markers="20" step="1" value="{{depth}}"></paper-slider>
          </div>
        </div>
      </nuxeo-card>

    </div>
`,

  is: 'nuxeo-distribution-analytics',
  behaviors: [I18nBehavior],

  properties: {
    index: {
      type: String,
      value: '_all'
    },
    path: {
      type: String
    },
    depth: {
      type: Number,
      value: 7
    }
  },

  observers: [
    '_observeDocPath(path, depth)'
  ],

  _observeDocPath: function() {
    if (this.path && this.path.length && this.path.endsWith('/') &&
      (this.path !== this.$.chart.path || this.depth !== this.$.chart.maxDepth)) {
      this.$.chart.maxDepth = this.depth;
      this.$.chart.path = this.path;
      this.$.chart.execute();
    }
  }
});

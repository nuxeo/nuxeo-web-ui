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

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-slider/paper-slider.js';
import { config } from '@nuxeo/nuxeo-elements';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-path-suggestion/nuxeo-path-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/dataviz/nuxeo-document-distribution-chart.js';
import './nuxeo-mime-types.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { animationFrame } from '@polymer/polymer/lib/utils/async.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-distribution-analytics`
@group Nuxeo UI
@element nuxeo-distribution-analytics
*/
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
        }
        --paper-input-container-underline: {
          display: none;
        }
        --paper-input-container-underline-focus: {
          display: none;
        }
      }

      .error {
        border-left: 4px solid var(--nuxeo-warn-text);
        color: var(--nuxeo-text-default);
        padding-left: 8px;
      }
    </style>

    <!-- use nxql page provider to limit the use of the distribution analytics chart -->
    <nuxeo-page-provider
      id="provider"
      provider="nxql_search"
      page-size="1"
      schemas="dublincore,uid"
      headers="[[_headers()]]"
      skip-aggregates
      on-error="_onError"
    >
    </nuxeo-page-provider>

    <template is="dom-if" if="[[visible]]">
      <div class="flex-layout">
        <nuxeo-card>
          <div class="suggestion-wrapper horizontal layout center">
            <iron-icon icon="icons:folder"></iron-icon>
            <div class="flex">
              <nuxeo-path-suggestion id="pathSuggester" value="{{path}}"></nuxeo-path-suggestion>
            </div>
          </div>

          <template is="dom-if" if="[[_enabled]]">
            <nuxeo-document-distribution-chart
              id="chart"
              index="[[index]]"
              path="[[path]]"
              max-depth="[[depth]]"
              mode="count"
            >
            </nuxeo-document-distribution-chart>

            <div class="horizontal layout center">
              <div>
                <iron-icon icon="icons:track-changes"></iron-icon>
              </div>
              <div class="flex">
                <paper-slider
                  id="ratings"
                  pin
                  snaps
                  max="20"
                  max-markers="20"
                  step="1"
                  value="{{depth}}"
                ></paper-slider>
              </div>
            </div>
          </template>

          <p class="error" hidden$="[[_enabled]]">[[i18n('distributionAnalytics.disabled.message')]]</p>
        </nuxeo-card>
      </div>
    </template>
  `,

  is: 'nuxeo-distribution-analytics',
  behaviors: [I18nBehavior],

  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    index: {
      type: String,
      value: '_all',
    },
    path: {
      type: String,
    },
    depth: {
      type: Number,
      value: 1,
    },
    disableThreshold: {
      type: Number,
      value: config.get('analytics.documentDistribution.disableThreshold'),
    },
    _enabled: {
      type: Boolean,
    },
    _loading: {
      type: Boolean,
    },
  },

  observers: ['_observeDocPath(path, depth, visible)'],

  _params() {
    return {
      queryParams:
        'SELECT * FROM Document ' +
        "WHERE ecm:mixinType != 'HiddenInNavigation' " +
        'AND ecm:isProxy = 0 AND ' +
        'ecm:isVersion = 0 AND ' +
        'ecm:isTrashed = 0 AND ' +
        `ecm:path STARTSWITH '${this.path}'`,
    };
  },

  _headers() {
    return {
      'Content-Type': 'application/json',
      accept: 'text/plain,application/json',
      'fetch-document': 'properties',
    };
  },

  _observeDocPath() {
    if (!this.visible || !this.path || !this.path.length || !this.path.endsWith('/')) {
      return;
    }

    if (this.disableThreshold) {
      this.$.provider.params = this._params();
      this.$.provider.fetch().then((result) => {
        this._enabled = result && result.resultsCount < this.disableThreshold;
        if (this._enabled) {
          animationFrame.run(() => this.$$('#chart').execute());
        }
      });
    } else {
      this._enabled = true;
      animationFrame.run(() => this.$$('#chart').execute());
    }
  },
});

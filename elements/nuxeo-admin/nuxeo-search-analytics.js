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

import '@nuxeo/nuxeo-dataviz-elements/nuxeo-search-data.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/chart-elements/chart-pie.js';
import '@nuxeo/chart-elements/chart-bar.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import moment from '@nuxeo/moment';
import { ChartDataBehavior } from './nuxeo-chart-data-behavior.js';

/**
`nuxeo-search-analytics`
@group Nuxeo UI
@element nuxeo-search-analytics
*/
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment">
      :host {
        display: block;
      }

      .dates input {
        border: 1px solid #c6c6c6;
        box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0);
        border-radius: 3px;
        margin-left: 0.5em;
        width: 125px;
      }

      nuxeo-date-picker {
        padding: 0 16px;
      }

      .flex-layout {
        display: flex;
        flex-wrap: wrap;
        margin: 0 -1em;
        padding: 0 8px;
      }

      .flex-layout nuxeo-card {
        flex: 1 0 calc(33% - 2em);
        margin: 0 8px 16px;
        text-align: center;
      }

      nuxeo-data-table {
        height: 450px;
      }

      chart-bar,
      chart-pie {
        margin: 25px auto 0 auto;
        width: 100% !important;
        display: block;
        font-size: 0.8rem;
      }

      @media (max-width: 1024px) {
        .flex-layout nuxeo-card {
          flex: 1 0 calc(100% - 2em);
        }
      }
    </style>

    <nuxeo-card class="dates">
      <div class="horizontal flex end-justified layout">
        <nuxeo-date-picker value="{{startDate}}" label="[[i18n('analytics.after')]]"></nuxeo-date-picker>
        <nuxeo-date-picker value="{{endDate}}" label="[[i18n('analytics.before')]]"></nuxeo-date-picker>
      </div>
    </nuxeo-card>

    <div class="flex-layout">
      <!-- Number of calls per PageProvider -->
      <nuxeo-search-data
        start-date="[[startDate]]"
        end-date="[[_extendEndDate(endDate)]]"
        grouped-by="pageProviderName"
        data="{{callsPerProvider}}"
        index="[[index]]"
      >
      </nuxeo-search-data>

      <nuxeo-card heading="[[i18n('searchAnalytics.callsPerPageProvider.heading')]]">
        <chart-pie values="[[_values(callsPerProvider)]]" labels="[[_labels(callsPerProvider)]]"></chart-pie>
      </nuxeo-card>

      <!-- Number of calls per hour -->
      <nuxeo-search-data
        start-date="[[startDate]]"
        end-date="[[_extendEndDate(endDate)]]"
        with-date-intervals="hour"
        without-extended-bounds
        date-format="HH"
        data="{{callsPerHour}}"
        index="[[index]]"
      >
      </nuxeo-search-data>

      <nuxeo-card heading="[[i18n('searchAnalytics.callsPerHour.heading')]]">
        <chart-bar
          labels="[[_range(0,23)]]"
          values="[[_aggregatePerHourOfDay(callsPerHour)]]"
          series="[[_range(0,23)]]"
          options='{ "legend": { "display": false }, "animation": false }'
        >
        </chart-bar>
      </nuxeo-card>

      <!-- Result ranges -->
      <nuxeo-search-data
        start-date="[[startDate]]"
        end-date="[[_extendEndDate(endDate)]]"
        with-ranges='{"resultsCount":[
                       {"key": "no result", "to": 1 },
                       {"key": "less than 50", "from" : 1, "to": 50},
                       {"key": "between 51 and 200", "from" : 51, "to": 200 },
                       {"key": "between 200 and 1000", "from" : 201, "to": 1000},
                       {"key": "more than 1000", "from" : 1001 }]}'
        data="{{callPerNumberOfResults}}"
        index="[[index]]"
      >
      </nuxeo-search-data>

      <nuxeo-card heading="[[i18n('searchAnalytics.numberOfResults.heading')]]">
        <nuxeo-data-table items="[[callPerNumberOfResults]]">
          <nuxeo-data-table-column name="[[i18n('searchAnalytics.numberOfResults.range')]]">
            <template>[[item.key]]</template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column name="[[i18n('searchAnalytics.numberOfResults.calls')]]">
            <template>[[item.value]]</template>
          </nuxeo-data-table-column>
        </nuxeo-data-table>
      </nuxeo-card>

      <!-- Most used expressions for full text search  -->
      <nuxeo-search-data
        start-date="[[startDate]]"
        end-date="[[_extendEndDate(endDate)]]"
        grouped-by="searchDocumentModel.properties.defaults:ecm_fulltext"
        group-limit="5"
        data="{{callsPerFT}}"
        index="[[index]]"
      >
      </nuxeo-search-data>

      <nuxeo-card heading="[[i18n('searchAnalytics.mostPopularSearches.heading')]]">
        <nuxeo-data-table items="[[callsPerFT]]">
          <nuxeo-data-table-column name="[[i18n('searchAnalytics.mostPopularSearches.searchTerm')]]">
            <template>[[item.key]]</template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column name="[[i18n('searchAnalytics.mostPopularSearches.numberOfCalls')]]">
            <template>[[item.value]]</template>
          </nuxeo-data-table-column>
        </nuxeo-data-table>
      </nuxeo-card>

      <!-- Searches by number of pages displayed -->
      <nuxeo-search-data
        start-date="[[startDate]]"
        end-date="[[_extendEndDate(endDate)]]"
        with-ranges='{"pageIndex":[
                           {"key": "First page", "from" : 0, "to": 1 },
                           {"key": "Page 2", "from" : 1, "to": 2},
                           {"key": "Pages 3 to 5", "from" : 2, "to": 5 },
                           {"key": "Pages 6 to 10", "from" : 6, "to": 10},
                           {"key": "After 10 pages", "from" : 10 }]}'
        data="{{callPerNumberOfPages}}"
        index="[[index]]"
      >
      </nuxeo-search-data>

      <nuxeo-card heading="[[i18n('searchAnalytics.mostPopularSearches.numberOfPagesDisplayed.heading')]]">
        <nuxeo-data-table items="[[callPerNumberOfPages]]">
          <nuxeo-data-table-column name="[[i18n('searchAnalytics.mostPopularSearches.numberOfPagesDisplayed.range')]]">
            <template>[[item.key]]</template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column
            name="[[i18n('searchAnalytics.mostPopularSearches.numberOfPagesDisplayed.numberOfCalls')]]"
          >
            <template>[[item.value]]</template>
          </nuxeo-data-table-column>
        </nuxeo-data-table>
      </nuxeo-card>

      <!-- Searches by filters used -->
      <nuxeo-search-data
        start-date="[[startDate]]"
        end-date="[[_extendEndDate(endDate)]]"
        grouped-by="searchFields"
        group-limit="5"
        data="{{callByFilters}}"
      >
      </nuxeo-search-data>

      <nuxeo-card heading="[[i18n('searchAnalytics.filtersUsed.heading')]]">
        <nuxeo-data-table items="[[callByFilters]]">
          <nuxeo-data-table-column name="[[i18n('searchAnalytics.filtersUsed.numberOfFilters')]]">
            <template>[[item.key]]</template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column name="[[i18n('searchAnalytics.filtersUsed.numberOfCalls')]]">
            <template>[[item.value]]</template>
          </nuxeo-data-table-column>
        </nuxeo-data-table>
      </nuxeo-card>
    </div>
  `,

  is: 'nuxeo-search-analytics',
  behaviors: [ChartDataBehavior, I18nBehavior],

  properties: {
    index: {
      type: String,
      value: 'audit',
    },
    startDate: String,
    endDate: String,
    hoursBounds: {
      value: { min: 0, max: 23 },
    },
  },

  ready() {
    this.startDate = moment()
      .subtract(1, 'month')
      .format('YYYY-MM-DD');
    this.endDate = moment().format('YYYY-MM-DD');
  },

  _range(start, end) {
    const res = [];
    for (let i = start; i <= end; i++) {
      res.push(i);
    }
    return res;
  },

  _aggregatePerHourOfDay(entries) {
    // aggregate our buckets by key
    const agg = {};
    entries.forEach((e) => {
      agg[e.key] = agg[e.key] || [];
      agg[e.key].push(e.value);
    });
    // build our total per bucket
    const hours = this._range(this.hoursBounds.min, this.hoursBounds.max);
    return [
      hours.map((i) => {
        if (!agg[i] || !agg[i].length) {
          return 0;
        }
        // TODO: use Array.reduce once prototype.js is removed!
        // return agg[i].reduce(function(a, b) { return a + b; });
        let sum = 0;
        agg[i].forEach((v) => {
          sum += v;
        });
        return sum;
      }),
    ];
  },
});

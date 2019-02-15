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
`nuxeo-repository-analytics`
@group Nuxeo UI
@element nuxeo-repository-analytics
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import '@nuxeo/nuxeo-dataviz-elements/nuxeo-audit-data.js';
import '@nuxeo/nuxeo-dataviz-elements/nuxeo-repository-data.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/chart-elements/chart-pie.js';
import '@nuxeo/chart-elements/chart-line.js';
import { ChartDataBehavior } from './nuxeo-chart-data-behavior.js';
import { mimeTypes } from './nuxeo-mime-types.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment">
      :host {
        display: block;
      }

      nuxeo-date-picker {
        padding: 0 8px;
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

      .message {
        color: #c6c6c6;
      }

      nuxeo-data-table {
        height: 550px;
      }

      iron-icon {
        color: #0f9d58;
        --iron-icon-width: 144px;
        --iron-icon-height: 144px;
        margin-top: 50px;
      }

      chart-line, chart-pie {
        margin: 25px auto 0 auto;
        width: 100% !important;
        min-width: 30em;
        display: block;
        font-size: .8rem;
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

      <!-- Top Downloads -->
      <nuxeo-audit-data event-id="download" where="{&quot;extended.downloadReason&quot;: &quot;download&quot;}" grouped-by="docUUID" group-limit="10" start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" data="{{downloads}}">
      </nuxeo-audit-data>

      <nuxeo-page-provider auto="" page-size="10" query="[[_downloadsQuery(downloads)]]" schemas="dublincore, common" current-page="{{downloadedDocs}}">
      </nuxeo-page-provider>

      <nuxeo-card heading="[[i18n('repositoryAnalytics.topDownloads.heading')]]">
        <template is="dom-if" if="[[!_isEmpty(downloads)]]">
          <nuxeo-data-table items="[[downloadedDocs]]">
            <nuxeo-data-table-column name="[[i18n('repositoryAnalytics.topDownloads.file')]]">
              <template>[[item.title]]</template>
            </nuxeo-data-table-column>
            <nuxeo-data-table-column name="[[i18n('repositoryAnalytics.topDownloads.downloads')]]">
              <template>[[_numberOfDownloads(item)]]</template>
            </nuxeo-data-table-column>
          </nuxeo-data-table>
        </template>
        <template is="dom-if" if="[[_isEmpty(downloads)]]">
          <div class="message">[[i18n('repositoryAnalytics.noResults')]]</div>
        </template>
      </nuxeo-card>

      <!-- Number of documents -->
      <nuxeo-repository-data start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" metrics="cardinality(ecm:uuid)" data="{{totalCount}}" index="[[index]]">
      </nuxeo-repository-data>

      <nuxeo-card heading="[[i18n('repositoryAnalytics.documents.heading')]]">
        <iron-icon icon="icons:description"></iron-icon>
        <h1>[[totalCount]]</h1>
      </nuxeo-card>

      <!-- Document count per type -->
      <nuxeo-repository-data start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" grouped-by="ecm:primaryType" group-limit="10" data="{{typeCount}}" index="[[index]]">
      </nuxeo-repository-data>

      <nuxeo-card heading="[[i18n('repositoryAnalytics.documentTypes.heading')]]">
        <chart-pie values="[[_values(typeCount)]]" labels="[[_labels(typeCount)]]" options="{ &quot;legend&quot;: { &quot;display&quot;: true, &quot;position&quot;: &quot;bottom&quot;, &quot;labels&quot;: { &quot;boxWidth&quot;: 12 } }, &quot;animation&quot;: false }">
        </chart-pie>
      </nuxeo-card>

      <!-- Top 10 creators -->
      <nuxeo-repository-data start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" grouped-by="dc:creator" group-limit="10" data="{{topCreators}}" index="[[index]]">
      </nuxeo-repository-data>

      <nuxeo-card heading="[[i18n('repositoryAnalytics.topNCreators.heading', '10')]]">
        <chart-pie values="[[_values(topCreators)]]" labels="[[_labels(topCreators)]]" options="{ &quot;legend&quot;: { &quot;display&quot;: true, &quot;position&quot;: &quot;bottom&quot;, &quot;labels&quot;: { &quot;boxWidth&quot;: 12 } }, &quot;animation&quot;: false }">
        </chart-pie>
      </nuxeo-card>

      <!-- Documents created per week -->
      <nuxeo-repository-data start-date="[[_formatDate(startDate)]]" end-date="[[_extendEndDate(endDate)]]" with-date-intervals="week" date-field="dc:created" data="{{docsCreatedPerWeek}}" index="[[index]]">
      </nuxeo-repository-data>

      <nuxeo-card heading="[[i18n('repositoryAnalytics.documentsCreatedPerWeek.heading')]]">
        <chart-line labels="[[_labels(docsCreatedPerWeek)]]" values="[[_values(docsCreatedPerWeek)]]" options="{ &quot;legend&quot;: { &quot;display&quot;: false }, &quot;animation&quot;: false }">
        </chart-line>
      </nuxeo-card>

      <!-- Documents modified per week -->
      <nuxeo-repository-data start-date="[[_formatDate(startDate)]]" end-date="[[_extendEndDate(endDate)]]" with-date-intervals="week" date-field="dc:modified" data="{{docsModifiedPerWeek}}" index="[[index]]">
      </nuxeo-repository-data>

      <nuxeo-card heading="[[i18n('repositoryAnalytics.documentsModifiedPerWeek.heading')]]">
        <chart-line labels="[[_labels(docsModifiedPerWeek)]]" values="[[_values(docsModifiedPerWeek)]]" options="{ &quot;legend&quot;: { &quot;display&quot;: false }, &quot;animation&quot;: false }">
        </chart-line>
      </nuxeo-card>

      <!-- Files by mime-type -->
      <nuxeo-repository-data start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" grouped-by="file:content.mime-type" data="{{filesByMimeType}}" index="[[index]]">
      </nuxeo-repository-data>

      <nuxeo-card heading="[[i18n('repositoryAnalytics.filesByMimeType.heading')]]">
        <chart-pie values="[[_values(filesByMimeType)]]" labels="[[_types(filesByMimeType)]]" options="{ &quot;legend&quot;: { &quot;display&quot;: true, &quot;position&quot;: &quot;bottom&quot;, &quot;labels&quot;: { &quot;boxWidth&quot;: 12 } }, &quot;animation&quot;: false }">
        </chart-pie>
      </nuxeo-card>

    </div>
`,

  is: 'nuxeo-repository-analytics',
  behaviors: [ChartDataBehavior, I18nBehavior],

  properties: {
    index: {
      type: String,
      value: '_all'
    },
    startDate: String,
    endDate: String
  },

  ready: function() {
    this.startDate = moment().subtract(1, 'month').format('YYYY-MM-DD');
    this.endDate = moment().format('YYYY-MM-DD');
  },

  _types: function(data) {
    return data.map(function(obj) {
      var mimeType = mimeTypes[obj.key];
      if (mimeType) {
        if (mimeType.name) {
          return mimeType.name;
        } else if (mimeType.extensions && mimeType.extensions.length > 0) {
          return mimeType.extensions[0].toUpperCase();
        } else {
          return obj.key;
        }
      } else {
        return obj.key;
      }
    });
  },

  // builds page provider query to get info about downloaded docs
  _downloadsQuery: function(entries) {
    if (entries.length > 0) {
      var values = entries.map(function(entry) {
        return '\'' + entry.key + '\'';
      }).join(',');
      return 'SELECT * FROM Document WHERE ecm:uuid IN (' + values + ')';
    }
  },

  _numberOfDownloads: function(doc) {
    return this.downloads.find(function(entry) {
      return entry.key === doc.uid;
    }).value;
  },

  _isEmpty: function(array) {
    return !array || array.length === 0;
  }
});

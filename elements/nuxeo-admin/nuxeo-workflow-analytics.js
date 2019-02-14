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
`nuxeo-workflow-analytics`
@group Nuxeo UI
@element nuxeo-workflow-analytics
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-dataviz-elements/nuxeo-workflow-data.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
// import 'chart-elements/chart-bar.js';
// import 'chart-elements/chart-pie.js';
import { ChartDataBehavior } from './nuxeo-chart-data-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment">
      :host {
        display: block;
      }

      nuxeo-select {
        min-width: 250px;
      }

      .dates input {
        border: 1px solid #c6c6c6;
        box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.0);
        border-radius: 3px;
        margin-left: .5em;
        width: 125px;
      }

      nuxeo-date-picker {
        padding: 0 16px;
      }

      nuxeo-data-table {
        height: 450px;
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

      iron-icon {
        color: #0f9d58;
        --iron-icon-width: 144px;
        --iron-icon-height: 144px;
        margin-top: 50px;
      }

      chart-bar, chart-pie {
        margin: 25px auto 0 auto;
        width: 100% !important;
        display: block;
        font-size: .8rem;
      }

      @media (max-width: 1024px) {
        .flex-layout nuxeo-card {
          flex: 1 0 calc(100% - 2em);
        }
      }

    </style>

    <nuxeo-resource auto="" path="workflowModel" on-response="_handleWorkflowModelResponse">
    </nuxeo-resource>

    <nuxeo-card class="dates">
      <div class="horizontal flex end-justified layout center wrap">
        <nuxeo-select label="[[i18n('analytics.workflow')]]" placeholder="[[i18n('analytics.workflow')]]" selected="{{workflow}}" options="[[workflows]]"></nuxeo-select>
        <nuxeo-date-picker value="{{startDate::change}}" label="[[i18n('analytics.after')]]"></nuxeo-date-picker>
        <nuxeo-date-picker value="{{endDate::change}}" label="[[i18n('analytics.before')]]"></nuxeo-date-picker>
      </div>
    </nuxeo-card>

    <div class="flex-layout">
      <!-- Average wf duration -->
      <nuxeo-workflow-data workflow="[[workflow]]" event="afterWorkflowFinish" metrics="avg(timeSinceWfStarted)" start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" data="{{avgWorkflowLength}}">
      </nuxeo-workflow-data>

      <nuxeo-card heading="[[i18n('workflowAnalytics.averageWorkflowDuration.heading')]]">
        <iron-icon icon="image:timer"></iron-icon>
        <h1>[[_asDuration(avgWorkflowLength)]]</h1>
      </nuxeo-card>

      <!-- Wf initiators -->
      <nuxeo-workflow-data workflow="[[workflow]]" event="afterWorkflowStarted" grouped-by="workflowInitiator" start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" data="{{initiators}}">
      </nuxeo-workflow-data>

      <nuxeo-card heading="[[i18n('workflowAnalytics.workflowInitiators.heading')]]">
        <chart-pie values="[[_values(initiators)]]" labels="[[_series(initiators)]]" options="{ &quot;legend&quot;: { &quot;display&quot;: true, &quot;position&quot;: &quot;bottom&quot;, &quot;labels&quot;: { &quot;boxWidth&quot;: 12 } }, &quot;animation&quot;: false }">
        </chart-pie>
      </nuxeo-card>

      <!-- Actions per user -->
      <nuxeo-workflow-data workflow="[[workflow]]" event="afterWorkflowTaskEnded" grouped-by="taskActor, action" start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" data="{{numberOfActionsPerUser}}">
      </nuxeo-workflow-data>

      <nuxeo-card heading="[[i18n('workflowAnalytics.actionsPerUser.heading')]]">
        <chart-bar labels="[[_labels(numberOfActionsPerUser)]]" series="[[_series(numberOfActionsPerUser)]]" values="[[_values(numberOfActionsPerUser)]]" options="{ &quot;legend&quot;: { &quot;display&quot;: true, &quot;position&quot;: &quot;bottom&quot;, &quot;labels&quot;: { &quot;boxWidth&quot;: 12 } }, &quot;animation&quot;: false }">
        </chart-bar>
      </nuxeo-card>

      <!-- Average task duration per user -->
      <nuxeo-workflow-data workflow="[[workflow]]" event="afterWorkflowTaskEnded" grouped-by="taskActor" metrics="avg(timeSinceTaskStarted)" start-date="[[startDate]]" end-date="[[_extendEndDate(endDate)]]" data="{{avgTaskDurationPerUser}}">
      </nuxeo-workflow-data>

      <nuxeo-card heading="[[i18n('workflowAnalytics.averageTaskDurationPerUser.heading')]]">
        <nuxeo-data-table items="[[_table(avgTaskDurationPerUser)]]">
          <nuxeo-data-table-column name="[[i18n('workflowAnalytics.averageTaskDurationPerUser.user')]]">
            <template>[[item.key]]</template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column name="[[i18n('workflowAnalytics.averageTaskDurationPerUser.duration')]]">
            <template>[[item.value]]</template>
          </nuxeo-data-table-column>
        </nuxeo-data-table>
      </nuxeo-card>

    </div>
`,

  is: 'nuxeo-workflow-analytics',
  behaviors: [ChartDataBehavior, I18nBehavior],

  properties: {
    workflow: {
      type: String,
      value: 'ParallelDocumentReview'
    },
    index: {
      type: String,
      value: 'nuxeo'
    },
    startDate: String,
    endDate: String,
    workflows: Array
  },

  ready: function() {
    this.startDate = moment().subtract(1, 'month').format('YYYY-MM-DD');
    this.endDate = moment().format('YYYY-MM-DD');
  },

  // override _labels and _values from nuxeo-chart-data-behavior.html
  _labels: function(data) {
    if (!data) { return []; }
    if (data.value) {
      return data.value.map(function(obj) {
        return obj.key;
      });
    } else {
      return this._labels(data[0]);
    }
  },

  _values: function(data) {
    var values = [];
    data.forEach(function(entry) {
      if (Array.isArray(entry.value)) {
        values.push(entry.value.map(function(e) { return e.value; }));
      } else {
        values.push(entry.value);
      }
    });
    return values;
  },

  _asDuration: function(duration) {
    var seconds = Math.floor(duration / 1000),
        minutes = Math.floor(seconds / 60),
        hours = Math.floor(minutes / 60),
        days = Math.floor(hours / 24),
        result = '';
    hours = hours - (days * 24);
    minutes = minutes - (days * 24 * 60) - (hours * 60);
    seconds = seconds - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);
    if (days > 0) {
      result += days + ' Days ';
    }
    if (hours > 0) {
      result += hours + 'h ';
    }
    if (minutes > 0) {
      result += minutes + 'm ';
    }
    if (seconds > 0) {
      result += seconds + 's ';
    }
    return result;
  },

  _table: function(data) {
    return data.map(function(e) {
      return {key: e.key, value: this._asDuration(e.value)};
    }.bind(this));
  },

  _handleWorkflowModelResponse: function(response) {
    var _workflowModels = response.detail.response.entries;
    this.workflows = _workflowModels.map(function(wfm) {
      return {
        id: wfm.name,
        label: this.i18n(wfm.title)
      }
    }.bind(this));
    this.workflow = this.workflows[0].id;
  }
});

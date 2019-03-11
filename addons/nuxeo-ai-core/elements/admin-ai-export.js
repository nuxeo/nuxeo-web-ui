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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';

/**
`nuxeo-ai-admin`
@group Nuxeo UI
@element nuxeo-admin-ai-export
*/
Polymer({
  _template: html`
        <style>
            #statsResult {
                height: 60vh;
            }

            .totalLabel {
                padding-right: 20px;
            }

            .row-container {
                @apply --layout-horizontal;
                @apply --layout-wrap;
            }
        </style>

        <nuxeo-operation id="aiStats" op="AI.DatasetStats" response="{{_stats}}"></nuxeo-operation>
        <nuxeo-operation id="aiExport" op="AI.DatasetExport"></nuxeo-operation>
        <nuxeo-card heading="[[i18n('admin.ai.export')]]">
            <paper-textarea id="queryInput" type="search" label="[[i18n('admin.ai.query')]]" value="{{query}}" placeholder="[[i18n('imaging.query.placeholder')]]" autofocus="">
            </paper-textarea>
            <paper-input id="inputs" label="[[i18n('admin.ai.inputs')]]" value="{{inProps}}"></paper-input>
            <paper-input id="outputs" label="[[i18n('admin.ai.outputs')]]" value="{{outProps}}"></paper-input>
            <paper-input id="split" label="[[i18n('admin.ai.split')]]" value="{{splitProp}}"></paper-input>
            <paper-button on-tap="_recompute">[[i18n('admin.ai.stats.action')]]</paper-button>
            <paper-button on-tap="_export">[[i18n('admin.ai.export.action')]]</paper-button>
        </nuxeo-card>
        <nuxeo-card heading="[[i18n('admin.ai.stats')]]">
            <div class="row-container">
                <span class="totalLabel">[[_computeLabel(_stats, 'total', i18n)]]</span>
                <span class="totalLabel">[[_computeLabel(_stats, 'count', i18n)]]</span>
            </div>
            <nuxeo-data-table id="statsResult" items="[[_filter(_stats)]]">
                <nuxeo-data-table-column name="[[i18n('admin.ai.stats.field')]]" flex="10">
                    <template>
                        [[item.field]]
                    </template>
                </nuxeo-data-table-column>
                <nuxeo-data-table-column name="[[i18n('admin.ai.stats.type')]]" flex="10">
                    <template>
                        [[item.type]]
                    </template>
                </nuxeo-data-table-column>
                <nuxeo-data-table-column name="[[i18n('admin.ai.stats.value')]]" flex="50">
                    <template>
                        [[_displayVal(item)]]
                    </template>
                </nuxeo-data-table-column>
            </nuxeo-data-table>
        </nuxeo-card>
        <nuxeo-card heading="[[i18n('admin.ai.export')]]">
            <div class="row-container">
                [[_exportText]]
            </div>
        </nuxeo-card>
`,

  is: 'nuxeo-admin-ai-export',
  behaviors: [LayoutBehavior],

  properties: {
      inProps: {
          type: String,
          value: 'dc:title,file:content'
      },
      outProps: {
          type: String,
          value: 'dc:lastContributor'
      },
      splitProp: {
          type: String,
          value: '80'
      },
      query: {
          type: String,
          value: "SELECT * FROM Document WHERE ecm:primaryType = 'File'"
      },
      _exportText: {
          type: String,
          value: ''
      },
      _stats: {
          type: String
      }
  },

  _displayVal: function (val) {
      if (val.numericValue != null) {
          return val.numericValue;
      }
      if (val.type === 'terms') {
          var toReturn = '';
          for (i = 0, len = val.value.length; i < len; i++) {
              toReturn += ' ' + val.value[i].key + ' (' + val.value[i].docCount + ')';
          }
          return toReturn;
      } else {
          return JSON.stringify(val.value);
      }
  },

  _filter: function (items) {
      return items && items.filter(function (item) {
          return !(item.type === 'total' || item.type === 'count');
      });
  },

  _computeLabel: function (theStats, fieldName) {
      var foundItem = theStats && theStats.find(function (item) {
          return item.type === fieldName;
      });
      return foundItem && this.i18n('admin.ai.export.' + fieldName, foundItem.numericValue);
  },

  _recompute: function () {
      this.$.aiStats.params = {
          'query': this.query,
          'inputs': this.inProps,
          'outputs': this.outProps
      };
      this.$.aiStats.execute().then(function (response) {
          if (response === undefined || response.length === 0) {
              this.fire('notify', {message: this.i18n('admin.ai.stats.none')});
          }
      }.bind(this)).catch(function () {
          this.fire('notify', {message: this.i18n('admin.ai.stats.error')});
      }.bind(this));
  },

  _export: function () {
      this.$.aiExport.params = {
          'query': this.query,
          'inputs': this.inProps,
          'outputs': this.outProps,
          'split': this.splitProp
      };
      this.$.aiExport.execute().then(function (response) {
          this._exportText = this.i18n('admin.ai.export.id', response.value);
          this.fire('notify', {message: this.i18n('admin.ai.export.success')});
      }.bind(this)).catch(function () {
          this._exportText = '';
          this.fire('notify', {message: this.i18n('admin.ai.export.error')});
      }.bind(this));
  }
});

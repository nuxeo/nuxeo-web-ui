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
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
/** 
`nuxeo-ai-admin`
@group Nuxeo UI
@element admin-ai-advanced-export
*/
class AdminAIAdvancedExport extends mixinBehaviors([I18nBehavior], Nuxeo.Element, LayoutBehavior) {
  static get template() {
    return html`
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
        <paper-textarea
          id="queryInput"
          type="search"
          label="[[i18n('admin.ai.query')]]"
          value="{{query}}"
          placeholder="[[i18n('imaging.query.placeholder')]]"
          autofocus
        >
        </paper-textarea>
        <nuxeo-input id="inputs" label="[[i18n('admin.ai.inputs')]]" value="{{inProps}}" required></nuxeo-input>
        <nuxeo-input id="outputs" label="[[i18n('admin.ai.outputs')]]" value="{{outProps}}" required></nuxeo-input>
        <nuxeo-input id="split" label="[[i18n('admin.ai.split')]]" value="{{splitProp}}"></nuxeo-input>
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
    `;
  }

  static get is() {
    return 'nuxeo-admin-ai-advanced-export';
  }

  static get properties() {
    return {
      /**
       * Input properties
       */
      inProps: {
        type: String,
        value: 'dc:title,file:content',
      },
      /**
       * Output properites
       */
      outProps: {
        type: String,
        value: 'dc:lastContributor',
      },

      /**
       * Split train/test
       */
      splitProp: {
        type: String,
        value: '80',
      },
      /**
       * Query to use for document collection
       */
      query: {
        type: String,
        value: "SELECT * FROM Document WHERE ecm:primaryType = 'File'",
      },
      /**
       * Text to headline export
       */
      _exportText: {
        type: String,
        value: '',
      },
      /**
       * Statistics
       */
      _stats: {
        type: String,
      },
    };
  }

  _displayVal(val) {
    if (val.numericValue != null) {
      return val.numericValue;
    }
    if (val.type === 'terms') {
      let toReturn = '';
      val.value.forEach((elem) => {
        toReturn += ` ${elem.key} (${elem.docCount})`;
      });

      return toReturn;
    }
    return JSON.stringify(val.value);
  }

  _filter(items) {
    return items && items.filter((item) => !(item.type === 'total' || item.type === 'count'));
  }

  _computeLabel(theStats, fieldName) {
    const foundItem = theStats && theStats.find((item) => item.type === fieldName);
    return foundItem && this.i18n(`admin.ai.export.${fieldName}`, foundItem.numericValue);
  }

  _recompute() {
    this.$.aiStats.params = {
      query: this.query,
      inputs: this.inProps,
      outputs: this.outProps,
    };
    this.$.aiStats
      .execute()
      .then((response) => {
        if (!response || response.length === 0) {
          this.fire('notify', { message: this.i18n('admin.ai.stats.none') });
        }
      })
      .catch(() => {
        this.fire('notify', { message: this.i18n('admin.ai.stats.error') });
      });
  }

  _export() {
    this.$.aiExport.params = {
      query: this.query,
      inputs: this.inProps,
      outputs: this.outProps,
      split: this.splitProp,
    };
    this.$.aiExport
      .execute()
      .then((response) => {
        this._exportText = this.i18n('admin.ai.export.id', response.value);
        this.fire('notify', { message: this.i18n('admin.ai.export.success') });
      })
      .catch(() => {
        this._exportText = '';
        this.fire('notify', { message: this.i18n('admin.ai.export.error') });
      });
  }
}

customElements.define(AdminAIAdvancedExport.is, AdminAIAdvancedExport);
Nuxeo.AdminAIAdvancedExport = AdminAIAdvancedExport;

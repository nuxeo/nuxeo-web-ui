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
`nuxeo-csv-export-button`
@group Nuxeo UI
@element nuxeo-csv-export-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <nuxeo-operation-button id="btn" operation="Bulk.RunAction" input="[[provider]]" params="[[_params(provider, schemas, fields)]]" icon="nuxeo:csv-export" label="csvExportButton.label" show-label\$="[[showLabel]]" poll-interval="[[pollInterval]]" error-label="csvExportButton.action.error" async="" download="">
    </nuxeo-operation-button>
`,

  is: 'nuxeo-csv-export-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    /**
     * Page provider from which results are to be exported.
     */
    provider: {
      type: Object,
    },
    /**
     * The interval to poll for the result, in milliseconds.
     */
    pollInterval: {
      type: Number,
      value: 1000,
    },
    /**
     * A comma separated list of schemas to be used to get the results.
     * If `null` or `undefined`, the `provider`'s schemas will be used.
     */
    schemas: {
      type: String,
    },
    /**
     * A comma separated list of fields to be be exported.
     */
    fields: {
      type: String,
    },
    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    /**
     * Current action status.
     */
    status: {
      type: Object,
      notify: true,
    }
  },

  ready: function() {
    this.$.btn.addEventListener('poll-start', this._onPollStart.bind(this));
    this.$.btn.addEventListener('response', this._onResponse.bind(this));
  },

  _params: function() {
    var actionParams = {};
    var schemas = this.schemas != null ? this.schemas : this.provider && this.provider.schemas;
    if (schemas) {
      actionParams.schemas = schemas.split(',').map(function(s) { return s.trim(); });
    }
    if (this.fields) {
      actionParams.xpaths = this.fields.split(',').map(function(s) { return s.trim(); });
    }
    return {
      action: 'csvExport',
      parameters: JSON.stringify(actionParams),
    };
  },

  _onPollStart: function() {
    this.fire('notify', { message: this.i18n('csvExportButton.action.poll') });
  },

  _onResponse: function() {
    this.fire('notify', { message: this.i18n('csvExportButton.action.completed') });
  }
});

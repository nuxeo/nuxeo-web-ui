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
`nuxeo-download-documents-button`
@group Nuxeo UI
@element nuxeo-download-documents-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <nuxeo-operation-button id="btn" operation="Blob.BulkDownload" input="[[_input(document, documents)]]" params="[[_params(document, documents)]]" icon="nuxeo:download" label="bulkDownload.tooltip" show-label\$="[[showLabel]]" error-label="bulkDownload.error" async="" download=""></nuxeo-operation-button>
`,

  is: 'nuxeo-download-documents-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    documents: {
      type: Array,
      notify: true,
      value: []
    },

    document: {
      type: Object,
    },

    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },
  },

  ready: function() {
    this.$.btn.addEventListener('poll-start', this._onPollStart.bind(this));
    this.$.btn.addEventListener('response', this._onResponse.bind(this));
  },

  _params: function() {
    var params = {};
    if (this.document && (this.hasFacet(this.document, 'Collection') || this.hasFacet(this.document, 'Folderish'))) {
      params.filename = this.document.title + '_' + new Date().getTime() + '.zip';
    } else {
      params.filename = this.i18n('bulkDownload.filename.selection') + "-" + new Date().getTime() + ".zip"
    }
    return params;
  },

  _input: function() {
    return 'docs:' + (this.document ? [this.document] : this.documents).map(function(doc) {
      return doc.uid;
    }).join(',');
  },

  _onPollStart: function() {
    this.fire('notify', { message: this.i18n('bulkDownload.preparing') });
  },

  _onResponse: function() {
    this.fire('notify', { message: this.i18n('bulkDownload.completed') });
  }
});

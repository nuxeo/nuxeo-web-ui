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

import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { isPageProviderDisplayBehavior } from '../select-all-helpers.js';

/**
`nuxeo-download-documents-button`
@group Nuxeo UI
@element nuxeo-download-documents-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles nuxeo-styles"></style>
    <nuxeo-operation-button
      id="btn"
      operation="Blob.BulkDownload"
      input="[[_input(document, documents)]]"
      params="[[_params(document, documents)]]"
      icon="nuxeo:download"
      label="bulkDownload.tooltip"
      show-label$="[[showLabel]]"
      error-label="bulkDownload.error"
      async
      download
      hidden$="[[!_isAvailable(documents.splices, view)]]"
    ></nuxeo-operation-button>
  `,

  is: 'nuxeo-download-documents-button',
  behaviors: [NotifyBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    documents: {
      type: Array,
      notify: true,
      value: [],
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

  ready() {
    this.$.btn.addEventListener('poll-start', this._onPollStart.bind(this));
    this.$.btn.addEventListener('response', this._onResponse.bind(this));
  },

  _isAvailable() {
    return !isPageProviderDisplayBehavior(this.documents);
  },

  _params() {
    const params = {};
    if (this.document && (this.hasFacet(this.document, 'Collection') || this.hasFacet(this.document, 'Folderish'))) {
      params.filename = `${this.document.title}_${new Date().getTime()}.zip`;
    } else {
      params.filename = `${this.i18n('bulkDownload.filename.selection')}-${new Date().getTime()}.zip`;
    }
    return params;
  },

  _input() {
    if (this._isAvailable()) {
      return `docs:${(this.document ? [this.document] : this.documents).map((doc) => doc.uid).join(',')}`;
    }
  },

  _onPollStart() {
    this.notify({ message: this.i18n('bulkDownload.preparing'), duration: 0, dismissible: true });
  },

  _onResponse() {
    this.notify({ message: this.i18n('bulkDownload.completed'), close: true });
  },
});

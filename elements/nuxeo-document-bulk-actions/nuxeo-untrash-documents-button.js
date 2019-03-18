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

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-untrash-documents-actions`
@group Nuxeo UI
@element nuxeo-untrash-documents-actions
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-operation id="operation" op="Document.Untrash" sync-indexing></nuxeo-operation>

    <template is="dom-if" if="[[_isAvailable(documents.splices)]]">
      <div class="action" on-tap="untrashDocuments">
        <paper-icon-button icon="nuxeo:restore-deleted" id="untrashAllButton"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]">[[_label]]</span>
      </div>
      <nuxeo-tooltip position="[[tooltipPosition]]">[[i18n(_label)]]</nuxeo-tooltip>
    </template>
`,

  is: 'nuxeo-untrash-documents-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    documents: {
      type: Array,
      notify: true,
      value: [],
    },

    tooltipPosition: {
      type: String,
      value: 'bottom',
    },

    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    _label: {
      type: String,
      computed: '_computeLabel(i18n)',
    },
  },

  untrashDocuments() {
    if (this.docsHavePermissions && window.confirm(this.i18n('untrashDocumentsButton.confirm.untrashDocuments'))) {
      if (this.documents && this.documents.length) {
        const uids = this.documents.map((doc) => doc.uid).join(',');
        this.$.operation.input = `docs:${  uids}`;
        const uidsArray = this.documents.map((doc) => doc.uid);
        this.$.operation.execute().then(() => {
          this.fire('nuxeo-documents-untrashed', {documentIds: uidsArray});
          this.documents = [];
          this.fire('refresh');
        },
        (error) => {
          this.fire('nuxeo-documents-untrashed', {error,  documents: uidsArray});
        });
      }
    }
  },

  _isAvailable() {
    return this.documents && this.documents.length > 0 && this._checkDocsPermissions()
        && this._checkDocsAreTrashed();
  },

  _checkDocsAreTrashed() {
    return this.documents.every((document) => this.isTrashed(document));
  },

  _checkDocsPermissions() {
    this.docsHavePermissions = !(this.documents.some(
      (document) => !this._docHasPermissions(document)));
    return this.docsHavePermissions;
  },

  /*
   * Checks if a single given document has 'Write' permission
   */
  _docHasPermissions(document) {
    return this.hasPermission(document, 'Write');
  },

  _computeLabel() {
    return this.i18n('untrashDocumentsButton.tooltip');
  },
});

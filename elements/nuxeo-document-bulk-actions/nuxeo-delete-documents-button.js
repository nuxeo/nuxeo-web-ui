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
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { SelectAllBehavior } from '../nuxeo-select-all-behavior.js';

/**
`nuxeo-delete-documents-actions`
@group Nuxeo UI
@element nuxeo-delete-documents-actions
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles nuxeo-styles"></style>

    <nuxeo-operation id="deleteOp" op="Document.Delete" sync-indexing></nuxeo-operation>

    <nuxeo-operation id="trashOp" op="Document.Trash" sync-indexing></nuxeo-operation>

    <nuxeo-operation-button 
      id="bulkOpBtn" 
      operation="Bulk.RunAction"
      input="[[view]]"
      params="[[_params(hard)]]"
      poll-interval="[[pollInterval]]"
      async 
      hidden
    >
    </nuxeo-operation-button>

    <template is="dom-if" if="[[_isAvailable(documents.splices)]]">
      <div class="action" on-tap="deleteDocuments">
        <paper-icon-button icon="[[_icon]]" id="deleteAllButton" aria-labelledby="label"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]" id="label">[[_label]]</span>
        <nuxeo-tooltip position="[[tooltipPosition]]">[[_label]]</nuxeo-tooltip>
      </div>
    </template>
  `,

  is: 'nuxeo-delete-documents-button',
  behaviors: [SelectAllBehavior, NotifyBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    documents: {
      type: Array,
      notify: true,
      value: [],
    },

    /**
     * Permanently delete the documents.
     */
    hard: {
      type: Boolean,
      value: false,
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

    _icon: {
      type: 'String',
      computed: '_computeIcon(hard)',
    },

    _label: {
      type: 'String',
      computed: '_computeLabel(hard, i18n)',
    },
  },

  deleteDocuments() {
    if ((this._isSelectAllActive() || this.docsHavePermissions)
      && window.confirm(this.i18n('deleteDocumentsButton.confirm.deleteDocuments'))) {
      if (this._isSelectAllActive()) {
        this.$.bulkOpBtn._execute();
      } else if (this.documents && this.documents.length) {
        const uids = this.documents.map((doc) => doc.uid).join(',');
        const op = this.hard ? this.$.deleteOp : this.$.trashOp;
        op.input = `docs:${uids}`;
        op.execute().then(
          () => {
            this.fire('nuxeo-documents-deleted', { documents: this.documents });
            this.documents = [];
            this.fire('refresh');
          },
          (error) => {
            this.fire('nuxeo-documents-deleted', { error, documents: this.documents });
          },
        );
      }
    }
  },

  _onPollStart() {
    this.notify({ message: this.i18n('deleteDocumentsButton.bulkOperation.poll.start') });
  },

  _onResponse() {
    this.fire('nuxeo-documents-deleted', { documents: this.documents });
    this.documents = [];
    this.fire('refresh');
  },

  _params() {
    return {
      operationId: this.hard ? 'Document.Delete' : 'Document.Trash',
      parameters: {
        properties: '',
      },
    };
  },

  /**
   * Action is available if all selected items are not trashed and `hard` is not active OR if all selected items
   * are trashed and `hard` is active OR if select all is active.
   */
  _isAvailable() {
    return this._isSelectAllActive() || (
      this.documents &&
      this.documents.length > 0 &&
      this._checkDocsPermissions() &&
      (this.hard || !this._checkDocsAreTrashed())
    );
  },

  /**
   * Checks if all selected documents are trashed.
   */
  _checkDocsAreTrashed() {
    return this.documents.every((document) => this.isTrashed(document));
  },

  _checkDocsPermissions() {
    this.docsHavePermissions = this.documents && !this.documents.some((document) => !this._docHasPermissions(document));
    return this.docsHavePermissions;
  },

  /*
   * Checks if a single given document has the 'Remove' permission to delete/trash
   */
  _docHasPermissions(document) {
    return !this.isUnderRetentionOrLegalHold(document) && this.hasPermission(document, 'Remove');
  },

  _computeIcon(hard) {
    return hard ? 'nuxeo:delete-permanently' : 'nuxeo:delete';
  },

  _computeLabel(hard) {
    return this.i18n(hard ? 'deleteDocumentsButton.tooltip.permanently' : 'deleteDocumentsButton.tooltip');
  },
});

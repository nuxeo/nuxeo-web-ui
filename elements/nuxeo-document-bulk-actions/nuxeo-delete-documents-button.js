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

    <nuxeo-operation-button
      id="bulkOpBtn"
      icon="[[_icon]]"
      input="[[view]]"
      label="[[_label]]"
      operation="[[_operation(hard)]]"
      params="[[_params()]]"
      show-label="[[showLabel]]"
      tooltip-position="[[tooltipPosition]]"
      sync-indexing
      hidden="[[!_isAvailable(documents.splices)]]"
    >
    </nuxeo-operation-button>
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

  attached() {
    // capture the click event on the capture phase to set the necessary nuxeo-operation-button properties
    this.$.bulkOpBtn.addEventListener('click', this._deleteDocuments.bind(this), { capture: true });
  },

  detached() {
    this.$.bulkOpBtn.removeEventListener('click', this._deleteDocuments.bind(this));
  },

  deleteDocuments() {
    if (
      (this._isSelectAllActive() || this.docsHavePermissions) &&
      window.confirm(this.i18n('deleteDocumentsButton.confirm.deleteDocuments'))
    ) {
      const documents = this.documents;
      const isSelectAllActive = this._isSelectAllActive();
      // if select all is active, then we don't pass the documents (we delete/trash all of them)
      const detail = isSelectAllActive ? {} : { documents };
      this.bulkOpBtn._execute()
        .then(() => {
          this.fire('nuxeo-documents-deleted', detail);
          this.documents = [];
          // TO DISCUSS - this refresh can be problematic if we no longer are in the same document, needs discussion
          this.fire('refresh');
        })
        .catch((error) => {
          if (!isSelectAllActive) {
            this.fire('nuxeo-documents-deleted', { error, documents });
          }
        });
    }
  },

  _deleteDocuments(e) {
    // prevent the nuxeo-operation-button click, so we can set the necessary properties before
    e.preventDefault();
    e.stopPropagation();
    this.deleteDocuments();
  },

  _operation() {
    return this.hard ? 'Document.Delete' : 'Document.Trash';
  },

  _params() {
    return {};
  },

  /**
   * Action is available if all selected items are not trashed and `hard` is not active OR if all selected items
   * are trashed and `hard` is active OR if select all is active.
   */
  _isAvailable() {
    return (
      this._isSelectAllActive() ||
      (this.documents &&
        this.documents.length > 0 &&
        this._checkDocsPermissions() &&
        (this.hard || !this._checkDocsAreTrashed()))
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

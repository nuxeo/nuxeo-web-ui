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
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { isPageProviderDisplayBehavior } from '../select-all-helpers.js';

/**
`nuxeo-delete-documents-actions`
@group Nuxeo UI
@element nuxeo-delete-documents-actions
*/
class NuxeoDeleteDocumentsButton extends mixinBehaviors([I18nBehavior, FiltersBehavior], Nuxeo.OperationButton) {
  static get is() {
    return 'nuxeo-delete-documents-button';
  }

  static get properties() {
    return {
      documents: {
        type: Object,
        notify: true,
        value: {},
      },

      /**
       * Permanently delete the documents.
       */
      hard: {
        type: Boolean,
        value: false,
      },
      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        computed: '_isHidden(documents.splices, hard)',
      },
    };
  }

  static get observers() {
    return ['_updateIcon(hard)', '_updateLabel(hard)'];
  }

  constructor() {
    super();
    this.syncIndexing = true;
  }

  _execute() {
    this.deleteDocuments();
  }

  /**
   * Keeping the method to keep the API compatibility (it might be called from somwhere else since it's public API).
   */
  deleteDocuments() {
    if (
      (isPageProviderDisplayBehavior(this.documents) || this.docsHavePermissions) &&
      window.confirm(this.i18n('deleteDocumentsButton.confirm.deleteDocuments'))
    ) {
      this.input = this.documents;
      this.operation = this._operation();
      this.params = {};

      const { documents } = this;
      const isSelectAllActive = isPageProviderDisplayBehavior(this.documents);
      // if select all is active, then we don't pass the documents (we delete/trash all of them)
      const detail = isSelectAllActive ? {} : { documents };
      super
        ._execute()
        .then(() => {
          this.fire('nuxeo-documents-deleted', detail);
          this.documents = [];
          this.fire('refresh');
        })
        .catch((error) => {
          if (!isSelectAllActive) {
            this.fire('nuxeo-documents-deleted', { error, documents });
          }
        });
    }
  }

  _operation() {
    return this.hard ? 'Document.Delete' : 'Document.Trash';
  }

  /**
   * Action is available if all selected items are not trashed and `hard` is not active OR if all selected items
   * are trashed and `hard` is active OR if select all is active.
   */
  _isHidden() {
    return !(
      isPageProviderDisplayBehavior(this.documents) ||
      (this.documents &&
        this.documents.length > 0 &&
        this._checkDocsPermissions() &&
        (this.hard || !this._checkDocsAreTrashed()))
    );
  }

  /**
   * Checks if all selected documents are trashed.
   */
  _checkDocsAreTrashed() {
    return this.documents.every((document) => this.isTrashed(document));
  }

  _checkDocsPermissions() {
    this.docsHavePermissions = this.documents && !this.documents.some((document) => !this._docHasPermissions(document));
    return this.docsHavePermissions;
  }

  /*
   * Checks if a single given document has the 'Remove' permission to delete/trash
   */
  _docHasPermissions(document) {
    return this.hasPermission(document, 'Remove');
  }

  _updateIcon(hard) {
    this.icon = hard ? 'nuxeo:delete-permanently' : 'nuxeo:delete';
  }

  _updateLabel(hard) {
    this.label = hard ? 'deleteDocumentsButton.tooltip.permanently' : 'deleteDocumentsButton.tooltip';
  }
}

window.customElements.define(NuxeoDeleteDocumentsButton.is, NuxeoDeleteDocumentsButton);

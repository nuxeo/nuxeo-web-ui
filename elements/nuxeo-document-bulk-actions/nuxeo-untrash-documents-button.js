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

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class';
import { isPageProviderDisplayBehavior } from '../select-all-helpers.js';

/**
`nuxeo-untrash-documents-actions`
@group Nuxeo UI
@element nuxeo-untrash-documents-actions
*/
class NuxeoUntrashDocumentsButton extends mixinBehaviors([I18nBehavior, FiltersBehavior], Nuxeo.OperationButton) {
  static get is() {
    return 'nuxeo-untrash-documents-button';
  }

  static get properties() {
    return {
      documents: {
        type: Object,
        notify: true,
        value: {},
      },
      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
        computed: '_isHidden(documents.splices)',
      },
    };
  }

  constructor() {
    super();
    this.icon = 'nuxeo:restore-deleted';
    this.label = 'untrashDocumentsButton.tooltip';
    this.operation = 'Document.Untrash';
    this.syncIndexing = true;
  }

  _execute() {
    this.untrashDocuments();
  }

  /**
   * Keeping the method to keep the API compatibility (it might be called from somewhere else since it's public API).
   */
  untrashDocuments() {
    if (
      (isPageProviderDisplayBehavior(this.documents) || this.docsHavePermissions) &&
      window.confirm(this.i18n('untrashDocumentsButton.confirm.untrashDocuments'))
    ) {
      const { documents } = this;
      const isSelectAllActive = isPageProviderDisplayBehavior(this.documents);
      // if select all is active, then we don't pass the documents (we untrash all of them)
      const detail = isSelectAllActive ? {} : { documents };

      this.input = this.documents;
      this.params = {};
      super
        ._execute()
        .then(() => {
          this.fire('nuxeo-documents-untrashed', detail);
          this.documents = [];
          this.fire('refresh');
        })
        .catch((error) => {
          if (!isSelectAllActive) {
            this.fire('nuxeo-documents-untrashed', { error, documents });
          }
        });
    }
  }

  _isHidden() {
    return !(
      isPageProviderDisplayBehavior(this.documents) ||
      (this.documents && this.documents.length > 0 && this._checkDocsPermissions() && this._checkDocsAreTrashed())
    );
  }

  _checkDocsAreTrashed() {
    return this.documents.every((document) => this.isTrashed(document));
  }

  _checkDocsPermissions() {
    this.docsHavePermissions = !this.documents.some((document) => !this._docHasPermissions(document));
    return this.docsHavePermissions;
  }

  /*
   * Checks if a single given document has 'Write' permission
   */
  _docHasPermissions(document) {
    return this.hasPermission(document, 'Write');
  }
}

window.customElements.define(NuxeoUntrashDocumentsButton.is, NuxeoUntrashDocumentsButton);

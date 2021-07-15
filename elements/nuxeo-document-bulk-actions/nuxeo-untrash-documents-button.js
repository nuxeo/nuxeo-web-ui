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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class';
import { SelectAllBehavior } from '../nuxeo-select-all-behavior.js';

/**
 `nuxeo-untrash-documents-actions`
 @group Nuxeo UI
 @element nuxeo-untrash-documents-actions
 */
class NuxeoUntrashDocumentsButton extends mixinBehaviors(
  [SelectAllBehavior, I18nBehavior, FiltersBehavior],
  Nuxeo.OperationButton,
) {
  static get template() {
    return html`
      <style include="nuxeo-action-button-styles nuxeo-styles"></style>
      ${super.template}
    `;
  }

  static get is() {
    return 'nuxeo-untrash-documents-button';
  }

  static get properties() {
    return {
      documents: {
        type: Array,
        notify: true,
        value: [],
      },

      icon: {
        type: String,
        value: 'nuxeo:restore-deleted',
      },
    };
  }

  static get observers() {
    return ['_isVisible(documents.splices)', '_updateLabel(i18n)'];
  }

  _execute() {
    this.untrashDocuments();
  }

  untrashDocuments() {
    if (
      (this._isSelectAllActive() || this.docsHavePermissions) &&
      window.confirm(this.i18n('untrashDocumentsButton.confirm.untrashDocuments'))
    ) {
      const { documents } = this;
      const isSelectAllActive = this._isSelectAllActive();
      // if select all is active, then we don't pass the documents (we untrash all of them)
      const detail = isSelectAllActive ? {} : { documents };

      this.input = this.view;
      this.operation = 'Document.Untrash';
      this.params = this._params();
      this.syncIndexing = true;

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

  _params() {
    return {};
  }

  _isVisible() {
    this.hidden = !this._isAvailable();
  }

  _isAvailable() {
    return (
      this._isSelectAllActive() ||
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

  _updateLabel() {
    this.label = this.i18n('untrashDocumentsButton.tooltip');
  }
}

window.customElements.define(NuxeoUntrashDocumentsButton.is, NuxeoUntrashDocumentsButton);

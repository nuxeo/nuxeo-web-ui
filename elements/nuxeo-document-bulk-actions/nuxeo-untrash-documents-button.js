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
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { SelectAllBehavior } from '../nuxeo-select-all-behavior.js';

/**
`nuxeo-untrash-documents-actions`
@group Nuxeo UI
@element nuxeo-untrash-documents-actions
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles nuxeo-styles"></style>

    <nuxeo-operation-button
      id="bulkOpBtn"
      icon="nuxeo:restore-deleted"
      label="[[_label]]"
      poll-interval="[[pollInterval]]"
      show-label="[[showLabel]]"
      tooltip-position="[[tooltipPosition]]"
      on-poll-start="_onPollStart"
      on-response="_onResponse"
      async
      sync-indexing
      hidden="[[!_isAvailable(documents.splices)]]"
    >
    </nuxeo-operation-button>
  `,

  is: 'nuxeo-untrash-documents-button',
  behaviors: [SelectAllBehavior, NotifyBehavior, I18nBehavior, FiltersBehavior],

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

  attached() {
    // capture the click event on the capture phase to set nuxeo-operation-buttons properties
    this.$.bulkOpBtn.addEventListener('click', this._untrashDocuments.bind(this), { capture: true });
  },

  detached() {
    this.$.bulkOpBtn.removeEventListener('click', this._untrashDocuments.bind(this));
  },

  untrashDocuments() {
    if (
      (this._isSelectAllActive() || this.docsHavePermissions) &&
      window.confirm(this.i18n('untrashDocumentsButton.confirm.untrashDocuments'))
    ) {
      const opBtn = this.bulkOpBtn;
      opBtn.input = this._input();
      opBtn.operation = this._operation();
      opBtn.params = this._params();
      opBtn._execute();
    }
  },

  _untrashDocuments(e) {
    e.preventDefault();
    e.stopPropagation();
    this.untrashDocuments();
  },

  _onPollStart() {
    this.notify({
      message: this.i18n('untrashDocumentsButton.bulkOperation.poll.start'),
      abort: this._isSelectAllActive(),
      dismissible: this._isSelectAllActive(),
    });
  },

  _onResponse() {
    this.fire('nuxeo-documents-untrashed', {
      documents: this.documents,
      dismissible: this._isSelectAllActive(),
    });
    this.documents = [];
    this.fire('refresh');
  },

  _input() {
    if (this._isSelectAllActive()) {
      return this.view;
    } else if (this.documents && this.documents.length) {
      const uids = this.documents.map((doc) => doc.uid).join(',');
      return `docs:${uids}`;
    }
  },

  _operation() {
    return this._isSelectAllActive() ? 'Bulk.RunAction' : 'Document.Trash';
  },

  _params() {
    if (!this._isSelectAllActive()) {
      return {};
    }
    return {
      operationId: 'Document.Untrash',
      parameters: {
        properties: '',
      },
    };
  },

  _isAvailable() {
    return (
      this._isSelectAllActive() ||
      (this.documents && this.documents.length > 0 && this._checkDocsPermissions() && this._checkDocsAreTrashed())
    );
  },

  _checkDocsAreTrashed() {
    return this.documents.every((document) => this.isTrashed(document));
  },

  _checkDocsPermissions() {
    this.docsHavePermissions = !this.documents.some((document) => !this._docHasPermissions(document));
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

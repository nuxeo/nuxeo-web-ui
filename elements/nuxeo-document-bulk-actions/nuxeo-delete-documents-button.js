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
`nuxeo-delete-documents-actions`
@group Nuxeo UI
@element nuxeo-delete-documents-actions
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-operation id="deleteOp" op="Document.Delete" sync-indexing=""></nuxeo-operation>

    <nuxeo-operation id="trashOp" op="Document.Trash" sync-indexing=""></nuxeo-operation>

    <template is="dom-if" if="[[_isAvailable(documents.splices)]]">
      <div class="action" on-tap="deleteDocuments">
        <paper-icon-button icon="[[_icon]]" id="deleteAllButton"></paper-icon-button>
        <span class="label" hidden\$="[[!showLabel]]">[[_label]]</span>
      </div>
      <nuxeo-tooltip for="deleteAllButton" position="[[tooltipPosition]]">[[_label]]</nuxeo-tooltip>
    </template>
`,

  is: 'nuxeo-delete-documents-button',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    documents: {
      type: Array,
      notify: true,
      value: []
    },

    /**
     * Permanently delete the documents.
     */
    hard: {
      type: Boolean,
      value: false
    },

    tooltipPosition: {
      type: String,
      value: 'bottom'
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
      computed: '_computeIcon(hard)'
    },

    _label: {
      type: 'String',
      computed: '_computeLabel(hard, i18n)'
    }
  },

  deleteDocuments: function() {
    if (this.docsHavePermissions && confirm(this.i18n('deleteDocumentsButton.confirm.deleteDocuments'))) {
      if (this.documents && this.documents.length) {
        var uids = this.documents.map(function(doc) {
          return doc.uid;
        }).join(',');
        var op = this.hard ? this.$.deleteOp : this.$.trashOp;
        op.input = 'docs:' + uids;
        op.execute().then(function() {
          this.fire('nuxeo-documents-deleted', {documents: this.documents});
          this.documents = [];
          this.fire('refresh');
        }.bind(this),
        function(error) {
          this.fire('nuxeo-documents-deleted', {error: error, documents: this.documents});
        }.bind(this));
      }
    }
  },

  /**
   * Action is available if all selected items are not trashed and `hard` is not active OR if all selected items
   * are trashed and `hard` is active.
   */
  _isAvailable: function() {
    return this.documents && this.documents.length > 0 && this._checkDocsPermissions() &&
        (this.hard || !this._checkDocsAreTrashed());
  },

  /**
   * Checks if all selected documents are trashed.
   */
  _checkDocsAreTrashed: function() {
    return this.documents.every(function(document) {
      return this.isTrashed(document);
    }.bind(this));
  },

  _checkDocsPermissions: function() {
    this.docsHavePermissions = this.documents && !(this.documents.some(
      function(document) {
        return !this._docHasPermissions(document);
      }.bind(this)));
    return this.docsHavePermissions;
  },

  /*
   * Checks if a single given document has 'Everything' permission to delete or 'Write' to trash
   */
  _docHasPermissions: function(document) {
    return this.hasPermission(document, 'Everything') || (!this.hard && this.hasPermission(document, 'Write'));
  },

  _computeIcon: function(hard) {
    return hard ? 'nuxeo:delete-permanently' : 'nuxeo:delete';
  },

  _computeLabel: function(hard) {
    return this.i18n(hard ? 'deleteDocumentsButton.tooltip.permanently' : 'deleteDocumentsButton.tooltip');
  }
});

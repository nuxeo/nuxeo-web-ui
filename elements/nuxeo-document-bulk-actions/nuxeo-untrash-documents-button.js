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
`nuxeo-untrash-documents-actions`
@group Nuxeo UI
@element nuxeo-untrash-documents-actions
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
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
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <nuxeo-operation id="operation" op="Document.Untrash" sync-indexing=""></nuxeo-operation>

    <template is="dom-if" if="[[_isAvailable(documents.splices)]]">
      <div class="action" on-tap="untrashDocuments">
        <paper-icon-button icon="nuxeo:restore-deleted" id="untrashAllButton"></paper-icon-button>
        <span class="label" hidden\$="[[!showLabel]]">[[_label]]</span>
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
      value: []
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

    _label: {
      type: String,
      computed: '_computeLabel(i18n)'
    }
  },

  untrashDocuments: function() {
    if (this.docsHavePermissions && confirm(this.i18n('untrashDocumentsButton.confirm.untrashDocuments'))) {
      if (this.documents && this.documents.length) {
        var uids = this.documents.map(function(doc) {
          return doc.uid;
        }).join(',');
        this.$.operation.input = 'docs:' + uids;
        var uidsArray = this.documents.map(function(doc) {
          return doc.uid;
        });
        this.$.operation.execute().then(function() {
          this.fire('nuxeo-documents-untrashed', {documentIds: uidsArray});
          this.documents = [];
          this.fire('refresh');
        }.bind(this),
        function(error) {
          this.fire('nuxeo-documents-untrashed', {error: error,  documents: uidsArray});
        }.bind(this));
      }
    }
  },

  _isAvailable: function() {
    return this.documents && this.documents.length > 0 && this._checkDocsPermissions()
        && this._checkDocsAreTrashed();
  },

  _checkDocsAreTrashed: function() {
    return this.documents.every(function(document) {
      return this.isTrashed(document);
    }.bind(this));
  },

  _checkDocsPermissions: function() {
    this.docsHavePermissions = !(this.documents.some(
      function(document) {
        return !this._docHasPermissions(document);
      }.bind(this)));
    return this.docsHavePermissions;
  },

  /*
   * Checks if a single given document has 'Write' permission
   */
  _docHasPermissions: function(document) {
    return this.hasPermission(document, 'Write');
  },

  _computeLabel: function() {
    return this.i18n('untrashDocumentsButton.tooltip');
  }
});

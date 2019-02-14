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
`nuxeo-clipboard-documents-button`
@group Nuxeo UI
@element nuxeo-clipboard-documents-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles"></style>

    <template is="dom-if" if="[[_isAvailable(documents.splices)]]">
      <div class="action" on-tap="addToClipBoard">
        <paper-icon-button noink="" id="clipboardButton" icon="icons:content-paste"></paper-icon-button>
        <span class="label" hidden\$="[[!showLabel]]">[[_label]]</span>
      </div>
      <nuxeo-tooltip for="clipboardButton" position="[[tooltipPosition]]">[[_label]]</nuxeo-tooltip>
    </template>
`,

  is: 'nuxeo-clipboard-documents-button',
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

  addToClipBoard: function() {
    this.fire('add-to-clipboard', {documents: this.documents});
    this.fire ('clear-selected-items');
  },

  _isAvailable: function() {
    return this.documents.every(function(doc) {
      return this.isCollectionMember(doc) && !this.isTrashed(doc);
    }.bind(this));
  },

  _computeLabel: function() {
    return this.i18n('clipboardDocumentsButton.addToClipboard');
  }
});

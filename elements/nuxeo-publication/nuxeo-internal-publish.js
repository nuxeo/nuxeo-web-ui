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
import '@polymer/iron-flex-layout/iron-flex-layout.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/social-icons.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-document-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '../nuxeo-document-versions/nuxeo-document-versions.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment iron-flex-factors nuxeo-styles">
      :host {
        display: block;
        @apply --layout-flex;
        @apply --layout-horizontal;
      }

      .container {
        margin: 2rem;
        padding: 0 1rem 0 0;
        display: inline-block;
        @apply --layout-flex;
        @apply --layout-vertical;
      }

      .versions, .options {
        margin-left: 3em;
      }

      label {
        @apply --nuxeo-label;
      }

      .error {
        border-left: 4px solid var(--nuxeo-warn-text);
        color: var(--nuxeo-text-default);
        padding-left: 8px;
        margin-bottom: 8px;
      }
    </style>

    <nuxeo-operation id="op" op="Document.PublishToSection" sync-indexing="">
    </nuxeo-operation>

    <nuxeo-document id="srcDoc">
    </nuxeo-document>

    <div class="container">
      <nuxeo-document-suggestion id="target" required="" label="[[i18n('publication.internal.location')]]" placeholder="[[i18n('publication.internal.location.placeholder')]]" selected-item="{{publishSpace}}" min-chars="0" selection-formatter="[[targetFormatter]]" enrichers="permissions" page-provider="publish_space_suggestion" repository="[[document.repository]]">
      </nuxeo-document-suggestion>
      <template is="dom-if" if="[[errorMessage]]">
        <span class="horizontal layout error">[[errorMessage]]</span>
      </template>

      <div class="horizontal layout flex">
        <nuxeo-select id="rendition" label="[[i18n('publication.internal.renditons.label')]]" placeholder="[[i18n('publication.internal.renditons.placeholder')]]" selected="{{selectedRendition}}" attr-for-selected="name">
          <template is="dom-repeat" items="[[_computeRenditionOptions(document, i18n)]]" as="rendition">
            <paper-item name\$="[[rendition.id]]">[[rendition.label]]</paper-item>
          </template>
        </nuxeo-select>
        <template is="dom-if" if="[[!_isMultiple]]">
          <div class="versions">
            <label>[[i18n('documentInfo.version')]]</label>
            <nuxeo-document-versions id="version" document="[[document]]"></nuxeo-document-versions>
          </div>
        </template>
        <div class="options">
          <label>[[i18n('publication.internal.options')]]</label>
          <paper-checkbox id="override" checked="{{override}}">
            [[i18n('publication.internal.override')]]
          </paper-checkbox>
        </div>
      </div>
      <div class="buttons horizontal end-justified layout">
        <div class="flex start-justified">
          <paper-button noink="" dialog-dismiss="" on-tap="_cancel">[[i18n('command.cancel')]]</paper-button>
        </div>
        <paper-button id="publish" noink="" class="primary" on-tap="_publish" disabled\$="[[!_canPublish(document,publishSpace)]]">
            [[i18n('publication.publish')]]
        </paper-button>
      </div>
    </div>
`,

  is: 'nuxeo-internal-publish',
  behaviors: [I18nBehavior, LayoutBehavior],

  properties: {
    /**
     * Input document.
     */
    document: Object,

    /**
     * Input documents.
     */
    documents: Array,

    publishSpace: Object,

    selectedRendition: {
      type: String,
      value: 'none'
    },

    _isMultiple: {
      type: Boolean,
      computed: '_computeMultiple(document, documents.length)'
    },

    targetFormatter: {
      type: Function,
      value: function() {
        return this._targetFormatter.bind(this);
      }
    }
  },

  _computeMultiple: function() {
    return !!(this.documents && this.documents.length > 0);
  },

  _computeRenditionOptions: function() {
    var options = [
      {'id': 'none', 'label': this.i18n('publication.internal.renditon.none')},
      {'id': 'default', 'label': this.i18n('publication.internal.renditon.default')}
    ];
    if (this.document && this.document.contextParameters && this.document.contextParameters.renditions) {
      this.document.contextParameters.renditions.forEach(function(item) {
        options.push({'id': item.name, 'label': this.formatRendition(item.name), 'icon': item.icon});
      }.bind(this));
    }
    return options;
  },

  _publish: function() {
    this.$.op.params = {
      'target': this.publishSpace.uid,
      'override': this.override,
      'renditionName': null
    }
    if (this.selectedRendition) {
      if (this.selectedRendition === 'default') {
        this.$.op.params.defaultRendition = true;
      } else if (this.selectedRendition !== 'none') {
        this.$.op.params.renditionName = this.selectedRendition;
      }
    }
    this.$.op.input = this._isMultiple ? 'docs:' + this.documents.map(function(doc) {
      return doc.uid;
    }).join(',') : this.document.uid;
    this.$.op.execute().then(function() {
      this.fire('notify', {
        'message': this.i18n('publication.internal.publish.success' + (this._isMultiple ? '.multiple' : ''))
      });
      this._isMultiple ? this.fire('navigate', {doc: this.publishSpace}) : this.fire('document-updated');
      this.fire('nx-publish-success');
    }.bind(this)).catch(function(err) {
      this.fire('notify', {
        'message': this.i18n('publication.internal.publish.error' + (this._isMultiple ? '.multiple' : ''))
      });
      throw err;
    }.bind(this));
  },

  _canPublish: function() {
    this.errorMessage = null;
    if(!this.publishSpace) {
      return false;
    }
    var hasPermission = this.hasPermission(this.publishSpace, 'AddChildren');
    if(!hasPermission) {
      this.errorMessage = this.i18n('publication.internal.location.error.noPermission');
    }
    return hasPermission;
  },

  _cancel: function() {
    this.fire('cancel');
  },

  _targetFormatter: function(doc) {
    return doc.title;
  }
});

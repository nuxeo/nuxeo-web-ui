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
`nuxeo-document-create-version`
@group Nuxeo UI
@element nuxeo-document-create-version
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-radio-group/paper-radio-group.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '../nuxeo-dropzone/nuxeo-dropzone.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      iron-icon:hover {
        fill: var(--nuxeo-link-hover-color);
      }

      .dialog .content {
        @apply --layout-vertical;
        box-shadow: none;
      }

      nuxeo-tag {
        cursor: pointer;
        @apply --nx-button-primary;
      }

      nuxeo-tag:hover {
        @apply --nx-button-primary-hover;
      }

      nuxeo-tag[disabled] {
        @apply --nuxeo-tag;
        cursor: auto;
        font-weight: normal;
      }

      .buttons {
        @apply --layout-horizontal;
        @apply --layout-justified;
        @apply --buttons-bar;
      }

      paper-radio-group {
        margin: 16px;
      }

      paper-radio-button {
        display: block;
      }

      paper-radio-button .version {
        background-color: var(--nuxeo-primary-color);
        color: var(--nuxeo-button-primary-text);
        padding: 4px 8px;
        margin-right: 8px;
        font-weight: 500;
        border-radius: 2px;
      }

      paper-button {
        margin: 0;
        padding: 8px 16px;
      }
    </style>

    <nuxeo-document id="doc" headers="[[headers]]" doc-id="[[document.uid]]" data="{{document}}" response="{{document}}">
    </nuxeo-document>

    <nuxeo-operation id="opCreateVersion" op="Document.CreateVersion" input="[[document.uid]]" headers="[[headers]]" response="{{version}}" sync-indexing=""></nuxeo-operation>

    <nuxeo-tag class="create" disabled\$="[[!_isAvailable(document)]]" on-tap="_toggleDialog" uppercase="">[[label]]</nuxeo-tag>

    <nuxeo-dialog id="dialog" class="dialog" with-backdrop="" on-iron-overlay-opened="_dialogOpened" on-iron-overlay-closed="_dialogClosed">
      <h2>[[i18n('documentCreateVersion.title',
        document.properties.dc:title, document.properties.uid:major_version, document.properties.uid:minor_version)]]
      </h2>
      <div class="content">
        <paper-radio-group selected="{{versionType}}">
          <paper-radio-button name="minor">
            <span id="nextMinor" class="version">[[_nextMinor(document)]]</span>
            <span>[[i18n('documentCreateVersion.minor')]]</span>
          </paper-radio-button>
          <paper-radio-button name="major">
            <span id="nextMajor" class="version">[[_nextMajor(document)]]</span>
            <span>[[i18n('documentCreateVersion.major')]]</span>
          </paper-radio-button>
        </paper-radio-group>
      </div>
      <div class="buttons">
        <paper-button noink="" dialog-dismiss="">[[i18n('documentCreateVersion.dismiss')]]</paper-button>
        <paper-button noink="" dialog-confirm="" class="primary" on-tap="_create">
          [[i18n('documentCreateVersion.confirm')]]
        </paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-document-create-version',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    label: String,
    document: Object,
    version: Object,
    headers: {
      type: Object,
      computed: '_computeHeaders(versionType)'
    },
    versionType: {
      type: String,
      value: 'major'
    },
    response: Object
  },

  ready: function() {
    if (!this.label) {
      this.label = this.i18n('versions.create');
    }
  },

  _dialogOpened: function(e) {
    e.target.parentNode.insertBefore(e.target.backdropElement, e.target);
  },

  _dialogClosed: function() {
    this.fire('dialog-closed');
  },

  _computeHeaders: function(versionType) {
    return {
      'X-Versioning-Option': versionType
    };
  },

  _isAvailable: function(doc) {
    return !this.isVersion(doc) && this.hasFacet(doc, 'Versionable') && this.hasPermission(doc, 'Write');
  },

  _nextMinor: function(doc) {
    return (doc) ? doc.properties['uid:major_version'] + '.' + (doc.properties['uid:minor_version'] + 1) : '';
  },

  _nextMajor: function(doc) {
    return (doc) ? (doc.properties['uid:major_version'] + 1) + '.0' : '';
  },

  _toggleDialog: function() {
    if (this._isAvailable(this.document)) {
      this.$.dialog.open();
    }
  },

  _create: function() {
    if (this._isAvailable(this.document)) {
      this.$.opCreateVersion.params = {increment: this.versionType, saveDocument: true};
      this.$.opCreateVersion.execute().then(function () {
        this.fire('document-updated');
      }.bind(this));
    }
  }
});

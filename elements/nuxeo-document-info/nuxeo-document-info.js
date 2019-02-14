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
`nuxeo-document-info`
@group Nuxeo UI
@element nuxeo-document-info
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tags.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '../nuxeo-document-versions/nuxeo-document-versions.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      [hidden] {
        display: none !important;
      }

      .item {
        @apply --layout-horizontal;
        line-height: 2.2rem;
      }

      .item label {
        width: 90px;
        min-width: 90px;
        font-size: 12px;
      }

    </style>

    <div class="item" name="process" hidden\$="[[!_showProcess]]">
      <label>[[i18n('documentInfo.process')]]</label>
      <div><nuxeo-tag uppercase="">[[i18n('documentInfo.process.running')]]</nuxeo-tag></div>
    </div>
    <div class="item">
      <label>[[i18n('documentInfo.state')]]</label>
      <div><nuxeo-tag uppercase="">[[formatLifecycleState(document.state)]]</nuxeo-tag></div>
    </div>
    <template is="dom-if" if="[[hasFacet(document, 'Versionable')]]">
      <div class="item">
        <label>[[i18n('documentInfo.version')]]</label>
        <template is="dom-if" if="[[!isProxy(document)]]">
          <nuxeo-document-versions document="[[document]]"></nuxeo-document-versions>
        </template>
        <template is="dom-if" if="[[isProxy(document)]]">
          <div><nuxeo-tag uppercase="">[[formatVersion(document)]]</nuxeo-tag></div>
        </template>
      </div>
    </template>
    <template is="dom-if" if="[[_showPub(document)]]">
      <div class="item">
        <label>[[i18n('documentInfo.publications')]]</label>
        <div>
          <a href\$="[[_urlForPub(document)]]">
            [[document.contextParameters.publications.resultsCount]]
          </a>
        </div>
      </div>
    </template>
    <div class="item">
      <label>[[i18n('documentInfo.lastModified')]]</label>
      <nuxeo-date datetime="[[document.properties.dc:modified]]"></nuxeo-date>
    </div>
    <div class="item">
      <label>[[i18n('documentInfo.created')]]</label>
      <nuxeo-date datetime="[[document.properties.dc:created]]"></nuxeo-date>
    </div>
    <div class="item">
      <label>[[i18n('documentInfo.by')]]</label>
      <nuxeo-user-tag user="[[document.properties.dc:creator]]"></nuxeo-user-tag>
    </div>
    <div class="item">
      <label>[[i18n('documentInfo.contributors')]]</label>
      <nuxeo-tags type="user" items="[[document.properties.dc:contributors]]"></nuxeo-tags>
    </div>
`,

  is: 'nuxeo-document-info',
  behaviors: [Nuxeo.LayoutBehavior],

  properties: {
    document: {
      type: Object,
      observer: '_documentChanged'
    },
    _showProcess: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    }
  },

  _showPub: function(doc) {
    return doc && doc.contextParameters &&
      doc.contextParameters.publications && doc.contextParameters.publications.resultsCount > 0;
  },

  _documentChanged: function() {
    this._showProcess = this.document && this.document.contextParameters &&
      this.document.contextParameters.runningWorkflows && this.document.contextParameters.runningWorkflows.length > 0;
  },

  _urlForPub: function() {
    if (this.document) {
      return this.urlFor('browse', this.document.path, 'publication');
    }
  }
});

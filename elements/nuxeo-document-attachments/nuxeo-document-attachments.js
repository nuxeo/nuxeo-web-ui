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
`nuxeo-document-attachments`
@group Nuxeo UI
@element nuxeo-document-attachments
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '../nuxeo-document-blob/nuxeo-document-blob.js';
import '../nuxeo-dropzone/nuxeo-dropzone.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex">
      :host {
        display: block;
      }

      nuxeo-dropzone {
        margin-top: 8px;
      }

      nuxeo-document-blob {
        border-top: 1px solid var(--nuxeo-border);
        padding: 8px 0;
      }

      .empty {
        opacity: .5;
        padding-bottom: 8px;
        font-size: 1.1em;
      }
    </style>

    <h3>[[i18n('documentAttachments.heading')]]</h3>

    <div class="vertical layout">
      <template is="dom-repeat" items="[[_computeFiles(document.*, xpath)]]">
        <nuxeo-document-blob document="[[document]]" xpath="[[_computeBlobXpath(xpath, index)]]"></nuxeo-document-blob>
      </template>

      <template is="dom-if" if="[[!_hasFiles(document)]]">
        <div class="empty">[[i18n('documentAttachments.empty')]]</div>
      </template>
    </div>

    <template is="dom-if" if="[[_hasWritePermission(document)]]">
      <nuxeo-dropzone document="{{document}}" xpath="[[xpath]]" uploaded-message="[[i18n('documentAttachments.upload.uploaded')]]" message="[[i18n('documentAttachments.upload.add')]]" drag-content-message="[[i18n('documentAttachments.upload.drop')]]" blob-list="" update-document="">
      </nuxeo-dropzone>
    </template>
`,

  is: 'nuxeo-document-attachments',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    document: Object,

    xpath: {
      type: String,
      value: 'files:files'
    }
  },

  _hasFiles: function(doc) {
    return doc && doc.properties && doc.properties[this.xpath] && doc.properties[this.xpath].length > 0;
  },

  _hasWritePermission: function (doc) {
    return doc && this.hasPermission(doc, 'Write') &&
      !this.isImmutable(doc) && doc.type !== 'Root' && !this.isTrashed(doc);
  },

  _computeFiles: function() {
    if (this._hasFiles(this.document)) {
      return this.document.properties[this.xpath];
    }
    return [];
  },

  _computeBlobXpath: function(xpath, index) {
    if (xpath === 'files:files') {
      return 'files:files/' + index + '/file';
    }
    return xpath + '/' + index;
  }
});

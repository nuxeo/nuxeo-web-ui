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

import { createNestedObject } from '@nuxeo/nuxeo-elements/utils.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '../nuxeo-document-blob/nuxeo-document-blob.js';
import '../nuxeo-dropzone/nuxeo-dropzone.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-attachments`
@group Nuxeo UI
@element nuxeo-document-attachments
*/
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
        opacity: 0.5;
        padding-bottom: 8px;
        font-size: 1.1em;
      }
    </style>

    <nuxeo-document id="doc" doc-id="[[document.uid]]"></nuxeo-document>

    <template is="dom-if" if="[[_isAvailable(document, xpath)]]">
      <h3>[[i18n('documentAttachments.heading')]]</h3>

      <div class="vertical layout">
        <template is="dom-repeat" items="[[_computeFiles(_attachments)]]">
          <nuxeo-document-blob document="[[document]]" xpath="[[_computeBlobXpath(xpath, index)]]">
          </nuxeo-document-blob>
        </template>

        <template is="dom-if" if="[[!_hasFiles(_attachments)]]">
          <div class="empty">[[i18n('documentAttachments.empty')]]</div>
        </template>
      </div>

      <template is="dom-if" if="[[_hasWritePermission(document)]]">
        <nuxeo-dropzone
          value="{{_attachments}}"
          multiple
          value-key="file"
          uploaded-message="[[i18n('documentAttachments.upload.uploaded')]]"
          message="[[i18n('documentAttachments.upload.add')]]"
          drag-content-message="[[i18n('documentAttachments.upload.drop')]]"
        >
        </nuxeo-dropzone>
      </template>
    </template>
  `,

  is: 'nuxeo-document-attachments',
  behaviors: [FormatBehavior, FiltersBehavior],

  properties: {
    document: Object,

    xpath: {
      type: String,
      value: 'files:files',
    },

    _attachments: {
      type: Object,
      computed: '_computeValue(document, xpath)',
    },
  },

  observers: ['_valueChanged(_attachments.splices)'],

  _computeValue(document, xpath) {
    if (document) {
      return this.get(this.formatPropertyXpath(xpath), this.document.properties);
    }
  },

  _valueChanged(e) {
    if (!e) {
      return;
    }
    const props = {};
    const formattedXpath = this.formatPropertyXpath(this.xpath);
    createNestedObject(props, formattedXpath.split('.'));
    this.set(formattedXpath, this._attachments, props);
    this.$.doc.data = {
      'entity-type': 'document',
      repository: this.document.repository,
      uid: this.document.uid,
      properties: props,
    };

    this.$.doc.put().then((response) => {
      this.document = response;
      this.fire('notify', { message: this.i18n(this.uploadedMessage) });
      this.fire('document-updated');
    });
  },

  _hasFiles(attachments) {
    return attachments && attachments.length > 0;
  },

  _hasWritePermission(doc) {
    return (
      doc &&
      !doc.isRecord &&
      this.hasPermission(doc, 'Write') &&
      !this.isImmutable(doc) &&
      !this.hasType(doc, 'Root') &&
      !this.isTrashed(doc)
    );
  },

  _computeFiles() {
    if (this._hasFiles(this._attachments)) {
      return this._attachments;
    }
    return [];
  },

  _computeBlobXpath(xpath, index) {
    if (xpath === 'files:files') {
      return `files:files/${index}/file`;
    }
    return `${xpath}/${index}`;
  },

  _isAvailable(document, xpath) {
    return document && xpath && this.hasSchema(document, xpath.split(':')[0]);
  },
});

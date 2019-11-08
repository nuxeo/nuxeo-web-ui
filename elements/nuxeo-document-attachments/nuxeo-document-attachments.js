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
        <template is="dom-repeat" items="[[_computeFiles(document.*, xpath)]]">
          <nuxeo-document-blob document="[[document]]" xpath="[[_computeBlobXpath(xpath, index)]]">
          </nuxeo-document-blob>
        </template>

        <template is="dom-if" if="[[!_hasFiles(document)]]">
          <div class="empty">[[i18n('documentAttachments.empty')]]</div>
        </template>
      </div>

      <template is="dom-if" if="[[_hasWritePermission(document)]]">
        <nuxeo-dropzone
          value="{{document.properties.files:files}}"
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
  },

  created() {
    this._createMethodObserver('_valueChanged(document.properties.files:files.splices)', true);
  },

  _valueChanged(e) {
    if (!e) {
      return;
    }
    const props = {};
    const formattedXpath = this.formatPropertyXpath(this.xpath);
    this._createNestedObjectRecursive(props, formattedXpath.split('.'));
    this.set(formattedXpath, this.get(formattedXpath, this.document.properties), props);
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

  _hasFiles(doc) {
    return doc && doc.properties && doc.properties[this.xpath] && doc.properties[this.xpath].length > 0;
  },

  _hasWritePermission(doc) {
    return (
      doc && this.hasPermission(doc, 'Write') && !this.isImmutable(doc) && doc.type !== 'Root' && !this.isTrashed(doc)
    );
  },

  _computeFiles() {
    if (this._hasFiles(this.document)) {
      return this.document.properties[this.xpath];
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

  /**
   * Recursive method to create nested objects when they don't exist in a parent object.
   * It does not change any other existing objects or inner objects, only the ones referred in 'path'.
   * @param obj Parent Object where inner nested objects should be created.
   * @param path Array containing the inner object keys.
   * Usage Example:
   *
   *  - Creating document properties using xpath:
   *
   *    const xpath = 'my:custom/field/subfield/x'
   *    _createNestedObjectRecursive(this.document.properties, xpath.split('/'));
   *
   */
  _createNestedObjectRecursive(obj, path) {
    if (path.length === 0) {
      return;
    }
    if ((!Object.prototype.hasOwnProperty.call(obj, path[0]) && !obj[path[0]]) || typeof obj[path[0]] !== 'object') {
      obj[path[0]] = {};
    }
    return this._createNestedObjectRecursive(obj[path[0]], path.slice(1));
  },
});

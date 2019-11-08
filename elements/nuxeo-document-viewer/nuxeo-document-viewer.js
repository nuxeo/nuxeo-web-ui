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

import '@polymer/iron-image/iron-image.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-preview.js';
import '../nuxeo-document-blob/nuxeo-document-blob.js';
import '../nuxeo-dropzone/nuxeo-dropzone.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-viewer`
@group Nuxeo UI
@element nuxeo-document-viewer
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      iron-image,
      nuxeo-document-preview {
        width: 100%;
        height: calc(80vh - 100px);
      }

      nuxeo-document-blob,
      nuxeo-dropzone {
        margin-top: 8px;
      }
    </style>

    <nuxeo-document id="doc" doc-id="[[document.uid]]"></nuxeo-document>

    <template is="dom-if" if="[[!document.properties.file:content.data]]">
      <iron-image position="center" sizing="contain" src="[[_thumbnail(document)]]"></iron-image>
      <template is="dom-if" if="[[_hasWritePermission(document)]]">
        <nuxeo-dropzone value="{{document.properties.file:content}}"></nuxeo-dropzone>
      </template>
    </template>
    <template is="dom-if" if="[[document.properties.file:content.data]]">
      <nuxeo-document-preview document="[[document]]"></nuxeo-document-preview>
      <nuxeo-document-blob document="[[document]]"></nuxeo-document-blob>
    </template>
  `,

  is: 'nuxeo-document-viewer',
  behaviors: [I18nBehavior, FiltersBehavior],

  properties: {
    document: Object,
  },

  created() {
    this._createMethodObserver('_valueChanged(document.properties.file:content)', true);
  },

  _valueChanged(e) {
    if (!e || e.data) {
      return;
    }
    const props = {};
    props['file:content'] = this.document.properties['file:content'];
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

  _thumbnail(doc) {
    return doc &&
      doc.uid &&
      doc.contextParameters &&
      doc.contextParameters.thumbnail &&
      doc.contextParameters.thumbnail.url
      ? doc.contextParameters.thumbnail.url
      : '';
  },

  _hasWritePermission(doc) {
    return (
      doc && this.hasPermission(doc, 'Write') && !this.isImmutable(doc) && doc.type !== 'Root' && !this.isTrashed(doc)
    );
  },
});

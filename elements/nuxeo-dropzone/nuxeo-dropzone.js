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
`nuxeo-dropzone`
@group Nuxeo UI
@element nuxeo-dropzone
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-progress/paper-progress.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-uploader-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      :host([dragging-files]) label {
        color: var(--paper-input-container-focus-color);
      }

      :host([dragging-files]) a {
        text-decoration: none;
      }

      :host([dragging-files]) #container {
        border: 1px dashed var(--paper-input-container-focus-color);
        background-color: var(--paper-input-container-focus-background-color, rgba(0, 102, 255, 0.1));
      }

      label {
        margin-bottom: 8px;
      }

      a, a:active, a:visited, a:focus {
        color: var(--nuxeo-secondary-color, #0066ff);
        text-decoration: underline;
      }

      #dropzone {
        overflow: auto;
        height: 100%;
      }

      #container {
        @apply --layout-vertical;
        @apply --layout-center;
        @apply --layout-flex;
        @apply --layout-center-justified;
        border-radius: 2px;
        border: 1px dashed var(--paper-input-container-color);
        min-height: 64px;
        height: calc(100% - 2px);
      }

      #container .actions {
        text-align: center;
        @apply --layout-horizontal;
        @apply --layout-wrap;
      }

      #details {
        border: 1px solid var(--nuxeo-border, rgba(0,0,0,0.15));
        padding: 16px;
        margin-bottom: 8px;
      }

      .file {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .file .info {
        @apply --layout-vertical;
        @apply --layout-flex;
      }

      .file .info .name {
        font-weight: 500;
      }

      .file .info .size {
        opacity: .5;
        margin: 4px 0;
      }

      .file .info .progress {
        width: 100%;
        padding: 8px 0;
      }

      .file .actions {
        margin-left: 16px;
      }

      .actions > * {
        margin-left: 8px;
      }
    </style>

    <nuxeo-connection id="nx"></nuxeo-connection>
    <nuxeo-document id="doc" doc-id="[[document.uid]]" enrichers="[[enrichers]]"></nuxeo-document>

    <template is="dom-if" if="[[label]]">
      <label id="label">[[label]]</label>
    </template>

    <input hidden="" id="input" type="file" on-change="_uploadInputFiles">

    <div id="details" hidden\$="[[!hasFiles]]">
      <template is="dom-repeat" items="[[files]]" as="file">
        <div class="file">
          <div class="info">
            <div class="name">[[file.name]]</div>
            <div class="size">[[formatSize(file.size)]]</div>
            <template is="dom-if" if="[[uploading]]">
              <paper-progress class="progress" indeterminate="[[!hasProgress()]]" value="[[file.progress]]"></paper-progress>
            </template>
          </div>
          <div class="actions" hidden\$="[[!_areActionsVisible(hasFiles, updateDocument, uploading)]]">
            <paper-icon-button noink="" icon="nuxeo:delete" on-tap="_deleteFile"></paper-icon-button>
          </div>
        </div>
      </template>
    </div>

    <div id="dropzone" hidden\$="[[!_isDropzoneVisible(hasFiles, updateDocument, blobList)]]">
      <div id="container">
        <a href="javascript:undefined" on-tap="open">[[_computeMessage(draggingFiles, message, dragContentMessage, i18n)]]</a>
        <div class="actions">
          <nuxeo-slot slot="FILE_UPLOAD_ACTIONS"></nuxeo-slot>
        </div>
      </div>
    </div>
`,

  is: 'nuxeo-dropzone',
  behaviors: [Nuxeo.UploaderBehavior, FormatBehavior],

  properties: {
    /**
     * Input Document.
     */
    document: {
      type: Object,
      notify: true
    },
    /**
     * The label for this element.
     */
    label: {
      type: String
    },
    /**
     * Dropzone clickable link translated text or key to be translated.
     * By default it will show: 'Upload main file'.
     */
    message: {
      type: String,
      value: 'dropzone.add'
    },
    /**
     * This flag determines whether the dropzone allows multiple files or not.
     */
    blobList: {
      type: Boolean,
      value: false
    },
    /**
     * Path to which the file(s) should be uploaded.
     * For example `xpath="files:files"`.
     * By default it will consider `file:content`.
     */
    xpath: {
      type: String,
      value: 'file:content'
    },
    /**
     * This flag determines whether the file should be immediately uploaded or not.
     */
    updateDocument: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },
    /**
     * Message to show when file is uploaded successfully.
     * It expects translated text or a key to be translated.
     * By default it will show: 'File uploaded'.
     */
    uploadedMessage: {
      type: String,
      value: 'dropzone.uploaded'
    },
    /**
     * Message to show when files are being dragged into the dropzone.
     * It expects translated text or a key to be translated.
     * By default it will show: 'Drop your file'.
     */
    dragContentMessage: {
      type: String,
      value: 'dropzone.dropFile'
    },
    /**
     * Flag that indicates if there are any files being dragged into the dropzone.
     */
    draggingFiles: {
      type: Boolean,
      readOnly: true,
      value: false,
      reflectToAttribute: true,
    },
    /**
     * Flag that indicates if there are already uploaded files on the dropzone.
     */
    hasFiles: {
      type: Boolean,
      readOnly: true,
      value: false,
      notify: true,
    },
    /**
     * A string containing an xpath expression, connected by dot (.) characters instead of slashes (/).
     */
    _parsedXpath: {
      type: String,
      computed: '_computeParsedXpath(xpath)'
    },
    /**
     * Content enrichers to be passed on to `nuxeo-document` resource.
     * Can be an object with entity type as keys or list or string (which defaults to `document` entity type).
     */
    enrichers: {
      type: Object,
      value: function() {
        return this._computeEnrichers();
      }
    }
  },

  listeners: {
    'batchFinished': 'importBatch',
    'nx-blob-picked': '_blobPicked'
  },

  observers: [
    '_reset(document)',
    '_filesChanged(files.splices)'
  ],

  attached: function() {
    this.connection = this.$.nx;
    this.setupDropZone(this.$.dropzone);
  },

  detached: function() {
    this.connection = null;
    this.teardownDropZone();
  },

  open: function() {
    this.$$('input').click();
  },

  _computeParsedXpath: function(xpath) {
    return this.formatPropertyXpath(xpath);
  },

  importBatch: function(data) {
    data.stopPropagation();
    if (this.blobList) {
      if (!this.get('document.properties.' + this._parsedXpath)) {
        this.set('document.properties.' + this._parsedXpath, []);
      }
      this.files.forEach(function(file, index) {
        var uploadedFile = {
          'upload-batch': data.detail.batchId,
          'upload-fileId': index.toString()
        };
        this.push('document.properties.' + this._parsedXpath,
          // Handle special case when using files:files
          this.xpath === 'files:files' ? { file: uploadedFile } : uploadedFile);
      }.bind(this));
    } else {
      this.set('document.properties.' + this._parsedXpath, {
        'upload-batch': data.detail.batchId,
        'upload-fileId': '0'
      });
    }
    this._handleBlobUploaded();
  },

  _blobPicked: function(e) {
    this.set('files', e.detail.blobs);
    if (this.blobList) {
      if (!this.get('document.properties.' + this._parsedXpath)) {
        this.set('document.properties.' + this._parsedXpath, []);
      }
      this.files.forEach(function(file) {
        var uploadedFile = {
          'providerId': file.providerId,
          'user': file.user,
          'fileId': file.fileId
        };
        this.push('document.properties.' + this._parsedXpath,
          // Handle special case when using files:files
          this.xpath === 'files:files' ? { file: uploadedFile } : uploadedFile);
      }.bind(this));
    } else {
      var file = e.detail.blobs[0];
      this.set('document.properties.' + this._parsedXpath, {
        'providerId': file.providerId,
        'user': file.user,
        'fileId': file.fileId
      });
    }
    this._handleBlobUploaded();
  },

  _handleBlobUploaded: function() {
    if (this.updateDocument) {
      var props = {};
      this._createNestedObjectRecursive(
        props, this._parsedXpath.split('.'),
        this.get('document.properties.' + this._parsedXpath)
      );
      this.$.doc.data = {
        "entity-type": "document",
        "repository": this.document.repository,
        "uid": this.document.uid,
        "properties": props
      };
      this.$.doc.put().then(function(response) {
        this.document = response;
        this.fire('notify', { message: this.i18n(this.uploadedMessage) });
        this.fire('document-updated');
      }.bind(this));
    } else {
      this.fire('notify', { message: this.i18n(this.uploadedMessage) });
    }
  },

  _deleteFile: function(e) {
    if (!this.updateDocument && this.blobList && Array.isArray(this.get('document.properties.' + this._parsedXpath))) {
      this.splice('document.properties.' + this._parsedXpath, e.model.itemsIndex, 1);
      this.splice('files', e.model.itemsIndex, 1);
    } else {
      this._reset();
      this.set('document.properties.' + this._parsedXpath, '');
    }
  },

  _reset: function(document) {
    if (document === undefined) {
      this.cancelBatch();
    }
    this.$.input.value = '';
    this.files = [];
  },

  _uploadInputFiles: function(e) {
    this._upload(e.target.files);
  },

  _filesChanged: function() {
    this._setHasFiles(this.files.length > 0);
  },

  _upload: function(files) {
    if (files && files.length > 0) {
      this.uploadFiles(files);
    }
  },

  _dragover: function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    this._setDraggingFiles(true);
  },

  _dragleave: function() {
    this._setDraggingFiles(false);
  },

  _drop: function(e) {
    e.preventDefault();
    this._setDraggingFiles(false);
    this._upload(e.dataTransfer.files);
  },

  _computeMessage: function() {
    return this.i18n && this.draggingFiles ? this.i18n(this.dragContentMessage) : this.i18n(this.message);
  },

  _isDropzoneVisible: function() {
    // Area to drop files should stay visible when the element is attached to a blob list property
    // and `updateDocument` is false (e.g when using the element on a form: creation or edition of documents).
    // This will allow the user to manage the list of files.
    return (!this.updateDocument && this.blobList) || !this.hasFiles;
  },

  _areActionsVisible: function() {
    return !this.updateDocument && this.hasFiles && !this.uploading;
  },

  _computeEnrichers: function() {
    return {
      document: ['preview'],
      blob: (Nuxeo.UI && Nuxeo.UI.config && Nuxeo.UI.config.enrichers && Nuxeo.UI.config.enrichers.blob)
        || ['appLinks']
    };
  },

  /**
   * Recursive method to create nested objects when they don't exist in a parent object.
   * It does not change any other existing objects or inner objects, only the ones referred in 'path'.
   * @param obj Parent Object where inner nested objects should be created.
   * @param path Array containing the inner object keys.
   * @param value Object that should be set to last nested object.
   * Usage Example:
   *
   *  - Creating document properties using xpath:
   *
   *    const xpath = 'my:custom/field/subfield/x'
   *    _createNestedObjectRecursive(this.document.properties, xpath.split('/'), 'should set this value');
   *
   */
  _createNestedObjectRecursive: function(obj, path, value) {
    if (path.length === 0) {
      return;
    }
    if ((!Object.prototype.hasOwnProperty.call(obj, path[0]) && !obj[path[0]]) || typeof obj[path[0]] !== 'object') {
      obj[path[0]] = path.length === 1 && value ? value : {};
    }
    return this._createNestedObjectRecursive(obj[path[0]], path.slice(1), value);
  }
});

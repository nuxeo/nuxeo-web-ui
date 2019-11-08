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

import { IronValidatableBehavior } from '@polymer/iron-validatable-behavior/iron-validatable-behavior.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-progress/paper-progress.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { UploaderBehavior } from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-uploader-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-dropzone`
@group Nuxeo UI
@element nuxeo-dropzone
*/
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

      :host([invalid]) #container {
        border: 2px dashed var(--paper-input-container-invalid-color, red);
      }

      label {
        margin-bottom: 8px;
      }

      label[required]::after {
        display: inline-block;
        content: '*';
        margin-left: 4px;
        color: var(--paper-input-container-invalid-color, red);
        font-size: 1.2em;
      }

      a,
      a:active,
      a:visited,
      a:focus {
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
        border: 1px solid var(--nuxeo-border, rgba(0, 0, 0, 0.15));
        padding: 16px;
        margin-bottom: 8px;
      }

      :host([invalid]) #details {
        border: 2px solid var(--paper-input-container-invalid-color, red);
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
        opacity: 0.5;
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

      .error {
        color: var(--paper-input-container-invalid-color, red);
        margin-top: 8px;
      }
    </style>

    <nuxeo-connection id="nx"></nuxeo-connection>

    <template is="dom-if" if="[[label]]">
      <label id="label" required$="[[required]]">[[label]]</label>
    </template>

    <input hidden id="input" type="file" multiple$="[[multiple]]" on-change="_uploadInputFiles" />

    <div id="details" hidden$="[[!hasFiles]]">
      <template is="dom-repeat" items="[[files]]" as="file">
        <div class="file">
          <div class="info">
            <div class="name">[[file.name]]</div>
            <div class="size">[[formatSize(file.size)]]</div>
            <template is="dom-if" if="[[uploading]]">
              <paper-progress
                class="progress"
                indeterminate="[[!hasProgress()]]"
                value="[[file.progress]]"
              ></paper-progress>
            </template>
          </div>
          <div class="actions">
            <paper-icon-button
              noink
              icon="nuxeo:delete"
              on-tap="_deleteFile"
              hidden$="[[!_areActionsVisible(hasFiles, uploading)]]"
            ></paper-icon-button>
            <div hidden$="[[!_showAbort(uploading)]]">
              <paper-icon-button noink icon="icons:cancel" on-tap="_abortUpload"></paper-icon-button>
              <nuxeo-tooltip>[[i18n('dropzone.abort')]]</nuxeo-tooltip>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div id="dropzone" hidden$="[[!_isDropzoneVisible(hasFiles, multiple)]]">
      <div id="container">
        <a href="javascript:undefined" on-tap="open"
          >[[_computeMessage(draggingFiles, message, dragContentMessage, i18n)]]</a
        >
        <div class="actions">
          <nuxeo-slot name="FILE_UPLOAD_ACTIONS"></nuxeo-slot>
        </div>
      </div>
    </div>

    <span class="error" hidden$="[[!invalid]]">[[_errorMessage]]</span>
  `,

  is: 'nuxeo-dropzone',
  behaviors: [UploaderBehavior, FormatBehavior, IronValidatableBehavior],

  properties: {
    /**
     * Blob reference (`upload-batch` and `upload-fileId).
     */
    value: {
      type: Object,
      notify: true,
    },
    /**
     * The label for this element.
     */
    label: {
      type: String,
    },
    /**
     * Dropzone clickable link translated text or key to be translated.
     * By default it will show: 'Upload main file'.
     */
    message: {
      type: String,
      value: 'dropzone.add',
    },
    /**
     * This flag determines whether the dropzone allows multiple files or not.
     */
    multiple: {
      type: Boolean,
      value: false,
    },
    /**
     * Key where the blob content will be stored when using blob lists.
     * For example on files schema `files:files` is used to store blobs, each blob being stored in `file` key.
     * In this specific case value-key='file'.
     */
    valueKey: {
      type: String,
    },
    /**
     * Message to show when file is uploaded successfully.
     * It expects translated text or a key to be translated.
     * By default it will show: 'File uploaded'.
     */
    uploadedMessage: {
      type: String,
      value: 'dropzone.uploaded',
    },
    /**
     * Message to show when files are being dragged into the dropzone.
     * It expects translated text or a key to be translated.
     * By default it will show: 'Drop your file'.
     */
    dragContentMessage: {
      type: String,
      value: 'dropzone.dropFile',
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
    _errorMessage: {
      type: String,
    },
    /**
     * Required.
     */
    required: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
    },
  },

  listeners: {
    batchFinished: 'importBatch',
    'nx-blob-picked': 'importBatch',
  },

  observers: ['_reset(value)', '_filesChanged(files.splices)'],

  attached() {
    this.connection = this.$.nx;
    this.setupDropZone(this.$.dropzone);
  },

  detached() {
    this.connection = null;
    this.teardownDropZone();
  },

  open() {
    this.$$('input').click();
  },

  importBatch(data) {
    if (data.type === 'nx-blob-picked') {
      this.set('files', data.detail.blobs);
    } else {
      data.stopPropagation();
    }
    const value = this._getFiles(data);
    if (this.multiple) {
      if (!this.value || !Array.isArray(this.value)) {
        this.value = [];
      }
      this.push('value', ...value);
    } else {
      this.set('value', value);
    }
    this.fire('notify', { message: this.i18n(this.uploadedMessage) });
    this.invalid = false;
  },

  _getFiles(data) {
    let uploadedFile;
    if (this.multiple) {
      const files = [];
      this.files.forEach((file, index) => {
        if (data.type === 'nx-blob-picked') {
          uploadedFile = {
            providerId: file.providerId,
            user: file.user,
            fileId: file.fileId,
          };
        } else {
          uploadedFile = {
            'upload-batch': data.detail.batchId,
            'upload-fileId': index.toString(),
          };
        }

        if (this.valueKey) {
          const wrappedFile = {};
          wrappedFile[this.valueKey] = uploadedFile;
          files.push(wrappedFile);
        } else {
          files.push(uploadedFile);
        }
      });
      return files;
    }
    if (data.type === 'nx-blob-picked') {
      const file = data.detail.blobs[0];
      uploadedFile = {
        providerId: file.providerId,
        user: file.user,
        fileId: file.fileId,
      };
    } else {
      uploadedFile = {
        'upload-batch': data.detail.batchId,
        'upload-fileId': '0',
      };
    }
    return uploadedFile;
  },

  _deleteFile(e) {
    if (this.multiple && Array.isArray(this.value)) {
      this.value.splice(this.value.length - this.files.length + e.model.itemsIndex, 1);
      this.splice('files', e.model.itemsIndex, 1);
    } else {
      this._reset();
      this.value = '';
    }
  },

  _reset(value) {
    if (
      value == null ||
      (Array.isArray(value) &&
        value.filter(
          (file) => !Object.prototype.hasOwnProperty.call(this.valueKey ? file[this.valueKey] : file, 'data'),
        ).length === 0) ||
      Object.prototype.hasOwnProperty.call(value, 'data')
    ) {
      if (this.uploading) {
        this.cancelBatch();
      }
      this.$.input.value = '';
      this.files = [];
    }
  },

  _uploadInputFiles(e) {
    this._upload(e.target.files);
  },

  _filesChanged() {
    this._setHasFiles(this.files.length > 0);
  },

  _upload(files) {
    if (files && files.length > 0) {
      this.uploadFiles(files);
    }
  },

  _dragover(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    this._setDraggingFiles(true);
  },

  _dragleave() {
    this._setDraggingFiles(false);
  },

  _drop(e) {
    e.preventDefault();
    this._setDraggingFiles(false);
    this._upload(e.dataTransfer.files);
  },

  _computeMessage() {
    return this.i18n && this.draggingFiles ? this.i18n(this.dragContentMessage) : this.i18n(this.message);
  },

  _isDropzoneVisible() {
    // Area to drop files should stay visible when the element is attached to a blob list property
    // and, e.g, when using the element on a form: creation or edition of documents.
    // This will allow the user to manage the list of files.
    return this.multiple || !this.hasFiles;
  },

  _areActionsVisible() {
    return this.hasFiles && !this.uploading;
  },

  _abortUpload(e) {
    if (this.hasAbort()) {
      this.abort(this.files[e.model.itemsIndex]);
      this.splice('files', e.model.itemsIndex, 1);
    }
  },

  _showAbort(uploading) {
    return uploading && this.hasAbort();
  },

  _getValidity() {
    if (this.uploading) {
      this._errorMessage = this.i18n('dropzone.invalid.uploading');
      return false;
    }
    if (!this.required) {
      return true;
    }
    return this.files && this.files.length > 0;
  },
});

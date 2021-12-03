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
import { createNestedObject } from '@nuxeo/nuxeo-elements/utils.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import { config } from '@nuxeo/nuxeo-elements';
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
        padding-bottom: 8px;
        min-height: 96px;
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
        border: 2px dashed var(--paper-input-container-invalid-color, #de350b);
      }

      label[required]::after {
        display: inline-block;
        content: '*';
        margin-left: 4px;
        color: var(--paper-input-container-invalid-color, #de350b);
      }

      button.link {
        color: var(--nuxeo-secondary-color, #0066ff);
        text-decoration: underline;
        padding: 0;
        background: none;
        border: none;
        cursor: pointer;
        font: inherit;
      }

      button.link:hover {
        color: var(--nuxeo-link-hover-color, #0066ff);
        font: inherit;
      }

      #dropzone {
        overflow: auto;
      }

      #container {
        @apply --layout-vertical;
        @apply --layout-center;
        @apply --layout-flex;
        @apply --layout-center-justified;
        border-radius: 2px;
        border: 1px dashed var(--paper-input-container-color);
        min-height: 82px;
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
        border: 2px solid var(--paper-input-container-invalid-color, #de350b);
      }

      .file {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .file .info {
        @apply --layout-vertical;
        @apply --layout-flex;
        overflow: hidden;
      }

      .file .info .name {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
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
        color: var(--paper-input-container-invalid-color, #de350b);
        margin-top: 8px;
      }

      .file-error {
        @apply --layout-horizontal;
        @apply --layout-flex;
      }

      .file-error span {
        color: var(--paper-input-container-invalid-color, #de350b);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    </style>

    <nuxeo-connection id="nx"></nuxeo-connection>
    <nuxeo-document id="doc" doc-id="[[document.uid]]" enrichers="[[enrichers]]"></nuxeo-document>

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
            <template is="dom-if" if="[[_displayProgressBar(file.*)]]">
              <paper-progress
                class="progress"
                indeterminate="[[!hasProgress()]]"
                value="[[file.progress]]"
              ></paper-progress>
            </template>
            <div class="file-error" hidden$="[[!file.error]]">
              <span>[[file.error]]</span>
              <nuxeo-tooltip>[[file.error]]</nuxeo-tooltip>
            </div>
          </div>
          <div class="actions">
            <paper-icon-button
              noink
              icon="nuxeo:delete"
              on-tap="_deleteFile"
              hidden$="[[!_areActionsVisible(hasFiles, uploading, updateDocument)]]"
              aria-label$="[[i18n('command.delete')]]"
            ></paper-icon-button>
            <div hidden$="[[!_showAbort(uploading)]]">
              <paper-icon-button
                noink
                icon="icons:cancel"
                on-tap="_abortUpload"
                aria-labelledby="abortTooltip"
              ></paper-icon-button>
              <nuxeo-tooltip id="abortTooltip">[[i18n('dropzone.abort')]]</nuxeo-tooltip>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div id="dropzone" hidden$="[[!_isDropzoneVisible(hasFiles, multiple, updateDocument, blobList)]]">
      <div id="container">
        <button class="link" on-click="open">
          [[_computeMessage(draggingFiles, message, dragContentMessage, i18n)]]
        </button>
        <div class="actions">
          <nuxeo-slot name="FILE_UPLOAD_ACTIONS"></nuxeo-slot>
        </div>
      </div>
    </div>

    <span class="error" hidden$="[[!invalid]]">[[_errorMessage]]</span>
  `,

  is: 'nuxeo-dropzone',
  behaviors: [NotifyBehavior, UploaderBehavior, FormatBehavior, IronValidatableBehavior],

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
    /**
     * Input Document.
     *
     * @deprecated since 3.0.0. Use `value` instead.
     *
     * `value` should be bound the document property holding the blob or blob list.
     */
    document: {
      type: Object,
      notify: true,
    },
    /**
     * This flag determines whether the dropzone allows multiple files or not.
     *
     * @deprecated since 3.0.0. Use `multiple` instead.
     */
    blobList: {
      type: Boolean,
      value: false,
    },
    /**
     * Path to which the file(s) should be uploaded.
     * For example `xpath="files:files"`.
     * By default it will consider `file:content`.
     *
     * @deprecated since 3.0.0. Use `value` instead.
     *
     * `value` should be bound the document property holding the blob or blob list.
     */
    xpath: {
      type: String,
      value: 'file:content',
    },
    /**
     * This flag determines whether the file should be immediately uploaded or not.
     *
     * @deprecated since 3.0.0. Add upload logic directly to your parent element.
     *
     * Please see
     * [this commit]{@link https://github.com/nuxeo/nuxeo-web-ui/commit/67d7fb74eaa83544144411f18e75eacf18da310c} for
     * a migration example.
     */
    updateDocument: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
    },
    /**
     * Content enrichers to be passed on to `nuxeo-document` resource.
     * Can be an object with entity type as keys or list or string (which defaults to `document` entity type).
     *
     * @deprecated since 3.0.0. Only required if `document` is set.
     */
    enrichers: {
      type: Object,
      value() {
        return {
          document: ['preview'],
          blob: config.get('enrichers.blob', ['appLinks']),
        };
      },
    },
    _parsedXpath: {
      type: String,
      computed: 'formatPropertyXpath(xpath)',
    },
  },

  listeners: {
    batchFinished: 'importBatch',
    'nx-blob-picked': 'importBatch',
    batchFailed: 'importBatch',
  },

  observers: ['_reset(value)', '_filesChanged(files.splices)', '_legacyReset(document)'],

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

  async importBatch(data) {
    if (data.type === 'nx-blob-picked') {
      this.set('files', data.detail.blobs);
    } else {
      data.stopPropagation();
    }
    const value = this._getFiles(data);
    const failed = this.files.filter((f) => f.error);
    if (this.multiple) {
      if (!this.value || !Array.isArray(this.value)) {
        this.value = [];
      }
      this.push('value', ...value);
    } else {
      this.set('value', value);
    }
    if (this.document && this.xpath) {
      this._legacyImportBatch(value);
    }
    if (failed.length > 0) {
      this.notify({
        message: this.i18n('dropzone.toast.error', failed.map((f) => f.name).join(', ')),
        duration: 0,
        dismissible: true,
      });
    } else {
      if (this.document && this.xpath) {
        await this._legacyUpdateDocument();
      }
      this.notify({ message: this.i18n(this.uploadedMessage), close: true });
      this.invalid = false;
    }
    if (this.invalid) {
      // if we're already displaying an error, we better update it, otherwise the user can be mislead
      this.validate();
    }
  },

  _getFiles(data) {
    let uploadedFile;
    if (this.multiple || this.blobList) {
      const files = [];
      this.files
        .filter((file) => !file.error)
        .forEach((file) => {
          if (data.type === 'nx-blob-picked') {
            uploadedFile = {
              providerId: file.providerId,
              user: file.user,
              fileId: file.fileId,
            };
          } else {
            uploadedFile = {
              'upload-batch': data.detail.batchId,
              'upload-fileId': file.index.toString(),
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
    if (this.document && this.xpath) {
      this._legacyDeleteFile(e);
    }
    // if this is not a required field, trigger validation so the error message is updated
    if (!this.required) {
      this.validate();
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
    return (this.multiple && !this.updateDocument) || !this.hasFiles;
  },

  _areActionsVisible() {
    return this.hasFiles && !this.uploading && !this.updateDocument;
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
    if (this.files.some((file) => file.error)) {
      this._errorMessage = this.i18n('dropzone.invalid.error');
      return false;
    }
    if (!this.required) {
      return true;
    }
    return this.files && this.files.length > 0;
  },

  _displayProgressBar(file) {
    return file.base && !file.base.providerId && !file.base.complete && !file.base.error;
  },

  /**
   * Legacy code below, adding support for the legacy API removed by NXP-28263.
   */
  _legacyReset(document) {
    if (document) {
      this.cancelBatch();
    }
    this.$.input.value = '';
    this.files = [];
  },

  _legacyDeleteFile(e) {
    if (!this.updateDocument && this.blobList && Array.isArray(this.get(`document.properties.${this._parsedXpath}`))) {
      this.splice(`document.properties.${this._parsedXpath}`, e.model.itemsIndex, 1);
      this.splice('files', e.model.itemsIndex, 1);
    } else {
      this._legacyReset();
      this.set(`document.properties.${this._parsedXpath}`, '');
    }
  },

  _legacyImportBatch(value) {
    if (!value || value.length === 0) {
      return;
    }
    if (this.blobList) {
      if (!this.get(`document.properties.${this._parsedXpath}`)) {
        this.set(`document.properties.${this._parsedXpath}`, []);
      }
      value.forEach((file) =>
        this.push(
          `document.properties.${this._parsedXpath}`,
          // Handle special case when using files:files
          this.xpath === 'files:files' ? { file } : file,
        ),
      );
    } else {
      this.set(`document.properties.${this._parsedXpath}`, value);
    }
  },

  async _legacyUpdateDocument() {
    if (this.updateDocument) {
      const props = {};
      createNestedObject(props, this._parsedXpath.split('.'));
      this.set(this._parsedXpath, this.get(`document.properties.${this._parsedXpath}`), props);
      this.$.doc.data = {
        'entity-type': 'document',
        repository: this.document.repository,
        uid: this.document.uid,
        properties: props,
      };
      return this.$.doc.put().then((response) => {
        this.document = response;
        this.fire('document-updated');
      });
    }
    return Promise.resolve();
  },
});

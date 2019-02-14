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
`nuxeo-document-import`
@group Nuxeo UI
@element nuxeo-document-import
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/iron-form/iron-form.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-a11y-keys/iron-a11y-keys.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-spinner/paper-spinner-lite.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-uploader-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-path-suggestion/nuxeo-path-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { DocumentCreationBehavior } from '../nuxeo-document-creation/nuxeo-document-creation-behavior.js';
import '../nuxeo-document-creation-stats/nuxeo-document-creation-stats.js';
import './nuxeo-document-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment iron-flex-factors nuxeo-styles">
      :host {
        display: block;
        @apply --layout-flex;
        @apply --layout-horizontal;
        --paper-dialog-scrollable: {
          padding: 0;
          overflow-x: hidden;
        };
      }

      paper-spinner-lite {
        --paper-spinner-color: var(--default-primary-color);
      }

      paper-dialog-scrollable {
        display: block;
        @apply --layout-flex;
      }

      paper-dialog-scrollable:after {
        height: 0;
      }

      .suggester {
        background-color: var(--nuxeo-dialog-buttons-bar);
        padding: 8px 16px;
        margin: 1rem 32px;
      }

      .file-to-import {
        min-height: 3em;
        margin: 0 .3em .8em;
        width: calc(50% - 3em);
        padding: .8em 1em;
        background-color:var(--nuxeo-box);
        border: 1px solid var(--divider-color);
        position: relative;
      }

      paper-progress {
        width: 100%;
      }

      div[name='customize'] #blobEditor span {
        width: 200px;
      }

      #dropzone {
        padding: 1em;
        position: relative;
        border: 2px dashed var(--divider-color);
        border-radius: 4px;
        background-color: rgba(0,0,0,0.05);
        min-height: 100px;
        margin: 1em 2em 5em;
      }

      #form {
        padding: 0 32px;
      }

      #document-import {
        margin-bottom: 2.5em;
      }

      #blobEditor {
        @apply --layout-flex-3;
      }

      #blobList {
        height: 100px;
      }

      #blobList .file-overview:first-of-type {
        margin-top: 32px;
      }

      #blobList .error {
        margin: 8px;
      }

      #sidePanel {
        @apply --layout-flex;
        background: var(--nuxeo-page-background);
        min-width: 200px;
      }

      .blobCheck {
        display: block;
        width: 16px;
        height: 16px;
      }

      .blobCheck.checked {
        color: var(--nuxeo-validated);
      }

      .blobCheck.unchecked {
        opacity: .3;
      }

      .blobCheck.hidden {
        visibility: hidden;
      }

      .file-overview {
        border: 1px solid var(--divider-color);
        border-radius: 1px;
        background-color: var(--nuxeo-box);
        padding: 16px 14px 16px 14px;
        margin: 8px;
        font-weight: bold;
        text-transform: none;
        color: var(--secondary-text-color);
      }

      .file-overview:hover {
        @apply --nuxeo-block-hover;
      }

      .file-overview.selected {
        @apply --nuxeo-block-selected;
      }

      .file-overview iron-icon {
        margin-top: 0.1em;
      }

      .name {
        font-weight: bold;
        word-break: break-all;
      }

      .size {
        font-size: .8rem;
        opacity: .3;
        padding: .1em .5em;
        white-space: nowrap;
      }

      .wrap.baseline {
        align-items: baseline;
      }

      .complete {
        background-color: var(--nuxeo-validated);
        border-radius: 2em;
        width: 1.5em;
        position: absolute;
        right: 1.5em;
        top: .8em;
        text-align: center;
      }

      .complete iron-icon  {
        width: 1.2em;
        height: 1.3em;
      }

      .provider {
        color: var(--nuxeo-primary-color);
      }

      .dropzone-label {
        cursor: pointer;
        margin: 16px 0 48px 0;
      }

      .dropzone-heading {
        font-weight: bold;
        margin: 4px 8px;
        padding: 4px 8px;
        width: 100%;
      }

      .disclaimer {
        display: block;
        font-weight: normal;
        font-size: .75rem;
        opacity: .3;
      }

      .clear {
        width: 3em;
        text-align: right;
      }

      .clear paper-icon-button {
        padding: 0 0 1em .5em;
      }

      .file-to-import:last-of-type {
        margin-bottom: 3em;
      }

      .disclaimer.checked,
      .disclaimer.hidden {
        visibility: hidden;
      }

      .add-more {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        text-align: center;
        background-color: var(--nuxeo-box);
        padding: .5em;
      }

      .buttons {
        @apply --buttons-bar;
      }

      .add-more .importActions {
        margin-left: 8px;
      }

      .importActions > * {
        margin-left: 8px;
      }

      @media (max-width: 1024px) {
        .file-to-import {
          width: calc(100% - 2em);
        }
      }

      .error {
        border-left: 4px solid var(--nuxeo-warn-text);
        color: var(--primary-text-color);
        padding-left: 8px;
      }

      .importing-label {
        margin-right: 8px;
      }

      iron-pages,
      div[name="upload"] ,
      div[name="customize"] {
        /*Firefox fix (NXP-22349)*/
        min-height: 100%;
      }
      div[name="upload"] {
        outline: none;
      }

    </style>

    <nuxeo-connection id="nx"></nuxeo-connection>
    <nuxeo-resource id="blobRemover"></nuxeo-resource>
    <nuxeo-operation id="fileManagerImport" op="FileManager.Import" sync-indexing=""></nuxeo-operation>
    <nuxeo-document id="docRequest" doc-path="[[targetPath]]" data="[[document]]" sync-indexing="" headers="{&quot;X-Batch-No-Drop&quot;: &quot;true&quot;}" response="{{createResponse}}"></nuxeo-document>
    <nuxeo-document id="parentFetcher" doc-path="[[targetPath]]"></nuxeo-document>

    <iron-a11y-keys keys="enter" on-keys-pressed="_submitKeyHandler"></iron-a11y-keys>

    <iron-pages selected="[[stage]]" attr-for-selected="name" class="vertical layout flex">

      <!--Stage: allow the user to upload files-->
      <div name="upload" class="upload vertical layout flex" tabindex="0">

        <div class="suggester">
          <nuxeo-path-suggestion id="pathSuggesterUpload" label="[[i18n('documentImportForm.location')]]" value="{{targetPath}}" parent="{{suggesterParent}}" children="{{suggesterChildren}}" disabled="" always-float-label=""></nuxeo-path-suggestion>
          <span class\$="horizontal layout [[_formatErrorMessage(errorMessage)]]">​[[errorMessage]]</span>
        </div>

        <div id="dropzone" class="vertical layout flex">
          <input hidden="" id="uploadFiles" type="file" on-change="_filesChanged" multiple="">
          <template is="dom-if" if="[[!hasFiles]]">
            <div class="vertical layout center center-justified flex">
              <div class="dropzone-label horizontal layout center center-justified">
                <a href="javascript:undefined" on-tap="_showUploadDialog">
                  [[i18n('documentImportForm.clickOrDrop')]]</a>
              </div>
              <span hidden\$="[[!_hasVisibleContributions]]">[[i18n('documentImportForm.linkFilesFrom')]]</span>
              <div class="importActions horizontal layout wrap">
                <nuxeo-slot slot="FILE_UPLOAD_ACTIONS" empty="{{!hasContributions}}"></nuxeo-slot>
              </div>
            </div>
          </template>
          <template is="dom-if" if="[[hasFiles]]" restamp="">
            <paper-dialog-scrollable>
              <div class="vertical layout flex">
                <div class="horizontal layout wrap baseline">
                  <span class="dropzone-heading" hidden\$="[[!_showDropzoneFileHeadings(hasLocalFiles,hasRemoteFiles)]]">
                    [[i18n('documentImportForm.localFiles')]]
                  </span>
                  <template is="dom-repeat" items="[[localFiles]]" as="file">
                    <!-- local file -->
                    <div class="file-to-import horizontal layout">
                      <div class="vertical layout flex">
                        <div class="horizontal layout">
                          <div class="name">
                            [[file.name]]
                          </div>
                          <span class="size">
                            [[formatSize(file.size)]]
                          </span>
                        </div>
                        <template is="dom-if" if="[[file.providerName]]">
                          <div class="provider">
                            [[file.providerName]]
                          </div>
                        </template>
                        <template is="dom-if" if="[[!file.complete]]">
                          <paper-progress indeterminate="[[!hasProgress()]]" value="[[file.progress]]"></paper-progress>
                        </template>
                      </div>
                      <div class="clear" hidden\$="[[!file.complete]]">
                        <paper-icon-button icon="nuxeo:remove" on-tap="_removeBlob"></paper-icon-button>
                        <nuxeo-tooltip>[[i18n('command.remove')]]</nuxeo-tooltip>
                      </div>
                    </div>
                  </template>
                  <span class="dropzone-heading" hidden\$="[[!_showDropzoneFileHeadings(hasLocalFiles,hasRemoteFiles)]]">
                    [[i18n('documentImportForm.remoteFiles')]]
                  </span>
                  <template is="dom-repeat" items="[[remoteFiles]]" as="file">
                    <!-- remote file -->
                    <div class="file-to-import horizontal layout">
                      <div class="vertical layout flex">
                        <div class="horizontal layout center">
                          <div class="name">
                            [[file.name]]
                          </div>
                          <span class="size">
                            [[formatSize(file.size)]]
                          </span>
                        </div>
                        <div class="provider">
                          [[file.providerName]]
                        </div>
                      </div>
                      <div class="horizontal layout center">
                        <paper-icon-button icon="nuxeo:remove" on-tap="_removeBlob"></paper-icon-button>
                        <nuxeo-tooltip>[[i18n('command.remove')]]</nuxeo-tooltip>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </paper-dialog-scrollable>
            <div class="horizontal layout center end-justified" hidden\$="!hasFiles">
              <div class="add-more horizontal layout center">
                <a href="javascript:undefined" on-tap="_showUploadDialog">Add more files</a>
                <span hidden\$="[[!_hasVisibleContributions]]">&nbsp;[[i18n('documentImportForm.linkFilesFrom')]]&nbsp;</span>
                <div class="importActions horizontal layout wrap">
                  <nuxeo-slot slot="FILE_UPLOAD_ACTIONS" empty="{{!hasContributions}}"></nuxeo-slot>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="buttons horizontal end-justified layout">
          <div class="flex start-justified">
            <paper-button noink="" dialog-dismiss="" on-tap="_cancel" hidden\$="[[_creating]]">[[i18n('command.cancel')]]</paper-button>
          </div>
          <paper-button noink="" id="edit" class="primary" on-tap="_toggleCustomize" hidden\$="[[!_canAddProperties(_creating,hasFiles,canCreate)]]">
                        [[i18n('documentImportForm.addProperties')]]
                      </paper-button>
          <paper-button noink="" id="create" class="primary" on-tap="_import" disabled\$="[[!_canImport(_creating, hasLocalFilesUploaded,hasRemoteFiles,canCreate)]]">
                        <template is="dom-if" if="[[!_isUploadingOrImporting(_creating, hasLocalFiles, hasLocalFilesUploaded)]]">
                          [[i18n('command.create')]]
                        </template>
                        <template is="dom-if" if="[[_isUploadingOrImporting(_creating, hasLocalFiles, hasLocalFilesUploaded)]]">
                          <span class="importing-label" hidden\$="[[_creating]]">[[i18n('documentImport.uploading')]]</span>
                          <span class="importing-label" hidden\$="[[!_creating]]">[[i18n('documentImport.importing')]]</span>
                          <paper-spinner-lite active=""></paper-spinner-lite>
                        </template>
                      </paper-button>
        </div>
      </div>

      <!--Stage: allow the user to fill in properties for the uploaded files and create the respective documents-->
      <div name="customize" class="vertical layout flex">
        <div class="horizontal layout flex">
          <paper-dialog-scrollable id="blobEditor">
            <div class="suggester">
              <nuxeo-path-suggestion id="pathSuggesterCustomize" label="[[i18n('documentImportForm.location')]]" value="{{targetPath}}" parent="{{suggesterParent}}" children="{{suggesterChildren}}" disabled="" always-float-label=""></nuxeo-path-suggestion>
              <span class\$="horizontal layout [[_formatErrorMessage(errorMessage)]]">​[[errorMessage]]</span>
            </div>
            <iron-form id="form">
              <form class="form vertical layout flex">
                <div class="horizontal layout center">
                  <div class="flex">
                    <nuxeo-select id="docTypeDropdown" selected="{{selectedDocType}}" attr-for-selected="key" label="[[i18n('documentImportForm.type.label')]]" placeholder="[[i18n('documentImportForm.type.placeholder')]]" error-message="[[i18n('documentImportForm.type.error')]]" required="">
                      <template is="dom-repeat" items="[[_importDocTypes]]" as="type">
                        <paper-item key="[[type]]">[[_getTypeLabel(type)]]</paper-item>
                      </template>
                    </nuxeo-select>
                  </div>
                </div>
                <!--restamp needed to prevent submit with hidden input fields, which will throw an error-->
                <template is="dom-if" if="[[document]]" restamp="">
                  <nuxeo-document-layout id="document-import" layout="import" document="[[document]]"></nuxeo-document-layout>
                </template>
              </form>
            </iron-form>
          </paper-dialog-scrollable>
          <paper-dialog-scrollable id="sidePanel">
            <div id="blobList" class="flex">
              <template is="dom-repeat" items="[[localFiles]]" as="file">
                <paper-button noink="" class\$="file-overview horizontal layout [[_selectedLocalDocStyle(index,docIdx)]]" on-tap="_tapLocalDoc">
                  <div class="horizontal layout flex">
                    <div class="vertical layout flex">
                      <span class="name flex" hidden\$="[[file.title]]">[[file.name]]</span>
                      <span class="name flex" hidden\$="[[!file.title]]">[[file.title]]</span>
                      <span class\$="disclaimer [[_styleFileCheck(file.*)]]">
                        [[i18n('documentImportForm.unchecked.disclaimer')]]
                      </span>
                      <template is="dom-if" if="[[!file.complete]]">
                        <paper-progress indeterminate=""></paper-progress>
                      </template>
                    </div>
                    <iron-icon icon="icons:check-circle" class\$="blobCheck [[_styleFileCheck(file.*)]]" on-tap="_checkTappedLocal"></iron-icon>
                  </div>
                </paper-button>
              </template>
              <template is="dom-repeat" items="[[remoteFiles]]" as="file">
                <paper-button noink="" class\$="file-overview horizontal layout [[_selectedLocalDocStyle(index,docIdx)]]" on-tap="_tapLocalDoc">
                  <div class="horizontal layout flex">
                    <div class="vertical layout flex">
                      <span class="name flex" hidden\$="[[file.title]]">[[file.name]]</span>
                      <span class="name flex" hidden\$="[[!file.title]]">[[file.title]]</span>
                      <span class\$="disclaimer [[_styleFileCheck(file.*)]]">
                        [[i18n('documentImportForm.unchecked.disclaimer')]]
                      </span>
                    </div>
                    <iron-icon icon="icons:check-circle" class\$="blobCheck [[_styleFileCheck(file.*)]]" on-tap="_checkTappedRemote"></iron-icon>
                  </div>
                </paper-button>
              </template>
              <span class="horizontal layout error" hidden\$="[[!_importWithPropertiesError]]">[[_importWithPropertiesError]]</span>
            </div>
          </paper-dialog-scrollable>
        </div>
        <div class="buttons horizontal end-justified layout">
          <div class="flex start-justified">
            <paper-button noink="" dialog-dismiss="" on-tap="_cancel" hidden\$="[[_creating]]">[[i18n('command.cancel')]]</paper-button>
          </div>

          <paper-button noink="" on-tap="_previousFile" hidden\$="[[!_hasPreviousFile(_creating,canCreate,customizing,docIdx)]]">
                        ❮&nbsp;[[i18n('documentImportForm.previousDocument')]]
                      </paper-button>
          <paper-button noink="" class="primary" on-tap="_nextFile" hidden\$="[[!_hasNextFile(_creating,canCreate,customizing,docIdx)]]">
                        [[i18n('documentImportForm.nextDocument')]]&nbsp;❯
                      </paper-button>

          <paper-button noink="" class="primary" on-tap="_applyToAll" hidden\$="[[!_canApplyToAll(_creating,canCreate,customizing,docIdx)]]">
                        [[i18n('documentImportForm.applyToAll')]]
                      </paper-button>

          <paper-button noink="" class="primary" on-tap="_importWithProperties" disabled\$="[[!_canImportWithMetadata(_creating,canCreate,hasLocalFilesUploaded,hasRemoteFiles,localFiles.*,remoteFiles.*)]]">
                        <template is="dom-if" if="[[_canImport(_creating, hasLocalFilesUploaded,hasRemoteFiles,canCreate)]]">
                          [[i18n('command.create')]]
                        </template>
                        <template is="dom-if" if="[[!_canImport(_creating, hasLocalFilesUploaded,hasRemoteFiles,canCreate)]]">
                          <span class="importing-label" hidden\$="[[_creating]]">[[i18n('documentImport.uploading')]]</span>
                          <span class="importing-label" hidden\$="[[!_creating]]">[[i18n('documentImport.importing')]]</span>
                          <paper-spinner-lite active=""></paper-spinner-lite>
                        </template>
                      </paper-button>
        </div>
      </div>
    </iron-pages>

    <nuxeo-document-creation-stats id="creationStats"></nuxeo-document-creation-stats>
`,

  is: 'nuxeo-document-import',
  behaviors: [IronResizableBehavior, Nuxeo.UploaderBehavior, DocumentCreationBehavior],

  properties: {

    batchAppend: {
      value: true
    },

    stage: {
      type: String,
      value: 'upload'
    },

    docIdx: {
      type: Number,
      value: -1
    },

    localFiles: {
      type: Array,
      value: []
    },

    remoteFiles: {
      type: Array,
      value: []
    },

    selectedDocType: {
      type: String,
      observer: '_selectedDocTypeChanged'
    },

    documentBlobProperties: {
      type: Object,
      value: {
        default: 'file:content',
        note: 'note:note'
      }
    },

    hasLocalFiles: {
      type: Boolean,
      value: false,
      notify: true
    },

    hasRemoteFiles: {
      type: Boolean,
      value: false,
      notify: true
    },

    hasFiles: {
      type: Boolean,
      value: false,
      computed: '_computeHasFiles(hasLocalFiles,hasRemoteFiles)'
    },

    visible: {
      type: Boolean
    },

    _doNotCreate: {
      type: Boolean,
      value: false
    },

    _docProperties: {
      type: Object,
      value: {}
    },

    _hasVisibleContributions: {
      type: Boolean
    },

    _importDocTypes: {
      type: Array,
      computed: '_computeImportDocTypes(subtypes)'
    },

    _creating: {
      type: Boolean,
      value: false
    },

    _importWithPropertiesError: String

  },

  listeners: {
    'batchFinished': '_batchReady',
    'nx-blob-picked': '_blobPicked',
    'nx-document-creation-parent-validated': '_parentValidated'
  },

  observers: [
    '_observeFiles(files.*)',
    '_observeRemoteFiles(remoteFiles.splices)',
    '_visibleOnStage(visible,stage)'
  ],

  ready: function() {
    this.connection = this.$.nx;
    this.setupDropZone(this.$.dropzone);
    this._clear();
    this.addEventListener('element-changed', this._layoutUpdated.bind(this), true);
  },

  init: function(files) {
    if (files) {
      this.uploadFiles(files);
    }
    this.set('_hasVisibleContributions',
              this.hasContributions && !!this.$$('.importActions > *:not([hidden]):not(nuxeo-slot)'));
  },

  _observeFiles: function(changeRecord) {
    if (changeRecord) {
      if (changeRecord.path === 'files.splices' && changeRecord.value && changeRecord.value.indexSplices) {
        changeRecord.value.indexSplices.forEach(function(s) {
          for (var i = 0; i < s.addedCount; i++) {
            var index = s.index + i;
            this.push('localFiles', this.files[index]);
          }
        }, this);
        this.hasLocalFiles = this.localFiles && this.localFiles.length > 0;
        this.hasLocalFilesUploaded = false;
      } else {
        var match = changeRecord.path.match(/(files\.\d+)\.(\w+)/);
        if (match) {
          // this is needed because the client doesn't account for removed blobs
          var localFilesIdx = this.localFiles.indexOf(this.get(match[1]));
          // hack: refresh on the dom repeat
          this.notifyPath(['localFiles', localFilesIdx, match[2]].join('.'));
          if (match[2] === 'complete') {
            this.hasLocalFilesUploaded = this.hasLocalFiles && this.localFiles.every(function(file) {
              return !file || file.complete;
            });
          }
        }
      }
    }
  },

  _observeRemoteFiles: function() {
    this.hasRemoteFiles = this.remoteFiles && this.remoteFiles.length > 0;
  },

  _showDropzoneFileHeadings: function() {
    return this.hasLocalFiles && this.hasRemoteFiles;
  },

  _canImport: function() {
    return (this.hasLocalFiles ? this.hasLocalFilesUploaded : this.hasRemoteFiles)
      && this.canCreate && !this._creating;
  },

  _isUploadingOrImporting: function() {
    return this._creating || (this.hasLocalFiles ? !this.hasLocalFilesUploaded : false);
  },

  _canImportWithMetadata: function() {
    return this._getAllFiles().every(function(file) {
      return 'checked' in file
    }) && this._canImport();
  },

  _canAddProperties: function() {
    return this.hasFiles && this.canCreate && !this._creating;
  },

  _showUploadDialog: function() {
    this.$.uploadFiles.click();
  },

  _filesChanged: function(e) {
    this.uploadFiles(e.target.files);
  },

  _selectedDocTypeChanged: function() {
    this._validate();
  },

  _toggleCustomize: function() {
    if (this.stage === 'upload') {
      this.stage = 'customize';
      this.customizing = true;
      this.set('selectedDocType', '');
      this.fire('nx-creation-wizard-hide-tabs');
      this._selectDoc(0);
    } else {
      this.stage = 'upload';
      this.customizing = false;
      this.fire('nx-creation-wizard-show-tabs');
    }
  },

  _computeHasFiles: function() {
    return this.hasLocalFiles || this.hasRemoteFiles;
  },

  _getAllFiles: function() {
    if (this.localFiles && this.remoteFiles) {
      return this.localFiles.concat(this.remoteFiles);
    } else {
      return this.localFiles ? this.localFiles : this.remoteFiles;
    }
  },

  _getTotalFileCount: function() {
    return (this.localFiles ? this.localFiles.length : 0) + (this.remoteFiles ? this.remoteFiles.length : 0);
  },

  _getCurrentFile: function() {
    var arr = this._getAllFiles();
    return arr[this.docIdx];
  },

  _isValidFileIndex: function(index) {
    var length = this._getTotalFileCount();
    return length > 0 && index >= 0 && index < length;
  },

  _getFile: function(index) {
    if (this._isValidFileIndex(index)) {
      return this._getAllFiles()[index];
    }
  },

  _setFileProp: function(index, prop, value) {
    if (this._isValidFileIndex(index)) {
      var pos = index;
      var arr = 'localFiles';
      if (pos >= this.localFiles.length) {
        arr = 'remoteFiles';
        pos = pos - this.localFiles.length;
      }
      this._setFilePropEx(arr, pos, prop, value);
    }
  },

  _setFilePropEx: function(arrName, index, prop, value) {
    this.set([arrName, index,prop].join('.'), value);
  },

  _getCurrentFileTitle: function() {
    var currentFile = this._getCurrentFile();
    return currentFile ? currentFile.name : '';
  },

  _getRemainingDocs: function() {
    var count = this._getTotalFileCount();
    return count > 1 ? this.i18n('documentImportForm.addProperties.otherDocuments', count - 1 - this.docIdx) : '';
  },

  _copyFileData: function(originIdx, destIdx) {
    var originFile = this._getFile(originIdx);
    var destFile = this._getFile(destIdx);
    var docData = originFile.docData;
    var copiedDocData = {};

    if (docData && Object.keys(docData).length > 0) {
      copiedDocData = JSON.parse(JSON.stringify(docData));
    }
    copiedDocData.document.properties['dc:title'] = destFile.name;
    this._setFileProp(destIdx, 'docData', copiedDocData);
    this._setFileProp(destIdx, 'checked', true);
  },

  _storeFile: function(index) {
    if (this._isValidFileIndex(index)) {
      var pos = index;
      var propName = 'localFiles';
      if (pos >= this.localFiles.length) {
        propName = 'remoteFiles';
        pos = pos - this.localFiles.length;
      }
      this.set([propName, pos, 'docData'].join('.'), {
        parent: this.targetPath,
        document: JSON.parse(JSON.stringify(this.document)),
        type: this.selectedDocType,
      });
      this.set([propName, pos, 'sanitizedName'].join('.'),
                this._sanitizeName(this.document.properties['dc:title']));
      this.set([propName, pos, 'title'].join('.'), this.document.properties['dc:title']);
    }
  },

  _loadFile: function(docData, title) {
    var properties = {};
    if (docData && Object.keys(docData).length > 0) {
      this.targetPath = docData.parent;
      this.selectedDocType = this._importDocTypes.find(function(type) {
        return type.id === docData.type.id;
      });
      properties = JSON.parse(JSON.stringify(docData.document)).properties;
    }
    if (title) {
      properties['dc:title'] = title;
    }
    this._docProperties = properties;
    this._updateDocument();
  },

  _nextFile: function() {
    if (this._hasNextFile()) {
      this._selectDoc(this.docIdx + 1);
    }
  },

  _previousFile: function() {
    if (this._hasPreviousFile()) {
      this._selectDoc(this.docIdx - 1);
    }
  },

  _hasNextFile: function() {
    var length = this._getTotalFileCount();
    return length > 1 && this.docIdx < length - 1 && this.canCreate && !this._creating;
  },

  _hasPreviousFile: function() {
    var length = this._getTotalFileCount();
    return length > 1 && this.docIdx > 0  && this.canCreate && !this._creating;
  },

  _selectDoc: function(index) {
    if (!this._isValidFileIndex(index)) {
      throw 'invalid file index: ' + index;
    } else if (this.docIdx !== index && (this.docIdx < 0 || this._validate())) {
      if (this.docIdx > -1) {
        this._storeFile(this.docIdx);
      }
      var previousFile = this._getCurrentFile();
      this.docIdx = index;
      var currentFile = this._getCurrentFile();
      if (currentFile.checked) {
        // load the file's own data
        this._loadFile(currentFile.docData);
      } else if (previousFile) {
        // load the previous file's data
        this._loadFile(previousFile.docData, currentFile.name);
      } else {
        this._loadFile({}, currentFile.name);
      }
      if (!('checked' in currentFile)) {
        this._setFileProp(index, 'checked', true);
      }
    }
  },

  _validate: function() {
    // run our custom validation function first to allow setting custom native validity
    var layout = this.$$('#document-import');

    // run our custom validation function first to allow setting custom native validity
    var result = (!layout || layout.validate()) && this._doNativeValidation(this.$.form) && this.$.form.validate();

    if (result || !layout) {
      return result;
    } else {
      var innerLayout = layout.$.layout;
      var nodes = innerLayout._getValidatableElements(innerLayout.element.root);
      var invalidField = nodes.find(function(node) {
        return node.invalid;
      });
      if (invalidField) {
        invalidField.scrollIntoView();
        invalidField.focus();
      }
    }
  },

  _tapLocalDoc: function(e) {
    if (this.canCreate) {
      this._selectDoc(e.model.index);
    }
  },

  _tapRemoteDoc: function(e) {
    if (this.canCreate) {
      this._selectDoc(e.model.index + this.localFiles.length);
    }
  },

  _selectedLocalDocStyle: function(index) {
    return index === this.docIdx ? 'selected' : '';
  },

  _selectedRemoteDocStyle: function(index) {
    return (index + this.localFiles.length) === this.docIdx ? 'selected' : '';
  },

  _cancel: function() {
    if (this.batchId) {
      this.cancelBatch();
    }
    this._clear();
    this.stage = 'upload';
    this.fire('nx-creation-wizard-show-tabs');
  },

  _clear: function() {
    this.stage = 'upload';
    this.files = [];
    this.localFiles = [];
    this.remoteFiles = [];
    this.hasLocalFilesUploaded = false;
    this.hasLocalFiles = false;
    this.hasRemoteFiles = false;
    this.properties = [];
    this.customizing = false;
    this.docIdx = -1;
    this._doNotCreate = false;
    this._docProperties = {};
    this._creating = false;
    this._importWithPropertiesError = '';
    this.$.uploadFiles.value = '';
  },

  _importWithProperties: function() {
    if (this._validate()) {
      this._creating = true;
      this._storeFile(this.docIdx);
      this._processFilesWithMetadata();
    }
  },

  _import: function() {
    this._creating = true;
    var params = {
      context: {
        currentDocument: this.targetPath
      }
    };
    var doLocal = this.batchId && this.localFiles && this.localFiles.length > 0;
    var doRemote = this.remoteFiles && this.remoteFiles.length > 0;
    if (doLocal && doRemote) {
      this._smartImportLocalFiles(params)
          .then(function(response1) {
            this._smartImportRemoteFiles(params).then(function(response2) {
              this._handleSuccess(this._mergeResponses(response1, response2));
            }.bind(this), this._handleError.bind(this));
          }.bind(this), this._handleError.bind(this));
    } else if (doLocal) {
      this._smartImportLocalFiles(params)
          .then(this._handleSuccess.bind(this), this._handleError.bind(this));
    } else {
      this._smartImportRemoteFiles(params)
          .then(this._handleSuccess.bind(this), this._handleError.bind(this));
    }
  },

  _handleSuccess: function(response, close) {
    if (close === undefined) {
      close = true;
    }
    this._notify(response, close);
    // store creation data
    if (response.entries && Array.isArray(response.entries)) {
      response.entries.forEach(function(f) {
        // XXX remove this to lower as soon as we get type information from the server
        this.$.creationStats.storeType(f.type.toLowerCase());
      }.bind(this));
    } else if (response.type) {
      this.$.creationStats.storeType(response.type);
    }
    if (close) {
      this.cancelBatch();
      this._clear();
      if (!response.entries || response.entries.length === 1) {
        this.navigateTo('browse', (response.entries ? response.entries[0] : response).path);
      } else {
        this.fire('document-updated');
        this.navigateTo('browse', this.targetPath);
      }
    }
  },

  _handleError: function(error) {
    this.set('_creating', false);
    this.set('errorMessage', this.i18n('documentImport.error.importFailed'));
    this.fire('notify', {message: this.i18n('label.error').toUpperCase() + ': ' + error.message});
  },

  _mergeResponses: function() {
    var response = {'entity-type': 'Documents', 'entries': []};
    for (var i = 0; i < arguments.length; i++) {
      var current = arguments[i];
      if (current && current.entries) {
        response.entries.concat(current.entries);
      } else {
        response.entries.push(current);
      }
    }
    return response;
  },

  _smartImportLocalFiles: function(params) {
    return this.batchExecute('FileManager.Import', params, {'nx_es_sync': 'true', 'X-Batch-No-Drop': 'true'});
  },

  _smartImportRemoteFiles: function(params) {
    this.$.fileManagerImport.input = 'blobs:' + this.remoteFiles.map(function(file) {
      return file.key;
    }).join();
    this.$.fileManagerImport.params = params;
    this.$.fileManagerImport.params.noMimeTypeCheck = true;
    return this.$.fileManagerImport.execute();
  },

  _processFilesWithMetadata: function() {
    this._importWithPropertiesError = '';
    var length = this._getTotalFileCount();
    var self = this;
    var promises = [];
    var localIndexes = [];
    var remoteIndexes = [];
    for (var i = 0; i < length; i++) {
      var arr = self.localFiles, index = i;
      if (i >= self.localFiles.length) {
        arr = self.remoteFiles;
        index = i - self.localFiles.length;
      }
      promises.push(
        (function(indexesToRemove, index){
          return ((arr[index].docData && arr[index].checked) ?
                    self._processFileWithMetadata(arr[index]) :
                    Promise.resolve({'entity-type': 'Documents', 'entries': []})).then(function(result) {
                      indexesToRemove.push(index);
                      return result;
                    }.bind(this)).catch(function(error) {
                      return error;
                    }.bind(this))
        }.bind(this))(i >= self.localFiles.length ? remoteIndexes : localIndexes, index));
    }
    Promise.all(promises).then(function(results) {
      var errorFree = results.filter(function(result) {
        return !(result instanceof Error);
      });
      this._handleSuccess(this._mergeResponses.apply(null, errorFree), !(errorFree.length < results.length));
      if (errorFree.length < results.length) {
        this.set('_creating', false);
        this.set('_importWithPropertiesError', 'These documents could not be created.');
        localIndexes.sort().reverse().forEach(function(index) {
          this.splice('localFiles', index, 1);
        }.bind(this));
        remoteIndexes.sort().reverse().forEach(function(index) {
          this.splice('remoteFiles', index, 1);
        }.bind(this));
        this._selectDoc(0);
      }

    }.bind(this));
  },

  _processFileWithMetadata: function(file) {
    this.document = file.docData.document;
    this.targetPath = file.docData.parent;
    this.document.name = file.sanitizedName || file.name;
    var blobProperty = this.documentBlobProperties[file.docData.type.id] ||
                       this.documentBlobProperties['default'];
    // XXX if fileData.type == Note, then the file's contents should be passed instead
    this.document.properties[blobProperty] = file.providerId ? {
      'providerId': file.providerId,
      'user': file.user,
      'fileId': file.fileId
    } : {
      'upload-batch': this.batchId,
      'upload-fileId': String(file.index)
    };
    return this.$.docRequest.post();
  },

  _removeBlob: function(e) {
    if (e.model.file.providerId) {
      this.splice('remoteFiles', e.model.index, 1);
    } else {
      this.$.blobRemover.path = 'upload/' + this.batchId + '/' + e.model.file.index;
      this.$.blobRemover.remove().then(function() {
        this.splice('localFiles', e.model.index, 1);
        this.hasLocalFiles = this.localFiles && this.localFiles.length > 0;
        this.$.uploadFiles.value = '';
      }.bind(this), this._handleError.bind(this));
    }
  },

  _batchReady: function(data) {
    data.stopPropagation();
    this.properties = [];
    for (var i = 0; i < this.localFiles.length; i++) {
      this.properties.push({});
    }
    var div = this.$$('div[name="upload"]');
    if (div) {
      div.focus();
    }
  },

  _blobPicked: function(e) {
    this.hasRemoteFiles = true;
    this.notifyPath('remoteFiles', this.remoteFiles.concat(e.detail.blobs));
  },

  _getDocumentProperties: function() {
    return this._docProperties;
  },

  _styleFileCheck: function(e) {
    return (e.base && ('checked' in e.base)) ? (e.base.checked ? 'checked' : 'unchecked') : 'hidden';
  },

  _checkTappedLocal: function(e) {
    e.stopPropagation();
    this._setFilePropEx('localFiles', e.model.index, 'checked', !e.model.file.checked);
  },

  _checkTappedRemote: function(e) {
    e.stopPropagation();
    this._setFilePropEx('remoteFiles', e.model.index, 'checked', !e.model.file.checked);
  },

  _canApplyToAll: function() {
    return this.customizing && this.docIdx === 0 && this._getTotalFileCount() > 1 &&
      this.canCreate && !this._creating;
  },

  _applyToAll: function() {
    var lastIdx = this._getTotalFileCount() - 1;
    if (this._isValidFileIndex(this.docIdx) && this._isValidFileIndex(lastIdx) && this._validate()) {
      this._storeFile(0);
      for (var i = 1; i <= lastIdx; i++) {
        this._copyFileData(0, i);
      }
      this._selectDoc(lastIdx);
    }
  },

  _filterImportDocTypes: function(type) {
    return window.nuxeo.importBlacklist.indexOf(type.type) === -1;
  },

  _computeImportDocTypes: function() {
    if (this.subtypes) {
      return this.subtypes.filter(this._filterImportDocTypes);
    }
  },

  _parentValidated: function() {
    if (this.canCreate && this._importDocTypes && this._importDocTypes.length === 0) {
      this.set('canCreate', false);
      this.set('errorMessage', this.i18n('documentImport.error.cannotImport'));
    }
  },

  _visibleOnStage: function() {
    this.$.pathSuggesterUpload.disabled = !this.visible || this.stage !== 'upload';
    this.$.pathSuggesterCustomize.disabled = !this.visible || this.stage !== 'customize';
  },

  /**
   * Retrieves and creates the layout for the current document type
   */
  _updateDocument: function() {

    if (!this._isValidType(this.selectedDocType) || !this.parent) {
      this.document = null;
      // prevent error message from being displayed the first time
      this.$.docTypeDropdown.invalid = false;
      return;
    }

    this.newDocument(this.selectedDocType.type, this._getDocumentProperties()).then(function(document) {
      document.parentRef = this.parent.uid;
      this.document = document;
    }.bind(this));
  },

  _layoutUpdated: function(e) {
    this.async(function() {
      var input = e.detail.value.querySelector('[autofocus]');
      if (input) {
        input.focus();
      }
    });
  },

  _submitKeyHandler: function(e) {
    if (this.stage === 'upload' && this._canImport()) {
      this._import();
    }
    if (this.stage === 'customize' && e.detail.keyboardEvent.target.tagName === 'INPUT') {
      if (this._hasNextFile()) {
        this._nextFile();
      } else if (this._canImportWithMetadata()) {
        this._importWithProperties();
      }
    }
  },

  // trigger native browser invalid-form UI
  _doNativeValidation: function(/*form*/) {
    /*var fakeSubmit = document.createElement('input');
    fakeSubmit.setAttribute('type', 'submit');
    fakeSubmit.style.display = 'none';
    form._form.appendChild(fakeSubmit);
    fakeSubmit.click();
    form._form.removeChild(fakeSubmit);
    return form._form.checkValidity();*/
    return true;
  }
});

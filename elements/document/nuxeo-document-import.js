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
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import { UploaderBehavior } from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-uploader-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-path-suggestion/nuxeo-path-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-layout.js';
import '../nuxeo-document-creation-stats/nuxeo-document-creation-stats.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { DocumentCreationBehavior } from '../nuxeo-document-creation/nuxeo-document-creation-behavior.js';

/**
`nuxeo-document-import`
@group Nuxeo UI
@element nuxeo-document-import
*/
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
        }
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
        background-color: var(--input-background, rgba(0, 0, 0, 0.05));
        padding: 8px 16px;
        margin: 12px 32px;
      }

      .file-to-import {
        height: 58px;
        margin: 0 0.3em 0.8em;
        width: calc(50% - 3em);
        padding: 0.8em 1em;
        background-color: var(--nuxeo-box);
        border: 1px solid var(--divider-color);
        position: relative;
      }

      file-to-import:first-child {
        overflow: hidden;
      }

      paper-progress {
        width: 100%;
      }

      #dropzone {
        padding: 1em;
        position: relative;
        border: 2px dashed var(--divider-color);
        border-radius: 4px;
        background-color: rgba(0, 0, 0, 0.05);
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
        @apply --layout-vertical;
        @apply --layout-flex;
        padding-top: 4px;
      }

      #blobList .error {
        margin: 8px;
      }

      #blobList .file-error {
        display: block;
        font-weight: normal;
        font-size: 0.75rem;
        line-height: 10px;
        margin-top: 4px;
      }

      #checkmarkNote {
        color: var(--secondary-text-color, #939caa);
        font-size: 11px;
        margin: 8px 8px 0 8px;
        opacity: 0.75;
        word-break: break-word;
      }

      #dropzone .file-error {
        white-space: nowrap;
      }

      #sidePanel {
        @apply --layout-vertical;
        @apply --layout-flex;
        background: var(--nuxeo-page-background);
        min-width: 200px;
      }

      .blobCheck {
        display: block;
        width: 16px;
        height: 16px;
        margin: 2px 0;
      }

      .blobCheck.checked {
        color: var(--nuxeo-validated);
      }

      .blobCheck.unchecked {
        opacity: 0.3;
      }

      .blobCheck.hidden {
        visibility: hidden;
      }

      .file-overview {
        @apply --layout-vertical;
        border: 1px solid var(--divider-color);
        border-radius: 1px;
        background-color: var(--nuxeo-box);
        padding: 16px 14px 16px 14px;
        margin: 8px;
        font-weight: bold;
        text-transform: none;
        color: var(--secondary-text-color);
        height: 88px;
      }

      .file-overview:hover {
        @apply --nuxeo-block-hover;
      }

      .file-overview.selected {
        @apply --nuxeo-block-selected;
      }

      .file-overview.selected .name {
        color: var(--nuxeo-primary-color, #0066ff);
      }

      .file-overview .name:hover {
        color: var(--nuxeo-primary-color, #0066ff);
      }

      .name {
        display: -webkit-box;
        font-weight: bold;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        height: 40px; /* XXX: 2 * line height, consider extracting variable at the base theme leve */
        word-break: break-all;
        overflow: hidden;
      }

      .size {
        font-size: 0.8rem;
        opacity: 0.3;
        padding: 0.1em 0.5em;
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
        top: 0.8em;
        text-align: center;
      }

      .complete iron-icon {
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

      .clear {
        width: 3em;
        text-align: right;
      }

      .clear paper-icon-button {
        padding: 0 0 1em 0.5em;
      }

      .file-to-import:last-of-type {
        margin-bottom: 3em;
      }

      .file-to-import[error] {
        border: 1px solid var(--paper-input-container-invalid-color, #de350b);
      }

      .file-to-import > div:first-child {
        overflow: hidden;
      }

      .add-more {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        text-align: center;
        background-color: var(--nuxeo-box);
        padding: 0.5em;
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

      .upload-error {
        color: var(--primary-text-color, #243238);
        margin: 1em 2em;
        padding-left: 8px;
      }

      .upload-error:not(:empty) {
        border-left: 4px solid var(--nuxeo-warn-text, #de350b);
      }

      .upload-error:empty::before {
        content: '\\200b';
        display: inline;
      }

      .file-error {
        color: var(--paper-input-container-invalid-color, #de350b);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .importing-label {
        margin-right: 8px;
      }

      iron-pages,
      div[name='upload'],
      div[name='customize'] {
        /*Firefox fix (NXP-22349)*/
        min-height: 100%;
      }
      div[name='upload'] {
        outline: none;
      }

      paper-progress {
        margin-top: 8px;
      }

      button.link {
        color: var(--nuxeo-link-color, #3a3a54);
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
    </style>

    <nuxeo-connection id="nx"></nuxeo-connection>
    <nuxeo-resource id="blobRemover"></nuxeo-resource>
    <nuxeo-operation id="fileManagerImport" op="FileManager.Import" sync-indexing></nuxeo-operation>
    <nuxeo-document
      id="docRequest"
      sync-indexing
      headers='{"X-Batch-No-Drop": "true"}'
      response="{{createResponse}}"
    ></nuxeo-document>
    <nuxeo-document id="parentFetcher" doc-path="[[targetPath]]"></nuxeo-document>

    <iron-a11y-keys keys="enter" on-keys-pressed="_submitKeyHandler"></iron-a11y-keys>

    <iron-pages selected="[[stage]]" attr-for-selected="name" class="vertical layout flex">
      <!--Stage: allow the user to upload files-->
      <div name="upload" class="upload vertical layout flex" tabindex="0">
        <div class="suggester">
          <nuxeo-path-suggestion
            id="pathSuggesterUpload"
            label="[[i18n('documentImportForm.location')]]"
            value="{{targetPath}}"
            parent="{{suggesterParent}}"
            children="{{suggesterChildren}}"
            disabled
            always-float-label
          ></nuxeo-path-suggestion>
          <span class$="horizontal layout [[_formatErrorMessage(errorMessage)]]">[[errorMessage]]</span>
        </div>

        <div id="dropzone" class="vertical layout flex">
          <input hidden id="uploadFiles" type="file" on-change="_filesChanged" multiple />
          <template is="dom-if" if="[[!hasFiles]]">
            <div class="vertical layout center center-justified flex">
              <div class="dropzone-label horizontal layout center center-justified">
                <button class="link" on-click="_showUploadDialog">
                  [[i18n('documentImportForm.clickOrDrop')]]
                </button>
              </div>
              <span hidden$="[[!_hasVisibleContributions]]">[[i18n('documentImportForm.linkFilesFrom')]]</span>
              <div class="importActions horizontal layout wrap">
                <nuxeo-slot name="FILE_UPLOAD_ACTIONS" empty="{{!hasContributions}}"></nuxeo-slot>
              </div>
            </div>
          </template>
          <template is="dom-if" if="[[hasFiles]]" restamp>
            <paper-dialog-scrollable>
              <div class="vertical layout flex">
                <div class="horizontal layout wrap baseline">
                  <span class="dropzone-heading" hidden$="[[!_showDropzoneFileHeadings(hasLocalFiles,hasRemoteFiles)]]">
                    [[i18n('documentImportForm.localFiles')]]
                  </span>
                  <template is="dom-repeat" items="[[localFiles]]" as="file">
                    <!-- local file -->
                    <div class="file-to-import horizontal layout" error$="{{file.error}}">
                      <div class="vertical layout flex">
                        <div class="horizontal layout">
                          <div class="name" title="[[file.name]]">
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
                        <template is="dom-if" if="[[_displayProgressBar(file.*)]]">
                          <paper-progress indeterminate="[[!hasProgress()]]" value="[[file.progress]]"></paper-progress>
                        </template>
                        <div class="horizontal layout flex" hidden$="[[!file.error]]">
                          <span class="file-error">[[file.error]]</span>
                          <nuxeo-tooltip>[[file.error]]</nuxeo-tooltip>
                        </div>
                      </div>
                      <div class="clear" hidden$="[[!_displayRemoveBlobBtn(file.*)]]">
                        <paper-icon-button
                          icon="[[_computeRemoveIcon(file.*)]]"
                          on-tap="_removeBlob"
                          aria-labelledby="removeBlobTooltip"
                        ></paper-icon-button>
                        <nuxeo-tooltip id="removeBlobTooltip">[[_computeRemoveLabel(file.*, i18n)]]</nuxeo-tooltip>
                      </div>
                    </div>
                  </template>
                  <span class="dropzone-heading" hidden$="[[!_showDropzoneFileHeadings(hasLocalFiles,hasRemoteFiles)]]">
                    [[i18n('documentImportForm.remoteFiles')]]
                  </span>
                  <template is="dom-repeat" items="[[remoteFiles]]" as="file">
                    <!-- remote file -->
                    <div class="file-to-import horizontal layout" error$="{{file.error}}">
                      <div class="vertical layout flex">
                        <div class="horizontal layout center">
                          <div class="name" title="[[file.name]]">
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
                        <paper-icon-button
                          icon="nuxeo:remove"
                          on-tap="_removeBlob"
                          aria-labelledby="removeTooltip"
                        ></paper-icon-button>
                        <nuxeo-tooltip id="removeTooltip">[[i18n('command.remove')]]</nuxeo-tooltip>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </paper-dialog-scrollable>
            <div class="horizontal layout center end-justified" hidden$="!hasFiles">
              <div class="add-more horizontal layout center">
                <button class="link" on-click="_showUploadDialog">[[i18n('documentImportForm.addMoreFiles')]]</button>
                <span hidden$="[[!_hasVisibleContributions]]"
                  >&nbsp;[[i18n('documentImportForm.linkFilesFrom')]]&nbsp;</span
                >
                <div class="importActions horizontal layout wrap">
                  <nuxeo-slot name="FILE_UPLOAD_ACTIONS" empty="{{!hasContributions}}"></nuxeo-slot>
                </div>
              </div>
            </div>
          </template>
        </div>
        <span class="upload-error">[[_importErrorMessage]]</span>
        <div class="buttons horizontal end-justified layout">
          <div class="flex start-justified">
            <paper-button noink dialog-dismiss on-tap="_cancel" hidden$="[[_creating]]" class="secondary"
              >[[i18n('command.cancel')]]</paper-button
            >
          </div>
          <paper-button
            noink
            id="edit"
            class="primary"
            on-tap="_toggleCustomize"
            hidden$="[[!_canAddProperties(_creating,hasFiles,canCreate)]]"
          >
            [[i18n('documentImportForm.addProperties')]]
          </paper-button>
          <paper-button
            noink
            id="create"
            class="primary"
            on-tap="_import"
            disabled$="[[!_canImport(_creating, hasLocalFilesUploaded,hasRemoteFiles,canCreate)]]"
            aria-label$="[[i18n('command.create')]]"
          >
            <template is="dom-if" if="[[!_isUploadingOrImporting(_creating, hasLocalFiles, hasLocalFilesUploaded)]]">
              [[i18n('command.create')]]
            </template>
            <template is="dom-if" if="[[_isUploadingOrImporting(_creating, hasLocalFiles, hasLocalFilesUploaded)]]">
              <span class="importing-label" hidden$="[[_creating]]">[[i18n('documentImport.uploading')]]</span>
              <span class="importing-label" hidden$="[[!_creating]]">[[i18n('documentImport.importing')]]</span>
              <paper-spinner-lite active></paper-spinner-lite>
            </template>
          </paper-button>
        </div>
      </div>

      <!--Stage: allow the user to fill in properties for the uploaded files and create the respective documents-->
      <div name="customize" class="vertical layout flex">
        <div class="horizontal layout flex">
          <div id="blobEditor" class="vertical layout flex">
            <paper-dialog-scrollable>
              <div class="suggester">
                <nuxeo-path-suggestion
                  id="pathSuggesterCustomize"
                  label="[[i18n('documentImportForm.location')]]"
                  value="{{targetPath}}"
                  parent="{{suggesterParent}}"
                  children="{{suggesterChildren}}"
                  disabled
                  always-float-label
                ></nuxeo-path-suggestion>
                <span class$="horizontal layout [[_formatErrorMessage(errorMessage)]]">[[errorMessage]]</span>
              </div>
              <iron-form id="form">
                <form class="form vertical layout flex">
                  <div class="horizontal layout center">
                    <div class="flex">
                      <nuxeo-select
                        id="docTypeDropdown"
                        selected="{{selectedDocType}}"
                        attr-for-selected="key"
                        label="[[i18n('documentImportForm.type.label')]]"
                        placeholder="[[i18n('documentImportForm.type.placeholder')]]"
                        error-message="[[i18n('documentImportForm.type.error')]]"
                        required
                      >
                        <template is="dom-repeat" items="[[_importDocTypes]]" as="type">
                          <paper-item key="[[type]]">[[_getTypeLabel(type)]]</paper-item>
                        </template>
                      </nuxeo-select>
                    </div>
                  </div>
                  <!--restamp needed to prevent submit with hidden input fields, which will throw an error-->
                  <template is="dom-if" if="[[document]]" restamp>
                    <nuxeo-document-layout
                      id="document-import"
                      layout="import"
                      document="[[document]]"
                      href-base="[[importPath]]"
                    ></nuxeo-document-layout>
                  </template>
                </form>
              </iron-form>
            </paper-dialog-scrollable>
            <span class="upload-error">[[_importErrorMessage]]</span>
          </div>
          <paper-dialog-scrollable id="sidePanel">
            <div id="blobList" class="flex">
              <div id="checkmarkNote">[[i18n('documentImportForm.unchecked.disclaimer')]]</div>
              <template is="dom-repeat" items="[[localFiles]]" as="file">
                <paper-button
                  noink
                  class$="file-overview [[_selectedLocalDocStyle(index,docIdx,_initializingDoc)]]"
                  on-tap="_tapLocalDoc"
                  disabled$="[[!_canTapDoc(canCreate, _initializingDoc)]]"
                  aria-label$="[[file.error]]"
                >
                  <div class="horizontal layout flex self-stretch">
                    <div class="vertical layout flex">
                      <span class="name" hidden$="[[file.title]]" title="[[file.name]]">[[file.name]]</span>
                      <span class="name" hidden$="[[!file.title]]" title="[[file.title]]">[[file.title]]</span>
                      <template is="dom-if" if="[[_displayProgressBar(file.*)]]">
                        <paper-progress indeterminate="[[!hasProgress()]]" value="[[file.progress]]"></paper-progress>
                      </template>
                      <div class="horizontal layout flex" hidden$="[[!file.error]]">
                        <span class="file-error">[[file.error]]</span>
                        <nuxeo-tooltip>[[file.error]]</nuxeo-tooltip>
                      </div>
                    </div>
                    <iron-icon
                      icon="[[_computedCheckItem(file.*)]]"
                      class$="blobCheck [[_styleFileCheck(file.*)]]"
                      on-tap="_checkTappedLocal"
                    ></iron-icon>
                  </div>
                </paper-button>
              </template>
              <template is="dom-repeat" items="[[remoteFiles]]" as="file">
                <paper-button
                  noink
                  class$="file-overview [[_selectedRemoteDocStyle(index,docIdx,_initializingDoc)]]"
                  on-tap="_tapRemoteDoc"
                  disabled$="[[!_canTapDoc(canCreate, _initializingDoc)]]"
                  aria-label$="[[i18n('command.select')]]"
                >
                  <div class="horizontal layout flex self-stretch">
                    <div class="vertical layout flex">
                      <span class="name flex" hidden$="[[file.title]]" title="[[file.name]]">[[file.name]]</span>
                      <span class="name flex" hidden$="[[!file.title]]" title="[[file.title]]">[[file.title]]</span>
                    </div>
                    <iron-icon
                      icon="[[_computedCheckItem(file.*)]]"
                      class$="blobCheck [[_styleFileCheck(file.*)]]"
                      on-tap="_checkTappedRemote"
                    ></iron-icon>
                  </div>
                </paper-button>
              </template>
              <span class="horizontal layout error" hidden$="[[!_importWithPropertiesError]]"
                >[[_importWithPropertiesError]]</span
              >
            </div>
          </paper-dialog-scrollable>
        </div>
        <div class="buttons horizontal justified layout">
          <paper-button noink dialog-dismiss on-tap="_cancel" hidden$="[[_creating]]" class="secondary">
            [[i18n('command.cancel')]]
          </paper-button>

          <div>
            <paper-button
              noink
              class="text"
              on-tap="_previousFile"
              disabled$="[[_disableEditPrevious(_initializingDoc,_creating,canCreate,customizing,docIdx)]]"
            >
              ❮&nbsp;[[i18n('documentImportForm.previousDocument')]]
            </paper-button>
            <paper-button
              noink
              class="text"
              on-tap="_nextFile"
              disabled$="[[_disableEditNext(_initializingDoc,_creating,canCreate,customizing,docIdx)]]"
            >
              [[i18n('documentImportForm.nextDocument')]]&nbsp;❯
            </paper-button>

            <paper-button
              noink
              class="text"
              on-tap="_applyToAll"
              disabled$="[[_disableApplyToAll(_initializingDoc,_creating,canCreate,customizing,docIdx)]]"
            >
              [[i18n('documentImportForm.applyToAll')]]
            </paper-button>
          </div>

          <paper-button
            noink
            class="primary"
            on-tap="_importWithProperties"
            disabled$="[[!_canImportWithMetadata(_creating,_initializingDoc,canCreate,hasLocalFilesUploaded,hasRemoteFiles,localFiles.*,remoteFiles.*)]]"
            aria-label$="[[i18n('command.create')]]"
          >
            <template is="dom-if" if="[[!_isUploadingOrImporting(_creating, hasLocalFiles, hasLocalFilesUploaded)]]">
              [[i18n('command.create')]]
            </template>
            <template is="dom-if" if="[[_isUploadingOrImporting(_creating, hasLocalFiles, hasLocalFilesUploaded)]]">
              <span class="importing-label" hidden$="[[_creating]]">[[i18n('documentImport.uploading')]]</span>
              <span class="importing-label" hidden$="[[!_creating]]">[[i18n('documentImport.importing')]]</span>
              <paper-spinner-lite active></paper-spinner-lite>
            </template>
          </paper-button>
        </div>
      </div>
    </iron-pages>

    <nuxeo-document-creation-stats id="creationStats"></nuxeo-document-creation-stats>
  `,

  is: 'nuxeo-document-import',
  behaviors: [NotifyBehavior, IronResizableBehavior, UploaderBehavior, DocumentCreationBehavior],
  importMeta: import.meta,

  properties: {
    batchAppend: {
      value: true,
    },

    stage: {
      type: String,
      value: 'upload',
    },

    docIdx: {
      type: Number,
      value: -1,
    },

    localFiles: {
      type: Array,
      value: [],
    },

    remoteFiles: {
      type: Array,
      value: [],
    },

    selectedDocType: {
      type: String,
      observer: '_selectedDocTypeChanged',
    },

    documentBlobProperties: {
      type: Object,
      value: {
        default: 'file:content',
        note: 'note:note',
      },
    },

    hasLocalFiles: {
      type: Boolean,
      value: false,
      notify: true,
    },

    hasRemoteFiles: {
      type: Boolean,
      value: false,
      notify: true,
    },

    hasFiles: {
      type: Boolean,
      value: false,
      computed: '_computeHasFiles(hasLocalFiles,hasRemoteFiles)',
    },

    visible: {
      type: Boolean,
    },

    _doNotCreate: {
      type: Boolean,
      value: false,
    },

    _docProperties: {
      type: Object,
      value: {},
    },

    _hasVisibleContributions: {
      type: Boolean,
    },

    _importDocTypes: {
      type: Array,
      computed: '_computeImportDocTypes(subtypes)',
    },

    _creating: {
      type: Boolean,
      value: false,
    },

    _initializingDoc: {
      type: Boolean,
      value: false,
    },

    _importErrorMessage: {
      type: String,
      value: '',
    },

    _importWithPropertiesError: String,
  },

  listeners: {
    batchFinished: '_batchReady',
    'nx-blob-picked': '_blobPicked',
    'nx-document-creation-parent-validated': '_parentValidated',
    uploadInterrupted: '_handleError',
    batchFailed: '_handleError',
  },

  observers: ['_observeFiles(files.*)', '_observeRemoteFiles(remoteFiles.splices)', '_visibleOnStage(visible,stage)'],

  ready() {
    this.connection = this.$.nx;
    this.$.docRequest.$.nxResource.set('uncancelable', true);
    this.setupDropZone(this.$.dropzone);
    this._clear();
    this.addEventListener('element-changed', this._layoutUpdated.bind(this), true);
  },

  init(files) {
    if (files) {
      this.uploadFiles(files);
    }
    this.set(
      '_hasVisibleContributions',
      this.hasContributions && !!this.$$('.importActions > *:not([hidden]):not(nuxeo-slot)'),
    );
    this._importErrorMessage = '';
  },

  _observeFiles(changeRecord) {
    if (changeRecord) {
      if (changeRecord.path === 'files.splices' && changeRecord.value && changeRecord.value.indexSplices) {
        changeRecord.value.indexSplices.forEach(function(s) {
          for (let i = 0; i < s.addedCount; i++) {
            const index = s.index + i;
            this.push('localFiles', this.files[index]);
          }
        }, this);
        this.hasLocalFiles = this.localFiles && this.localFiles.length > 0;
        this.hasLocalFilesUploaded = false;
      } else {
        const match = changeRecord.path.match(/(files\.\d+)\.(\w+)/);
        if (match) {
          // this is needed because the client doesn't account for removed blobs
          const localFilesIdx = this.localFiles.indexOf(this.get(match[1]));
          // hack: refresh on the dom repeat
          this.notifyPath(['localFiles', localFilesIdx, match[2]].join('.'));
          if (match[2] === 'complete' || match[2] === 'error') {
            this.hasLocalFilesUploaded =
              this.hasLocalFiles && this.localFiles.every((file) => !file || file.complete || file.error);
            // if we are already editing file properties, we need to uncheck those whose upload failed
            if (this.hasLocalFilesUploaded) {
              this._getAllFiles().forEach((f, index) => f.error && this._setFileProp(index, 'checked', false));
            }
          }
        }
      }
    }
  },

  _observeRemoteFiles() {
    this.hasRemoteFiles = this.remoteFiles && this.remoteFiles.length > 0;
  },

  _showDropzoneFileHeadings() {
    return this.hasLocalFiles && this.hasRemoteFiles;
  },

  _canImport() {
    return (this.hasLocalFiles ? this.hasLocalFilesUploaded : this.hasRemoteFiles) && this.canCreate && !this._creating;
  },

  _isUploadingOrImporting() {
    return this._creating || (this.hasLocalFiles ? !this.hasLocalFilesUploaded : false);
  },

  _canImportWithMetadata() {
    return this._getAllFiles().every((file) => 'checked' in file) && this._canImport();
  },

  _canAddProperties() {
    return this.hasFiles && this.canCreate && !this._creating;
  },

  _showUploadDialog() {
    this.$.uploadFiles.click();
  },

  _filesChanged(e) {
    this.uploadFiles(e.target.files);
  },

  _selectedDocTypeChanged() {
    this._validate();
  },

  _toggleCustomize() {
    if (this.stage === 'upload') {
      this.stage = 'customize';
      this.customizing = true;
      this.set('selectedDocType', '');
      this.fire('nx-creation-wizard-hide-tabs');
      // let's select the first file that's not disabled
      const toSelect = this._getAllFiles().findIndex((f) => !f.error);
      this._selectDoc(toSelect < 0 ? 0 : toSelect);
    } else {
      this.stage = 'upload';
      this.customizing = false;
      this.fire('nx-creation-wizard-show-tabs');
    }
  },

  _computeHasFiles() {
    return this.hasLocalFiles || this.hasRemoteFiles;
  },

  _getAllFiles() {
    if (this.localFiles && this.remoteFiles) {
      return this.localFiles.concat(this.remoteFiles);
    }
    return this.localFiles ? this.localFiles : this.remoteFiles;
  },

  _getTotalFileCount() {
    return (this.localFiles ? this.localFiles.length : 0) + (this.remoteFiles ? this.remoteFiles.length : 0);
  },

  _getCurrentFile() {
    const arr = this._getAllFiles();
    return arr[this.docIdx];
  },

  _isValidFileIndex(index) {
    const length = this._getTotalFileCount();
    return length > 0 && index >= 0 && index < length;
  },

  _getFile(index) {
    if (this._isValidFileIndex(index)) {
      return this._getAllFiles()[index];
    }
  },

  _setFileProp(index, prop, value) {
    if (this._isValidFileIndex(index)) {
      let pos = index;
      let arr = 'localFiles';
      if (pos >= this.localFiles.length) {
        arr = 'remoteFiles';
        pos -= this.localFiles.length;
      }
      this._setFilePropEx(arr, pos, prop, value);
    }
  },

  _setFilePropEx(arrName, index, prop, value) {
    this.set([arrName, index, prop].join('.'), value);
  },

  _getCurrentFileTitle() {
    const currentFile = this._getCurrentFile();
    return currentFile ? currentFile.name : '';
  },

  _getRemainingDocs() {
    const count = this._getTotalFileCount();
    return count > 1 ? this.i18n('documentImportForm.addProperties.otherDocuments', count - 1 - this.docIdx) : '';
  },

  _copyFileData(originIdx, destIdx) {
    const originFile = this._getFile(originIdx);
    const destFile = this._getFile(destIdx);
    const { docData } = originFile;
    let copiedDocData = {};

    if (docData && Object.keys(docData).length > 0) {
      copiedDocData = JSON.parse(JSON.stringify(docData));
    }
    copiedDocData.document.properties['dc:title'] = destFile.name;
    this._setFileProp(destIdx, 'docData', copiedDocData);
    this._setFileProp(destIdx, 'checked', true);
  },

  _storeFile(index) {
    if (this._isValidFileIndex(index)) {
      let pos = index;
      let propName = 'localFiles';
      if (pos >= this.localFiles.length) {
        propName = 'remoteFiles';
        pos -= this.localFiles.length;
      }
      this.set([propName, pos, 'docData'].join('.'), {
        parent: this.targetPath,
        document: JSON.parse(JSON.stringify(this.document)),
        type: this.selectedDocType,
      });
      this.set([propName, pos, 'sanitizedName'].join('.'), this._sanitizeName(this.document.properties['dc:title']));
      this.set([propName, pos, 'title'].join('.'), this.document.properties['dc:title']);
    }
  },

  _loadFile(docData, title) {
    let properties = {};
    if (docData && Object.keys(docData).length > 0) {
      this.targetPath = docData.parent;
      this.selectedDocType = this._importDocTypes.find((type) => type.id === docData.type.id);
      ({ properties } = JSON.parse(JSON.stringify(docData.document)));
    }
    if (title) {
      properties['dc:title'] = title;
    }
    this._docProperties = properties;
    return this._updateDocument();
  },

  _nextFile() {
    if (this._hasNextFile()) {
      this._selectDoc(this.docIdx + 1);
    }
  },

  _previousFile() {
    if (this._hasPreviousFile()) {
      this._selectDoc(this.docIdx - 1);
    }
  },

  _hasNextFile() {
    const length = this._getTotalFileCount();
    return length > 1 && this.docIdx < length - 1 && this.canCreate && !this._creating;
  },

  _hasPreviousFile() {
    const length = this._getTotalFileCount();
    return length > 1 && this.docIdx > 0 && this.canCreate && !this._creating;
  },

  async _selectDoc(index) {
    if (!this._isValidFileIndex(index)) {
      throw new Error(`invalid file index: ${index}`);
    } else if (this.docIdx !== index && (this.docIdx < 0 || this._validate())) {
      if (this.docIdx > -1) {
        this._storeFile(this.docIdx);
      }
      const previousFile = this._getCurrentFile();
      this.docIdx = index;
      const currentFile = this._getCurrentFile();
      if (currentFile.checked) {
        // load the file's own data
        await this._loadFile(currentFile.docData);
      } else if (previousFile) {
        // load the previous file's data
        await this._loadFile(previousFile.docData, currentFile.name);
      } else {
        await this._loadFile({}, currentFile.name);
      }
      if (currentFile.error) {
        this._setFileProp(index, 'checked', false);
      } else if (!('checked' in currentFile)) {
        this._setFileProp(index, 'checked', true);
      }
    }
    const currentFile = this._getCurrentFile();
    if (currentFile && currentFile._validationReport) {
      const layout = this.$$('#document-import');
      layout.reportValidation(currentFile._validationReport);
    }
  },

  _validate() {
    // run our custom validation function first to allow setting custom native validity
    const layout = this.$$('#document-import');

    // run our custom validation function first to allow setting custom native validity
    const result = this._doNativeValidation(this.$.form) && this.$.form.validate();

    if (result || !layout) {
      return result;
    }
    const innerLayout = layout.$.layout;
    const nodes = innerLayout._getValidatableElements(innerLayout.element.root);
    const invalidField = nodes.find((node) => node.invalid);
    if (invalidField) {
      invalidField.scrollIntoView();
      invalidField.focus();
    }
  },

  _canTapDoc() {
    return this.canCreate && !this._initializingDoc;
  },

  _tapLocalDoc(e) {
    this._selectDoc(e.model.index);
  },

  _tapRemoteDoc(e) {
    this._selectDoc(e.model.index + this.localFiles.length);
  },

  _selectedLocalDocStyle(index) {
    return index === this.docIdx && !this._initializingDoc ? 'selected' : '';
  },

  _selectedRemoteDocStyle(index) {
    return index + this.localFiles.length === this.docIdx && !this._initializingDoc ? 'selected' : '';
  },

  _cancel() {
    this.cancelBatch();
    this._clear();
    this.fire('nx-creation-wizard-show-tabs');
  },

  _clear() {
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
    this._initializingDoc = false;
    this._importWithPropertiesError = '';
    this._importErrorMessage = '';
    this.$.uploadFiles.value = '';
    this.selectedDocType = '';
  },

  _importWithProperties() {
    if (this._validate()) {
      this._creating = true;
      this._storeFile(this.docIdx);
      this._processFilesWithMetadata();
    }
  },

  _import() {
    this._creating = true;
    const params = {
      context: {
        currentDocument: this.targetPath,
      },
    };
    const doLocal = this.batchId && this.localFiles && this.localFiles.length > 0;
    const doRemote = this.remoteFiles && this.remoteFiles.length > 0;
    if (doLocal && doRemote) {
      this._smartImportLocalFiles(params).then((response1) => {
        this._smartImportRemoteFiles(params).then((response2) => {
          this._handleSuccess(this._mergeResponses(response1, response2));
        }, this._handleError.bind(this));
      }, this._handleError.bind(this));
    } else if (doLocal) {
      this._smartImportLocalFiles(params).then(this._handleSuccess.bind(this), this._handleError.bind(this));
    } else {
      this._smartImportRemoteFiles(params).then(this._handleSuccess.bind(this), this._handleError.bind(this));
    }
  },

  _handleSuccess(response, close) {
    if (close === undefined) {
      close = true;
    }
    this._notify(response, close);
    // store creation data
    if (response.entries && Array.isArray(response.entries)) {
      response.entries.forEach((f) => {
        // XXX remove this to lower as soon as we get type information from the server
        this.$.creationStats.storeType(f.type.toLowerCase());
      });
    } else if (response.type) {
      this.$.creationStats.storeType(response.type);
    }
    if (close) {
      this.cancelBatch();
      this._clear();
      if (!response.entries || response.entries.length === 1) {
        this.navigateTo(response.entries ? response.entries[0] : response);
      } else {
        this.fire('document-updated');
        this.navigateTo(this.parent);
      }
    }
  },

  _handleError(error) {
    this.set('_creating', false);
    this.set('_importErrorMessage', this.i18n('documentImport.error.importFailed'));
    const message = error.message || (error.detail && error.detail.error);
    this.notify({ message: `${this.i18n('label.error').toUpperCase()}: ${message}` });
  },

  _mergeResponses(...args) {
    const response = { 'entity-type': 'Documents', entries: [] };
    for (let i = 0; i < args.length; i++) {
      const current = args[i];
      if (current && current.entries) {
        response.entries.concat(current.entries);
      } else {
        response.entries.push(current);
      }
    }
    return response;
  },

  _smartImportLocalFiles(params) {
    return this.batchExecute('FileManager.Import', params, { 'nx-es-sync': 'true', 'X-Batch-No-Drop': 'true' });
  },

  _smartImportRemoteFiles(params) {
    this.$.fileManagerImport.input = `blobs:${this.remoteFiles.map((file) => file.key).join()}`;
    this.$.fileManagerImport.params = params;
    this.$.fileManagerImport.params.noMimeTypeCheck = true;
    return this.$.fileManagerImport.execute();
  },

  _processFilesWithMetadata() {
    this._importWithPropertiesError = '';
    const length = this._getTotalFileCount();
    const self = this;
    const promises = [];
    const localIndexes = [];
    const remoteIndexes = [];
    for (let i = 0; i < length; i++) {
      let arr = self.localFiles;
      let index = i;
      if (i >= self.localFiles.length) {
        arr = self.remoteFiles;
        index = i - self.localFiles.length;
      }
      promises.push(
        (function(indexesToRemove, idx) {
          return (arr[idx].docData && arr[idx].checked && !arr[idx].error
            ? self._processFileWithMetadata(arr[idx])
            : Promise.resolve({ 'entity-type': 'Documents', entries: [] })
          )
            .then((result) => {
              indexesToRemove.push(idx);
              return result;
            })
            .catch((error) => {
              // save the validation_report for later display by the nuxeo-document-layout
              if (!(error instanceof Error) && error['entity-type'] && error['entity-type'] === 'validation_report') {
                arr[idx]._validationReport = error;
              }
              return error;
            });
        })(i >= self.localFiles.length ? remoteIndexes : localIndexes, index),
      );
    }
    Promise.all(promises).then((results) => {
      const errorFree = results.filter(
        (result) =>
          !(result instanceof Error) &&
          result['entity-type'] &&
          result['entity-type'] !== 'exception' &&
          result['entity-type'] !== 'validation_report',
      );
      this._handleSuccess(this._mergeResponses.apply(null, errorFree), !(errorFree.length < results.length));
      if (errorFree.length < results.length) {
        this.set('_creating', false);
        this.set('_importWithPropertiesError', 'These documents could not be created.');
        localIndexes
          .sort()
          .reverse()
          .forEach((index) => {
            this.splice('localFiles', index, 1);
          });
        remoteIndexes
          .sort()
          .reverse()
          .forEach((index) => {
            this.splice('remoteFiles', index, 1);
          });
        /*
         * XXX Prevent this._selectDoc(0) from storing the previously selected file,
         * in case it was saved and removed from localFiles.
         */
        this.docIdx = -1;
        this._selectDoc(0);
      }
    });
  },

  _processFileWithMetadata(file) {
    const { document, parent: docPath } = file.docData;
    document.name = file.sanitizedName || file.name;
    const blobProperty = this.documentBlobProperties[file.docData.type.id] || this.documentBlobProperties.default;
    // XXX if fileData.type == Note, then the file's contents should be passed instead
    document.properties[blobProperty] = file.providerId
      ? {
          providerId: file.providerId,
          user: file.user,
          fileId: file.fileId,
        }
      : {
          'upload-batch': this.batchId,
          'upload-fileId': String(file.index),
        };
    this.$.docRequest.data = document;
    this.$.docRequest.docPath = docPath;
    return this.$.docRequest.post();
  },

  _removeFile(index) {
    this.splice('localFiles', index, 1);
    this.hasLocalFiles = this.localFiles && this.localFiles.length > 0;
    // clear error message if no more files with error
    if (!this.localFiles.some((f) => f.error)) {
      this._importErrorMessage = '';
    }
    this.$.uploadFiles.value = '';
  },

  _removeBlob(e) {
    const { file, index } = e.model;
    if (file.providerId) {
      this.splice('remoteFiles', index, 1);
    } else if (!e.model.file.error && !e.model.file.complete && this.hasAbort()) {
      this.abort(e.model.file);
      this._removeFile(index);
    } else {
      this.$.blobRemover.path = `upload/${this.batchId}/${file.index}`;
      this.$.blobRemover.remove().then(
        () => {
          this._removeFile(index);
        },
        (reason) => {
          // file was never created in the first place
          if (reason.status === 404) {
            this._removeFile(index);
          } else {
            this._handleError(reason);
          }
        },
      );
    }
  },

  _batchReady(data) {
    data.stopPropagation();
    this.properties = [];
    for (let i = 0; i < this.localFiles.length; i++) {
      this.properties.push({});
    }
    const div = this.$$('div[name="upload"]');
    if (div) {
      div.focus();
    }
  },

  _blobPicked(e) {
    this.hasRemoteFiles = true;
    this.notifyPath('remoteFiles', this.remoteFiles.concat(e.detail.blobs));
  },

  _getDocumentProperties() {
    return this._docProperties;
  },

  _computedCheckItem(e) {
    if (e.base && e.base.checked) {
      return 'icons:check-circle';
    }
    return 'icons:radio-button-unchecked';
  },

  _computeRemoveIcon(file) {
    if (file.base) {
      if (file.base.complete || file.base.error) {
        return 'nuxeo:remove';
      }
      if (this.hasAbort()) {
        return 'icons:cancel';
      }
    }
    return '';
  },

  _computeRemoveLabel(file) {
    if (file.base) {
      if (file.base.complete || file.base.error) {
        return this.i18n('command.remove');
      }
      if (this.hasAbort()) {
        return this.i18n('command.cancel');
      }
    }
    return '';
  },

  _styleFileCheck(e) {
    if (e.base && 'checked' in e.base) {
      return e.base.checked ? 'checked' : 'unchecked';
    }
    return 'hidden';
  },

  _checkTappedLocal(e) {
    e.stopPropagation();
    if (e.model.file.error) {
      return;
    }
    this._setFilePropEx('localFiles', e.model.index, 'checked', !e.model.file.checked);
  },

  _checkTappedRemote(e) {
    e.stopPropagation();
    if (e.model.file.error) {
      return;
    }
    this._setFilePropEx('remoteFiles', e.model.index, 'checked', !e.model.file.checked);
  },

  _canApplyToAll() {
    return this.customizing && this.docIdx === 0 && this._getTotalFileCount() > 1 && this.canCreate && !this._creating;
  },

  _applyToAll() {
    const lastIdx = this._getTotalFileCount() - 1;
    if (this._isValidFileIndex(this.docIdx) && this._isValidFileIndex(lastIdx) && this._validate()) {
      this._storeFile(0);
      for (let i = 1; i <= lastIdx; i++) {
        this._copyFileData(0, i);
      }
      this._selectDoc(lastIdx);
    }
  },

  _filterImportDocTypes(type) {
    return window.nuxeo.importBlacklist.indexOf(type.type) === -1;
  },

  _computeImportDocTypes() {
    if (this.subtypes) {
      return this.subtypes.filter(this._filterImportDocTypes);
    }
  },

  _parentValidated() {
    if (this.canCreate && this._importDocTypes && this._importDocTypes.length === 0) {
      this.set('canCreate', false);
      this.set('errorMessage', this.i18n('documentImport.error.cannotImport'));
    }
  },

  _visibleOnStage() {
    this.$.pathSuggesterUpload.disabled = !this.visible || this.stage !== 'upload';
    this.$.pathSuggesterCustomize.disabled = !this.visible || this.stage !== 'customize';
  },

  /**
   * Retrieves and creates the layout for the current document type.
   */
  _updateDocument() {
    this._initializingDoc = true;
    if (!this._isValidType(this.selectedDocType) || !this.parent) {
      this.document = null;
      // prevent error message from being displayed the first time
      this.$.docTypeDropdown.invalid = false;
      this._initializingDoc = false;
      return;
    }

    return this.newDocument(this.selectedDocType.type, this._getDocumentProperties()).then((document) => {
      document.parentRef = this.parent.uid;
      // disable controls while the layout loads
      if (
        !this.document ||
        (this.document.type !== document.type &&
          !customElements.get(`nuxeo-${document.type.toLowerCase()}-import-layout`))
      ) {
        const promise = new Promise((resolve) => {
          this._layout_changed = (e) => {
            if (e.detail.element) {
              this.removeEventListener('document-layout-changed', this._layout_changed);
              resolve(e);
            }
          };
          this.addEventListener('document-layout-changed', this._layout_changed);
        });
        this.document = document;
        return promise.then((e) => {
          if (e.detail.element) {
            this._initializingDoc = false;
          }
        });
      }
      this.document = document;
      this._initializingDoc = false;
    });
  },

  _displayProgressBar(file) {
    return file.base && !file.base.providerId && !file.base.complete && !file.base.error;
  },

  _displayRemoveBlobBtn(file) {
    return file.base && (file.base.complete || file.base.error || this.hasAbort());
  },

  _layoutUpdated(e) {
    this.async(() => {
      const input = e.detail.value.querySelector('[autofocus]');
      if (input) {
        input.focus();
      }
    });
  },

  _submitKeyHandler(e) {
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
  _doNativeValidation(/* form */) {
    /* var fakeSubmit = document.createElement('input');
    fakeSubmit.setAttribute('type', 'submit');
    fakeSubmit.style.display = 'none';
    form._form.appendChild(fakeSubmit);
    fakeSubmit.click();
    form._form.removeChild(fakeSubmit);
    return form._form.checkValidity(); */
    return true;
  },

  _disableEditPrevious() {
    return this._initializingDoc || !this._hasPreviousFile();
  },

  _disableEditNext() {
    return this._initializingDoc || !this._hasNextFile();
  },

  _disableApplyToAll() {
    return this._initializingDoc || !this._canApplyToAll();
  },
});

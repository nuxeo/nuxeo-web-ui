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
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-arender-view-documents-button`
@group Nuxeo UI
@element nuxeo-arender-view-documents-button
*/
Polymer({
  _template: html`
    <style include="nuxeo-action-button-styles">
      #close-icon {
        position: absolute;
        right: -12px;
        top: -12px;
        width: 25px;
        height: 25px;
        border: 1px solid rgba(0, 0, 0, 0.4);
        padding: 3px;
        background: var(--nuxeo-secondary-color);
        color: var(--nuxeo-button-primary-text);
      }

      #close-icon:hover {
        border-color: var(--nuxeo-primary-color);
      }

      nuxeo-dialog {
        width: 100%;
        height: 100%;
        min-width: 480px;
      }

      iframe {
        width: 100%;
        height: 100%;
        border: 0;
      }

      nuxeo-dialog > * {
        margin: 0;
        padding: 0;
      }
    </style>

    <nuxeo-operation id="arenderMultiDocOp" op="Document.ARenderGetPreviewerUrl"></nuxeo-operation>

    <template is="dom-if" if="[[_isAvailable(documents)]]">
      <div class="action" on-tap="_openDialog">
        <paper-tooltip>[[i18n('arender.openDocuments')]]</paper-tooltip>
        <paper-icon-button noink id="aRenderDocsButton" icon="icons:pageview"></paper-icon-button>
        <span class="label" hidden$="[[!showLabel]]">[[i18n('arender.openDocuments')]]</span>
      </div>
    </template>

    <nuxeo-dialog on-iron-overlay-closed="_closeDialog" id="aRenderDocsDialog" with-backdrop>
      <template>
        <iframe src="[[aRenderUrl]]"></iframe>
        <paper-icon-button id="close-icon" icon="nuxeo:clear" on-click="_closeDialog" noink></paper-icon-button>
      </template>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-arender-view-documents-button',

  properties: {
    /**
     * List of documents to display in arender.
     */
    documents: {
      type: Array,
    },
    aRenderUrl: {
      type: String,
      value: '',
    },
    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },
  },

  _isAvailable(documents) {
    return documents !== null && documents.length !== 0;
  },

  _openDialog() {
    if (this.documents) {
      const documentIds = this.documents.filter((doc) => this.hasContent(doc)).map((doc) => doc.uid);
      if (documentIds.length === 0) {
        return;
      }
      this.$.arenderMultiDocOp.input = documentIds;
      this.$.arenderMultiDocOp
        .execute()
        .then((res) => {
          this.set('aRenderUrl', res.previewerUrl);
          this.$.aRenderDocsDialog.open();
        })
        .catch(() => {
          this.fire('notify', { message: this.i18n('arender.viewDocumentsError') });
        });
    }
  },

  _closeDialog() {
    this.$.aRenderDocsDialog.close();
  },
});

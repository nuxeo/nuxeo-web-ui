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
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-arender-blob-diff-button`
@group Nuxeo UI
@element nuxeo-arender-blob-diff-button
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

      nuxeo-dialog > nuxeo-document-preview {
        height: 100%;
      }

      nuxeo-dialog > * {
        margin: 0;
        padding: 0;
      }

      nuxeo-dialog > nuxeo-document-preview ::slotted(audio) {
        height: 50%;
      }
    </style>

    <nuxeo-operation id="aRenderDiffOp" op="Document.ARenderGetDiffUrl">
    </nuxeo-operation>

    <div class="action" on-tap="_openDialog">
      <paper-icon-button noink id="aRenderblobDiffButton" icon="[[icon]]"></paper-icon-button>
    </div>
    <nuxeo-tooltip for="aRenderblobDiffButton">[[i18n('documentDiffButton.blob.tooltip')]]</nuxeo-tooltip>

    <nuxeo-dialog on-iron-overlay-closed="_closeDialog" id="aRenderBlobDiffDialog" with-backdrop>
      <template>
        <iframe src="[[_aRenderUrl]]"></iframe>
        <paper-icon-button id="close-icon" icon="nuxeo:clear" on-click="_closeDialog" noink></paper-icon-button>
      </template>
    </nuxeo-dialog>
`,

  is: 'nuxeo-arender-blob-diff-button',
  behaviors: [I18nBehavior],

  properties: {
    icon: {
      type: String,
      value: 'nuxeo:preview',
    },
    xpath: String,
    leftUid: String,
    rightUid: String,
    _aRenderUrl: {
      type: String,
      value: '',
    },
  },

  _openDialog() {
    this.$.aRenderDiffOp.params = {
      leftDocId: this.leftUid,
      rightDocId: this.rightUid,
      leftBlobXPath: this.xpath,
      rightBlobXPath: this.xpath,
    }
    this.$.aRenderDiffOp.execute().then((res) => {
      this.set('_aRenderUrl', res.previewerUrl);
      this.$.aRenderBlobDiffDialog.open();
    });
  },

  _closeDialog() {
    this.$.aRenderBlobDiffDialog.close();
  },
});

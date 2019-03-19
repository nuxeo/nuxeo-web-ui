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
`nuxeo-arender-page`
@group Nuxeo UI
@element nuxeo-arender-page
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      iframe {
        width: 100%;
        min-height: 84vh;
        border: 0;
      }
    </style>

    <nuxeo-operation id="aRenderOp" op="Document.ARenderGetPreviewerUrl" input="[[document.uid]]"></nuxeo-operation>

    <iframe src="[[aRenderUrl]]"></iframe>
  `,

  is: 'nuxeo-arender-page',

  properties: {
    document: {
      type: Object,
    },
    aRenderUrl: {
      type: String,
      value: '',
    },
    visible: {
      type: Boolean,
    },
  },

  observers: ['_observeDocument(document, visible)'],

  _observeDocument() {
    this.aRenderUrl = '';
    if (this.visible && this.document) {
      this.$.aRenderOp
        .execute()
        .then((res) => {
          this.set('aRenderUrl', res.previewerUrl);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  },
});

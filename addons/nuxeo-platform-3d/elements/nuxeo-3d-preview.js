/**
(C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and others.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
    Miguel Nixo <mnixo@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import './nuxeo-3d-viewer.js';

/**
`nuxeo-3d-preview` allows the visualization of a 3D document.
Download and delete actions are available below the WebGL viewer.

    <nuxeo-3d-preview></nuxeo-3d-preview>

Example - Load a ThreeD document:

    <nuxeo-3d-preview document="[[doc]]"></nuxeo-3d-preview>

@group Nuxeo 3D Elements
@element nuxeo-3d-preview
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      nuxeo-3d-viewer {
        width: 100%;
        height: 40vh;
      }

      .title {
        color: #213f7d;
        font-size: 1.64rem;
      }

      .flex {
        font-size: 12px;
        margin: auto;
      }
    </style>
    
    <nuxeo-document id="doc" doc-id="[[document.uid]]"></nuxeo-document>

    <template is="dom-if" if="{{document.properties.file:content}}">
      <template is="dom-if" if="{{_hasItems(document.properties.threed:transmissionFormats)}}">
        <nuxeo-3d-viewer id="threedViewer" src="[[document.properties.threed:transmissionFormats.0.content.data]]">
        </nuxeo-3d-viewer>
      </template>
      <template is="dom-if" if="{{!_hasItems(document.properties.threed:transmissionFormats)}}">
        <p>[[i18n('threeDViewLayout.transmissionFormats.notAvailable')]]</p>
      </template>
    </template>
    <template is="dom-if" if="{{!document.properties.file:content}}">
      <nuxeo-dropzone value="{{document.properties.file:content}}"></nuxeo-dropzone>
    </template>
    <div class="horizontal layout center">
      <template is="dom-if" if="[[document.properties.file:content]]">
        <p class="title">
          <a href="[[document.properties.file:content.data]]">[[document.title]]</a>
        </p>
        <div class="horizontal flex end-justified layout">
          <nuxeo-delete-blob-button document="{{document}}" xpath="file:content"></nuxeo-delete-blob-button>
        </div>
      </template>
      <template is="dom-if" if="[[!document.properties.file:content]]">
        <p class="title">
          <span>[[document.title]]</span>
        </p>
      </template>
    </div>
  `,

  is: 'nuxeo-3d-preview',

  properties: {
    /**
     * The ThreeD `document` to be previewed.
     */
    document: {
      type: Object,
      notify: true,
    },
  },

  behaviors: [I18nBehavior],

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

  _hasItems(list) {
    return list.length > 0;
  },
});

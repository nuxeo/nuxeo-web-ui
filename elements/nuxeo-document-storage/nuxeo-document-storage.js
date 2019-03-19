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

import '@polymer/iron-localstorage/iron-localstorage.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';

import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-storage`
@group Nuxeo UI
@element nuxeo-document-storage
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: none;
      }
    </style>

    <nuxeo-connection id="nxcon"></nuxeo-connection>

    <iron-localstorage id="storage" name="[[name]]" value="{{documents}}" on-iron-localstorage-load-empty="initialize">
    </iron-localstorage>
  `,

  is: 'nuxeo-document-storage',

  properties: {
    name: {
      type: String,
      value: 'nuxeo-document-storage',
    },
    documents: {
      type: Array,
      notify: true,
    },
  },

  initialize() {
    this.documents = [];
  },

  add(doc) {
    if (this.contains(doc)) {
      return;
    }
    const document = {
      uid: doc.uid,
      title: doc.title,
      type: doc.type,
      path: doc.path,
      lastViewed: new Date(),
    };
    if (doc.contextParameters && doc.contextParameters.thumbnail && doc.contextParameters.thumbnail.url) {
      document.contextParameters = { thumbnail: { url: doc.contextParameters.thumbnail.url } };
    }
    return this.unshift('documents', document);
  },

  contains(doc) {
    return this.documents && this._indexOf(doc) !== -1;
  },

  remove(doc) {
    const index = this._indexOf(doc);
    if (index !== -1) {
      this.splice('documents', index, 1);
    }
  },

  update(doc, properties) {
    const index = this._indexOf(doc);
    if (index !== -1) {
      Object.keys(properties).forEach((key) => {
        this.set(`documents.${index}.${key}`, properties[key]);
      });
    }
  },

  get(doc) {
    const index = this._indexOf(doc);
    if (index !== -1) {
      return this.documents[index];
    }
    return null;
  },

  _indexOf(doc) {
    return this.documents.findIndex((e) => e.uid === doc.uid);
  },

  ready() {
    this.$.nxcon.connect().then((res) => {
      this.name = `${res.id}-${this.name}`;
    });
  },

  reload() {
    this.$.storage.reload();
  },
});

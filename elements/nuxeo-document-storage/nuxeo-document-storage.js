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
`nuxeo-document-storage`
@group Nuxeo UI
@element nuxeo-document-storage
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-localstorage/iron-localstorage.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';

import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
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
      value: 'nuxeo-document-storage'
    },
    documents: {
      type: Array,
      notify: true
    }
  },

  initialize: function() {
    this.documents = [];
  },

  add: function(doc) {
    if (this.contains(doc)) {
      return;
    }
    var document = {
      uid: doc.uid,
      title: doc.title,
      type: doc.type,
      path: doc.path,
      lastViewed: new Date()
    };
    if (doc.contextParameters && doc.contextParameters.thumbnail && doc.contextParameters.thumbnail.url) {
      document.contextParameters = {thumbnail: {url: doc.contextParameters.thumbnail.url}}
    }
    return this.unshift('documents', document);
  },

  contains: function(doc) {
    return this.documents && this._indexOf(doc) !== -1;
  },

  remove: function(doc) {
    var index = this._indexOf(doc);
    if (index !== -1) {
      this.splice('documents', index, 1);
    }
  },

  update: function(doc, properties) {
    var index = this._indexOf(doc);
    if (index !== -1) {
      for (var key in properties) {
        if (properties.hasOwnProperty(key)) {
          this.set("documents." + index + "." + key, properties[key]);
        }
      }
    }
  },

  get: function(doc) {
    var index = this._indexOf(doc);
    if (index !== -1) {
      return this.documents[index];
    }
    return null;
  },

  _indexOf: function(doc) {
    return this.documents.findIndex(function(e) {
      return e.uid === doc.uid;
    });
  },

  ready: function() {
    this.$.nxcon.connect().then(function(res) {
      this.name = res.id + '-' + this.name;
    }.bind(this));
  },

  reload: function() {
    this.$.storage.reload();
  }
});

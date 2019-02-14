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
`nuxeo-document-creation-stats`
@group Nuxeo UI
@element nuxeo-document-creation-stats
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@polymer/iron-localstorage/iron-localstorage.js';
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
    <iron-localstorage id="storage" name="[[name]]" value="{{creationStats}}" on-iron-localstorage-load-empty="initialize" auto-save-disabled="">
    </iron-localstorage>
`,

  is: 'nuxeo-document-creation-stats',

  properties: {
    name: String,
    recencySize: {
      type: Number,
      value: 5
    },
    creationStats: {
      type: Object,
      notify: true
    }
  },

  ready: function() {
    this.$.nxcon.connect().then(function(res) {
      this.name =  res.id + '-document-creation-stats';
    }.bind(this));
  },

  initialize: function() {
    this.creationStats = {
      recency: [],
      frequency: {},
      total: 0
    };
  },

  storeType: function(type) {
    this.$.storage.reload();

    if (this.creationStats.recency.length === this.recencySize) {
      this.splice('creationStats.recency', 0, 1);
    }
    if (!(type in this.creationStats.frequency)) {
      this.set('creationStats.frequency.' + type, 0);
    }

    this.push('creationStats.recency', type);
    this.set('creationStats.frequency.' + type, this.creationStats.frequency[type] + 1);
    this.set('creationStats.total', this.creationStats.total + 1);
    this.$.storage.save();
  },

  lastType: function(n) {
    this.$.storage.reload();
    if (this.creationStats.recency.length === 0) {
      return [];
    }
    return this.creationStats.recency.slice(Math.max(this.creationStats.recency.length - (n ? n : 1), 0));
  },

  mostCommonType: function(n) {
    this.$.storage.reload();
    var sorted = Object.keys(this.creationStats.frequency).sort(function(a, b) {
      return this.creationStats.frequency[a] < this.creationStats.frequency[b];
    }.bind(this)).filter(function(elem, index, self) {
      return index === self.indexOf(elem);
    });
    return sorted.slice(0, Math.min((n ? n : 1), sorted.length));
  }
});

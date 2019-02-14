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
`nuxeo-document-create-shortcuts`
@group Nuxeo UI
@element nuxeo-document-create-shortcuts
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '../nuxeo-document-creation-stats/nuxeo-document-creation-stats.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
Polymer({
  _template: html`
    <style>
      #shortcuts {
        @apply --layout-vertical;
        @apply --layout-center;
        @apply --layout-end-justified;
      }

      nuxeo-document-create-shortcut {
        margin: var(--nuxeo-document-create-shortcut-margin);
      }
    </style>

    <div id="shortcuts"></div>

    <nuxeo-document-creation-stats id="creationStats"></nuxeo-document-creation-stats>
`,

  is: 'nuxeo-document-create-shortcuts',
  behaviors: [FormatBehavior],

  properties: {
    hostVisible: {
      type: Boolean,
      observer: '_observeVisibility'
    },
    subtypes: {
      type: Array
    }
  },

  _observeVisibility: function() {
    if (this.hostVisible) {
      this._updateShortcuts();
    }
  },

  _updateShortcuts: function() {
    var types = this.$.creationStats.lastType(1);
    this.$.creationStats.mostCommonType(2).forEach(function(type) {
      if (types.indexOf(type) < 0) {
        types.push(type);
      }
    });

    var shorcuts = [];
    types.forEach(function(type) {
      if (this.subtypes && this.subtypes.indexOf(type) > -1) {
        var el = document.createElement('nuxeo-document-create-shortcut');
        el.type = type;
        el.icon =  'images/doctypes/' + type + '.svg';
        el.label = this.formatDocType(type);
        shorcuts.push(el);
      }
    }.bind(this));

    this._putNodes(dom(this.$.shortcuts), shorcuts.reverse());
  },

  _putNodes: function(parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    if (arguments && arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        if (Array.isArray(arguments[i])) {
          for (var j = 0; j < arguments[i].length; j++) {
            parent.appendChild(arguments[i][j]);
          }
        } else {
          parent.appendChild(arguments[i]);
        }
      }
    }
  }
});

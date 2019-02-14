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
`nuxeo-keys`
@group Nuxeo UI
@element nuxeo-keys
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-a11y-keys/iron-a11y-keys.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <iron-a11y-keys id="a11y" keys="[[keys]]" target="[[target]]" on-keys-pressed="_keysPressed"></iron-a11y-keys>
`,

  is: 'nuxeo-keys',

  properties: {
    /**
     * Space delimited list of keys to listen.
     */
    keys: {
      type: String,
    },

    /**
     * Target node where keys will be listened.
     * By default: body
     */
    target: {
      type: Object,
      value: function() {
        return document.body;
      }
    },

    invasive: {
      type: Boolean,
      value: false,
    },
  },

  _keysPressed: function(e) {
    var keyboardEvent = e.detail.keyboardEvent;
    if (this._getMatchingKeyBindings(keyboardEvent).length === 0) {
      return;
    }

    if (this.target === document.body) {
      var element = keyboardEvent.composedPath()[0];
      switch (element.tagName) {
        case 'INPUT':
        case 'TEXTAREA':
          if (!this.invasive) {
            return;
          }
          break;
        case 'DIV':
          if (!this.invasive && element.isContentEditable) {
            return;
          }
          if (element.id === 'input') {
            e.preventDefault();
            return;
          }
          break;
        case 'NUXEO-DIALOG':
        case 'PAPER-DIALOG':
        case 'PAPER-BUTTON':
        case 'PAPER-CHECKBOX':
        case 'PAPER-RADIO-BUTTON':
          e.preventDefault();
          return;
      }
    }
    this.fire('pressed', e.detail, {});
  },

  _getMatchingKeyBindings: function(keyboardEvent) {
    return this.$.a11y._keyBindings[keyboardEvent.type].filter(function(entry) {
      var bind = entry[0];
      return bind.key.toLowerCase() === this._transformKey(keyboardEvent.key)
        && keyboardEvent.altKey === !!bind.altKey && keyboardEvent.ctrlKey === !!bind.ctrlKey
        && keyboardEvent.metaKey === !!bind.metaKey && keyboardEvent.shiftKey === !!bind.shiftKey;
    }.bind(this));
  },

  /**
   * Transforms the key to match iron-a11y-keys logic.
   * @param {string} key The KeyBoardEvent.key
   *
   * @see https://github.com/PolymerElements/iron-a11y-keys-behavior/blob/v2.1.1/iron-a11y-keys-behavior.html#L102-L130
   */
  _transformKey: function(key) {
    var validKey = '';
    if (key) {
      var lKey = key.toLowerCase();
      if (lKey === ' ' || /^space(bar)?/.test(lKey)) {
        validKey = 'space';
      } else if (/^escape$/.test(lKey)) {
        validKey = 'esc';
      } else if (/^arrow/.test(lKey)) {
        validKey = lKey.replace('arrow', '');
      } else if (lKey === 'multiply') {
        validKey = '*';
      } else {
        validKey = lKey;
      }
    }
    return validKey;
  }
});

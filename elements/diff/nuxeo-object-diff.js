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
`nuxeo-object-diff`
@group Nuxeo UI
@element nuxeo-object-diff
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { DiffBehavior } from './nuxeo-diff-behavior.js';
import './nuxeo-diff-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
export const Diff = Diff || {};
Diff.registry = {
  default: 'nuxeo-default-diff'
};

/**
 * Registers a custom diff element for a set of rules to condition when the element is to be displayed.
 *
 * @param {string} id - The element id.
 * @param {Object} rules - A set of rules, following the format: `{type: 'type', property: 'propertname'}`.
 */
Diff.registerElement = function(id, rules) {
  if (rules.type) {
    if (!Diff.registry.types) {
      Diff.registry.types = {};
    }
    Diff.registry.types[rules.type] = id;
  }
  if (rules.property) {
    if (!Diff.registry.properties) {
      Diff.registry.properties = {};
    }
    Diff.registry.properties[rules.property] = id;
  }
},

/**
 * Retrieves a custom element for a given set of rules, or the default element if none is found.
 */
Diff.getElement = function(rules) {
  var id = null;
  if (Diff.registry.properties && rules.property) {
    id = Diff.registry.properties[rules.property];
  }
  if (!id && Diff.registry.types && rules.type) {
    id = Diff.registry.types[rules.type];
  }
  return id || Diff.registry.default;
}

Polymer({
  _template: html`
    <style include="nuxeo-diff-styles">
    </style>

    <div id="container"></div>
`,

  is: 'nuxeo-object-diff',
  behaviors: [DiffBehavior],
  observers: ['_updateContainer(type, property)'],

  created: function() {
    for (var prop in this.properties) {
      // XXX: use a method observer per property to keep databinding between the object diff and it's child
      // Note: we're not using a property observer here because we need to pass not only the value but also the
      // property name, in order to be able to set it on the child.
      this._createMethodObserver('_forwardProp("' + prop + '", ' + prop + ')');
    }
  },

  _forwardProp: function(prop, value) {
    if (this._instance) {
      this._instance[prop] = value;
    }
  },

  _updateContainer: function(type, property) {
    // retrieve a custom element for the given type and property combination,
    // or the default element if none is found.
    this._instance = document.createElement(Diff.getElement({type: type,
      property: [this.schema && (this.schema.prefix || this.schema.name), property].filter(Boolean).join(':')}));

    for (var prop in this.properties) {
      this._instance[prop] = this[prop];
    }

    if (this.$.container.hasChildNodes()) {
      this.$.container.replaceChild(this._instance, this.$.container.firstChild);
    } else {
      this.$.container.appendChild(this._instance);
    }
  }
});

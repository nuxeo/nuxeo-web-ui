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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { IronFormElementBehavior } from '@polymer/iron-form-element-behavior';
import { createNestedObject } from '@nuxeo/nuxeo-elements/utils.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import './nuxeo-ai-suggestion.js';

/**
 * `nuxeo-ai-suggestions` allows selecting one or more tags.
 *
 *     <nuxeo-ai-suggestions document="{{document}}"
 *       property="dc:description"
 *       suggestions="[[suggestions]]"
 *       threshold=0.7>
 *     </nuxeo-ai-suggestions>
 *
 * @memberof Nuxeo
 */
class AISuggestions extends mixinBehaviors([IronFormElementBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          @apply --layout-horizontal;
          @apply --layout-wrap;
          @apply --layout-flex;
        }

        :host([hidden]) {
          display: none;
        }

        nuxeo-ai-suggestion {
          margin: 0 10px 10px 0;
        }

        nuxeo-ai-suggestion[match] {
          pointer-events: none;
        }
      </style>

      <template is="dom-repeat" items="[[suggestions]]">
        <nuxeo-ai-suggestion
          suggestion="[[item]]"
          match$="[[_matchesInput(item, _inputMatches)]]"
          threshold="[[threshold]]"
          property="[[property]]"
          on-click="_selectSuggestion"
        ></nuxeo-ai-suggestion>
      </template>
    `;
  }

  static get is() {
    return 'nuxeo-ai-suggestions';
  }

  static get properties() {
    return {
      /**
       * The document for which the suggestions were made.
       */
      document: {
        type: Object,
        notify: true,
      },

      /**
       * The document's property xpath to which the suggestions were made.
       */
      property: {
        type: String,
      },

      /**
       * The list of suggestions made by Artificial Intelligence engine.
       */
      suggestions: {
        type: Array,
        value: [],
      },

      /**
       * The confidence threshold for the suggestions.
       */
      threshold: {
        type: Number,
        value: 0.7,
      },

      /**
       * Function used to get the id from the choice object.
       */
      idFunction: {
        type: Function,
        value() {
          return this._idFunction.bind(this);
        },
      },

      _inputMatches: {
        type: Object,
      },
    };
  }

  static get observers() {
    return ['_matchInput(property, suggestions, document.properties.*)'];
  }

  _matchInput() {
    if (!this.property || !this.suggestions || !this.document) {
      return;
    }
    // XXX: this method memoizes matching between the property value and the suggestions
    const matches = new Map();
    const currentValue = this.get(this._parsePropertyPath());
    if (this.suggestions.length > 0 && currentValue) {
      const isArray = Array.isArray(currentValue);
      this.suggestions.forEach((suggestion) => {
        const suggestedValue = this.idFunction(suggestion.value);
        const match = isArray
          ? currentValue.map((i) => this.idFunction(i)).includes(suggestedValue)
          : this.idFunction(currentValue) === String(suggestedValue);
        matches.set(suggestedValue, match);
      });
    }
    this._inputMatches = matches;
  }

  _matchesInput(suggestion) {
    return this._inputMatches && suggestion.value && this._inputMatches.get(this.idFunction(suggestion.value));
  }

  _selectSuggestion(event) {
    const suggestion = this.suggestions[event.model.index];
    const propertyPath = this._parsePropertyPath();
    if (this.get(propertyPath) === undefined) {
      createNestedObject(this.document.properties, this.property.split('/'));
    }
    if (Array.isArray(this.get(propertyPath))) {
      // XXX: we're doing this instead of `this.push(propertyPath, value);` because the push will produce
      // a `<propertyPath>.splices` which might not reflect to widgets with the value double bound to
      // `propertyPath`.
      this.set(propertyPath, this.get(propertyPath).concat(suggestion.value));
    } else {
      this.set(propertyPath, suggestion.value);
    }
  }

  _idFunction(item) {
    return item.computedId || item.uid || item.id || item;
  }

  _parsePropertyPath() {
    return `document.properties.${this.property.replace(new RegExp('/', 'g'), '.')}`;
  }
}

customElements.define(AISuggestions.is, AISuggestions);
Nuxeo.AISuggestions = AISuggestions;

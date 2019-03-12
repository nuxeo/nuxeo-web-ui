<!--
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
-->
<link rel="import" href="nuxeo-ai-icons.html">
<dom-module id="nuxeo-ai-suggestions">
  <template>

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

      .suggestion {
        margin: 0 10px 10px 0;
        padding: 5px 9px 5px;

        border-radius: 2em;
        background-color: var(--nuxeo-tag-background, transparent);

        cursor: pointer;

        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;

        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .suggestion:hover {
        background-color: var(--nuxeo-artificial-intelligence-confidence-hover, rgba(74, 144, 246, 0.1));
      }

      .chosen {
        opacity: 0.3;
        pointer-events:none;
      }

      iron-icon {
        --iron-icon-fill-color: var(--nuxeo-artificial-intelligence-confidence-color, #4A90E2);
        margin-left: 7px;
        height: 1.2em;
      }
    </style>

    <template is="dom-repeat" items="[[suggestions]]">
      <div class$="suggestion [[_styleSuggestion(item, _inputMatches)]]" on-click="_selectSuggestion">
        <span>[[idFunction(item.name)]]</span>
        <iron-icon icon="[[_getConfidenceIcon(item.confidence)]]"></iron-icon>
      </div>
    </template>

  </template>

  <script>
    {
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
      class AISuggestions
        extends Polymer.mixinBehaviors([Nuxeo.I18nBehavior, Polymer.IronFormElementBehavior], Nuxeo.Element) {

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
            }
          };
        }

        static get observers() {
          return [
            '_matchInput(property, suggestions, document.properties.*)',
          ];
        }

        _matchInput() {
          if (!this.property || !this.suggestions || !this.document) {
            return;
          }
          // XXX: this method memoizes matching between the property value and the suggestions
          const matches = new Map();
          let currentValue = this.get(this._parsePropertyPath());
          if (this.suggestions.length > 0) {
            const isArray = Array.isArray(currentValue);
            this.suggestions.forEach((suggestion) => {
              const suggestedValue = this.idFunction(suggestion.name);
              const match = isArray ? currentValue.includes(suggestedValue) : currentValue === suggestedValue;
              matches.set(suggestedValue, match);
            });
          }
          this._inputMatches = matches;
        }

        _styleSuggestion(suggestion) {
          return (this._inputMatches && suggestion.name && this._inputMatches.get(suggestion.name)) ? 'chosen' : '';
        }

        _getConfidenceIcon(confidenceLevel) {
          const interval = (1 - this.threshold) / 3;
          let icon;
          if (confidenceLevel >= this.threshold && confidenceLevel < this.threshold + interval) {
            icon = 'nuxeo-ai:confidence-level-low';
          } else if (confidenceLevel >= this.threshold + interval && confidenceLevel < this.threshold + (2 * interval)) {
            icon = 'nuxeo-ai:confidence-level-medium';
          } else if (confidenceLevel >= this.threshold + (2 * interval) && confidenceLevel <= 1) {
            icon = 'nuxeo-ai:confidence-level-high';
          }
          return icon;
        }

        _selectSuggestion(event) {
          const suggestion = this.suggestions[event.model.index];
          const propertyPath = this._parsePropertyPath();
          if (!this.get(propertyPath)) {
            this._createNestedObjectRecursive(this.document.properties, this.property.split('/'));
          }
          const value = this.idFunction(suggestion.name);
          if (Array.isArray(this.get(propertyPath))) {
            // XXX: we're doing this instead of `this.push(propertyPath, value);` because the push will produce
            // a `<propertyPath>.splices` which might not reflect to widgets with the value double bound to
            // `propertyPath`.
            this.set(propertyPath, this.get(propertyPath).concat(value));
          } else {
            this.set(propertyPath, value);
          }
        }

        _idFunction(item) {
          return item.computedId || item.uid || item.id || item;
        }

        _parsePropertyPath() {
          return `document.properties.${this.property.replace(new RegExp('/', 'g'), '.')}`;
        }

        /**
         * Recursive method to create nested objects when they don't exist in a parent object.
         * It does not change any other existing objects or inner objects, only the ones referred in 'path'.
         * @param obj Parent Object where inner nested objects should be created.
         * @param path Array containing the inner object keys.
         * Usage Example:
         *
         *  - Creating document properties using xpath:
         *
         *    const xpath = 'my:custom/field/subfield/x'
         *    _createNestedObjectRecursive(this.document.properties, xpath.split('/');
         *
         */
        _createNestedObjectRecursive(obj, path) {
          if (path.length === 0) {
            return;
          }
          if ((!Object.prototype.hasOwnProperty.call(obj, path[0]) && !obj[path[0]]) || typeof obj[path[0]] !== 'object') {
            obj[path[0]] = {};
          }
          return this._createNestedObjectRecursive(obj[path[0]], path.slice(1));
        }

        /**
         * Iterative Method to create nested objects when they don't exist in a parent object.
         * It does not change any other existing objects or inner objects, only the ones referred in 'path'.
         * @param obj Parent Object where inner nested objects should be created.
         * @param path Array containing the inner object keys.
         * @param startingPath Path from where the algorithm will start.
         * Usage Example:
         *
         *  - Creating document properties using xpath:
         *
         *    const xpath = 'my:custom/field/subfield/x'
         *    _createNestedObject(this.document.properties, xpath.split('/'), 'document.properties');
         *
         */
        _createNestedObject(obj, path, startingPath) {
          let composedPath = startingPath;
          path.forEach((piece) => {
            obj = this.get(composedPath);
            composedPath += (`${composedPath.length === 0 ? '' : '.'}${piece}`);
            if (!this.get(composedPath)) {
              obj[piece] = {};
            }
          });
        }

      }

      customElements.define(AISuggestions.is, AISuggestions);
      Nuxeo.AISuggestions = AISuggestions;
    }
  </script>
</dom-module>

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
const AISuggestionMixin = function(superClass) {
  return class extends superClass {
    static get properties() {
      return {
        /**
         * The document's property xpath to which the suggestions were made.
         */
        property: {
          type: String,
        },
        /**
         * The suggestion.
         */
        suggestion: {
          type: Object,
        },
        /**
         * The confidence threshold for the suggestions.
         */
        threshold: {
          type: Number,
        },
        /**
         * `true` if this suggestion matches the input, `false` otherwise.
         */
        match: {
          type: Boolean,
          value: false,
          reflectToAttribute: true,
        },
      };
    }

    _idFunction(item) {
      const id = ['computeId', 'uid', 'id'].find((key) => Object.prototype.hasOwnProperty.call(item, key));
      return id ? item[id] : item;
    }

    _getConfidenceIcon(confidenceLevel) {
      const interval = (1 - this.threshold) / 3;
      let icon;
      if (confidenceLevel >= this.threshold && confidenceLevel < this.threshold + interval) {
        icon = 'nuxeo-ai:confidence-level-low';
      } else if (confidenceLevel >= this.threshold + interval && confidenceLevel < this.threshold + 2 * interval) {
        icon = 'nuxeo-ai:confidence-level-medium';
      } else if (confidenceLevel >= this.threshold + 2 * interval && confidenceLevel <= 1) {
        icon = 'nuxeo-ai:confidence-level-high';
      }
      return icon;
    }
  };
};

Nuxeo.AISuggestionMixin = AISuggestionMixin;

export default AISuggestionMixin;

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
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '../nuxeo-ai-icons.js';

class DefaultAISuggestionFormatter extends Nuxeo.Element {
  static get template() {
    return html`
      <style>
        :host {
          @apply --layout-horizontal;
        }
        span {
          @apply --layout-flex;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        iron-icon {
          --iron-icon-fill-color: var(--nuxeo-artificial-intelligence-confidence-color, #4a90e2);
          margin-left: 7px;
          height: 1.2em;
        }
      </style>
      <span>[[_idFunction(suggestion.name)]]</span>
      <iron-icon icon="[[_getConfidenceIcon(suggestion.confidence)]]"></iron-icon>
    `;
  }

  static get is() {
    return 'nuxeo-default-suggestion-formatter';
  }

  static get properties() {
    return {
      property: {
        type: String,
      },
      suggestion: {
        type: Object,
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
}
customElements.define(DefaultAISuggestionFormatter.is, DefaultAISuggestionFormatter);
Nuxeo.DefaultAISuggestionFormatter = DefaultAISuggestionFormatter;

export default DefaultAISuggestionFormatter;

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
import './nuxeo-ai-icons.js';
import AISuggestionFormatters from './nuxeo-ai-suggestion-formatters.js';

/**
 * `nuxeo-ai-suggestion` allows selecting one or more tags.
 *
 *     <nuxeo-ai-suggestion document="{{document}}"
 *       property="dc:description"
 *       suggestions="[[suggestions]]"
 *       threshold=0.7>
 *     </nuxeo-ai-suggestion>
 *
 * @memberof Nuxeo
 */
class AISuggestion extends Nuxeo.Element {
  static get template() {
    return html`
      <style>
        :host {
          @apply --layout-horizontal;
          max-width: 200px;
        }
        :host([hidden]) {
          display: none;
        }
        #container {
          width: 100%;
        }
      </style>
      <div id="container"></div>
    `;
  }

  static get is() {
    return 'nuxeo-ai-suggestion';
  }

  static get properties() {
    return {
      property: {
        type: String,
      },
      suggestion: {
        type: Object,
      },
      threshold: {
        type: Number,
      },
    };
  }

  static get observers() {
    return ['_updateContainer(suggestion, property)'];
  }

  _updateContainer(suggestion, property) {
    this._instance = document.createElement(
      AISuggestionFormatters.get(
        suggestion.value && suggestion.value['entity-type']
          ? {
              type: suggestion.value['entity-type'],
              property,
            }
          : {},
      ),
    );

    Object.keys(this.constructor.properties).forEach((prop) => {
      this._instance[prop] = this[prop];
    });

    if (this.$.container.hasChildNodes()) {
      this.$.container.replaceChild(this._instance, this.$.container.firstChild);
    } else {
      this.$.container.appendChild(this._instance);
    }
  }
}

customElements.define(AISuggestion.is, AISuggestion);
Nuxeo.AISuggestion = AISuggestion;

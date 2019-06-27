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
import AISuggestionMixin from '../nuxeo-ai-suggestion-mixin.js';
import '../nuxeo-ai-icons.js';
import '../nuxeo-ai-suggestion-formatter-styles.js';

class DefaultAISuggestionFormatter extends AISuggestionMixin(Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-ai-suggestion-formatter-styles"></style>
      <span>[[_idFunction(suggestion.name)]]</span>
      <iron-icon icon="[[_getConfidenceIcon(suggestion.confidence)]]"></iron-icon>
    `;
  }

  static get is() {
    return 'nuxeo-default-ai-suggestion-formatter';
  }
}
customElements.define(DefaultAISuggestionFormatter.is, DefaultAISuggestionFormatter);
Nuxeo.DefaultAISuggestionFormatter = DefaultAISuggestionFormatter;

export default DefaultAISuggestionFormatter;

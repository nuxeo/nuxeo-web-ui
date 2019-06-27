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
import '@polymer/polymer/lib/elements/dom-if.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-group-tag.js';
import AISuggestionMixin from '../nuxeo-ai-suggestion-mixin.js';
import '../nuxeo-ai-icons.js';
import '../nuxeo-ai-suggestion-formatter-styles.js';

class UserGroupAISuggestionFormatter extends AISuggestionMixin(Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-ai-suggestion-formatter-styles">
        :host {
          padding: 4px 9px 4px 5px;
        }
        nuxeo-user-tag,
        nuxeo-group-tag {
          display: flex;
          pointer-events: none;
          --nuxeo-tag: {
            display: inline-block;
            background-color: transparent;
            padding: 0;
            margin: 0 !important;
            color: var(--nuxeo-tag-text);
            font-size: 0.8rem;
            letter-spacing: 0.02em;
            line-height: 1rem;
            border-radius: 2em;
            text-decoration: none;
            vertical-align: baseline;
          }
        }
      </style>
      <dom-if if="[[_isUser(suggestion.value)]]">
        <template>
          <nuxeo-user-tag user="[[suggestion.value]]"></nuxeo-user-tag>
        </template>
      </dom-if>
      <dom-if if="[[_isGroup(suggestion.value)]]">
        <template>
          <nuxeo-group-tag group="[[suggestion.value]]"></nuxeo-group-tag>
        </template>
      </dom-if>
      <iron-icon icon="[[_getConfidenceIcon(suggestion.confidence)]]"></iron-icon>
    `;
  }

  static get is() {
    return 'nuxeo-user-group-ai-suggestion-formatter';
  }

  _isUser(model) {
    return model['entity-type'] === 'user';
  }

  _isGroup(model) {
    return model['entity-type'] === 'group';
  }
}
customElements.define(UserGroupAISuggestionFormatter.is, UserGroupAISuggestionFormatter);
Nuxeo.UserGroupAISuggestionFormatter = UserGroupAISuggestionFormatter;

export default UserGroupAISuggestionFormatter;

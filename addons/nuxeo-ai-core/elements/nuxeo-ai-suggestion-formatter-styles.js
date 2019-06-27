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

const template = html`
  <dom-module id="nuxeo-ai-suggestion-formatter-styles">
    <template>
      <style>
        :host {
          @apply --layout-horizontal;
          @apply --layout-center;
          padding: 5px 9px 5px 14px;
          border-radius: 2em;
          background-color: var(--nuxeo-tag-background, transparent);
          cursor: pointer;
          user-select: none;
          overflow: hidden;
          font-size: 12px;
        }
        :host([match]) {
          opacity: 0.3;
          pointer-events: none;
        }
        :host(:hover) {
          background-color: var(--nuxeo-artificial-intelligence-confidence-hover, rgba(74, 144, 246, 0.1));
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
    </template>
  </dom-module>
`;

document.head.appendChild(template.content);

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

/*
  Styles module to be used by elements related to document's comment feature, providing styles to common needs.

  Custom property | Description | Default
  ----------------|-------------|----------
  `--nuxeo-comment-line-height` | Text color for the label         | 20
  `--nuxeo-comment-max-height`  | Background color of added values | 80
*/
const template = html`
  <dom-module id="nuxeo-document-comments-styles">
    <template>
      <style include="nuxeo-styles">
        :host {
          display: block;
        }

        .horizontal {
          @apply --layout-horizontal;
        }

        .main-option {
          height: 1.5em;
          width: 1.5em;
          cursor: pointer;
        }

        .more-content {
          color: var(--nuxeo-secondary-color, #1f28bf);
        }

        .no-selection {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .opaque {
          opacity: 0.5;
        }

        .pointer {
          cursor: pointer;
        }

        .input-area {
          margin: 5px 0;

          @apply --layout-horizontal;
          @apply --layout-end;
        }

        .smaller {
          font-size: 0.86em;
        }

        paper-textarea {
          width: 100%;
          --paper-input-container-input: {
            font-size: 1em;
            line-height: var(--nuxeo-comment-line-height, 20px);
          }

          --paper-input-container-color: var(--secondary-text-color, #939caa);

          --iron-autogrow-textarea-placeholder: {
            color: var(--secondary-text-color, #939caa);
            font-size: 0.86em;
          }
        }
      </style>
    </template>
  </dom-module>
`;

document.head.appendChild(template.content);

/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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
import '@polymer/polymer/polymer-legacy.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/*
  Styles module to be used by elements extending `Nuxeo.DiffBehavior`, providing styles to represent arrays and both
  simple and complex objects.

  Custom property | Description | Default
  ----------------|-------------|----------
  `--nuxeo-diff-label-color` | Text color for the label | #D4D4D9
  `--nuxeo-diff-added-color` | Background color of added values | #B4EFCB
  `--nuxeo-diff-deleted-color` | Background color of deleted values | #E6B1B1
  `--nuxeo-diff-label` | Mixin applied to label | {}
  `--nuxeo-string-diff-added` | Mixin applied to the additions of strings | {}
  `--nuxeo-string-diff-deleted` | Mixin applied to the deletions of strings | {}
  `--nuxeo-complex-diff-added` | Mixin applied to the additions of complex objects | {}
  `--nuxeo-complex-diff-deleted` | Mixin applied to the deletions of complex objects | {}
*/
const template = html`
  <dom-module id="nuxeo-diff-styles">
    <template>
      <style include="iron-flex iron-flex-alignment nuxeo-styles">
        :host {
          display: block;
        }

        :host([is-array-item]) .label {
          margin-right: 8px;
          @apply --layout-flex-none;
        }

        /*
         * WEBUI-1491: break inside a word only when the word cannot fit on a line of its own, so
         * ordinary values read normally instead of being chopped mid-word. It has to be
         * overflow-wrap: anywhere rather than break-word, because only anywhere contributes
         * its break opportunities to the min-content size - and these values sit in flex items,
         * whose width is driven by exactly that. With break-word a single unbroken value (a URL,
         * a path, a hash) keeps its whole length as a minimum and overflows the compare pane.
         */
        span {
          overflow-wrap: anywhere;
        }

        span.added {
          display: inline;
          overflow-wrap: anywhere;
          background-color: var(--nuxeo-diff-added-color, #b4efcb);
          @apply --nuxeo-string-diff-added;
        }

        span.deleted {
          display: inline;
          overflow-wrap: anywhere;
          background-color: var(--nuxeo-diff-deleted-color, #e6b1b1);
          @apply --nuxeo-string-diff-deleted;
        }

        .addition,
        .deletion {
          display: inherit;
        }

        .deletion ~ .addition {
          margin-left: 8px;
        }

        .addition > :not(span):not(div):not(a) {
          border-left: 4px solid var(--nuxeo-diff-added-color, #b4efcb);
          padding-left: 2px;
          @apply --nuxeo-complex-diff-added;
        }

        .deletion > :not(span):not(div):not(a) {
          border-left: 4px solid var(--nuxeo-diff-deleted-color, #e6b1b1);
          padding-left: 2px;
          @apply --nuxeo-complex-diff-deleted;
        }

        .label {
          @apply --layout-flex;
          max-width: 150px;
          color: var(--nuxeo-diff-label-color, #d4d4d9);
          @apply --nuxeo-diff-label;
        }

        .simple .label {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }

        .value.simple {
          display: inherit;
        }

        :host(:not([is-array-item])) .value.simple {
          @apply --layout-flex-2;
        }

        .text.diff {
          overflow-wrap: anywhere;
        }

        .array.complex {
          @apply --layout-vertical;
          display: block;
        }

        .array.simple {
          @apply --layout-horizontal;
          @apply --layout-flex;
          @apply --layout-wrap;
        }

        .array.diff.simple .sep {
          margin: 0 8px 0 4px;
        }

        .array.simple .item:not(:last-of-type)::after {
          content: ',';
          margin-left: 4px;
        }

        .array.simple .item:not(:last-child) {
          margin-right: 8px;
        }

        .item {
          @apply --layout-horizontal;
        }

        .array.complex .item ~ .item {
          margin-top: 12px;
        }

        .array .item nuxeo-object-diff {
          @apply --layout-flex;
        }
      </style>
    </template>
  </dom-module>
`;

document.head.appendChild(template.content);

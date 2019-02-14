import '@polymer/polymer/polymer-legacy.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="nuxeo-diff-styles">
  <template>
    <style include="iron-flex iron-flex-alignment nuxeo-styles">
      :host {
        display: block;
      }

      :host([is-array-item]) .label {
        margin-right: 8px;
        @apply --layout-flex-none;
      }

      span {
        word-break: break-all;
      }

      span.added {
        display: inline;
        word-break: break-all;
        background-color: var(--nuxeo-diff-added-color, #B4EFCB);
        @apply --nuxeo-string-diff-added;
      }

      span.deleted {
        display: inline;
        word-break: break-all;
        background-color: var(--nuxeo-diff-deleted-color, #E6B1B1);
        @apply --nuxeo-string-diff-deleted;
      }

      .addition, .deletion {
        display: inherit;
      }

      .deletion ~ .addition {
        margin-left: 8px;
      }

      .addition > :not(span):not(div):not(a) {
        border-left: 4px solid var(--nuxeo-diff-added-color, #B4EFCB);
        padding-left: 2px;
        @apply --nuxeo-complex-diff-added;
      }

      .deletion > :not(span):not(div):not(a) {
        border-left: 4px solid var(--nuxeo-diff-deleted-color, #E6B1B1);
        padding-left: 2px;
        @apply --nuxeo-complex-diff-deleted;
      }

      .label {
        @apply --layout-flex;
        max-width: 150px;
        color: var(--nuxeo-diff-label-color, #D4D4D9);
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
        word-break: break-all;
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
        content: ",";
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
</dom-module>`;

document.head.appendChild($_documentContainer.content);

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
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
;

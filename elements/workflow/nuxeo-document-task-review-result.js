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

import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-task-review-result`
@group Nuxeo UI
@element nuxeo-document-task-review-result
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }
    </style>
  `,

  is: 'nuxeo-document-task-review-result',

  properties: {
    result: {
      type: String,
      observer: '_observeResult',
    },
  },

  _observeResult() {
    this.root.innerHTML = this.result;
  },
});

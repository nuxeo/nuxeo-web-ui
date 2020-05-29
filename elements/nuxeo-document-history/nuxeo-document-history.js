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
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '../nuxeo-audit/nuxeo-audit-search.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-history`
@group Nuxeo UI
@element nuxeo-document-history
@deprecated since 3.0.0. Use `nuxeo-audit-search` instead.
*/
Polymer({
  _template: html`
    <nuxeo-audit-search name="document-history" id="document-history" document="[[document]]"></nuxeo-audit-search>
  `,

  /** @override */
  ready() {
    console.warn(`${this.is} is deprecated. Please use nuxeo-audit-search instead!`);
  },

  is: 'nuxeo-document-history',

  properties: {
    document: Object,
  },
});

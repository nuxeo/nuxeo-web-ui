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

import '../nuxeo-document-info-bar/nuxeo-document-info-bar.js';
import './nuxeo-document-view.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

import '../nuxeo-grid/nuxeo-grid.js';
import './nuxeo-document-collapsible-details.js';
import './nuxeo-document-sidebar.js';

/**
`nuxeo-collapsible-document-page`
@group Nuxeo UI
@element nuxeo-collapsible-document-page
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      nuxeo-document-view {
        --nuxeo-document-content-height: calc(100vh - 237px - var(--nuxeo-app-top));
      }
    </style>

    <nuxeo-grid cols="1" rows="3">
      <nuxeo-document-info-bar document="[[document]]" nuxeo-grid-row="1" nuxeo-grid-col="1"></nuxeo-document-info-bar>
      <nuxeo-document-collapsible-details
        document="[[document]]"
        nuxeo-grid-row="2"
        nuxeo-grid-col="1"
      ></nuxeo-document-collapsible-details>
      <nuxeo-document-view document="[[document]]" nuxeo-grid-row="3" nuxeo-grid-col="1"></nuxeo-document-view>
    </nuxeo-grid>
  `,

  is: 'nuxeo-collapsible-document-page',

  properties: {
    document: {
      type: Object,
    },
  },
});

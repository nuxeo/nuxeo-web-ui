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
import './nuxeo-document-sidebar.js';

/**
`nuxeo-document-page`
@group Nuxeo UI
@element nuxeo-document-page
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      nuxeo-document-view {
        --nuxeo-document-content-margin-bottom: var(--nuxeo-card-margin-bottom);
      }
    </style>

    <nuxeo-grid template-columns="1fr 1fr auto" rows="3" column-gap="16px">
      <nuxeo-document-info-bar
        document="[[document]]"
        nuxeo-grid-row="1"
        nuxeo-grid-col="1"
        nuxeo-grid-colspan="3"
      ></nuxeo-document-info-bar>
      <nuxeo-document-view
        document="[[document]]"
        nuxeo-grid-row="2"
        nuxeo-grid-col="1"
        nuxeo-grid-colspan="2"
      ></nuxeo-document-view>
      <!-- XXX expanded-width is hacky too -->
      <!-- XXX side bar on document page now has a fixed with when expanded -->
      <nuxeo-document-sidebar
        document="[[document]]"
        opened="{{opened}}"
        nuxeo-grid-row="2"
        nuxeo-grid-col="3"
        nuxeo-grid-rowspan="3"
        expanded-width="320px"
      >
      </nuxeo-document-sidebar>
    </nuxeo-grid>
  `,

  is: 'nuxeo-document-page',

  properties: {
    document: {
      type: Object,
    },
    opened: {
      type: Boolean,
      value: false,
      notify: true,
      reflectToAttribute: true,
    },
  },
});

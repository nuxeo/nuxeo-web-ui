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
limitations under the License. */
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';

import '../nuxeo-grid/nuxeo-grid.js';
import './nuxeo-document-sidebar.js';
import './nuxeo-picture-exif.js';
import './nuxeo-picture-info.js';
import './nuxeo-picture-formats.js';
import './nuxeo-picture-iptc.js';

/**
`nuxeo-picture-document-page`
@group Nuxeo UI
@element nuxeo-picture-document-page
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        /* --nuxeo-card-margin-bottom: 0; */ /* XXX */
        /* --paper-card_-_margin-bottom: 0; */ /* XXX */
        /* --nuxeo-card_-_margin-bottom: 0; */ /* XXX */
      }

      /* nuxeo-document-view {
        --nuxeo-document-content-margin-bottom: var(--nuxeo-card-margin-bottom);
      } */

      /* nuxeo-card {
        min-width: 384px;
      } */
      nuxeo-document-view {
        --nuxeo-document-content-margin-bottom: var(--nuxeo-card-margin-bottom);
      }
      /* mixing content with cards and without cards will be messy */
      /* expanded-width is hacky too */
      /* how to configure breakpoint on the grid */
      /* side bar on document page now has a fixed with when expanded */
    </style>

    <nuxeo-grid template-columns="1fr 1fr auto" rows="4" column-gap="16px">
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

      <nuxeo-document-sidebar
        document="[[document]]"
        opened="{{opened}}"
        nuxeo-grid-row="2"
        nuxeo-grid-col="3"
        nuxeo-grid-rowspan="3"
        expanded-width="320px"
      >
      </nuxeo-document-sidebar>

      <nuxeo-card heading="[[i18n('pictureViewLayout.info')]]" nuxeo-grid-row="3" nuxeo-grid-col="1">
        <nuxeo-picture-info role="widget" document="[[document]]"></nuxeo-picture-info>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.formats')]]" nuxeo-grid-row="3" nuxeo-grid-col="2">
        <nuxeo-picture-formats role="widget" document="[[document]]"></nuxeo-picture-formats>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.exif')]]" nuxeo-grid-row="4" nuxeo-grid-col="1">
        <nuxeo-picture-exif role="widget" document="[[document]]"></nuxeo-picture-exif>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.iptc')]]" nuxeo-grid-row="4" nuxeo-grid-col="2">
        <nuxeo-picture-iptc role="widget" document="[[document]]"></nuxeo-picture-iptc>
      </nuxeo-card>
    </nuxeo-grid>
  `,

  is: 'nuxeo-picture-document-page',
  behaviors: [LayoutBehavior],

  properties: {
    document: {
      type: Object,
    },
    opened: {
      type: Boolean,
      value: true,
      notify: true,
      reflectToAttribute: true,
    },
  },
});

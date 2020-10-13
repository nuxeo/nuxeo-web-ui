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
    </style>

    <nuxeo-grid>
      <nuxeo-grid-template column-gap="16px" template-columns="2fr auto">
        <nuxeo-grid-area name="infobar" col="1" row="1" colspan="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="view" col="1" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="side" col="2" row="2" rowspan="5"></nuxeo-grid-area>
        <nuxeo-grid-area name="info" col="1" row="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="1" row="4"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="1" row="5"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="1" row="6"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-grid-template min-width="1280px" template-columns="1fr 1fr auto">
        <nuxeo-grid-area name="infobar" col="1" row="1" colspan="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="view" col="1" row="2" colspan="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="side" col="3" row="2" rowspan="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="info" col="1" row="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="2" row="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="1" row="4"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="2" row="4"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-grid-template max-width="1024px">
        <nuxeo-grid-area name="infobar" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="view" col="1" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="side" col="1" row="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="info" col="1" row="4"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="1" row="5"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="1" row="6"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="1" row="7"></nuxeo-grid-area>
      </nuxeo-grid-template>

      <nuxeo-document-info-bar document="[[document]]" nuxeo-grid-area="infobar"></nuxeo-document-info-bar>

      <nuxeo-document-view document="[[document]]" nuxeo-grid-area="view"></nuxeo-document-view>

      <nuxeo-document-sidebar document="[[document]]" opened="{{opened}}" nuxeo-grid-area="side" expanded-width="320px">
      </nuxeo-document-sidebar>

      <nuxeo-card heading="[[i18n('pictureViewLayout.info')]]" nuxeo-grid-area="info">
        <nuxeo-picture-info role="widget" document="[[document]]"></nuxeo-picture-info>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.formats')]]" nuxeo-grid-area="formats">
        <nuxeo-picture-formats role="widget" document="[[document]]"></nuxeo-picture-formats>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.exif')]]" nuxeo-grid-area="exif">
        <nuxeo-picture-exif role="widget" document="[[document]]"></nuxeo-picture-exif>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.iptc')]]" nuxeo-grid-area="iptc">
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

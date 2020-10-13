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

import './nuxeo-picture-exif.js';
import './nuxeo-picture-info.js';
import './nuxeo-picture-formats.js';
import './nuxeo-picture-iptc.js';

import '../nuxeo-grid/nuxeo-grid.js';

/**
`nuxeo-picture-document-page`
@group Nuxeo UI
@element nuxeo-picture-document-page
*/
Polymer({
  _template: html`
    <style>
      /*.additional {
        @apply --layout-horizontal;
        @apply --layout-justified;
        @apply --layout-wrap;
        margin: -5px;
      }*/

      /*nuxeo-card {
        @apply --layout-flex;
        padding-right: 1.3rem;
        padding-bottom: 1.3rem;
        min-width: 384px;
        margin: 5px;
      }*/

      nuxeo-card {
        min-width: 384px;
      }
    </style>

    <!-- test 1 -->
    <nuxeo-grid cols="2" rows="2" gap="10px">
      <!-- nuxeo-document-page -->
      <nuxeo-document-page
        document="[[document]]"
        nuxeo-grid-col="1"
        nuxeo-grid-row="1"
        nuxeo-grid-colspan="2"
        opened
      ></nuxeo-document-page>

      <!-- Picture details -->
      <nuxeo-card heading="[[i18n('pictureViewLayout.info')]]">
        <nuxeo-picture-info role="widget" document="[[document]]"></nuxeo-picture-info>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.formats')]]">
        <nuxeo-picture-formats role="widget" document="[[document]]"></nuxeo-picture-formats>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.exif')]]">
        <nuxeo-picture-exif role="widget" document="[[document]]"></nuxeo-picture-exif>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.iptc')]]">
        <nuxeo-picture-iptc role="widget" document="[[document]]"></nuxeo-picture-iptc>
      </nuxeo-card>
    </nuxeo-grid>

    <!-- grid with areas -->
    <!--    <nuxeo-grid gap="16px">
      &lt;!&ndash;
        documentpage documentpage
        info formats
        exif iptc
      &ndash;&gt;
      <nuxeo-grid-template>
        <nuxeo-grid-area name="documentpage" colspan="2" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="info" col="1" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="2" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="1" row="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="2" row="3"></nuxeo-grid-area>
      </nuxeo-grid-template>
      
       &lt;!&ndash;
        documentpage documentpage documentpage documentpage
        info         formats      exif         iptc
      &ndash;&gt;
      <nuxeo-grid-template min-width="1440px">
        <nuxeo-grid-area name="documentpage" colspan="4" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="info" col="1" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="2" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="3" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="4" row="2"></nuxeo-grid-area>
      </nuxeo-grid-template>
      
      &lt;!&ndash;
        documentpage
        info
        formats
        exif
        iptc
      &ndash;&gt;
      <nuxeo-grid-template max-width="720px">
        <nuxeo-grid-area name="documentpage" col="1" row="1"></nuxeo-grid-area>
        <nuxeo-grid-area name="info" col="1" row="2"></nuxeo-grid-area>
        <nuxeo-grid-area name="formats" col="1" row="3"></nuxeo-grid-area>
        <nuxeo-grid-area name="exif" col="1" row="4"></nuxeo-grid-area>
        <nuxeo-grid-area name="iptc" col="1" row="5"></nuxeo-grid-area>
      </nuxeo-grid-template>
      
      &lt;!&ndash; parent document page &ndash;&gt;
      <nuxeo-document-page document="[[document]]" nuxeo-grid-area="documentpage" opened></nuxeo-document-page>
      
      &lt;!&ndash; Picture details &ndash;&gt;
      <nuxeo-card heading="[[i18n('pictureViewLayout.info')]]" nuxeo-grid-area="info">
        <nuxeo-picture-info role="widget" document="[[document]]" nuxeo-grid-area="info"></nuxeo-picture-info>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.formats')]]" nuxeo-grid-area="formats">
        <nuxeo-picture-formats role="widget" document="[[document]]" nuxeo-grid-area="formats"></nuxeo-picture-formats>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.exif')]]" nuxeo-grid-area="exif">
        <nuxeo-picture-exif role="widget" document="[[document]]" nuxeo-grid-area="formats"></nuxeo-picture-exif>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.iptc')]]" nuxeo-grid-area="iptc">
        <nuxeo-picture-iptc role="widget" document="[[document]]" nuxeo-grid-area="formats"></nuxeo-picture-iptc>
      </nuxeo-card>
    </nuxeo-grid>-->

    <!-- original -->

    <!--nuxeo-document-page document="[[document]]" opened></nuxeo-document-page-->

    <!--div class="additional">
      <nuxeo-card heading="[[i18n('pictureViewLayout.info')]]">
        <nuxeo-picture-info role="widget" document="[[document]]"></nuxeo-picture-info>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.formats')]]">
        <nuxeo-picture-formats role="widget" document="[[document]]"></nuxeo-picture-formats>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.exif')]]">
        <nuxeo-picture-exif role="widget" document="[[document]]"></nuxeo-picture-exif>
      </nuxeo-card>

      <nuxeo-card heading="[[i18n('pictureViewLayout.iptc')]]">
        <nuxeo-picture-iptc role="widget" document="[[document]]"></nuxeo-picture-iptc>
      </nuxeo-card>
    </div-->
  `,

  is: 'nuxeo-picture-document-page',
  behaviors: [LayoutBehavior],

  properties: {
    document: {
      type: Object,
    },
  },
});

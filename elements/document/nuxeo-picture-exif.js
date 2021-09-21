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
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';

/**
`nuxeo-picture-exif`
@group Nuxeo UI
@element nuxeo-picture-exif
*/
Polymer({
  _template: html`
    <style>
      .properties label {
        @apply --nuxeo-label;
        min-width: 10rem;
        margin-inline-end: 12px;
      }

      .properties .item {
        @apply --layout-horizontal;
        @apply --layout-flex;
        line-height: 2.2rem;
      }
    </style>

    <div class="properties">
      <div class="item">
        <label>[[i18n('pictureViewLayout.date')]]</label>
        <nuxeo-date
          datetime="[[document.properties.imd:date_time_original]]"
          hidden$="[[!document.properties.imd:date_time_original]]"
        ></nuxeo-date>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.orientation')]]</label>
        <div>[[document.properties.imd:orientation]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.fnumber')]]</label>
        <div>[[document.properties.imd:fnumber]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.exposure')]]</label>
        <div>[[document.properties.imd:exposure_time]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.iso')]]</label>
        <div>[[document.properties.imd:iso_speed_ratings]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.focalLength')]]</label>
        <div>[[document.properties.imd:focalLength]]</div>
      </div>
    </div>
  `,

  is: 'nuxeo-picture-exif',
  behaviors: [I18nBehavior, FormatBehavior],

  properties: {
    label: String,
    document: Object,
  },
});

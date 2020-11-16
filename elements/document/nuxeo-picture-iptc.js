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
`nuxeo-picture-iptc`
@group Nuxeo UI
@element nuxeo-picture-iptc
*/
Polymer({
  _template: html`
    <style>
      .properties label {
        min-width: 10rem;
        margin-inline-end: 12px;
      }

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

      .text-area {
        max-width: 60%;
      }
    </style>

    <div class="properties">
      <div class="item">
        <label>[[i18n('pictureViewLayout.copyright')]]</label>
        <div>[[document.properties.imd:copyright]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.rights')]]</label>
        <div>[[document.properties.dc:rights]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.source')]]</label>
        <div>[[document.properties.dc:source]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.description')]]</label>
        <div class="text-area">[[document.properties.imd:image_description]]</div>
      </div>
    </div>
  `,

  is: 'nuxeo-picture-iptc',
  behaviors: [I18nBehavior, FormatBehavior],

  properties: {
    label: String,
    document: Object,
  },
});

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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';

/**
`nuxeo-picture-info`
@group Nuxeo UI
@element nuxeo-picture-info
*/
Polymer({
  _template: html`
    <style>
      .properties label {
        min-width: 10em;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item {
        @apply --layout-horizontal;
        @apply --layout-flex;
        line-height: 2.2rem;
      }
    </style>

    <div class="properties">
      <div class="item">
        <label>[[i18n('pictureViewLayout.dimensions')]]</label>
        <div>[[document.properties.picture:info.width]] x [[document.properties.picture:info.height]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.format')]]</label>
        <div>[[document.properties.picture:info.format]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.colorSpace')]]</label>
        <div>[[document.properties.picture:info.colorSpace]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.depth')]]</label>
        <div>[[document.properties.picture:info.depth]]</div>
      </div>
      <div class="item">
        <label>[[i18n('pictureViewLayout.weight')]]</label>
        <div>[[formatSize(document.properties.file:content.length)]]</div>
      </div>
    </div>
`,

  is: 'nuxeo-picture-info',
  behaviors: [I18nBehavior, FormatBehavior],

  properties: {
    label: String,
    document: Object
  }
});

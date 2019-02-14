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
/**
`nuxeo-video-info`
@group Nuxeo UI
@element nuxeo-video-info
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      .properties {
        -moz-column-width: 25em; /* Firefox */
        -webkit-column-width: 25em; /* webkit, Safari, Chrome */
        column-width: 25em;
        column-count: 3;
        -moz-column-count: 3; /* Firefox */
        -webkit-column-count: 3; /* webkit, Safari, Chrome */
      }

      .properties label {
        width: 10em;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item {
        @apply --layout-horizontal;
        @apply --layout-flex;
      }

      .item label {
        color: var(--secondary-text-color);
      }
    </style>

    <div class="properties">
      <div class="item">
        <label>[[i18n('videoViewLayout.format')]]</label>
        <div>[[document.properties.vid:info.format]]</div>
      </div>
      <div class="item">
        <label>[[i18n('videoViewLayout.duration')]]</label>
        <div>[[document.properties.vid:info.duration]]</div>
      </div>
      <div class="item">
        <label>[[i18n('videoViewLayout.width')]]</label>
        <div>[[document.properties.vid:info.width]]</div>
      </div>
      <div class="item">
        <label>[[i18n('videoViewLayout.height')]]</label>
        <div>[[document.properties.vid:info.height]]</div>
      </div>
      <div class="item">
        <label>[[i18n('videoViewLayout.frameRate')]]</label>
        <div>[[document.properties.vid:info.frameRate]]</div>
      </div>
    </div>
`,

  is: 'nuxeo-video-info',
  behaviors: [I18nBehavior],

  properties: {
    document: Object
  }
});

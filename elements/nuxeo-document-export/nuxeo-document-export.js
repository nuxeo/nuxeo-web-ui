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
`nuxeo-document-export`
@group Nuxeo UI
@element nuxeo-document-export
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-icon/iron-icon.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>

      iron-icon {
        width: 1em;
        height: 1em;
        margin-right: 16px;
        @apply --icon-theme;
      }

      .rendition-container {
        padding: 6px;
        @apply --rendition-container-theme;
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .rendition-container + .rendition-container {
        border-top: 1px solid #ddd;
        @apply --rendition-container-in-between-theme;
      }

      a {
        color: #00adff;
        font-weight: 700;
        text-decoration: none;
        @apply --rendition-name-theme;
      }
    </style>

  <template is="dom-repeat" items="[[_filterRenditions(document)]]">
    <div class="rendition-container">
      <iron-icon src="[[item.icon]]"></iron-icon>
      <a href="[[item.url]]">[[i18n(item.name)]]</a>
    </div>
  </template>
`,

  is: 'nuxeo-document-export',
  behaviors: [I18nBehavior],

  properties: {
    document: Object
  },

  _filterRenditions: function(document) {
    if (document && document.contextParameters) {
      return document.contextParameters.renditions.filter(function(rendition) {
        return rendition.kind !== 'nuxeo:video:conversion' && rendition.kind !== 'nuxeo:picture:conversion';
      }).map(function(item) {
        item.name = 'documentExport.' + item.name;
        return item;
      });
    } else {
      return [];
    }
  }
});

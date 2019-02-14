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
`nuxeo-document-blob`
@group Nuxeo UI
@element nuxeo-document-blob
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-actions-menu.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      .row {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .row .info {
        @apply --layout-vertical;
        @apply --layout-flex;
        overflow: hidden;
      }

      .row .actions {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .row .info a {
        overflow: hidden;
        display: block;
        text-overflow: ellipsis;
      }

      .detail {
        opacity: .5;
      }

      .actions ::content paper-icon-button {
        width: 36px;
        height: 36px;
      }

      nuxeo-actions-menu {
        height: 100%;
        max-width: var(--nuxeo-document-blob-actions-menu-max-width, 160px);
      }
    </style>

    <nuxeo-connection user="{{user}}"></nuxeo-connection>

    <template is="dom-if" if="[[blob]]">
      <div class="row">
        <div class="info">
          <div><a href="[[blob.data]]" title="[[blob.name]]">[[blob.name]]</a></div>
          <div class="detail">[[formatSize(blob.length)]]</div>
        </div>
        <div class="actions">
          <nuxeo-actions-menu>
            <nuxeo-slot slot="BLOB_ACTIONS" model="[[actionContext]]"></nuxeo-slot>
          </nuxeo-actions-menu>
        </div>
      </div>
    </template>
`,

  is: 'nuxeo-document-blob',
  behaviors: [I18nBehavior, FormatBehavior],

  properties: {
    user: Object,
    document: Object,
    xpath: {
      type: String,
      value: 'file:content'
    },
    blob: Object,
    actionContext: Object
  },

  observers: [
    '_update(user, document, xpath)'
  ],

  _update: function(user, document, xpath) {
    this.blob = document && this._deepFind(document.properties, xpath);
    this.actionContext = {user: this.user, document: this.document, blob: this.blob, xpath: this.xpath};
  },

  _deepFind: function(obj, props) {
    for (var i = 0, path = props.split('/'), len = path.length; i < len; i++) {
      if (!obj || obj === []) {
        break;
      }
      obj = obj[path[i]];
    }
    return obj;
  }
});

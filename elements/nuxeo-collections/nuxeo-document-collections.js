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

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tags.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-document-collections`
@group Nuxeo UI
@element nuxeo-document-collections
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      .item {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      iron-icon {
        /* Similiar look and feel as select2 */
        height: 13px;
        width: 13px;
        opacity: 0.6;
      }

      #removeCollection {
        border: none;
        padding: 0;
        margin: 0;
        background-color: transparent;
      }

      iron-icon:hover {
        cursor: pointer;
        opacity: 1;
      }

      .ellipsis {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        display: block;
      }
    </style>

    <nuxeo-operation op="Collection.RemoveFromCollection" input="[[document.uid]]" id="op"></nuxeo-operation>

    <template is="dom-repeat" items="[[document.contextParameters.collections]]">
      <nuxeo-tag>
        <div class="item">
          <a class="title ellipsis" href$="[[urlFor(item)]]">[[item.title]]</a>
          <button id="removeCollection" aria-label$="[[i18n('command.remove')]]">
            <iron-icon
              icon="nuxeo:cross"
              name="remove"
              on-tap="remove"
              aria-hidden="true"
              data-uid$="[[item.uid]]"
            ></iron-icon>
          </button>
        </div>
      </nuxeo-tag>
    </template>
  `,

  is: 'nuxeo-document-collections',
  behaviors: [RoutingBehavior, I18nBehavior],

  properties: {
    document: Object,
  },

  remove(evt) {
    const { op } = this.$;
    op.params = {
      collection: evt.currentTarget.dataset.uid,
    };
    op.execute().then(() => {
      this.fire('removed-from-collection', { doc: this.document, collectionId: evt.target.dataset.uid });
    });
  },
});

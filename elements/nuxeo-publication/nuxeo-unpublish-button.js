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

import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '../nuxeo-confirm-button/nuxeo-confirm-button.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-unpublish-button`
@group Nuxeo UI
@element nuxeo-unpublish-button
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: inline-block;
      }

      nuxeo-confirm-button {
        display: inline-block;
      }

      nuxeo-confirm-button .label {
        font-weight: 500;
      }
    </style>

    <nuxeo-operation id="unpublishOp" op="Document.Delete" input="[[document]]" sync-indexing></nuxeo-operation>

    <template is="dom-if" if="[[_isAvailable(document)]]">
      <nuxeo-confirm-button
        dialog-title="[[i18n('publication.unpublish.confirm')]]"
        dialog-dismiss="[[i18n('label.no')]]"
        dialog-confirm="[[i18n('label.yes')]]"
        on-confirm="_unpublish"
        class="secondary"
      >
        <span class="label">[[i18n('publication.unpublish')]]</span>
      </nuxeo-confirm-button>
    </template>
  `,

  is: 'nuxeo-unpublish-button',
  behaviors: [I18nBehavior, RoutingBehavior, FiltersBehavior],

  properties: {
    document: Object,
  },

  _isAvailable() {
    return this.document && this.document.isProxy && this.hasPermission(this.document, 'WriteVersion');
  },

  _unpublish() {
    this.$.unpublishOp
      .execute()
      .then(() => {
        this.fire('notify', { message: this.i18n('publication.unpublish.success') });
        this.fire('nx-unpublish-success');
      })
      .catch(() => {
        this.fire('notify', { message: this.i18n('publication.unpublish.error') });
      });
  },
});

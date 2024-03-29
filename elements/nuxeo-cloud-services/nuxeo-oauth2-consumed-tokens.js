/**
 * ©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-form/iron-form.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-suggestion.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { TokenBehavior } from './nuxeo-tokens-behavior.js';

const OAUTH2_PROVIDER_TOKENS_PATH = 'oauth2/token/provider/';

/**
 * `nuxeo-oauth2-consumed-tokens` allows declaring a Nuxeo consumed tokens.
 *     <nuxeo-oauth2-consumed-tokens id="consumedTokens">
 *     </nuxeo-oauth2-consumed-tokens>
 *
 * @memberof Nuxeo
 */
class OAuth2ConsumedTokens extends mixinBehaviors([TokenBehavior, FormatBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-styles">
        nuxeo-data-table {
          height: var(--nuxeo-oauth2-consumed-tokens-table-height, calc(80vh - 172px));
        }
      </style>

      <nuxeo-data-table
        name="table"
        icon="nuxeo:view-list"
        empty-label="[[i18n('cloudTokens.emptyResult')]]"
        items="[[tokens]]"
      >
        <nuxeo-data-table-column name="[[i18n('cloudTokens.serviceName')]]" field="serviceName">
          <template>
            <span>[[item.serviceName]]</span>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n('cloudTokens.nuxeoLogin')]]" field="nuxeoLogin">
          <template>
            <span>[[item.nuxeoLogin]]</span>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n('cloudTokens.serviceLogin')]]" field="serviceLogin">
          <template>
            <span>[[item.serviceLogin]]</span>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n('cloudTokens.creationDate')]]" field="creationDate">
          <template>
            <nuxeo-date datetime="[[item.creationDate]]"></nuxeo-date>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n('cloudTokens.isShared')]]" field="isShared">
          <template>
            <paper-checkbox noink checked="[[item.isShared]]" disabled></paper-checkbox>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n(col.name)]]" key="[[col.key]]">
          <template>
            <paper-icon-button
              name="edit"
              icon="nuxeo:edit"
              on-tap="_editEntry"
              title="[[i18n('cloudTokens.edit')]]"
            ></paper-icon-button>
            <paper-icon-button
              name="delete"
              icon="nuxeo:delete"
              on-tap="_deleteEntry"
              title="[[i18n('cloudTokens.delete')]]"
            ></paper-icon-button>
          </template>
        </nuxeo-data-table-column>
      </nuxeo-data-table>

      <nuxeo-dialog id="dialog" with-backdrop>
        <h2>[[i18n('cloudTokens.popup.editEntry')]]</h2>
        <iron-form id="form">
          <form>
            <nuxeo-input
              disabled
              label="[[i18n('cloudTokenEdit.serviceName')]]"
              name="serviceName"
              value="{{_selectedEntry.serviceName}}"
            >
            </nuxeo-input>

            <nuxeo-input
              disabled
              label="[[i18n('cloudTokenEdit.nuxeoLogin')]]"
              name="description"
              value="{{_selectedEntry.nuxeoLogin}}"
            >
            </nuxeo-input>

            <nuxeo-input
              required
              label="[[i18n('cloudTokenEdit.serviceLogin')]]"
              name="clientId"
              value="{{_selectedEntry.serviceLogin}}"
            >
            </nuxeo-input>

            <nuxeo-date-picker
              name="creationDate"
              required
              label="[[i18n('cloudTokenEdit.creationDate')]]"
              value="{{_selectedEntry.creationDate}}"
            >
            </nuxeo-date-picker>

            <paper-checkbox noink checked="{{_selectedEntry.isShared}}">
              [[i18n('cloudTokenEdit.isShared')]]
            </paper-checkbox>

            <nuxeo-user-suggestion
              label="[[i18n('cloudTokenEdit.shareWith')]]"
              value="{{_selectedEntry.sharedWith}}"
              prefixed
              multiple
            >
            </nuxeo-user-suggestion>
          </form>
        </iron-form>
        <div class="buttons">
          <paper-button id="cancel" name="cancel" noink class="secondary" dialog-dismiss>
            [[i18n('command.cancel')]]
          </paper-button>
          <paper-button id="save" name="save" noink class="primary" on-tap="_save">
            [[i18n('command.save')]]
          </paper-button>
        </div>
      </nuxeo-dialog>
    `;
  }

  static get is() {
    return 'nuxeo-oauth2-consumed-tokens';
  }

  getDefaultPath() {
    return 'oauth2/token/AS_CLIENT';
  }

  getUpdatePath() {
    return OAUTH2_PROVIDER_TOKENS_PATH + this._selectedEntry.serviceName;
  }

  getDeletePath(item) {
    return OAUTH2_PROVIDER_TOKENS_PATH + item.serviceName;
  }
}

customElements.define(OAuth2ConsumedTokens.is, OAuth2ConsumedTokens);
Nuxeo.OAuth2ConsumedTokens = OAuth2ConsumedTokens;

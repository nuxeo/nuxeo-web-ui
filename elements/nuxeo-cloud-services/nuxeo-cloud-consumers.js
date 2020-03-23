/**
 * (C) Copyright 2019 Nuxeo (http://nuxeo.com/) and others.
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
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

const OAUTH2_CONSUMERS_TYPE = 'oauth2Client';
const OAUTH2_CONSUMERS_BASE_PATH = '/oauth2/client/';

/**
 * `nuxeo-cloud-consumers` allows declaring a Nuxeo cloud consumers.
 *     <nuxeo-cloud-consumers id="consumers" name="consumers">
 *     </nuxeo-cloud-consumers>
 *
 * @memberof Nuxeo
 */
class CloudConsumers extends mixinBehaviors([FormatBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-styles iron-flex iron-flex-alignment">
        nuxeo-data-table {
          height: calc(100vh - 210px);
        }
      </style>

      <nuxeo-card heading="[[i18n('cloudConsumers.OAuth2Consumers')]]">
        <nuxeo-resource id="oauth" response="{{consumers}}"></nuxeo-resource>
        <div class="layout horizontal center end-justified">
          <paper-button id="addClient" class="primary" on-tap="_addEntry">
            <span>[[i18n('cloudConsumers.add')]]</span>
          </paper-button>
        </div>

        <nuxeo-data-table
          id="table"
          name="table"
          icon="nuxeo:view-list"
          empty-label="[[i18n('cloudConsumers.emptyResult')]]"
          items="[[oauth2Consumers]]"
        >
          <nuxeo-data-table-column name="[[i18n('cloudConsumers.name')]]" field="name">
            <template>
              <span name="name">[[item.name]]</span>
            </template>
          </nuxeo-data-table-column>

          <nuxeo-data-table-column name="[[i18n('cloudConsumers.consumerId')]]" field="id">
            <template>
              <span name="id">[[item.id]]</span>
            </template>
          </nuxeo-data-table-column>

          <nuxeo-data-table-column name="[[i18n('cloudConsumers.secret')]]" field="secret">
            <template>
              <span name="secret">[[item.secret]]</span>
            </template>
          </nuxeo-data-table-column>

          <nuxeo-data-table-column name="[[i18n('cloudConsumers.redirect')]]" field="redirectURIs">
            <template>
              <span name="redirectURIs">[[item.redirectURIs]]</span>
            </template>
          </nuxeo-data-table-column>

          <nuxeo-data-table-column name="[[i18n('cloudConsumers.autoGrant')]]" field="isAutoGrant">
            <template>
              <paper-checkbox noink checked="[[item.isAutoGrant]]" disabled></paper-checkbox>
            </template>
          </nuxeo-data-table-column>

          <nuxeo-data-table-column name="[[i18n('cloudConsumers.isEnabled')]]" field="isEnabled">
            <template>
              <paper-checkbox noink checked="[[item.isEnabled]]" disabled></paper-checkbox>
            </template>
          </nuxeo-data-table-column>

          <nuxeo-data-table-column name="[[i18n(col.name)]]" key="[[col.key]]">
            <template>
              <paper-icon-button
                name="edit"
                icon="nuxeo:edit"
                on-tap="_editEntry"
                title="[[i18n('cloudConsumers.edit.tooltip')]]"
              ></paper-icon-button>
              <paper-icon-button
                name="delete"
                icon="nuxeo:delete"
                on-tap="_deleteEntry"
                title="[[i18n('cloudConsumers.delete.tooltip')]]"
              ></paper-icon-button>
            </template>
          </nuxeo-data-table-column>
        </nuxeo-data-table>
      </nuxeo-card>

      <nuxeo-dialog id="dialog" with-backdrop no-auto-focus>
        <h2>[[i18n('cloudConsumersEdit.popup.editEntry')]]</h2>
        <iron-form id="form">
          <form>
            <nuxeo-input
              required
              label="[[i18n('cloudConsumersEdit.name')]]"
              name="name"
              value="{{_selectedEntry.name}}"
            >
            </nuxeo-input>

            <nuxeo-input
              required
              label="[[i18n('cloudConsumersEdit.consumerId')]]"
              name="id"
              value="{{_selectedEntry.id}}"
            >
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudConsumersEdit.secret')]]" name="secret" value="{{_selectedEntry.secret}}">
            </nuxeo-input>

            <nuxeo-input
              required
              label="[[i18n('cloudConsumersEdit.redirect')]]"
              name="redirectURIs"
              value="{{_selectedEntry.redirectURIs}}"
            >
            </nuxeo-input>

            <paper-checkbox noink id="isAutoGrant" name="isAutoGrant" checked="{{_selectedEntry.isAutoGrant}}">
              [[i18n('cloudConsumersEdit.autoGrant')]]
            </paper-checkbox>

            <paper-checkbox noink id="isEnabled" name="isEnabled" checked="{{_selectedEntry.isEnabled}}">
              [[i18n('cloudConsumersEdit.isEnabled')]]
            </paper-checkbox>
          </form>
        </iron-form>
        <div class="buttons">
          <paper-button id="cancel" noink dialog-dismiss>[[i18n('command.cancel')]]</paper-button>
          <paper-button id="save" noink class="primary" on-tap="_save">[[i18n('command.save')]]</paper-button>
        </div>
      </nuxeo-dialog>
    `;
  }

  static get is() {
    return 'nuxeo-cloud-consumers';
  }

  static get properties() {
    return {
      _selectedEntry: {
        type: Object,
        readOnly: true,
      },

      _selectedClientId: {
        type: String,
        readOnly: true,
      },

      oauth2Consumers: {
        type: Array,
        value: [],
      },
    };
  }

  refresh() {
    this.$.oauth.path = OAUTH2_CONSUMERS_BASE_PATH;
    this.$.oauth.get().then((response) => {
      this.oauth2Consumers = response.entries;
      this.async(this.$.table.$.list.notifyResize.bind(this.$.table.$.list), 1000);
    });
  }

  _editEntry(e) {
    const entry = JSON.parse(JSON.stringify(e.target.parentNode.item));
    if (Array.isArray(entry.redirectURIs)) {
      entry.redirectURIs = entry.redirectURIs.join();
    }
    this._set_selectedEntry(entry);
    this._set_selectedClientId(entry.id);
    this.$.dialog.toggle();
  }

  _addEntry() {
    const entry = {
      'entity-type': OAUTH2_CONSUMERS_TYPE,
      redirectURIs: '',
    };
    this._set_selectedEntry(entry);
    this._set_selectedClientId(null);
    this.$.dialog.toggle();
  }

  _save() {
    const valid = this.$.form.validate();
    if (valid) {
      this._selectedEntry.redirectURIs = this._selectedEntry.redirectURIs
        ? this._selectedEntry.redirectURIs.split(',')
        : [];
      this.$.oauth.data = this._selectedEntry;

      if (!this._selectedClientId) {
        this._create(this._selectedEntry);
      } else {
        this._update(this._selectedClientId, this._selectedEntry);
      }
    }
  }

  _create(entry) {
    this.$.oauth.path = OAUTH2_CONSUMERS_BASE_PATH;
    this.$.oauth.data = entry;
    this.$.oauth.post().then(
      () => {
        this.refresh();
        this.$.dialog.toggle();
        this.fire('notify', { message: this.i18n('cloudConsumers.successfullyCreated') });
      },
      (err) => {
        this.fire('notify', {
          message: `${this.i18n('label.error').toUpperCase()}: ${
            err.message && err.message.length > 0 ? err.message : this.i18n('cloudConsumers.errorCreating')
          }`,
        });
      },
    );
  }

  _update(clientId, entry) {
    this.$.oauth.path = OAUTH2_CONSUMERS_BASE_PATH + clientId;
    this.$.oauth.data = entry;
    this.$.oauth.put().then(
      () => {
        this.$.dialog.toggle();
        this.fire('notify', { message: this.i18n('cloudConsumers.successfullyEdited') });
        this.refresh();
      },
      (err) => {
        this.fire('notify', {
          message: `${this.i18n('label.error').toUpperCase()}: ${
            err.message && err.message.length > 0 ? err.message : this.i18n('cloudConsumers.errorEditing')
          }`,
        });
      },
    );
  }

  _deleteEntry(e) {
    if (window.confirm(this.i18n('cloudConsumers.confirmDelete'))) {
      const { item } = e.target.parentNode;
      this.$.oauth.path = OAUTH2_CONSUMERS_BASE_PATH + item.id;
      this.$.oauth.remove().then(
        () => {
          this.refresh();
          this.fire('notify', { message: this.i18n('cloudConsumers.successfullyDeleted') });
        },
        () => {
          this.fire('notify', {
            message: `${this.i18n('label.error').toUpperCase()}: ${this.i18n('cloudConsumers.errorDeleting')}`,
          });
        },
      );
    }
  }
}

customElements.define(CloudConsumers.is, CloudConsumers);
Nuxeo.CloudConsumers = CloudConsumers;

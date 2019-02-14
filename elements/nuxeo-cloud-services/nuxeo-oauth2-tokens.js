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
`nuxeo-oauth2-tokens`
@group Nuxeo UI
@element nuxeo-oauth2-tokens
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-form/iron-form.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-suggestion.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var OAUTH2_PROVIDER_TOKENS_PATH = 'oauth2/token/provider/';
var OAUTH2_CLIENT_TOKENS_PATH = 'oauth2/token/client/';

Polymer({
  _template: html`
    <style include="nuxeo-styles">
      nuxeo-data-table {
        height: var(--nuxeo-oauth2-tokens-table-height, calc(100vh - 172px));
      }
    </style>
    <nuxeo-resource id="tokens"></nuxeo-resource>

    <nuxeo-data-table name="table" icon="nuxeo:view-list" empty-label="[[i18n('cloudTokens.emptyResult')]]" items="[[tokens]]">

      <nuxeo-data-table-column name="[[i18n('cloudTokens.serviceName')]]" field="serviceName" sort-by="serviceName">
        <template>
          <span>[[item.serviceName]]</span>
        </template>
      </nuxeo-data-table-column>

      <nuxeo-data-table-column name="[[i18n('cloudTokens.nuxeoLogin')]]" field="nuxeoLogin" sort-by="nuxeoLogin">
        <template>
          <span>[[item.nuxeoLogin]]</span>
        </template>
      </nuxeo-data-table-column>

      <nuxeo-data-table-column name="[[i18n('cloudTokens.serviceLogin')]]" field="serviceLogin" sort-by="serviceLogin">
        <template>
          <span>[[item.serviceLogin]]</span>
        </template>
      </nuxeo-data-table-column>

      <nuxeo-data-table-column name="[[i18n('cloudTokens.creationDate')]]" field="creationDate" sort-by="creationDate">
        <template>
          <nuxeo-date datetime="[[item.creationDate]]"></nuxeo-date>
        </template>
      </nuxeo-data-table-column>

      <nuxeo-data-table-column name="[[i18n('cloudTokens.isShared')]]" field="isShared" sort-by="isShared">
        <template>
          <paper-checkbox noink="" checked="[[item.isShared]]" disabled=""></paper-checkbox>
        </template>
      </nuxeo-data-table-column>

      <nuxeo-data-table-column name="[[i18n(col.name)]]" key="[[col.key]]">
        <template>
          <paper-icon-button name="edit" icon="nuxeo:edit" on-tap="_editEntry" title="[[i18n('cloudTokens.edit')]]"></paper-icon-button>
          <paper-icon-button name="delete" icon="nuxeo:delete" on-tap="_deleteEntry" title="[[i18n('cloudTokens.delete')]]"></paper-icon-button>
        </template>
      </nuxeo-data-table-column>
    </nuxeo-data-table>

    <nuxeo-dialog id="dialog" with-backdrop="" no-auto-focus="">
      <h2>[[i18n('cloudTokens.popup.editEntry')]]</h2>
      <paper-dialog-scrollable>
        <iron-form id="form">
          <form>
            <nuxeo-input disabled="" label="[[i18n('cloudTokenEdit.serviceName')]]" name="serviceName" value="{{_selectedEntry.serviceName}}">
            </nuxeo-input>

            <nuxeo-input disabled="" label="[[i18n('cloudTokenEdit.nuxeoLogin')]]" name="description" value="{{_selectedEntry.nuxeoLogin}}">
            </nuxeo-input>

            <nuxeo-input required="" label="[[i18n('cloudTokenEdit.serviceLogin')]]" name="clientId" value="{{_selectedEntry.serviceLogin}}">
            </nuxeo-input>

            <nuxeo-date-picker name="creationDate" required="" label="[[i18n('cloudTokenEdit.creationDate')]]" value="{{_selectedEntry.creationDate}}">
            </nuxeo-date-picker>

            <paper-checkbox noink="" checked="{{_selectedEntry.isShared}}">
              [[i18n('cloudTokenEdit.isShared')]]
            </paper-checkbox>

            <nuxeo-user-suggestion label="[[i18n('cloudTokenEdit.shareWith')]]" value="{{_selectedEntry.sharedWith}}" prefixed="" multiple="">
            </nuxeo-user-suggestion>
          </form>
        </iron-form>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button id="cancel" name="cancel" noink="" dialog-dismiss="">[[i18n('command.cancel')]]</paper-button>
        <paper-button id="save" name="save" noink="" class="primary" on-tap="_save">[[i18n('command.save')]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-oauth2-tokens',
  behaviors: [FormatBehavior],

  properties: {
    tokens: {
      type: Array,
      value: []
    },

    _selectedEntry: {
      type: Object
    }
  },

  get _isClientToken() {
    !!(this._selectedEntry && this._selectedEntry.clientId);
  },

  _deleteEntry: function(e) {
    if (confirm(this.i18n('cloudTokens.confirmDelete'))) {
      var item = e.target.parentNode.item;

      this.$.tokens.path = (item.clientId ? OAUTH2_CLIENT_TOKENS_PATH + '/' + item.clientId :
                                            OAUTH2_PROVIDER_TOKENS_PATH + item.serviceName) + '/' +
                                            'user/' + item.nuxeoLogin;
      this.$.tokens.remove().then(function() {
        this.fire('oauth2-token-deleted');
        this.fire('notify', {message: this.i18n('cloudTokens.successfullyDeleted')});
      }.bind(this), function() {
        this.fire('notify', {message: this.i18n('label.error').toUpperCase() + ': ' +
          this.i18n('cloudTokens.errorDeleting')
        });
      }.bind(this));
    }
  },

  _editEntry: function(e) {
    this._selectedEntry = JSON.parse(JSON.stringify(e.target.parentNode.item));
    this.$.dialog.toggle();
  },

  _save: function() {
    var valid = this.$.form.validate();
    if (valid) {
      this._selectedEntry.creationDate = this.formatDate(this._selectedEntry.creationDate, 'YYYY-MM-DD HH:MM:SS');
      this.$.tokens.data = this._selectedEntry;
      this.$.tokens.path = (this._isClientToken ? OAUTH2_CLIENT_TOKENS_PATH + '/' + this._selectedEntry.clientId :
                            OAUTH2_PROVIDER_TOKENS_PATH + this._selectedEntry.serviceName) + '/' +
                            'user/' + this._selectedEntry.nuxeoLogin;
      this.$.tokens.put().then(function() {
        this.$.dialog.toggle();
        this.fire('oauth2-token-saved');
        this.fire('notify', {message: this.i18n('cloudTokens.successfullyEdited')});
      }.bind(this), function(err) {
        this.fire('notify', {
          message: this.i18n('label.error').toUpperCase() + ': ' +
          (err.message && err.message.length > 0 ? err.message :
            this.i18n('cloudTokens.errorEditing'))
        });
      }.bind(this));
    }
  }
});

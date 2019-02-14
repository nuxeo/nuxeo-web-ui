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
`nuxeo-cloud-providers`
@group Nuxeo UI
@element nuxeo-cloud-providers
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
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
var OAUTH2_PROVIDERS_BASE_PATH = 'oauth2/provider/';

Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex iron-flex-alignment">
      nuxeo-data-table {
        height: calc(100vh - 210px);
      }
    </style>

    <nuxeo-resource id="oauth"></nuxeo-resource>

    <nuxeo-card heading="[[i18n('cloudProviders.OAuth2ServiceProviders')]]">
      <div class="layout horizontal center end-justified">
        <paper-button id="addEntry" class="primary" on-tap="_addEntry">
          <span>[[i18n('cloudProviders.add')]]</span>
        </paper-button>
      </div>

      <nuxeo-data-table id="table" name="table" icon="nuxeo:view-list" empty-label="[[i18n('cloudProviders.emptyResult')]]" items="[[oauth2Providers]]">

        <nuxeo-data-table-column name="[[i18n('cloudProviders.serviceName')]]" field="serviceName" sort-by="serviceName">
          <template>
            <span name="serviceName">[[item.serviceName]]</span>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n('cloudProviders.description')]]" field="description" sort-by="description">
          <template>
            <span>[[item.description]]</span>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n('cloudProviders.enabled')]]" field="isEnabled" sort-by="isEnabled">
          <template>
            <paper-checkbox noink="" checked="[[item.isEnabled]]" disabled=""></paper-checkbox>
          </template>
        </nuxeo-data-table-column>

        <nuxeo-data-table-column name="[[i18n(col.name)]]" key="[[col.key]]">
          <template>
            <paper-icon-button name="edit" icon="nuxeo:edit" on-tap="_editEntry" title="[[i18n('cloudProviders.edit')]]"></paper-icon-button>
            <paper-icon-button name="delete" icon="nuxeo:delete" on-tap="_deleteEntry" title="[[i18n('cloudProviders.delete')]]"></paper-icon-button>
          </template>
        </nuxeo-data-table-column>
      </nuxeo-data-table>
    </nuxeo-card>

    <nuxeo-dialog id="dialog" with-backdrop="" no-auto-focus="">
      <h2>[[i18n('cloudProviders.popup.editEntry')]]</h2>
      <paper-dialog-scrollable>
        <iron-form id="form">
          <form>
            <nuxeo-input required="" label="[[i18n('cloudProviderEdit.serviceName')]]" name="serviceName" value="{{_selectedEntry.serviceName}}">
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudProviderEdit.description')]]" name="description" value="{{_selectedEntry.description}}">
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudProviderEdit.clientId')]]" name="clientId" value="{{_selectedEntry.clientId}}">
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudProviderEdit.clientSecret')]]" name="clientSecret" value="{{_selectedEntry.clientSecret}}">
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudProviderEdit.authorizationServerURL')]]" name="authorizationServerURL" pattern="(http[s]?:\\/\\/).*" value="{{_selectedEntry.authorizationServerURL}}">
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudProviderEdit.tokenServerURL')]]" name="tokenServerURL" pattern="(http[s]?:\\/\\/).*" value="{{_selectedEntry.tokenServerURL}}">
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudProviderEdit.userAuthorizationURL')]]" name="userAuthorizationURL" pattern="(http[s]?:\\/\\/).*" value="{{_selectedEntry.userAuthorizationURL}}">
            </nuxeo-input>

            <nuxeo-input label="[[i18n('cloudProviderEdit.scopes')]]" name="scopes" value="{{_selectedEntry.scopes}}">
            </nuxeo-input>

            <paper-checkbox noink="" id="isEnabled" checked="{{_selectedEntry.isEnabled}}">
              [[i18n('cloudProviderEdit.isEnabled')]]
            </paper-checkbox>
          </form>
        </iron-form>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button id="cancel" name="cancel" noink="" dialog-dismiss="">[[i18n('command.cancel')]]</paper-button>
        <paper-button id="save" name="save" noink="" class="primary" on-tap="_save">[[i18n('command.save')]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-cloud-providers',
  behaviors: [FormatBehavior],

  properties: {
    _selectedEntry: {
      type: Object
    },

    oauth2Providers: {
      type: Array,
      value: []
    },

    _isNew: {
      type: Boolean
    },

    _selectedServiceName: {
      type: String
    }
  },

  refresh: function() {
    this.$.oauth.path = OAUTH2_PROVIDERS_BASE_PATH;
    this.$.oauth.get().then(function(response) {
      this.oauth2Providers = response.entries;
      // ELEMENTS-322 - fix this on nuxeo-data-table
      this.async(this.$.table.$.list.notifyResize.bind(this.$.table.$.list), 1000);
    }.bind(this));
  },

  _editEntry: function(e) {
    this._isNew = false;
    this._selectedEntry = JSON.parse(JSON.stringify(e.target.parentNode.item));
    this._selectedServiceName = this._selectedEntry.serviceName;
    if (Array.isArray(this._selectedEntry.scopes)) {
      this._selectedEntry.scopes = this._selectedEntry.scopes.join();
    }
    this.$.dialog.toggle();
  },

  _addEntry: function() {
    this._isNew = true;
    this._selectedEntry = {
      'entity-type': 'nuxeoOAuth2ServiceProvider',
      scopes: '',
      isEnabled: false
    };
    this.$.dialog.toggle();
  },

  _save: function() {
    var valid = this.$.form.validate();
    if (valid){
      this._selectedEntry.scopes = this._selectedEntry.scopes ? this._selectedEntry.scopes.split(',') : [];
      this.$.oauth.data = this._selectedEntry;

      if (this._isNew) {
        this._create(this._selectedEntry);
      } else {
        this._update(this._selectedServiceName, this._selectedEntry);
      }
    }
  },

  _create: function(entry) {
    this.$.oauth.path = OAUTH2_PROVIDERS_BASE_PATH;
    this.$.oauth.data = entry;
    this.$.oauth.post().then(function() {
      this.refresh();
      this.$.dialog.toggle();
      this.fire('notify', {message: this.i18n('cloudProviders.successfullyCreated')});
    }.bind(this), function(err) {
      this.fire('notify', {
        message: this.i18n('label.error').toUpperCase() + ': ' +
        (err.message && err.message.length > 0 ? err.message :
          this.i18n('cloudProviders.errorCreating'))
      });
    }.bind(this));
  },

  _update: function(serviceName, entry) {
    this.$.oauth.path = OAUTH2_PROVIDERS_BASE_PATH + serviceName;
    this.$.oauth.data = entry;
    this.$.oauth.put().then(function() {
      this.$.dialog.toggle();
      this.fire('notify', {message: this.i18n('cloudProviders.successfullyEdited')});
      this.refresh();
    }.bind(this), function(err) {
      this.fire('notify', {
        message: this.i18n('label.error').toUpperCase() + ': ' +
        (err.message && err.message.length > 0 ? err.message :
          this.i18n('cloudProviders.errorEditing'))
      });
    }.bind(this));
  },

  _deleteEntry: function(e) {
    if (confirm(this.i18n('cloudProviders.confirmDelete'))) {
      var item =  e.target.parentNode.item;
      this.$.oauth.path = OAUTH2_PROVIDERS_BASE_PATH + item.serviceName;
      this.$.oauth.remove().then(function() {
        this.refresh();
        this.fire('notify', {message: this.i18n('cloudProviders.successfullyDeleted')});
      }.bind(this), function() {
        this.fire('notify', {
          message: this.i18n('label.error').toUpperCase() + ': ' +
          this.i18n('cloudProviders.errorDeleting')
        });
      }.bind(this));
    }
  }
});

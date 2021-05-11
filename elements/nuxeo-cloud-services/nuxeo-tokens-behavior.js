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
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';

/**
 * `Nuxeo.TokenBehavior` allows the management of oAuth2 token.
 *
 * @polymerBehavior
 */
export const TokenBehavior = [
  NotifyBehavior,
  {
    properties: {
      tokens: {
        type: Array,
        value: [],
      },

      _selectedEntry: {
        type: Object,
        readOnly: true,
      },

      _resource: {
        type: Object,
        readOnly: true,
      },

      path: {
        type: String,
      },
    },

    get resource() {
      if (!this._resource) {
        this._set_resource(document.createElement('nuxeo-resource'));
        this.shadowRoot.appendChild(this._resource);
      }

      return this._resource;
    },

    getDefaultPath() {
      throw new Error('not implemented');
    },

    refresh() {
      const { resource } = this;
      resource.path = this.path ? this.path : this.getDefaultPath();
      resource.get().then((response) => {
        this.tokens = response.entries;
      });
    },

    _editEntry(e) {
      this._set_selectedEntry(JSON.parse(JSON.stringify(e.target.parentNode.item)));
      this.$.dialog.toggle();
    },

    _deleteEntry(e) {
      if (window.confirm(this.i18n('cloudTokens.confirmDelete'))) {
        const { item } = e.target.parentNode;
        this.resource.path = `${this.getDeletePath(item)}/user/${item.nuxeoLogin}`;
        this.resource.remove().then(
          () => {
            this.refresh();
            this.notify({ message: this.i18n('cloudTokens.successfullyDeleted') });
          },
          () => {
            this.notify({
              message: `${this.i18n('label.error').toUpperCase()}: ${this.i18n('cloudTokens.errorDeleting')}`,
            });
          },
        );
      }
    },

    _save() {
      const valid = this.$.form.validate();
      if (valid) {
        this._selectedEntry.creationDate = this.formatDate(this._selectedEntry.creationDate, 'YYYY-MM-DD HH:MM:SS');
        this.resource.data = this._selectedEntry;
        this.resource.path = `${this.getUpdatePath()}/user/${this._selectedEntry.nuxeoLogin}`;
        this.resource.put().then(
          () => {
            this.$.dialog.toggle();
            this.refresh();
            this.notify({ message: this.i18n('cloudTokens.successfullyEdited') });
          },
          (err) => {
            this.notify({
              message: `${this.i18n('label.error').toUpperCase()}: ${
                err.message && err.message.length > 0 ? err.message : this.i18n('cloudTokens.errorEditing')
              }`,
            });
          },
        );
      }
    },
  },
];

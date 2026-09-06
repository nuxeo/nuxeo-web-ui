/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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

import '@polymer/iron-form/iron-form.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-textarea.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '../nuxeo-app/nuxeo-page.js';
import {
  ANNOUNCEMENT_DIRECTORY,
  ANNOUNCEMENT_ENTRY_ID,
  ANNOUNCEMENT_ENTRY_PATH,
  ANNOUNCEMENT_ENTRY_UPDATE_PATH,
  ANNOUNCEMENT_MAX_LENGTH,
  ANNOUNCEMENT_UPDATED_EVENT,
  sanitizeAnnouncementLink,
} from '../nuxeo-app/nuxeo-announcement.js';

/**
`nuxeo-announcement-management`

Administration screen letting an administrator turn the announcement banner on or off, edit its
message and attach an optional link. The value is shared by every user of the instance.

@group Nuxeo UI
@element nuxeo-announcement-management
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      .field {
        margin-bottom: 1rem;
        max-width: 40rem;
      }

      .hint {
        color: var(--nuxeo-text-default, #3a3a54);
        font-size: 0.8rem;
        opacity: 0.7;
      }

      .counter {
        margin: -0.75rem 0 1rem;
        max-width: 40rem;
        text-align: right;
      }

      .buttons {
        display: flex;
        justify-content: flex-end;
      }
    </style>

    <nuxeo-resource id="announcement"></nuxeo-resource>

    <nuxeo-page>
      <div slot="header">
        <span class="flex">[[i18n('announcementManagement.heading')]]</span>
      </div>

      <nuxeo-card heading="[[i18n('announcementManagement.banner')]]">
        <iron-form id="form">
          <form>
            <div class="field">
              <paper-toggle-button id="enabled" checked="{{_entry.enabled}}" disabled$="[[_loading]]"
                >[[i18n('announcementManagement.enabled')]]</paper-toggle-button
              >
              <div class="hint">[[i18n('announcementManagement.enabled.description')]]</div>
            </div>

            <nuxeo-textarea
              class="field"
              id="message"
              name="message"
              rows="3"
              label="[[i18n('announcementManagement.message')]]"
              value="{{_entry.message}}"
              required$="[[_entry.enabled]]"
              disabled$="[[_loading]]"
              invalid="[[_messageInvalid]]"
              error-message="[[_messageError]]"
            ></nuxeo-textarea>
            <!--
              nuxeo-textarea has no maxlength support, unlike the link fields below, so the limit is
              applied in _messageChanged and surfaced by this counter instead.
            -->
            <div class="hint counter">
              [[i18n('announcementManagement.message.counter', _messageLength, _maxLength)]]
            </div>

            <nuxeo-input
              class="field"
              id="linkUrl"
              name="linkUrl"
              type="url"
              label="[[i18n('announcementManagement.linkUrl')]]"
              placeholder="[[i18n('announcementManagement.linkUrl.placeholder')]]"
              maxlength="[[_maxLength]]"
              pattern="https?://.+"
              disabled$="[[_loading]]"
              error-message="[[i18n('announcementManagement.linkUrl.invalid')]]"
              value="{{_entry.linkUrl}}"
            ></nuxeo-input>

            <nuxeo-input
              class="field"
              id="linkLabel"
              name="linkLabel"
              label="[[i18n('announcementManagement.linkLabel')]]"
              placeholder="[[i18n('announcementBanner.moreDetails')]]"
              maxlength="[[_maxLength]]"
              disabled$="[[_loading]]"
              value="{{_entry.linkLabel}}"
            ></nuxeo-input>
          </form>
        </iron-form>

        <div class="buttons">
          <paper-button id="save" name="save" noink class="primary" disabled$="[[_loading]]" on-tap="_save"
            >[[i18n('command.save')]]</paper-button
          >
        </div>
      </nuxeo-card>
    </nuxeo-page>
  `,

  is: 'nuxeo-announcement-management',
  behaviors: [I18nBehavior, NotifyBehavior],

  properties: {
    visible: {
      type: Boolean,
      value: false,
      observer: '_visibleChanged',
    },

    _entry: {
      type: Object,
      value: () => {
        return { enabled: false, message: '', linkUrl: '', linkLabel: '' };
      },
    },

    /** Whether the announcement already exists server side, which decides between POST and PUT. */
    _exists: {
      type: Boolean,
      value: false,
    },

    /**
     * True while the announcement is being loaded. The form is disabled until then: `_exists` is
     * not known yet, and a slow response would otherwise land on top of what the administrator has
     * already typed.
     */
    _loading: {
      type: Boolean,
      value: false,
    },

    _maxLength: {
      type: Number,
      readOnly: true,
      value: ANNOUNCEMENT_MAX_LENGTH,
    },

    _messageLength: {
      type: Number,
      value: 0,
    },

    _messageInvalid: {
      type: Boolean,
      value: false,
    },

    _messageError: {
      type: String,
      value: '',
    },
  },

  observers: ['_messageChanged(_entry.message)'],

  _messageChanged(message) {
    if (typeof message === 'string' && message.length > ANNOUNCEMENT_MAX_LENGTH) {
      // `nuxeo-textarea` cannot carry a `maxlength`, so mirror here what the attribute does natively
      // on the link fields: the field never holds more than the directory column can store, which
      // also means turning the banner off is never blocked by a message that is too long.
      this.set('_entry.message', message.slice(0, ANNOUNCEMENT_MAX_LENGTH));
      return;
    }
    this._messageLength = (message || '').length;
    if (this._messageInvalid) {
      this._clearMessageError();
    }
  },

  _visibleChanged(visible) {
    if (visible) {
      this.refresh();
    }
  },

  /**
   * Loads the current announcement.
   * @return {Promise} resolved once the form reflects the server state.
   */
  refresh() {
    this.$.announcement.path = ANNOUNCEMENT_ENTRY_PATH;
    this.$.announcement.data = null;
    this._loading = true;
    return this.$.announcement.get().then(
      (response) => {
        // Only the entry with the reserved id is the announcement; any other row of the directory
        // is unrelated and must not be loaded into this form.
        const entry = (response?.entries || []).find((e) => e?.id === ANNOUNCEMENT_ENTRY_ID);
        this._exists = !!entry;
        this._entry = {
          enabled: !!entry?.properties?.enabled,
          message: entry?.properties?.message || '',
          linkUrl: entry?.properties?.linkUrl || '',
          linkLabel: entry?.properties?.linkLabel || '',
        };
        this._clearMessageError();
        this._loading = false;
      },
      (err) => {
        this._exists = false;
        this._loading = false;
        this.notify({
          message: `${this.i18n('label.error').toUpperCase()}: ${
            err?.message || this.i18n('announcementManagement.errorLoading')
          }`,
        });
      },
    );
  },

  _save() {
    if (this._loading || !this._validate()) {
      return Promise.resolve();
    }
    const properties = {
      id: ANNOUNCEMENT_ENTRY_ID,
      enabled: !!this._entry.enabled,
      message: (this._entry.message || '').trim(),
      linkUrl: (this._entry.linkUrl || '').trim(),
      linkLabel: (this._entry.linkLabel || '').trim(),
    };
    this.$.announcement.data = {
      'entity-type': 'directoryEntry',
      directoryName: ANNOUNCEMENT_DIRECTORY,
      id: ANNOUNCEMENT_ENTRY_ID,
      properties,
    };
    if (this._exists) {
      this.$.announcement.path = ANNOUNCEMENT_ENTRY_UPDATE_PATH;
      return this._persist(this.$.announcement.put());
    }
    this.$.announcement.path = ANNOUNCEMENT_ENTRY_PATH;
    return this._persist(this.$.announcement.post());
  },

  _persist(request) {
    return request.then(
      () => {
        this._exists = true;
        this.notify({ message: this.i18n('announcementManagement.saved') });
        // Let the banner of the current session pick the new value up without a reload.
        document.dispatchEvent(new CustomEvent(ANNOUNCEMENT_UPDATED_EVENT));
      },
      (err) => {
        this.notify({
          message: `${this.i18n('label.error').toUpperCase()}: ${
            err?.message || this.i18n('announcementManagement.errorSaving')
          }`,
        });
      },
    );
  },

  _validate() {
    const message = (this._entry.message || '').trim();
    if (this._entry.enabled && !message) {
      return this._failMessageValidation(this.i18n('announcementManagement.message.required'));
    }
    if (message.length > ANNOUNCEMENT_MAX_LENGTH) {
      return this._failMessageValidation(this.i18n('announcementManagement.message.tooLong', ANNOUNCEMENT_MAX_LENGTH));
    }
    this._clearMessageError();
    // The link fields are plain inputs, so let iron-form run their own validators.
    if (!this.$.form.validate()) {
      return false;
    }
    const linkUrl = (this._entry.linkUrl || '').trim();
    if (linkUrl && !sanitizeAnnouncementLink(linkUrl)) {
      this.notify({ message: this.i18n('announcementManagement.linkUrl.invalid') });
      return false;
    }
    return true;
  },

  _failMessageValidation(error) {
    this._messageError = error;
    this._messageInvalid = true;
    return false;
  },

  _clearMessageError() {
    this._messageInvalid = false;
    this._messageError = '';
  },
});

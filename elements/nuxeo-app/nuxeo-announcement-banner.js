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

import '@polymer/iron-icon/iron-icon.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import {
  ANNOUNCEMENT_ENTRY_ID,
  ANNOUNCEMENT_ENTRY_PATH,
  ANNOUNCEMENT_UPDATED_EVENT,
  sanitizeAnnouncementLink,
} from './nuxeo-announcement.js';

/**
`nuxeo-announcement-banner`

Renders the administrator-managed announcement banner at the very top of the
application, above every other piece of chrome. The announcement is stored
server side (see `nuxeo-announcement-management`) and is readable by every
authenticated user, so all users see the same message.

While the banner is displayed it publishes its own height as `--nuxeo-app-top`
on the document root, which is the variable the drawer, the page toolbars and
the result views already use to reserve vertical space. That way the banner
pushes the application down instead of covering it.

@group Nuxeo UI
@element nuxeo-announcement-banner
*/
Polymer({
  _template: html`
    <style>
      /*
       * The banner is laid out in the normal flow, as the first thing inside <header role="banner">,
       * so it pushes the whole application down instead of covering the top of the page. The fixed
       * chrome (drawer, logo, menu, toolbars) is viewport positioned and cannot be pushed that way,
       * so the height is also published as --nuxeo-app-top, which that chrome already honours.
       * The z-index stays below the skip link so the skip link remains visible when focused.
       */
      :host {
        display: none;
        position: relative;
        z-index: 999;
        background: var(--nuxeo-announcement-banner-background, #fee066);
        color: var(--nuxeo-announcement-banner-text, #3a3a54);
        box-shadow: var(--nuxeo-app-header-box-shadow);
        font-size: 0.9rem;
      }

      :host([_opened]) {
        display: block;
      }

      .content {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        min-height: 2.5rem;
        padding: 0.5rem 1rem;
        text-align: center;
      }

      iron-icon {
        flex: none;
        --iron-icon-height: 1.25rem;
        --iron-icon-width: 1.25rem;
      }

      .message {
        overflow-wrap: anywhere;
      }

      a {
        color: inherit;
        font-weight: 700;
        text-decoration: underline;
      }
    </style>

    <nuxeo-resource id="announcement" path="[[_path]]"></nuxeo-resource>

    <div class="content" role="status" aria-live="polite">
      <iron-icon icon="icons:info-outline" aria-hidden="true"></iron-icon>
      <span class="message">[[_message]]</span>
      <template is="dom-if" if="[[_linkUrl]]">
        <a href$="[[_linkUrl]]" target="_blank" rel="noopener noreferrer">[[_linkLabel]]</a>
      </template>
    </div>
  `,

  is: 'nuxeo-announcement-banner',
  behaviors: [I18nBehavior],

  properties: {
    /**
     * The connected user. Used only to defer the lookup until there is an
     * authenticated session, and to refresh it when the user changes.
     */
    user: {
      type: Object,
      observer: '_userChanged',
    },

    _path: {
      type: String,
      readOnly: true,
      value: ANNOUNCEMENT_ENTRY_PATH,
    },

    _opened: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
      observer: '_openedChanged',
    },

    _message: {
      type: String,
      value: '',
    },

    _linkUrl: {
      type: String,
      value: '',
    },

    _linkLabel: {
      type: String,
      value: '',
    },
  },

  attached() {
    this._boundRefresh = () => this.refresh();
    document.addEventListener(ANNOUNCEMENT_UPDATED_EVENT, this._boundRefresh);
  },

  detached() {
    if (this._boundRefresh) {
      document.removeEventListener(ANNOUNCEMENT_UPDATED_EVENT, this._boundRefresh);
      this._boundRefresh = null;
    }
    this._disconnectResizeObserver();
    this._opened = false;
  },

  /**
   * Reloads the announcement from the server and updates the banner.
   * @return {Promise} resolved once the banner reflects the server state.
   */
  refresh() {
    if (!this.user) {
      return Promise.resolve();
    }
    return this.$.announcement.get().then(
      (response) => this._update(response),
      // A server without the announcement directory (or an unreachable one) simply has no
      // announcement to show: stay hidden rather than failing the whole application shell.
      () => this._update(null),
    );
  },

  _userChanged(user) {
    if (user) {
      this.refresh();
    } else {
      this._update(null);
    }
  },

  _update(response) {
    const entry = this._entryOf(response);
    const message = entry && typeof entry.message === 'string' ? entry.message.trim() : '';
    const enabled = !!(entry && entry.enabled);
    if (!enabled || !message) {
      this._message = '';
      this._linkUrl = '';
      this._linkLabel = '';
      this._opened = false;
      return;
    }
    const linkUrl = sanitizeAnnouncementLink(entry.linkUrl);
    const linkLabel = typeof entry.linkLabel === 'string' ? entry.linkLabel.trim() : '';
    this._message = message;
    this._linkUrl = linkUrl;
    this._linkLabel = linkUrl ? linkLabel || this.i18n('announcementBanner.moreDetails') : '';
    this._opened = true;
  },

  _entryOf(response) {
    const entries = (response && response.entries) || [];
    const entry = entries.find((e) => e && e.id === ANNOUNCEMENT_ENTRY_ID) || entries[0];
    return entry ? entry.properties : null;
  },

  _openedChanged(opened) {
    if (opened) {
      this._observeHeight();
    } else {
      this._disconnectResizeObserver();
      this._setAppTop(null);
    }
  },

  _observeHeight() {
    this._setAppTop(this.offsetHeight);
    if (this._resizeObserver || typeof ResizeObserver === 'undefined') {
      return;
    }
    // The message wraps on narrow viewports, so the space to reserve is only known once rendered.
    this._resizeObserver = new ResizeObserver(() => {
      if (this._opened) {
        this._setAppTop(this.offsetHeight);
      }
    });
    this._resizeObserver.observe(this);
  },

  _disconnectResizeObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  },

  _setAppTop(height) {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    if (height) {
      root.style.setProperty('--nuxeo-app-top', `${height}px`);
    } else {
      root.style.removeProperty('--nuxeo-app-top');
    }
  },
});

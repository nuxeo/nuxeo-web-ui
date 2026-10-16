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
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { ANNOUNCEMENT_ENTRY_PATH, ANNOUNCEMENT_UPDATED_EVENT, sanitizeAnnouncementLink } from './nuxeo-announcement.js';

// Dispatched on `document` by `setI18n` once a locale's messages are in place.
const I18N_LOCALE_LOADED_EVENT = 'i18n-locale-loaded';

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
class AnnouncementBanner extends mixinBehaviors([I18nBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style>
        /*
       * The banner is laid out in the normal flow, as the first thing inside <header role="banner">,
       * so it pushes the whole application down instead of covering the top of the page. The fixed
       * chrome (drawer, logo, menu, toolbars) is viewport positioned and cannot be pushed that way,
       * so the height is also published as --nuxeo-app-top, which that chrome already honours.
       *
       * The z-index only has to lift the banner's shadow over the content that follows it in the
       * flow. It deliberately sits below every overlay: unlike nuxeo-offline-banner and
       * nuxeo-expired-session, which claim 1000 because losing the connection or the session has to
       * be seen even over a dialog, an announcement is informational, so a modal dialog keeps the
       * screen. It stays below the fixed chrome too, which never overlaps it because that chrome is
       * anchored at --nuxeo-app-top, and below the skip link so that stays visible when focused.
       */
        :host {
          display: none;
          position: relative;
          z-index: 99;
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
          /* The height is published as --nuxeo-app-top, which the fixed navigation sits below and
             which nuxeo-page subtracts from the viewport. A maximum-length message and label wrap
             into enough lines at 400% zoom to consume the whole viewport, so cap what the banner can
             claim and scroll the rest. */
          max-height: 30vh;
          overflow-y: auto;
        }

        /* The region only takes a tab stop while it scrolls, so this is the focus ring a keyboard
           user sees when stepping onto the overflow. */
        .content:focus-visible {
          outline: 2px solid var(--nuxeo-announcement-banner-text, #3a3a54);
          outline-offset: -2px;
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
          /* A label may be one unbroken 255-character run. Wrapping the flex line only moves the whole
             anchor to the next row, so without this it keeps its content width and overflows. */
          overflow-wrap: anywhere;
        }
      </style>

      <nuxeo-resource id="announcement" path="[[_path]]"></nuxeo-resource>

      <div id="content" class="content" role="status" aria-live="polite" tabindex$="[[_computeTabIndex(_scrollable)]]">
        <iron-icon icon="icons:info-outline" aria-hidden="true"></iron-icon>
        <span class="message">[[_message]]</span>
        <!-- restamp: removing the link must not leave a hidden anchor behind holding the previous href -->
        <template is="dom-if" if="[[_linkUrl]]" restamp>
          <a href$="[[_linkUrl]]" target="_blank" rel="noopener noreferrer">[[_linkLabel]]</a>
        </template>
      </div>
    `;
  }

  static get is() {
    return 'nuxeo-announcement-banner';
  }

  static get properties() {
    return {
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

      /**
       * The administrator's own label, kept apart from the displayed one so that the built-in
       * fallback stays a function of the current locale rather than of the locale that happened to
       * be loaded when the announcement arrived.
       */
      _customLinkLabel: {
        type: String,
        value: '',
      },

      _linkLabel: {
        type: String,
        value: '',
      },

      /**
       * True while the banner's contents are taller than the height it is allowed to occupy, which
       * is the only state in which the region needs its own tab stop.
       */
      _scrollable: {
        type: Boolean,
        value: false,
      },
    };
  }

  constructor() {
    super();
    /**
     * Incremented for every lookup, and whenever a lookup in flight must be abandoned. A response
     * is only applied while it is still the newest one, so overlapping refreshes cannot resolve out
     * of order and a late response cannot reopen the banner after logout.
     */
    this._requestId = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this._attachedToDom = true;
    this._boundRefresh = () => this.refresh();
    document.addEventListener(ANNOUNCEMENT_UPDATED_EVENT, this._boundRefresh);
    // Locales load asynchronously, so an announcement can be applied while the fallback label still
    // resolves to its key. Recompute it here rather than through a computed property bound to
    // `i18n`: that only invalidates when the translate function changes identity, which it is not
    // guaranteed to do across locale loads.
    this._boundLocaleLoaded = () => this._updateLinkLabel();
    document.addEventListener(I18N_LOCALE_LOADED_EVENT, this._boundLocaleLoaded);
  }

  disconnectedCallback() {
    this._attachedToDom = false;
    this._requestId += 1;
    if (this._boundRefresh) {
      document.removeEventListener(ANNOUNCEMENT_UPDATED_EVENT, this._boundRefresh);
      this._boundRefresh = null;
    }
    if (this._boundLocaleLoaded) {
      document.removeEventListener(I18N_LOCALE_LOADED_EVENT, this._boundLocaleLoaded);
      this._boundLocaleLoaded = null;
    }
    this._disconnectResizeObserver();
    this._opened = false;
    super.disconnectedCallback();
  }

  /**
   * Reloads the announcement from the server and updates the banner.
   * @return {Promise} resolved once the banner reflects the server state.
   */
  refresh() {
    if (!this.user) {
      return Promise.resolve();
    }
    this._requestId += 1;
    const requestId = this._requestId;
    return this.$.announcement.get().then(
      (response) => this._applyIfCurrent(requestId, response),
      // A server without the announcement directory (or an unreachable one) simply has no
      // announcement to show: stay hidden rather than failing the whole application shell.
      () => this._applyIfCurrent(requestId, null),
    );
  }

  _applyIfCurrent(requestId, response) {
    if (requestId !== this._requestId || !this.user || this._attachedToDom === false) {
      return;
    }
    this._update(response);
  }

  _userChanged(user) {
    if (user) {
      // Deliberately not awaited: a Polymer observer cannot return a promise. `void` marks it
      // ignored without attaching a handler, so rejection behaviour is exactly as it was.
      void this.refresh();
    } else {
      // Abandon anything in flight so it cannot reopen the banner for a user who just left.
      this._requestId += 1;
      this._update(null);
    }
  }

  _update(response) {
    const entry = response?.properties;
    const message = typeof entry?.message === 'string' ? entry.message.trim() : '';
    const enabled = !!entry?.enabled;
    if (!enabled || !message) {
      this._message = '';
      this._linkUrl = '';
      this._customLinkLabel = '';
      this._updateLinkLabel();
      this._opened = false;
      return;
    }
    const linkUrl = sanitizeAnnouncementLink(entry.linkUrl);
    const linkLabel = typeof entry.linkLabel === 'string' ? entry.linkLabel.trim() : '';
    this._message = message;
    this._linkUrl = linkUrl;
    this._customLinkLabel = linkLabel;
    this._updateLinkLabel();
    this._opened = true;
  }

  /**
   * Derives the displayed label from the administrator's own one, falling back to a translated
   * default. Called again whenever a locale finishes loading, because a response can be applied
   * before the translations it needs are available.
   */
  _updateLinkLabel() {
    if (!this._linkUrl) {
      this._linkLabel = '';
      return;
    }
    this._linkLabel = this._customLinkLabel || this.i18n('announcementBanner.moreDetails');
  }

  _openedChanged(opened) {
    if (opened) {
      this._observeHeight();
    } else {
      this._disconnectResizeObserver();
      this._setAppTop(null);
    }
  }

  _observeHeight() {
    this._measure();
    if (this._resizeObserver || typeof ResizeObserver === 'undefined') {
      return;
    }
    // The message wraps on narrow viewports, so the space to reserve is only known once rendered.
    this._resizeObserver = new ResizeObserver(() => {
      if (this._opened) {
        this._measure();
      }
    });
    this._resizeObserver.observe(this);
  }

  _measure() {
    this._setAppTop(this.offsetHeight);
    const content = this.$?.content;
    // Sub-pixel rounding leaves a harmless one-pixel difference on content that in fact fits.
    this._scrollable = !!content && content.scrollHeight - content.clientHeight > 1;
  }

  _computeTabIndex(scrollable) {
    return scrollable ? '0' : null;
  }

  _disconnectResizeObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

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
  }
}

customElements.define(AnnouncementBanner.is, AnnouncementBanner);

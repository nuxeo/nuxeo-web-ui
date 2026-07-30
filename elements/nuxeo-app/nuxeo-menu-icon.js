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

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-badge/paper-badge.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PaperItemBehavior } from '@polymer/paper-item/paper-item-behavior.js';

/**
`nuxeo-menu-icon`
@group Nuxeo UI
@element nuxeo-menu-icon
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
        position: relative;
        outline: none;
      }

      /* Match the button box so the focus ring frames the whole icon, not a thin inline strip. */
      a {
        display: block;
      }

      /* Host or inner <a> can be focused (never both). Inset ring so it isn't clipped by
         overflow:hidden containers. */
      :host(:focus-visible),
      a:focus-visible {
        outline: auto;
        outline-offset: -2px;
      }

      :host(.selected) paper-icon-button {
        background: var(--hyland-sidebar-item-selected-background, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        color: var(--nuxeo-sidebar-menu-icon, var(--nuxeo-sidebar-menu-hover));
      }

      /* Active item selection indicator: a white block pinned to the leading edge,
         vertically centred, with the trailing corners rounded (per Figma). Logical
         properties keep it on the correct side and round the correct corners in RTL. */
      :host(.selected)::before {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 20px;
        background: var(--hyland-sidebar-selection-indicator, var(--nuxeo-sidebar-menu-icon, #fff));
        border-start-end-radius: 16px;
        border-end-end-radius: 16px;
        z-index: 1;
      }

      paper-badge {
        --paper-badge-background: var(--nuxeo-badge-background);
        --paper-badge-margin-left: -24px;
        --paper-badge-margin-bottom: -24px;
        --paper-badge-width: 16px;
        --paper-badge-height: 16px;
      }

      paper-icon-button {
        color: var(--nuxeo-sidebar-menu);
        height: 48px;
        padding: 12px 13px;
        width: var(--nuxeo-sidebar-width);
      }

      paper-icon-button:hover {
        background: var(--hyland-sidebar-item-hover-background, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        color: var(--nuxeo-sidebar-menu-icon, var(--nuxeo-sidebar-menu-hover));
      }

      paper-icon-button svg,
      paper-icon-button g,
      paper-icon-button path {
        tabindex: -1;
      }
    </style>

    <a href$="[[_href(urlFor, route, link)]]">
      <paper-icon-button noink id="button" name$="[[name]]" aria-labelledby="tooltip" tabindex="-1"></paper-icon-button>
      <nuxeo-tooltip
        for="button"
        position="[[_tooltipPosition]]"
        offset="0"
        animation-delay="0"
        id="tooltip"
        tabindex="-1"
        >[[i18n(label)]]</nuxeo-tooltip
      >
      <template is="dom-if" if="[[badge]]">
        <paper-badge label="[[badge]]" for="button"></paper-badge>
      </template>
    </a>
  `,

  is: 'nuxeo-menu-icon',
  behaviors: [I18nBehavior, RoutingBehavior, PaperItemBehavior],

  properties: {
    /**
     * The 18n label key
     */
    label: {
      type: String,
    },

    /**
     * The icon
     */
    icon: {
      type: String,
    },

    src: {
      type: String,
      value: '',
    },

    /**
     * A named route and arguments. Route syntax is <name>:<arg 1>/<arg 2>/.../<arg n>.
     */
    route: {
      type: String,
      value: '',
    },

    /**
     * An explicit link.
     */
    link: {
      type: String,
      value: '',
    },

    /**
     * A badge associated with the icon
     */
    badge: {
      type: String,
    },

    _isRTL: {
      type: Boolean,
      value: false,
    },

    _tooltipPosition: {
      type: String,
      value: 'left',
    },
  },

  observers: ['_srcOrIcon(icon, src)'],

  ready() {
    this._checkRtl();
    this._handleTooltipPosition(this._isRTL);
  },

  _checkRtl() {
    const dir = document.documentElement.getAttribute('dir');
    this._isRTL = dir === 'rtl';
  },

  _handleTooltipPosition(isRTL) {
    if (!isRTL) {
      this._tooltipPosition = 'right';
    } else {
      this._tooltipPosition = 'left';
    }
  },

  _srcOrIcon() {
    if (this.src && this.src.length > 0) {
      this.$.button.icon = '';
      this.$.button.src = this.src;
    } else if (!this.$.button.src || this.$.button.src.length === 0) {
      this.$.button.icon = this.icon;
    }
  },

  _href() {
    if (!this.route) {
      return;
    }
    if (this.link) {
      return this.link;
    }
    if (this.urlFor) {
      const parts = this.route.split(':');
      const name = parts[0];
      const args = (parts[1] && parts[1].split('/')) || [];
      return this.urlFor(...[name].concat(args));
    }
  },
});

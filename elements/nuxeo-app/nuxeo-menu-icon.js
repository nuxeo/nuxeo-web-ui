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
      /*
       * Sidebar rail layout contract (52px × 48px per item):
       * - Host and link use fixed --nuxeo-sidebar-width (never width: 100%).
       * - paper-icon-button matches that box; padding 12px×14px leaves a 24×24px
       *   content area so the button's internal iron-icon (width/height 100%) stays 24px.
       * - Tooltip and hover use #menuItemAnchor (full cell); badge uses #button (icon).
       * - cursor: pointer on host/anchor (drawer items often have no href).
       * - When nuxeo-app is [sidebar-expanded], show icon + label; the label is
       *   decorative (the anchor's aria-label is the accessible name).
       */
      :host {
        display: block;
        position: relative;
        outline: none;
        flex-shrink: 0;
        width: var(--nuxeo-sidebar-width, 52px);
        min-height: 48px;
        box-sizing: border-box;
        cursor: pointer;
      }

      :host(:focus-visible) {
        outline: auto;
      }

      :host(.selected) {
        background: var(--sat-sidebar-item-selected-background, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
      }

      :host(.selected)::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 20px;
        background: var(--nuxeo-sidebar-menu, #fff);
        border-radius: 0 16px 16px 0;
        pointer-events: none;
      }

      :host-context([dir='rtl']):host(.selected)::before {
        left: auto;
        right: 0;
        border-radius: 16px 0 0 16px;
      }

      #menuItemAnchor {
        display: block;
        box-sizing: border-box;
        width: var(--nuxeo-sidebar-width, 52px);
        height: 48px;
        min-height: 48px;
        color: var(--nuxeo-sidebar-menu);
        text-decoration: none;
        /* Drawer items often have no href; paper-icon-button used to supply cursor: pointer */
        cursor: pointer;
      }

      #menuItemAnchor:hover {
        background: var(--sat-sidebar-item-hover-background, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        color: var(--nuxeo-sidebar-menu-hover);
      }

      :host(.selected) #menuItemAnchor:hover {
        background: transparent;
        color: var(--nuxeo-sidebar-menu-hover);
      }

      paper-icon-button {
        box-sizing: border-box;
        display: block;
        width: var(--nuxeo-sidebar-width, 52px);
        min-width: var(--nuxeo-sidebar-width, 52px);
        max-width: var(--nuxeo-sidebar-width, 52px);
        height: 48px;
        min-height: 48px;
        margin: 0;
        padding: 12px 14px;
        color: var(--nuxeo-sidebar-menu);
        pointer-events: none;
      }

      paper-icon-button:hover,
      :host(.selected) paper-icon-button {
        background: transparent;
        color: var(--nuxeo-sidebar-menu-hover);
      }

      paper-badge {
        --paper-badge-background: var(--nuxeo-badge-background);
        --paper-badge-margin-left: -24px;
        --paper-badge-margin-bottom: -24px;
        --paper-badge-width: 16px;
        --paper-badge-height: 16px;
      }

      .sidebar-item-label {
        display: block;
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--nuxeo-app-font);
        font-size: 14px;
        font-weight: 500;
        line-height: 20px;
        letter-spacing: 0.1px;
        color: var(--nuxeo-sidebar-menu);
        opacity: 0;
        max-width: 0;
        height: 0;
        padding: 0;
        transition:
          opacity 0.2s ease,
          max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }

      :host([expanded]) {
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }

      :host([expanded]) #menuItemAnchor {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 48px;
        height: auto;
        padding: 0;
        padding-inline-end: 12px;
      }

      :host([expanded]) paper-icon-button {
        flex-shrink: 0;
      }

      :host([expanded]) .sidebar-item-label {
        opacity: 1;
        max-width: 200px;
        height: auto;
        transition:
          opacity 0.2s ease 0.05s,
          max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }

      :host(.selected) .sidebar-item-label {
        font-weight: 600;
      }

      paper-icon-button svg,
      paper-icon-button g,
      paper-icon-button path {
        pointer-events: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .sidebar-item-label {
          transition: none;
        }
      }
    </style>

    <a id="menuItemAnchor" href$="[[_href(urlFor, route, link)]]" aria-label$="[[i18n(label)]]">
      <paper-icon-button noink id="button" name$="[[name]]" tabindex="-1" aria-hidden="true"></paper-icon-button>
      <span class="sidebar-item-label" aria-hidden="true">[[i18n(label)]]</span>
      <nuxeo-tooltip
        for="menuItemAnchor"
        position="[[_tooltipPosition]]"
        offset="0"
        animation-delay="0"
        id="tooltip"
        hidden$="[[expanded]]"
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

    /**
     * Set by the parent `nuxeo-app` to mirror its `sidebar-expanded` state.
     * Reflected so CSS can key off `:host([expanded])` (cross-browser; avoids
     * non-standard `:host-context()`).
     */
    expanded: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
      observer: '_onExpandedChanged',
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

  _onExpandedChanged(expanded) {
    const tooltip = this.$?.tooltip;
    if (tooltip && expanded && typeof tooltip.hide === 'function') {
      tooltip.hide();
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

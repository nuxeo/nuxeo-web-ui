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
`nuxeo-menu-icon`
@group Nuxeo UI
@element nuxeo-menu-icon
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-badge/paper-badge.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
        position: relative;
        outline: none;
      }

      :host(.selected) paper-icon-button {
        background: rgba(0, 0, 0, 0.2);
        color: var(--nuxeo-sidebar-menu-hover);
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
        background: rgba(0, 0, 0, 0.2);
        color: var(--nuxeo-sidebar-menu-hover);
      }
   </style>

    <a href\$="[[_href(urlFor, route, link)]]">
      <paper-icon-button noink="" id="button" name\$="[[name]]"></paper-icon-button>
      <nuxeo-tooltip for="button" position="right" offset="0" animation-delay="0">[[i18n(label)]]</nuxeo-tooltip>
      <template is="dom-if" if="[[badge]]">
        <paper-badge label="[[badge]]" for="button"></paper-badge>
      </template>
    </a>
`,

  is: 'nuxeo-menu-icon',
  behaviors: [I18nBehavior, Nuxeo.RoutingBehavior],

  properties: {
    /**
     * The 18n label key
     */
    label: {
      type: String
    },

    /**
     * The icon
     */
    icon: {
      type: String
    },

    src: {
      type: String,
      value: ''
    },

    /**
     * A named route and arguments. Route syntax is <name>:<arg 1>/<arg 2>/.../<arg n>.
     */
    route: {
      type: String,
      value: ''
    },

    /**
     * An explicit link.
     */
    link: {
      type: String,
      value: ''
    },

    /**
     * A badge associated with the icon
     */
    badge: {
      type: String
    }
  },

  observers: [
    '_srcOrIcon(icon, src)'
  ],

  _srcOrIcon: function() {
    if (this.src && this.src.length > 0) {
      this.$.button.icon = '';
      this.$.button.src = this.src;
    } else if (!this.$.button.src || this.$.button.src.length === 0) {
      this.$.button.icon = this.icon;
    }
  },

  _href: function() {
    if (!this.route) {
      return;
    }
    if (this.link) {
      return this.link;
    }
    if (this.urlFor) {
      var parts = this.route.split(':');
      var name = parts[0];
      var args = (parts[1] && parts[1].split('/')) || [];
      return this.urlFor.apply(this, [name].concat(args));
    }
  }
});

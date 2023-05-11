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

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-menu-item`
@group Nuxeo UI
@element nuxeo-menu-item
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      a {
        margin-bottom: 0;
        padding: 1em;
        display: block;
        @apply --nuxeo-link;
        @apply --nuxeo-menu-item-link;
      }
    </style>

    <a href$="[[_href(urlFor, route, link)]]">[[i18n(label)]]</a>
  `,

  is: 'nuxeo-menu-item',
  behaviors: [I18nBehavior, RoutingBehavior],

  properties: {
    /**
     * The 18n label key
     */
    label: {
      type: String,
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
  },

  _href() {
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

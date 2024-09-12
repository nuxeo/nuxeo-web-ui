/**
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

icensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
  Gabriel Barata <gbarata@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import './nuxeo-liveconnect-box-provider.js';

/**
`nuxeo-liveconnect-box-link`
@group Nuxeo UI
@element nuxeo-liveconnect-box-link
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: inline-block;
        @apply --layout-horizontal;
        @apply --nuxeo-liveconnect-link-layout;
      }

      iron-icon {
        --iron-icon-height: 16px;
        --iron-icon-width: 32px;
        margin-right: 4px;
        @apply --nuxeo-liveconnect-icon-layout;
      }

      a {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-center-justified;
        @apply --nuxeo-liveconnect-anchor-layout;
      }

      a,
      a:active,
      a:visited,
      a:focus {
        color: var(--nuxeo-secondary-color, #0066ff);
        text-decoration: underline;
      }
    </style>

    <nuxeo-liveconnect-box-provider
      id="provider"
      is-available="{{isProviderAvailable}}"
    ></nuxeo-liveconnect-box-provider>
    <template is="dom-if" if="[[isProviderAvailable]]">
      <a href="#" on-tap="_openPicker">
        <iron-icon src="[[importPath]]images/box.png"></iron-icon>
        [[i18n('liveconnectImportActions.box', 'Box')]]
      </a>
    </template>
  `,

  is: 'nuxeo-liveconnect-box-link',
  behaviors: [I18nBehavior],

  ready() {
    this.$.provider.updateProviderInfo();
  },

  _openPicker(e) {
    e.preventDefault();
    this.$.provider.openPicker();
  },
});

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

import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-fab/paper-fab.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-create-shortcut`
@group Nuxeo UI
@element nuxeo-document-create-shortcut
*/
Polymer({
  _template: html`
    <style is="custom-style">
      :host {
        display: inline-block;
      }

      .shortcut-container {
        display: flex;
        align-items: center;
        gap: 9px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 16px;
        background-color: var(--sat-document-create-button-background, var(--nuxeo-button-primary));
        transition: background-color 0.2s ease;
        box-shadow: var(
          --sat-document-create-button-box-shadow,
          0px 4px 8px 3px rgba(0, 0, 0, 0.15),
          0px 1px 3px rgba(0, 0, 0, 0.3)
        );
      }

      .shortcut-container:hover {
        background-color: var(--sat-document-create-button-hover-background, var(--nuxeo-button-primary-focus));
      }

      paper-fab {
        width: 40px;
        height: 40px;
        color: var(--sat-document-create-button-icon-color, var(--nuxeo-button-primary-text));
        --paper-fab-background: transparent;
        --paper-fab-keyboard-focus-background: transparent;
        box-shadow: none;
      }

      .shortcut-label {
        font-size: 14px;
        font-weight: 500;
        line-height: 20px;
        color: var(--sat-create-button-shortcut-label-color, var(--nuxeo-button-primary-text));
        white-space: nowrap;
        letter-spacing: 0.1px;
        font-family: var(--sat-font-family-secondary, var(--nuxeo-app-font));
      }
    </style>

    <div class="shortcut-container" role="button" tabindex="0" on-keydown="_handleKeydown" on-tap="_tap">
      <paper-fab mini noink id="createBtn" src="[[icon]]" on-tap="_tap"></paper-fab>
      <span class="shortcut-label">[[i18n(label)]]</span>
    </div>

    <nuxeo-tooltip for="createBtn" position="left">[[i18n(label)]]</nuxeo-tooltip>
  `,

  is: 'nuxeo-document-create-shortcut',
  behaviors: [I18nBehavior],

  properties: {
    type: String,
    icon: String,
    label: String,
  },

  _handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._tap();
    }
  },

  _tap() {
    this.fire('create-document', { type: this.type });
  },
});

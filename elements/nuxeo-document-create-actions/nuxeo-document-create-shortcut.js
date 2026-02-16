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

import '@polymer/paper-fab/paper-fab.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
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
        gap: 12px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 16px;
        background-color: var(--sat-document-create-button-background, var(--nuxeo-button-primary));
        transition: background-color 0.2s ease;
        box-shadow: 0px 0px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15);
      }

      .shortcut-container:hover {
        background-color: var(--sat-document-create-button-hover-background, var(--nuxeo-button-primary-focus));
      }

      .shortcut-label {
        font-size: 14px;
        font-weight: 500;
        line-height: 20px;
        color: var(--sat-create-button-shortcut-label-color, var(--nuxeo-button-primary-text));
        white-space: nowrap;
        letter-spacing: 0.1px;
      }

      /* Icon styling - simple image without background */
      .shortcut-icon {
        height: 40px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .shortcut-icon img {
        width: 24px;
        height: 24px;
      }

      .shortcut-icon img[src=''],
      .shortcut-icon img:not([src]) {
        display: none;
      }
    </style>

    <div class="shortcut-container" on-tap="_tap">
      <div class="shortcut-icon">
        <img src="[[icon]]" alt="[[label]]" aria-hidden="true" on-error="_handleImageError" />
      </div>
      <span class="shortcut-label">[[i18n(label)]]</span>
    </div>
  `,

  is: 'nuxeo-document-create-shortcut',
  behaviors: [I18nBehavior],

  properties: {
    type: String,
    icon: String,
    label: String,
  },

  _handleImageError(e) {
    // Hide the image if it fails to load
    e.target.style.display = 'none';
  },

  _tap() {
    this.fire('create-document', { type: this.type });
  },
});

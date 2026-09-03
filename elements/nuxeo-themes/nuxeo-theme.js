/**
@license
©2026 Hyland Software, Inc. and its affiliates. All rights reserved. 
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

import '@polymer/iron-image/iron-image.js';
import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { resolveTheme, shouldHideTheme } from '../../themes/theme-config.js';

/**
`nuxeo-theme`
@group Nuxeo UI
@element nuxeo-theme
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      /* Hide cards for opposite branding mode using the hidden attribute to override :host display. */
      :host([hidden]) {
        display: none;
      }

      nuxeo-card[selected] {
        border: 2px solid var(--default-primary-color);
        border-radius: 3px;
      }

      iron-image {
        width: 100%;
        height: 250px;
        margin-bottom: 8px;
        background-color: rgba(0, 0, 0, 0.05);
      }

      .details {
        @apply --layout-horizontal;
        @apply --layout-justified;
        @apply --layout-center;
      }

      .label {
        margin-left: 8px;
      }

      paper-button {
        @apply --nx-button-primary;
      }

      paper-button[disabled] {
        @apply --nx-button-disabled;
      }
    </style>

    <nuxeo-card selected$="[[_selected(name)]]">
      <iron-image src="[[_image(name)]]" sizing="contain"></iron-image>
      <div class="details">
        <div class="label">[[_label(name)]]</div>
        <paper-button on-tap="_apply" noink disabled$="[[_selected(name)]]" aria-label="[[_ariaLabel(name)]]">
          [[_button(name)]]
        </paper-button>
      </div>
    </nuxeo-card>
  `,

  is: 'nuxeo-theme',
  behaviors: [I18nBehavior],

  properties: {
    name: {
      type: String,
      observer: '_nameChanged',
    },
    title: String,
    preview: String,
  },

  // NXENG-527: hide the built-in theme cards that belong to the opposite branding mode.
  // Custom customer themes are never hidden (shouldHideTheme only matches known themes).
  // Kept as an observer rather than a computed `hidden` so the native property stays writable.
  _nameChanged(name) {
    this.hidden = shouldHideTheme(name);
  },

  _image(name) {
    return this.preview ? this.preview : `themes/${name}/preview.jpg`;
  },

  _label(name) {
    return this.title ? this.title : this.i18n(`themes.${name}`);
  },

  _button(name) {
    return this.i18n(`themes.${this._selected(name) ? 'current' : 'apply'}`);
  },

  _ariaLabel(name) {
    const label = this._label(name);
    return this._selected(name)
      ? this.i18n('themes.current.ariaLabel', label)
      : this.i18n('themes.apply.ariaLabel', label);
  },

  _selected(name) {
    // Compare against the resolved theme so the selection stays consistent with the branding
    // remap (e.g. a legacy stored theme maps to its branding equivalent when branding is on).
    // resolveTheme(null) returns the deployment default.
    return name === resolveTheme(this._storedTheme());
  },

  /**
   * Reads the stored theme defensively. Storage access can throw when it is blocked
   * (private browsing / disabled storage); return null so callers fall back to the default.
   */
  _storedTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (e) {
      return null;
    }
  },

  _apply() {
    localStorage.setItem('theme', this.name);
    this.fire('theme-changed', { theme: this.name });
  },
});

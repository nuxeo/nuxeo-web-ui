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

import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '../nuxeo-document-creation-stats/nuxeo-document-creation-stats.js';
import '../nuxeo-keys/nuxeo-keys.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-create-button`
@group Nuxeo UI
@element nuxeo-document-create-button
*/
Polymer({
  _template: html`
    <style>
      /* Button styling */
      #createBtn {
        width: var(--sat-document-create-button-width, 56px);
        height: var(--sat-document-create-button-height, 56px);
        border-radius: 16px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        color: var(--nuxeo-button-primary-text);
        box-shadow: var(--sat-document-create-button-box-shadow);
        background: var(--sat-document-create-button-background, var(--nuxeo-button-primary));
      }

      #createBtn:hover,
      #createBtn:focus {
        background-color: var(--sat-document-create-button-hover-background, var(--nuxeo-button-primary-focus));
      }

      #createBtn svg {
        width: 24px;
        height: 24px;
        display: block;
      }

      paper-fab {
        width: var(--nuxeo-document-create-button-width, 56px);
        height: var(--nuxeo-document-create-button-height, 56px);
        color: var(--nuxeo-button-primary-text);
        --paper-fab-background: var(--nuxeo-button-primary);
        --paper-fab-keyboard-focus-background: var(--nuxeo-button-primary-focus);
        @apply --nuxeo-document-create-button;
        transition: color 0.25s ease-in-out;
      }

      paper-fab:hover,
      paper-fab:focus {
        background-color: var(--nuxeo-button-primary-focus);
      }

      #tray {
        position: absolute;
        bottom: calc(32px + var(--nuxeo-app-bottom, 0));
        right: 32px;
        z-index: 10;
      }

      :host([dir='rtl']) #tray {
        left: 32px;
        right: auto;
        overflow: hidden;
      }

      #shortcuts {
        opacity: 0;
        transition: opacity 0.25s ease-in-out;
      }

      #shortcuts.open {
        opacity: 1;
      }

      nuxeo-document-create-shortcuts {
        --nuxeo-document-create-shortcut-margin: 0 0 16px 0;
      }
    </style>

    <nuxeo-document id="defaultDoc" doc-path="[[parent.path]]" enrichers="permissions, subtypes" response="{{parent}}">
    </nuxeo-document>

    <div id="tray" on-mouseenter="_onMouseEnter" on-mouseleave="_onMouseLeave">
      <div id="shortcuts" class$="[[_animateOpen(shortcutsVisible)]]">
        <div hidden$="[[!shortcutsVisible]]">
          <nuxeo-slot name="DOCUMENT_CREATE_ACTIONS" model="[[actionContext]]"></nuxeo-slot>
        </div>
      </div>

      <button type="button" id="createBtn" on-tap="_displayWizard" aria-labelledby="createBtnTooltip">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M18.9775 10.9873H12.9944L12.9915 5.00818C12.9915 4.45847 12.5446 4.01233 11.9939 4.01233C11.4433 4.01233 10.9964 4.45847 10.9964 5.00818L10.9994 10.9873H5.0124C4.46178 10.9873 4.01489 11.4334 4.01489 11.9831C4.01489 12.5328 4.46178 12.979 5.0124 12.979H11.0004L11.0034 18.9501C11.0034 19.4998 11.4503 19.9459 12.0009 19.9459C12.5516 19.9459 12.9984 19.4998 12.9984 18.9501L12.9954 12.979H18.9775C19.5281 12.979 19.975 12.5328 19.975 11.9831C19.975 11.4334 19.5281 10.9873 18.9775 10.9873Z"
            fill="var(--sat-create-button-shortcut-label-color, var(--nuxeo-button-primary-text))"
          />
        </svg>
      </button>
      <!-- nuxeo-tooltip does not play nice (in shadycss) when attached to elements that are position: absolute -->
      <paper-tooltip for="createBtn" position="left" id="createBtnTooltip"
        >[[i18n('documentCreateButton.tooltip')]]</paper-tooltip
      >
    </div>

    <nuxeo-document-creation-stats id="creationStats"></nuxeo-document-creation-stats>

    <nuxeo-keys keys="c" on-pressed="_displayWizard"></nuxeo-keys>
  `,

  is: 'nuxeo-document-create-button',
  behaviors: [I18nBehavior],

  properties: {
    parent: {
      type: Object,
      observer: '_parentChanged',
    },
    subtypes: {
      type: Array,
    },
    shortcutsVisible: {
      type: Boolean,
      value: false,
    },
    actionContext: {
      type: Object,
      value() {
        return {};
      },
      computed: '_actionContext(shortcutsVisible,subtypes)',
    },
  },

  listeners: {
    'create-document': '_hideShortcuts',
  },

  ready() {
    if (!this.hasAttribute('dir')) {
      const direction = document.documentElement.getAttribute('dir');
      this.setAttribute('dir', direction);
    }
  },

  _parentChanged() {
    if (this.parent) {
      if (
        !this.parent.contextParameters ||
        !this.parent.contextParameters.subtypes ||
        !this.parent.contextParameters.permissions
      ) {
        this.$.defaultDoc.get();
      } else {
        const subtypes =
          this.parent.contextParameters && this.parent.contextParameters.subtypes
            ? this.parent.contextParameters.subtypes.map((type) => {
                type.id = type.type.toLowerCase();
                return type;
              })
            : [];
        const filteredSubtypes = [];
        if (this._canCreateIn(this.parent)) {
          subtypes.forEach((type) => {
            if (type.facets.indexOf('HiddenInCreation') === -1) {
              filteredSubtypes.push(type.id);
            }
          });
        }
        this.set('subtypes', filteredSubtypes);
      }
    }
  },

  _canCreateIn(document) {
    if (document && document.contextParameters && document.contextParameters.permissions) {
      return document.contextParameters.permissions.indexOf('AddChildren') > -1;
    }
    return false;
  },

  _actionContext() {
    return { hostVisible: this.shortcutsVisible, subtypes: this.subtypes };
  },

  _showShortcuts() {
    this.shortcutsVisible = true;
  },

  _hideShortcuts() {
    this.shortcutsVisible = false;
  },

  _onMouseEnter() {
    this._showShortcuts();
  },

  _onMouseLeave() {
    this._hideShortcuts();
  },

  _displayWizard(e) {
    e.preventDefault();
    if (!this.hidden) {
      this.fire('create-document', e.detail);
    }
  },

  _animateOpen() {
    return this.shortcutsVisible ? 'open' : '';
  },
});

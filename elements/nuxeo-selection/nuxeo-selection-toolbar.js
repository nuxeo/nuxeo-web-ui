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

import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
### Styling

The following custom properties and mixins are available for styling:

Custom property                        | Description                        | Default
---------------------------------------|------------------------------------|-----------------------
`--nuxeo-selection-toolbar-background` | Background color                   | #000
`--nuxeo-selection-toolbar-text`       | Text color                         | #fff
`--nuxeo-selection-toolbar-link`       | Link color                         | #fff
`--nuxeo-selection-toolbar-link-hover` | Link hover color                   | #000
`--nuxeo-selection-toolbar`            | Mixin applied to the toolbar       | `{}`

`nuxeo-selection-toolbar`
@group Nuxeo UI
@element nuxeo-selection-toolbar
*/
Polymer({
  _template: html`
    <style is="iron-flex iron-flex-alignment nuxeo-styles">
      :host {
        font-family: var(--nuxeo-app-font);
      }

      .toolbar {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-fit;
        height: 60px;
        position: fixed;
        top: var(--nuxeo-app-top, 0);
        left: 0;
        right: 0;
        z-index: 199;
        padding: 0 2em;
        font-weight: 300;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.4);
        background: var(--nuxeo-selection-toolbar-background, #000);
        color: var(--nuxeo-selection-toolbar-text, #fff);
        @apply --nuxeo-selection-toolbar;
      }
      .selection {
        display: flex;
        align-content: center;
      }

      .actions {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-flex;
        @apply --layout-end-justified;
      }

      .count {
        font-weight: 600;
      }

      #selectedItemsPopup {
        margin-top: 196px;
      }

      .horizontal {
        @apply --layout-flex;
        @apply --layout-horizontal;
      }

      /* links */
      a,
      a:active,
      a:visited,
      a:focus {
        display: inline-block;
        vertical-align: bottom;
        text-decoration: underline;
        margin-left: 1em;
        color: var(--nuxeo-selection-toolbar-link, #fff);
        cursor: pointer;
      }
      a:hover {
        color: var(--nuxeo-selection-toolbar-link-hover, #66ffff);
      }
      .shortcut-hint kbd {
        background-color: #e0e7ff; /* light blue background */
        border: 1px solid #94a3b8; /* subtle border */
        border-radius: 4px;
        padding: 2px 6px;
        font-family: monospace;
        font-size: 0.85em;
        box-shadow: inset 0 -1px 0 #94a3b8;
        color: black;
      }

      .shortcut-hint {
        margin-left: 2em;
        font-style: italic;
        color: var(--nuxeo-selection-toolbar-link, #fff);
      }
      :host(:focus-within) .shortcut-hint {
        display: none;
      }
    </style>

    <div class="horizontal center layout" id="content">
      <div id="selectionToolbar" class="toolbar">
        <div class="selection">
          <!-- if some elements are selected -->
          <template is="dom-if" if="[[!selectAllActive]]">
            <span class="count" aria-live="polite">
              [[i18n('selectionToolbar.selected.items', selectedItems.length)]]
            </span>
            <a class="selectionLink" on-tap="toogleSelectedItemsPopup" href="#">
              <span>[[i18n('selectionToolbar.display.selection')]]</span>
            </a>
          </template>

          <!-- else if all the elements are selected -->
          <template is="dom-if" if="[[selectAllActive]]">
            <span class="count" aria-live="polite">[[i18n('selectionToolbar.selected.all', _resultsCount)]]</span>
          </template>
          <a class="selectionLink" on-tap="clearSelection" href="#">
            <span>[[i18n('command.clear')]]</span>
          </a>
          <!-- show keyboard shortcut hint only when using keyboard -->
          <template is="dom-if" if="[[lastInputKeyboard]]">
            <span class="shortcut-hint" aria-hidden="true" inner-h-t-m-l="[[_computeShortcutHint()]]"></span>
          </template>
        </div>
        <div class="actions">
          <slot></slot>
        </div>
      </div>
    </div>

    <template is="dom-if" if="[[!selectAllActive]]">
      <nuxeo-dialog id="selectedItemsPopup" with-backdrop>
        <h2>[[i18n('selectionToolbar.dialog.heading')]]</h2>
        <paper-dialog-scrollable>
          <template is="dom-repeat" items="[[selectedItems]]">
            <div class="layout horizontal center">
              <nuxeo-document-thumbnail document="[[item]]"></nuxeo-document-thumbnail>
              <div>[[item.title]]</div>
            </div>
          </template>
        </paper-dialog-scrollable>
        <div class="buttons">
          <paper-button dialog-dismiss class="secondary">[[i18n('command.close')]]</paper-button>
        </div>
      </nuxeo-dialog>
    </template>
  `,

  is: 'nuxeo-selection-toolbar',
  behaviors: [I18nBehavior],

  properties: {
    hidden: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
    },
    selectAllActive: {
      type: Boolean,
      value: false,
      notify: true,
    },
    selectedItems: {
      type: Object,
      value: [],
      notify: true,
    },
    _isDisplayToolbar: {
      type: Boolean,
      value: false,
    },
    lastInputKeyboard: {
      type: Boolean,
      value: false,
    },
    /**
     * XXX - workaround: resultCounts is used to display the number of selected items (instead of selectedItems.length)
     * to support paginable elements that don't know the total number of items.
     */

    _resultsCount: {
      type: Number,
    },
  },

  observers: ['_observeSelectedItems(selectedItems)'],

  _observeSelectedItems() {
    this.hidden = !this.selectedItems || this.selectedItems.length === 0;
  },

  _computeShortcutHint() {
    let platform;

    if (navigator.userAgentData && navigator.userAgentData.platform) {
      platform = navigator.userAgentData.platform.toLowerCase();
    } else {
      platform = navigator.userAgent.toLowerCase();
    }

    const isMac = platform.includes('mac');
    const key = isMac ? 'Command' : 'Ctrl';

    return this.i18n('selectionToolbar.hint.message', key);
  },

  toogleSelectedItemsPopup(e) {
    e.preventDefault();
    this._lastFocused = e.currentTarget;

    const dialog = this.$$('#selectedItemsPopup');
    if (dialog) {
      dialog.toggle();
      dialog.addEventListener(
        'iron-overlay-closed',
        () => {
          if (this._lastFocused) {
            this._lastFocused.focus();
          }
        },
        { once: true },
      );
    }
  },

  clearSelection(e) {
    e.preventDefault();
    this.fire('clear-selected-items');
    this.$.selectionToolbar.focus();
  },
  ready() {
    const dialog = this.$$('#selectedItemsPopup');
    if (dialog) {
      dialog.addEventListener('iron-overlay-closed', () => {
        if (this._lastFocused) {
          this._lastFocused.focus();
        }
      });
    }
    this._onKeydown = () => {
      this.lastInputKeyboard = true;
    };
    this._onMousedown = () => {
      this.lastInputKeyboard = false;
    };
    this._onTouchstart = () => {
      this.lastInputKeyboard = false;
    };

    document.addEventListener('keydown', this._onKeydown);
    document.addEventListener('mousedown', this._onMousedown);
    document.addEventListener('touchstart', this._onTouchstart);

    // Detect if user is on Mac (once)
    const isMac =
      (navigator.userAgentData &&
        navigator.userAgentData.platform &&
        navigator.userAgentData.platform.toLowerCase().includes('mac')) ||
      /mac/i.test(navigator.userAgent);

    // Command/Ctrl + . toggle: table -> toolbar
    document.addEventListener('keydown', (e) => {
      // On Mac, use Command (metaKey); otherwise use Ctrl
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;
      if (!modifierPressed) return;

      const isPeriod = e.key === '.' || e.code === 'Period';
      if (!isPeriod) return;

      e.preventDefault();

      const toolbar = this.$.selectionToolbar;
      const inToolbar = toolbar.contains(document.activeElement);
      const focusableElements = toolbar.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');

      if (!inToolbar) {
        if (this.selectAllActive) {
          focusableElements[1].focus();
        } else {
          focusableElements[0].focus();
        }
      }
    });
  },

  disconnectedCallback() {
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }

    // remove listeners to avoid memory leaks
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('mousedown', this._onMousedown);
    document.removeEventListener('touchstart', this._onTouchstart);
  },
});

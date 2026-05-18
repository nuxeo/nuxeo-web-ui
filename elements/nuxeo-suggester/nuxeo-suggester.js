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
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-selector/iron-selector.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '../nuxeo-keys/nuxeo-keys.js';
import '../nuxeo-document-highlight/nuxeo-document-highlights.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

const commands = [];

export const _Suggester = {};
/**
 * Adds a custom command to nuxeo-suggester. Expected command format:
 * { id: String, startsWith: Boolean, searchTerm: String, suggestion: Object, run: Function }
 * Here, suggestion must have and id, icon and label.
 */
_Suggester.addCommand = function (command) {
  if (!command) {
    return;
  }
  const index = commands.indexOf((c) => c.id === command.id);
  if (index > -1) {
    commands.splice(index, 1, command);
  } else {
    commands.push(command);
  }
  command.suggestion.command = command;
};

/**
`nuxeo-suggester`
@group Nuxeo UI
@element nuxeo-suggester
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        @apply --layout-horizontal;
        @apply --layout-flex;
        @apply --layout-center;
      }

      paper-input {
        width: var(--nuxeo-suggester-width, 60%);

        --paper-input-container-input: {
          color: var(--nuxeo-quicksearch-text);
          font-size: 1rem;
          font-family: var(--nuxeo-app-font);
        };

        --paper-input-container-underline: {
          background-color: transparent;
        };

        --paper-input-container-underline-focus: {
          background-color: transparent;
        };

        --paper-input-container-label: {
          color: var(--nuxeo-text-default);
          font-size: 1rem;
          font-family: var(--nuxeo-app-font);
          line-height: unset;
          padding-left: 5px;
        };

        --paper-input-container-label-focus: {
          color: #e8e8e8;
          font-size: 1rem;
          line-height: unset;
          padding-left: 5px;
        };
      }

      .input-content.paper-input-container label {
        left: 7px;
      }

      #searchButton {
        border-left: 1px solid rgba(0, 0, 0, 0.1);
        position: fixed;
        z-index: 100;
        top: 0;
        color: var(--nuxeo-app-header);
        @apply --nuxeo-suggester-button;
      }

      :host([dir='rtl']) #searchButton {
        right: auto;
        left: 0;
        border-right: 1px solid rgba(0, 0, 0, 0.1);
      }

      #searchButton:hover {
        background-color: var(--nuxeo-button-primary);
        color: var(--nuxeo-button-primary-text);
      }

      #searchButton.toggled {
        color: var(--nuxeo-button-primary-text);
        background-color: var(--nuxeo-button-primary);
        z-index: 1001;
      }

      #suggester {
        top: var(--nuxeo-app-top, 0);
        left: 0;
        position: fixed;
        z-index: 1001;
        width: 100%;
        height: 100%;
        @apply --layout-vertical;
        @apply --layout-center;
      }

      #searchBar {
        height: 53px;
        background-color: var(--nuxeo-quicksearch-background);
        color: var(--nuxeo-quicksearch-text);
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-center-justified;
        @apply --layout-self-stretch;
      }

      #suggester .unfocused-line.paper-input-container,
      #suggester .focused-line.paper-input-container {
        background-color: transparent;
      }

      #results {
        width: var(--nuxeo-suggester-width, 65%);
        margin: 0.5em 0 3em;
        height: calc(100% - 130px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
        padding: 0 2em;
        box-sizing: border-box;
        overflow-y: auto;
        @apply --layout-vertical;
      }

      .item {
        display: block;
        padding: 1em;
        background-color: var(--nuxeo-quicksearch-background);
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .item.details {
        @apply --layout-vertical;
      }

      .item .details {
        min-width: 1px;
      }

      .item + .item {
        border-top: 1px solid var(--nuxeo-border);
      }

      .item iron-icon {
        margin: 0 16px 0 4px;
      }

      :host([dir='rtl']) .item iron-icon {
        margin: 0 -16px 0 4px;
      }

      a.item:hover,
      a.iron-selected {
        color: var(--nuxeo-text-default);
        @apply --nuxeo-block-selected;
      }

      a .itemName {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      a .itemPath {
        opacity: 0.7;
        font-size: 0.8em;
      }

      a:hover .itemName {
        color: var(--nuxeo-primary-color);
      }

      .fade {
        top: var(--nuxeo-app-top, 0);
        bottom: var(--nuxeo-app-bottom, 0);
        left: 0;
        width: 100%;
        position: fixed;
        opacity: 0.8;
        z-index: -1;
        background: var(--primary-text-color);
      }

      .thumbnailContainer {
        width: 60px;
        height: 60px;
        margin-right: 10px;
      }

      :host([dir='rtl']) .thumbnailContainer {
        margin-right: 16px;
      }

      nuxeo-document-highlights {
        font-size: 0.85rem;
      }

      :host([dir='rtl']) paper-input {
        --paper-input-container-label: {
          padding-left: 0px;
          padding-right: 8px;
          left: -3px !important;
        };
      }

      @media (max-width: 1024px) {
        #searchButton {
          background-color: var(--sat-app-header-box-background-color, var(--nuxeo-app-header-background));
          z-index: 100;
        }

        #searchBar {
          justify-content: flex-start;
        }

        paper-input {
          width: var(--nuxeo-suggester-media-width, calc(100% - 90px));
          margin-left: var(--nuxeo-suggester-media-margin-left, 1.2rem);
        }

        #results {
          width: 100%;
          padding: 1em;
        }
      }
    </style>

    <nuxeo-connection id="nxcon"></nuxeo-connection>
    <nuxeo-operation
      id="op"
      op="Search.SuggestersLauncher"
      response="{{items}}"
      params='{"searchTerm":"[[sanitizedSearchTerm]]"}'
    ></nuxeo-operation>

    <div hidden$="[[!toggled]]">
      <div id="suggester">
        <div class="fade" on-tap="toggle"></div>
        <div id="searchBar">
          <paper-input
            noink
            id="searchInput"
            value="{{searchTerm}}"
            type="text"
            auto-focus
            label="[[i18n('suggester.label')]]"
            no-label-float
            on-keydown="_handleInputKeydown"
          ></paper-input>
          <paper-icon-button
            id="clearButton"
            icon="icons:clear"
            aria-label="[[i18n('suggester.clearSearch')]]"
            hidden$="[[!searchTerm]]"
            on-click="_clearSearch"
            on-keydown="_clearSearchKey"
          >
          </paper-icon-button>
        </div>
        <div id="results" role="listbox" hidden$="[[!_canShowResults(searchTerm, items, items.splices)]]">
          <iron-selector id="selector">
            <template is="dom-repeat" items="{{items}}" index-as="index" initial-count="[[items.length]]">
              <a
                class="item"
                href$="[[_getUrl(item, false, urlFor)]]"
                on-click="_itemClicked"
                role="option"
                aria-label$="[[_resultAnnouncement(item.label, index, items.length)]]"
                on-focus="_resultFocused"
              >
                <div class="thumbnailContainer">
                  <iron-icon
                    src="[[_getThumbnail(item)]]"
                    icon="[[_getIcon(item)]]"
                    sizing="cover"
                    position="center"
                    class="thumbnailContainer"
                  >
                  </iron-icon>
                </div>
                <div class="details">
                  <div class="itemName">[[item.label]]</div>
                  <div class="itemPath">[[_getUrl(item, true, urlFor)]]</div>
                  <nuxeo-document-highlights highlights="[[item.highlights]]"></nuxeo-document-highlights>
                </div>
              </a>
            </template>
          </iron-selector>
        </div>
      </div>
    </div>

    <paper-icon-button
      noink
      id="searchButton"
      icon="nuxeo:search"
      name="browser"
      on-tap="toggle"
      aria-label$="[[i18n('pickerSearch.title')]]"
      aria-expanded="[[toggled]]"
    >
    </paper-icon-button>

    <nuxeo-keys target="[[target]]" keys="up" on-pressed="_handleArrowNavigation"></nuxeo-keys>
    <nuxeo-keys target="[[target]]" keys="down" on-pressed="_handleArrowNavigation"></nuxeo-keys>
    <nuxeo-keys target="[[target]]" keys="enter" on-pressed="_enterPressed"></nuxeo-keys>
    <nuxeo-keys target="[[target]]" keys="esc" on-pressed="closeResults"></nuxeo-keys>
  `,

  is: 'nuxeo-suggester',
  behaviors: [RoutingBehavior, I18nBehavior],

  properties: {
    toggled: {
      type: Boolean,
      notify: true,
      value: false,
    },
    searchTerm: {
      type: String,
      value: '',
      notify: true,
      observer: '_searchTermChanged',
    },
    sanitizedSearchTerm: {
      type: String,
      value: '',
    },
    searchDelay: {
      type: Number,
      value: 500,
    },
    target: {
      type: Object,
      value() {
        return this;
      },
    },
    items: {
      type: Array,
      observer: '_itemsChanged',
    },
  },

  ready() {
    if (!this.hasAttribute('dir')) {
      const direction = document.documentElement.getAttribute('dir');
      this.setAttribute('dir', direction);
    }
  },
  _itemsChanged() {
    this.async(() => {
      const items = this.shadowRoot.querySelectorAll('#results a.item');

      if (items.length) {
        // no auto selection or focus
        this.$.selector.selected = -1;
      }
    });
  },

  _handleInputKeydown(e) {
    if (e.key !== 'Tab' || e.shiftKey) {
      return;
    }

    // If there is text, tab should go to clear button
    if (this.searchTerm && this.searchTerm.length > 0) {
      e.preventDefault();
      this.$.clearButton.focus();
    }
  },
  _clearSearch() {
    this.searchTerm = '';
    this.items = [];
    this.$.searchInput.focus();
  },
  _clearSearchKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._clearSearch();
    }
  },
  _resultAnnouncement(label, index, total) {
    if (!label || total === undefined) {
      return label;
    }
    return `${label} ${index + 1} out of ${total} results`;
  },
  _resultFocused(e) {
    const { index } = e.model;
    this.$.selector.selected = index;
  },

  toggle() {
    this.toggled = !this.toggled;
    this.searchTerm = '';
    this.toggleClass('toggled', this.toggled, this.$.searchButton);
    if (this.toggled) {
      this.$.searchInput.focus();
    }
  },

  closeResults(e) {
    e.detail.keyboardEvent.preventDefault();
    this.toggle();
  },

  _searchTermChanged() {
    this.sanitizedSearchTerm = this._sanitizeSearchTerm(this.searchTerm);
    this.$.selector.selected = 0;
    if (!this.sanitizedSearchTerm) {
      this.items = [];
    } else {
      this.debounce(
        'suggester-search',
        () => {
          this.$.op.execute().then(() => {
            commands.forEach((command) => {
              let addSuggestion = false;
              if (command.trigger.regex) {
                addSuggestion = this.searchTerm.match(command.trigger.regex);
              } else if (command.trigger.searchTerm) {
                const commandTerm = command.trigger.searchTerm.trim().toLowerCase();
                const searchTerm = this.searchTerm.trim().toLowerCase();
                addSuggestion = command.trigger.startsWith
                  ? commandTerm.startsWith(searchTerm)
                  : commandTerm === searchTerm;
              }
              if (addSuggestion) {
                this.push('items', command.suggestion);
              }
            });
          });
        },
        this.searchDelay,
      );
    }
  },

  _sanitizeSearchTerm(term) {
    return (term || '').replace(/"/g, encodeURIComponent('"')).trim();
  },

  _canShowResults() {
    return this.searchTerm !== '' && this.items && (Array.isArray(this.items) ? this.items.length > 0 : true);
  },

  _getIcon(item) {
    return !this._getThumbnail(item) && `nuxeo:${item.type}`;
  },

  _getThumbnail(item) {
    if (item.command) {
      return item.icon;
    }
    if (item.thumbnailUrl && item.thumbnailUrl.length > 0) {
      return `${this.$.nxcon.url}/${item.thumbnailUrl}`;
    }
  },

  _getUrl(item, replaceHashbang) {
    let url;
    if (!item.command) {
      url = item.type && this.urlFor(item.type, item.id);
    }
    if (url && replaceHashbang) {
      url = url.replace('/#!', '');
    }
    return url;
  },

  _handleArrowNavigation(e) {
    e.detail.keyboardEvent.preventDefault();

    const { items } = this.$.selector;

    if (!items || !items.length) {
      return;
    }

    const { key } = e.detail.keyboardEvent;
    let index = this.$.selector.selected;

    if (index === -1) {
      index = 0;
    } else if (key === 'ArrowDown') {
      index = Math.min(index + 1, items.length - 1);
    } else if (key === 'ArrowUp') {
      index = Math.max(index - 1, 0);
    }

    this.$.selector.selected = index;
    items[index].focus();
  },

  _enterPressed(e) {
    if (this.$.selector.items.length > 0) {
      e.detail.keyboardEvent.preventDefault();
      this.$.selector.items[this.$.selector.selected].click();
    }
  },

  _itemClicked(e) {
    if (e.model.item.command && e.model.item.command.run) {
      e.model.item.command.run(this.searchTerm);
    }
    this.toggle();
  },
});

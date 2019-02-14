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
An element to display results from a page provider.

It supports multiple display modes and handles toggling between them.
Each display mode is associated to a display element which has to be declared as a children with `class="results"` and
must also have a `name` and `icon` to be used as toggle button, ex:

  <nuxeo-datatable class="results" name="table" icon="icon="icons:list">

The current page provider will be injected in each view as `nxProvider` so a property with this name should be available
in each results element.

`<nuxeo-results>` handles also storing of settings for each view in local storage in which case result elements should
expose a `settings` property.

It will also handle refresh and selection actions so it expects elements to include `Polymer.IronResizableBehavior`,
a `selectedItems` property and expose a small API (`clearSelection()`, `selectItems()`) part of
`Nuxeo.PageProviderDisplayBehavior`.

@group Nuxeo UI
@element nuxeo-results
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-localstorage/iron-localstorage.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-quick-filters/nuxeo-quick-filters.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-actions-menu.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-sort-select.js';
import '../nuxeo-selection/nuxeo-selection-toolbar.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>

      :host([loading]) .resultsCount {
        opacity: 0.1;
        transition: opacity 300ms ease-in-out;
      }

      .displayMode {
        @apply --nuxeo-action;
      }

      .displayMode:hover {
        @apply --nuxeo-action-hover;
      }

      .main {
        @apply --layout-vertical;
      }

      .resultActions, .viewModes, .rightHand {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .resultActions, .rightHand {
        @apply --layout-wrap;
      }

      .rightHand {
        @apply --layout-flex;
        @apply --layout-end-justified;
      }

      .resultActions {
        margin-bottom: 16px;
        min-height: 38px;
      }

      .resultActions paper-icon-button {
        width: 2em;
        height: 2em;
        padding: .3em;
        margin-left: 4px;
      }

      .resultsCount {
        opacity: 0.5;
        margin-right: 16px;
        transition: opacity 100ms ease-in-out;
      }

      paper-icon-button[selected] {
        color: var(--icon-toggle-outline-color, var(--nuxeo-action-color-activated));
      }

      nuxeo-actions-menu {
        height: 100%;
        max-width: var(--nuxeo-results-selection-actions-menu-max-width, 240px);
      }

      nuxeo-quick-filters {
        margin-right: 16px;
      }

    </style>

    <nuxeo-connection id="nxcon"></nuxeo-connection>

    <div class="main">

      <nuxeo-selection-toolbar id="toolbar" selected-items="[[selectedItems]]" class="toolbar" on-refresh="_refreshAndFetch" on-refresh-display="_refreshDisplay" on-clear-selected-items="_clearSelectedItems">

        <nuxeo-actions-menu>
          <slot name="selectionActions"></slot>
          <nuxeo-slot slot="RESULTS_SELECTION_ACTIONS" model="[[actionContext]]"></nuxeo-slot>
        </nuxeo-actions-menu>

      </nuxeo-selection-toolbar>

      <div class="resultActions" hidden\$="[[hideContentViewActions]]">

        <template is="dom-if" if="[[_displaySort(displaySort, view)]]">
          <nuxeo-sort-select options="[[_sortOptions(view, sortOptions)]]" selected="{{sortSelected}}" on-sort-order-changed="_sortChanged"></nuxeo-sort-select>
        </template>
        <template is="dom-if" if="[[_displayQuickFilters(displayQuickFilters, view)]]">
          <nuxeo-quick-filters quick-filters="{{quickFilters}}" on-quick-filters-changed="fetch">
          </nuxeo-quick-filters>
        </template>
        <span class="resultsCount" hidden\$="[[!_showResultsCount(nxProvider, resultsCount)]]">[[i18n('results.heading.count', resultsCount)]]</span>

        <div class="rightHand">
          <slot name="actions"></slot>

          <!-- 0.9 compatibility -->
          <nuxeo-slot slot="DOCUMENT_LISTING_ACTIONS" model="[[actionContext]]"></nuxeo-slot>

          <nuxeo-slot slot="RESULTS_ACTIONS" model="[[actionContext]]"></nuxeo-slot>

          <div class="viewModes">
            <template is="dom-repeat" items="[[_displayModes]]">
              <paper-icon-button class="displayMode" icon="[[item.icon]]" title\$="[[_displayModeTitle(item, i18n)]]" selected\$="[[_isCurrentDisplayMode(item, displayMode)]]" disabled\$="[[_isCurrentDisplayMode(item, displayMode)]]" on-tap="_toggleDisplayMode">
              </paper-icon-button>
            </template>
          </div>
        </div>

      </div>

      <iron-pages id="views" attr-for-selected="name" selected="{{displayMode}}" selected-item="{{view}}" on-iron-items-changed="_updateViews">
        <slot></slot>
      </iron-pages>

    </div>

    <iron-localstorage id="prefStorage" name="[[_localStorageName]]" value="{{_settings}}" on-iron-localstorage-load="restoreSettings" on-iron-localstorage-load-empty="initializeSettings" auto-save-disabled="">
    </iron-localstorage>
`,

  is: 'nuxeo-results',
  behaviors: [RoutingBehavior, FormatBehavior],

  properties: {
    /**
     * the page provider to display results for
     */
    nxProvider: {
      type: Object,
      observer: '_providerChanged',
    },

    /**
     * Used as key for settings in local storage. Without a `name`, no settings are saved/restored.
     */
    name: String,

    /**
     * Active display mode. If no `displayMode` is specified, it will fallback to the first display mode found.
     */
    displayMode: {
      type: String,
      notify: true
    },

    view: {
      type: Object,
      observer: '_viewChanged'
    },

    /**
     * Document available in the action context.
     */
    document: Object,

    actionContext: {
      type: Object,
      notify: true
    },
    _settings: {
      type: Object
    },
    selectedItems: {
      type: Array,
      value: [],
      notify: true
    },
    columns: {
      type: Array,
      value: []
    },
    hideContentViewActions: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },
    /**
     * If enabled, it displays the list of quickfilters defined on the associated
     * page provider at the top of the search results.
     */
    displayQuickFilters: {
      type: Boolean,
      value: false,
    },
    /**
     * Specify here a subset of quick filters in case you want to
     * specify the ones to be displayed on the search results.
     * Expected format : ['quickfilter1','quickfilter2']
     */
    quickFilters: {
      type: Array
    },
    /**
     * If enabled, it allows to sort the results of the search results.
     */
    displaySort: {
      type: Boolean,
      value: false,
    },
    /**
     * Sort option selected by default (can retrieve the one configured in sort-options).
     */
    sortSelected: {
      type: Object,
      observer: '_sortSelectedChanged',
    },
    /**
     * List of properties available to sort the result list.
     * It should be formatted as a JSON array of objects like:
     * ```
     * [
     *   {field: 'dc:title', label: this.i18n('searchResults.sort.field.title'), order: 'asc'},
     *   {field: 'dc:created', label: this.i18n('searchResults.sort.field.created'), order: 'asc', selected: true}
     * ]
     * ```
     */
    sortOptions: {
      type: Array,
      value: [],
    },

    resultsCount: {
      type: Number,
    },

    /**
     * `true` if results are being loaded.
     */
    loading: {
      type: Boolean,
      reflectToAttribute: true,
      notify: true,
      readOnly: true,
      value: false,
    },


    _displayModes:  Array,

    _localStorageName: String

  },

  observers: [
    '_updateStorage(name)',
    '_updateActionContext(displayMode, nxProvider.*, nxProvider.sort.*, selectedItems, columns, document)'
  ],

  listeners: {
    'settings-changed': '_updateActionContext'
  },

  ready: function() {
    this.$.nxcon.connect().then(this._updateStorage.bind(this));
  },

  get items() {
    if (this.view && this.view.items) {
      return this.view.items;
    }
    // XXX: this.view.items is not working
    return (this.view && this.view.$.list) ? this.view.$.list.items : [];
  },

  detached: function() {
    if (this.view) {
      this.unlisten(this.view, 'columns-changed', '_columnsChanged');
      this.unlisten(this.view, 'selected-items-changed', '_selectedItemsChanged');
      this.unlisten(this.view, 'settings-changed', '_saveViewSettings');
    }
    this.columns = [];
    this.view = null;
  },

  _displayQuickFilters: function() {
    // XXX check previous view properties for compatibility
    return this.view && !this.view.handlesFiltering &&
      (this.view.hasAttribute('display-quick-filters') || this.displayQuickFilters);
  },

  _displaySort: function() {
    // XXX check previous view properties for compatibility
    return this.view && !this.view.handlesSorting && (this.view.hasAttribute('display-sort') || this.displaySort);
  },

  _sortOptions: function() {
    // XXX check previous view properties for compatibility
    return (this.view && this.view.sortOptions) || this.sortOptions;
  },

  _sortChanged: function() {
    if (this.sortSelected && this.nxProvider) {
      var sort = {};
      sort[this.sortSelected.field] = this.sortSelected.order;
      this.nxProvider.sort = sort;
      this.fetch();
    }
  },

  _sortSelectedChanged: function(newSort, oldSort) {
    // do not trigger fetch results when sort options are being initialized
    if (newSort && oldSort) {
      this._sortChanged();
    }
  },

  fetch: function() {
    return new Promise(function(resolve, error) {
      this.debounce('fetch', function() {
        if (this.view) {
          this.view.fetch().then(resolve).catch(error);
        } else {
          resolve();
        }
      }.bind(this), 100);
    }.bind(this));
  },

  reset: function() {
    if (this.view) {
      this.view.reset();
    }
  },

  _viewChanged: function(view, oldView) {
    if (oldView) {
      this.unlisten(oldView, 'columns-changed', '_columnsChanged');
      this.unlisten(oldView, 'selected-items-changed', '_selectedItemsChanged');
      this.unlisten(oldView, 'settings-changed', '_saveViewSettings');
      this.unlisten(oldView, 'items-changed', '_itemsChanged');
      this.unlisten(oldView, 'quick-filters-changed', '_quickFiltersChanged');
    }
    if (view) {
      // initialize columns
      if (this.columns.length === 0 && Array.isArray(view.columns) && view.columns.length > 0) {
        this.set('columns', view.columns);
      }
      // restore settings
      if (this._settings) {
        this.set('_settings.displayMode', this.displayMode);
        this.saveSettings();
        view.settings = this._settings[this.displayMode];
      }
      // restore selection
      if (this.selectedItems) {
        this.selectedItems = []; // NXP-23186: this line removes selection synchronization between view modes
        this.selectItems(this.selectedItems.slice());
      }
      // listen for columns, settings and selection changed
      this.listen(view, 'columns-changed', '_columnsChanged');
      this.listen(view, 'selected-items-changed', '_selectedItemsChanged');
      this.listen(view, 'settings-changed', '_saveViewSettings');
      this.listen(view, 'items-changed', '_itemsChanged');
      this.listen(view, 'quick-filters-changed', '_quickFiltersChanged');
      view.nxProvider = this.nxProvider;
      // update view
      this.reset();
      this.fetch();
      this.fire('search-results-view', {view: view, name: this.name});
    }
  },

  _updateViews: function() {
    var hasDisplayMode;
    this._displayModes = [];
    this.$.views.items.forEach(function(view) {
      var name = view.getAttribute("name"),
          icon = view.getAttribute("icon");
      view.nxProvider = this.nxProvider;
      if (this._settings && view.settings) {
        view.settings = this._settings[name];
      }
      if (name === this.displayMode) {
        hasDisplayMode = true;
      }
      this.push('_displayModes', {name: name, icon: icon});
    }.bind(this));

    // if current selected display mode is not available use the first one
    if (!hasDisplayMode) {
      this.displayMode = this._displayModes[0] && this._displayModes[0].name;
    }

  },

  _displayModeTitle: function(item) {
    return this.i18n('displayModeButton.display.' + item.name);
  },

  _isCurrentDisplayMode: function(item) {
    return item.name === this.displayMode;
  },

  _toggleDisplayMode: function(e) {
    this.displayMode = e.model.item.name;
  },

  _refreshAndFetch: function() {
    if (this.view) {
      this.view.reset();
      this.fetch();
    }
  },

  _updateStorage: function() {
    if (this.$.nxcon.user && this.name) {
      this._localStorageName = this.$.nxcon.user.id + '-nuxeo-results-' + this.name;
    }
  },

  _updateActionContext: function() {
    this.actionContext = {
      baseUrl: this.$.nxcon.url,
      displayMode: this.displayMode,
      nxProvider: this.nxProvider,
      selectedItems: this.selectedItems,
      items: this.items,
      columns: this.columns,
      document: this.document
    };
  },

  _clearSelectedItems: function() {
    this.clearSelection();
  },

  initializeSettings: function() {
    this._settings = {};
  },

  restoreSettings: function() {
    if (this._settings && this.name) {
      if (this._settings.displayMode && this._settings.displayMode.length > 0) {
        this.displayMode = this._settings.displayMode;
      }
      if (this._settings[this.displayMode] && this.view) {
        this.view.settings = this._settings[this.displayMode];
      }
    }
  },

  saveSettings: function() {
    if (this.name && this._localStorageName) {
      this.$.prefStorage.save();
    }
  },

  _columnsChanged: function(e) {
    this.columns = e.target.columns;
  },

  _selectedItemsChanged: function() {
    this.selectedItems = [];
    this.set('selectedItems', this.view.selectedItems);
  },

  _refreshDisplay: function(e) {
    this.refresh();

    if (this.selectedItems && this.selectedItems.length > 0) {
      var tmp = this.selectedItems.slice();
      this.selectedItems = [];
      if (e.detail.focusIndex || e.detail.focusIndex === 0) {
        this.selectItems(tmp);
        if (e.detail.focusIndex > -1) {
          this.view.focusOnIndexIfNotVisible && this.view.focusOnIndexIfNotVisible(e.detail.focusIndex);
        }
      }
    }
  },

  get size() {
    return this.view.size;
  },

  clearSelection: function() {
    this.view.clearSelection();
  },

  selectItems: function(items) {
    this.clearSelection();
    this.view.selectItems(items);
    this.view.notifyResize();
  },

  refresh: function() {
    this.view.notifyResize();
  },

  _saveViewSettings: function() {
    if (this.view.settings) {
      this.set('_settings.' + this.displayMode, this.view.settings);
      this.saveSettings();
    }
  },

  _providerChanged: function(provider, oldProvider) {
    if (oldProvider) {
      this.unlisten(oldProvider, 'loading-changed', '_loadingChanged');
    }
    if (provider) {
      this.listen(provider, 'loading-changed', '_loadingChanged');
      this._setLoading(provider.loading);
    }
  },

  _loadingChanged: function() {
    this._setLoading(this.nxProvider.loading);
  },

  _showResultsCount: function() {
    return this.nxProvider && this.resultsCount;
  },

  _itemsChanged: function(e) {
    if (this.nxProvider && e.detail.value) {
      this.resultsCount = this.nxProvider.resultsCount;
    }
  },

  _quickFiltersChanged: function(e) {
    if (this.nxProvider && e.detail.value) {
      this.quickFilters = this.nxProvider.quickFilters;
    }
  }
});

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

import '@polymer/iron-localstorage/iron-localstorage.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import { config } from '@nuxeo/nuxeo-elements';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-quick-filters/nuxeo-quick-filters.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-actions-menu.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-sort-select.js';
import '../nuxeo-selection/nuxeo-selection-toolbar.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';

const hasSelectAllEnabled = config.get('selection.selectAllEnabled', false);
const __globalPrefsCache = new Map();

/**
An element to display results from a page provider.

It supports multiple display modes and handles toggling between them.
Each display mode is associated to a display element which has to be declared as a children with `class="results"` and
must also have a `name` and `icon` to be used as toggle button, ex:

  <nuxeo-data-table class="results" name="table" icon="icon="icons:list">

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

Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host([loading]) .resultsCount {
        opacity: 0.1;
        transition: opacity 300ms ease-in-out;
      }

      [hidden] {
        display: none !important;
      }

      #views slot::slotted(*),
      #views::slotted(*) /* edge */ {
        display: block;
        position: relative;
        height: var(
          --nuxeo-results-view-height,
          calc(100vh - 130px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)))
        );
      }

      /* because some views can delegate actions into the resultActions panel */
      #views slot::slotted(:not([handles-select-all])),
      #views slot::slotted(:not([handles-sorting])),
      #views::slotted(:not([handles-select-all])) /* edge */,
      #views::slotted(:not([handles-sorting])) /* edge */ {
        height: calc(var(--nuxeo-results-view-height, calc(100vh - 130px - var(--nuxeo-app-top))) - 66px);
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

      .resultActions {
        @apply --layout-vertical;
      }

      .commonActions,
      .delegatedActions,
      .viewModes,
      .rightHand {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .commonActions,
      .delegatedActions .resultActions,
      .rightHand {
        @apply --layout-wrap;
      }

      .rightHand {
        @apply --layout-flex;
        @apply --layout-end-justified;
      }

      .commonActions,
      .delegatedActions {
        @apply --layout-flex;
      }

      .delegatedActions {
        @apply --iron-data-table-header;
        margin-top: 13px;
      }

      .delegatedActions > *:not(:last-child) {
        margin: 0 22px;
      }

      .resultActions {
        margin-bottom: 16px;
        min-height: 38px;
      }

      .resultActions paper-icon-button {
        width: 2em;
        height: 2em;
        padding: 0.3em;
        margin-left: 4px;
      }

      .resultsCount {
        opacity: 0.8;
        margin-right: 16px;
        transition: opacity 100ms ease-in-out;
      }

      paper-icon-button[selected] {
        color: var(--icon-toggle-outline-color, var(--nuxeo-action-color-activated));
      }

      nuxeo-actions-menu {
        height: 100%;
        max-width: var(--nuxeo-results-selection-actions-menu-max-width, 280px);
      }

      nuxeo-quick-filters {
        margin-right: 16px;
      }
    </style>

    <nuxeo-connection id="nxcon"></nuxeo-connection>
    <nuxeo-resource id="preferences"></nuxeo-resource>

    <div class="main">
      <nuxeo-selection-toolbar
        id="toolbar"
        selected-items="[[selectedItems]]"
        select-all-active="[[selectAllActive]]"
        class="toolbar"
        on-refresh="_refreshAndFetch"
        on-refresh-display="_refreshDisplay"
        on-clear-selected-items="_clearSelectedItems"
      >
        <slot name="selectionActions">
          <nuxeo-actions-menu>
            <nuxeo-slot name="RESULTS_SELECTION_ACTIONS" model="[[actionContext]]"></nuxeo-slot>
          </nuxeo-actions-menu>
        </slot>
      </nuxeo-selection-toolbar>

      <div class="resultActions" hidden$="[[hideContentViewActions]]">
        <div class="commonActions">
          <span class="resultsCount" aria-live="polite" hidden$="[[!_showResultsCount(nxProvider, resultsCount)]]">
            [[_resultsCountLabel]]
          </span>
          <template is="dom-if" if="[[_displayQuickFilters(displayQuickFilters, view)]]">
            <nuxeo-quick-filters
              quick-filters="{{quickFilters}}"
              on-quick-filters-changed="fetch"
            ></nuxeo-quick-filters>
          </template>

          <div class="rightHand">
            <slot name="actions">
              <nuxeo-slot name="RESULTS_ACTIONS" model="[[actionContext]]"></nuxeo-slot>
            </slot>

            <div class="viewModes">
              <template is="dom-repeat" items="[[_displayModes]]">
                <paper-icon-button
                  class="displayMode"
                  icon="[[item.icon]]"
                  title$="[[_displayModeTitle(item, i18n)]]"
                  selected$="[[_isCurrentDisplayMode(item, displayMode)]]"
                  disabled$="[[_isCurrentDisplayMode(item, displayMode)]]"
                  on-tap="_toggleDisplayMode"
                  aria-selected="true"
                >
                </paper-icon-button>
              </template>
            </div>
          </div>
        </div>
        <div class="delegatedActions" hidden="[[!_displayDelegatedAction(displaySort, view)]]">
          <template is="dom-if" if="[[_displaySelectAll(view, view.selectAllEnabled)]]">
            <nuxeo-checkmark checked="[[_isChecked(view.selectAllActive, _excludedDocs)]]" on-click="_toggleSelectAll">
            </nuxeo-checkmark>
          </template>
          <template is="dom-if" if="[[_displaySort(displaySort, view)]]">
            <nuxeo-sort-select
              options="[[_sortOptions(view, sortOptions)]]"
              selected="{{sortSelected}}"
              on-sort-order-changed="_sortChanged"
            ></nuxeo-sort-select>
          </template>
        </div>
      </div>

      <iron-pages
        id="views"
        attr-for-selected="name"
        selected="{{displayMode}}"
        selected-item="{{view}}"
        on-iron-items-changed="_updateViews"
      >
        <slot></slot>
      </iron-pages>
    </div>

    <iron-localstorage
      id="prefStorage"
      name="[[_localStorageName]]"
      value="{{_settings}}"
      on-iron-localstorage-load="restoreSettings"
      on-iron-localstorage-load-empty="initializeSettings"
      auto-save-disabled
    >
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
      notify: true,
    },

    view: {
      type: Object,
      notify: true,
      observer: '_viewChanged',
    },

    /**
     * Document available in the action context.
     */
    document: Object,

    actionContext: {
      type: Object,
      notify: true,
    },
    _settings: {
      type: Object,
    },
    selectedItems: {
      type: Array,
      value: [],
      notify: true,
    },
    columns: {
      type: Array,
      value: [],
    },
    hideContentViewActions: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
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
      type: Array,
      notify: true,
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

    _resultsCountLabel: {
      type: String,
      computed: '_computeCountLabel(resultsCount)',
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

    _displayModes: Array,

    selectAllActive: {
      type: Boolean,
      notify: true,
      value: false,
    },

    _localStorageName: String,

    _excludedDocs: {
      type: Number,
      value: 0,
    },

    // -------------------------
    // Global results prefs
    // -------------------------
    useGlobalPrefs: {
      type: Boolean,
      value: false,
    },

    // parsed object you can bind to (columns order/sizes/sort etc.)
    globalPrefs: {
      type: Object,
      notify: true,
      value: () => {
        return {};
      },
    },

    _prefsSaveDebouncer: Object,

    _connectedUser: {
      type: Object,
    },

    _connectedUserId: {
      type: String,
    },

    // -------------------------
    // Doc-level results prefs
    // -------------------------
    // enable/disable doc-level preferences (opt-in)
    useDocumentPrefs: {
      type: Boolean,
      value: false,
    },

    _docPrefsSaveDebouncer: Object,
  },

  observers: [
    '_selectAllChanged(view)',
    '_updateStorage(name)',
    '_updateActionContext(displayMode, nxProvider.*, nxProvider.sort.*, selectedItems, columns.*, document, view.*)',

    // global prefs
    '_loadGlobalPrefs(useGlobalPrefs, nxProvider, _connectedUserId)',
    '_applyGlobalPrefs(useGlobalPrefs, globalPrefs, view)',

    // doc prefs (enricher-based)
    '_applyDocPrefs(useDocumentPrefs, document, view)',
  ],

  listeners: {
    'settings-changed': '_updateActionContext',
  },

  ready() {
    this.$.nxcon.connect().then((user) => {
      this._connectedUser = user;
      this._connectedUserId = user && (user.id || user.uid || user.username);
      this._updateStorage();
    });
  },

  get items() {
    if (this.view && this.view.items) {
      return this.view.items;
    }
    // XXX: this.view.items is not working
    return this.view && this.view.$.list ? this.view.$.list.items : [];
  },

  detached() {
    if (this.view) {
      this.unlisten(this.view, 'columns-changed', '_columnsChanged');
      this.unlisten(this.view, 'selected-items-changed', '_selectedItemsChanged');
      this.unlisten(this.view, 'settings-changed', '_saveViewSettings');
    }

    // flush pending debounced preference save BEFORE clearing the view
    if (this._prefsSaveDebouncer && this._prefsSaveDebouncer.flush) {
      this._prefsSaveDebouncer.flush();
    }
    if (this._docPrefsSaveDebouncer && this._docPrefsSaveDebouncer.flush) {
      this._docPrefsSaveDebouncer.flush();
    }

    this.columns = [];
    this.view = null;
  },

  _displayQuickFilters() {
    // XXX check previous view properties for compatibility
    return (
      this.view &&
      !this.view.handlesFiltering &&
      (this.view.hasAttribute('display-quick-filters') || this.displayQuickFilters)
    );
  },

  _displayDelegatedAction() {
    return this._displaySelectAll() || this._displaySort();
  },

  _displaySelectAll() {
    return (
      this.view && !this.view.handlesSelectAll && this.view.hasAttribute('selection-enabled') && hasSelectAllEnabled
    );
  },

  _displaySort() {
    // XXX check previous view properties for compatibility
    return this.view && !this.view.handlesSorting && (this.view.hasAttribute('display-sort') || this.displaySort);
  },

  _computeCountLabel() {
    // Fetch the property value from web-ui-properties.xml
    const isNumberFormattingEnabled =
      (Nuxeo && Nuxeo.UI && Nuxeo.UI.config && Nuxeo.UI.config.numberFormattingEnabled) || false;
    if (this.resultsCount < 0) {
      return this.i18n('results.heading.count.unknown');
    }
    if (isNumberFormattingEnabled) {
      const formattedCount = new Intl.NumberFormat().format(this.resultsCount);
      return this.i18n('results.heading.count', formattedCount);
    }
    return this.i18n('results.heading.count', this.resultsCount);
  },

  _sortOptions() {
    // XXX check previous view properties for compatibility
    return (this.view && this.view.sortOptions) || this.sortOptions;
  },

  _sortChanged() {
    if (this.sortSelected && this.nxProvider) {
      const sort = {};
      sort[this.sortSelected.field] = this.sortSelected.order;
      this.nxProvider.sort = sort;
      this.fetch();
    }
  },

  _sortSelectedChanged(newSort, oldSort) {
    // do not trigger fetch results when sort options are being initialized
    if (newSort && oldSort) {
      this._sortChanged();
    }
  },

  _toggleSelectAll() {
    if (!this.view) {
      return;
    }
    if (this._excludedDocs === 0 && this.view.selectAllActive) {
      this.clearSelection();
    } else {
      this.selectAll();
    }
  },

  fetch() {
    return new Promise((resolve, error) => {
      this._fetchDebouncer = Debouncer.debounce(this._fetchDebouncer, timeOut.after(100), () => {
        if (this.view) {
          this.view.fetch().then(resolve).catch(error);
        } else {
          resolve();
        }
      });
    });
  },

  reset() {
    if (this.view) {
      this.view.reset();
    }
  },

  _viewChanged(view, oldView) {
    if (oldView) {
      this.unlisten(oldView, 'columns-changed', '_columnsChanged');
      this.unlisten(oldView, 'selected-items-changed', '_selectedItemsChanged');
      this.unlisten(oldView, 'settings-changed', '_saveViewSettings');
      this.unlisten(oldView, 'items-changed', '_itemsChanged');
      this.unlisten(oldView, 'quick-filters-changed', '_quickFiltersChanged');
      this.unlisten(oldView, 'select-all-active-changed', '_selectAllActiveChanged');
      this.unlisten(oldView, '_excluded-items-changed', '_excludedDocsChanged');
      // we need to clear the selected items and selection (removes selection synchronization)
      if (this.selectedItems) {
        this.selectedItems = [];
      }
      this.selectAllActive = false;
    }
    if (view) {
      // initialize columns
      this.set('columns', view.columns);
      if (Array.isArray(view.columns)) {
        this.listen(view, 'columns-changed', '_columnsChanged');
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
      this.listen(view, 'selected-items-changed', '_selectedItemsChanged');
      this.listen(view, 'settings-changed', '_saveViewSettings');
      this.listen(view, 'items-changed', '_itemsChanged');
      this.listen(view, 'quick-filters-changed', '_quickFiltersChanged');
      this.listen(view, 'select-all-active-changed', '_selectAllActiveChanged');
      this.listen(view, '_excluded-items-changed', '_excludedDocsChanged');
      view.nxProvider = this.nxProvider;
      // update view
      this.reset();
      this.fetch();
      this.fire('search-results-view', { view, name: this.name });
    }
  },

  _selectAllChanged() {
    if (this.view && this.view.selectionEnabled) {
      this.view.selectAllEnabled = hasSelectAllEnabled;
    }
  },

  _selectAllActiveChanged() {
    this.selectAllActive = this.view.selectAllActive;
  },

  _updateViews() {
    let hasDisplayMode;
    this._displayModes = [];
    this.$.views.items.forEach((view) => {
      const name = view.getAttribute('name');
      const icon = view.getAttribute('icon');
      view.nxProvider = this.nxProvider;
      if (this._settings && view.settings) {
        view.settings = this._settings[name];
      }
      if (name === this.displayMode) {
        hasDisplayMode = true;
      }
      this.push('_displayModes', { name, icon });
    });

    // if current selected display mode is not available use the first one
    if (!hasDisplayMode) {
      this.displayMode = this._displayModes[0] && this._displayModes[0].name;
    }
  },

  _displayModeTitle(item) {
    return this.i18n(`displayModeButton.display.${item.name}`);
  },

  _isCurrentDisplayMode(item) {
    return item.name === this.displayMode;
  },

  _toggleDisplayMode(e) {
    this.displayMode = e.model.item.name;
  },

  _refreshAndFetch() {
    if (this.view) {
      this.view.reset();
      this.fetch();
    }
  },

  _updateStorage() {
    if (this.$.nxcon.user && this.name) {
      this._localStorageName = `${this.$.nxcon.user.id}-nuxeo-results-${this.name}`;
    }
  },

  _updateActionContext() {
    this.actionContext = {
      baseUrl: this.$.nxcon.url,
      displayMode: this.displayMode,
      nxProvider: this.nxProvider,
      selectedItems: this.selectedItems,
      items: this.items,
      columns: this.columns,
      document: this.document,
      selection: this.view && this.view.selectAllActive ? this.view : this.selectedItems,
    };
  },

  _clearSelectedItems() {
    this.clearSelection();
  },

  initializeSettings() {
    this._settings = {};
  },

  restoreSettings() {
    // XXX _isRestoring is a control flag to prevent restoring from triggering a save (see WEBUI-581)
    this._isRestoring = true;
    if (this._settings && this.name) {
      if (this._settings.displayMode && this._settings.displayMode.length > 0) {
        this.displayMode = this._settings.displayMode;
      }
      if (this._settings[this.displayMode] && this.view) {
        this.view.settings = this._settings[this.displayMode];
      }
    }
    this._isRestoring = false;
  },

  saveSettings() {
    if (this.name && this._localStorageName) {
      this.$.prefStorage.save();
    }
  },

  _columnsChanged(e) {
    this.columns = e.target.columns;
  },

  _selectedItemsChanged() {
    this.selectedItems = [];
    this.set('selectedItems', this.view.selectedItems);
  },

  _refreshDisplay(e) {
    this.refresh();

    // keep compatibility with previous behavior, as we don't need it for select all
    if (this.selectedItems && this.selectedItems.length > 0 && !this.selectAllActive) {
      const tmp = this.selectedItems.slice();
      this.selectedItems = [];
      if (e.detail.focusIndex || e.detail.focusIndex === 0) {
        this.selectItems(tmp);
        if (e.detail.focusIndex > -1 && this.view.focusOnIndexIfNotVisible) {
          this.view.focusOnIndexIfNotVisible(e.detail.focusIndex);
        }
      }
    }
  },

  get size() {
    return this.view.size;
  },

  selectAll() {
    this.view.selectAll();
  },

  clearSelection() {
    this._excludedDocs = -1;
    this.selectAllActive = false;
    this.view.clearSelection();
  },

  selectItems(items) {
    this.clearSelection();
    this.view.selectItems(items);
    this.view.notifyResize();
  },

  refresh() {
    this.view.notifyResize();
  },

  _saveViewSettings() {
    if (this.view.settings && !this._isRestoring) {
      this.set(`_settings.${this.displayMode}`, this.view.settings);
      this.saveSettings();

      // ---- global level ----
      if (this.useGlobalPrefs) {
        this._debounceSave('_prefsSaveDebouncer', () => {
          this.saveGlobalResultsPrefs(this.view.settings).catch((error) => {
            // log the error instead of silently swallowing it
            // so failures in saving global results preferences are visible
            // eslint-disable-next-line no-console
            console.warn('Failed to save global results preferences', error);
          });
        });
      }

      // ---- doc level ----
      if (this.useDocumentPrefs && this.document && this.document.path) {
        const docKey = this._getDocResultsPrefsKey();
        this._debounceSave('_docPrefsSaveDebouncer', () => {
          this.saveDocPrefs(this.document.path, docKey, this.view.settings).catch((error) => {
            // eslint-disable-next-line no-console
            console.warn('Failed to save document results preferences', {
              path: this.document && this.document.path,
              key: docKey,
              error,
            });
          });
        });
      }
    }
  },

  _providerChanged(provider, oldProvider) {
    if (oldProvider) {
      this.unlisten(oldProvider, 'loading-changed', '_loadingChanged');
    }
    if (provider) {
      this.listen(provider, 'loading-changed', '_loadingChanged');
      this._setLoading(provider.loading);
    }
  },

  _loadingChanged() {
    this._setLoading(this.nxProvider.loading);
  },

  _showResultsCount() {
    return this.nxProvider && this.resultsCount;
  },

  _itemsChanged(e) {
    if (this.nxProvider && e.detail.value) {
      this.resultsCount = this.nxProvider.resultsCount;
      /**
       * XXX - set the resultsCount to be used when selectAll is active, because paginable views don't know the total
       * number of results, only the ones in the loaded pages
       */
      this.$.toolbar._resultsCount = this.resultsCount - this._excludedDocs;
    }
  },

  _quickFiltersChanged(e) {
    if (this.nxProvider && e.detail.value) {
      this.quickFilters = this.nxProvider.quickFilters;
    }
  },

  _isChecked(selectAllActive, _excludedDocs) {
    return selectAllActive && _excludedDocs === 0;
  },

  _excludedDocsChanged(e) {
    if (typeof e.detail.value === 'number' && !Number.isNaN(e.detail.value)) {
      this._excludedDocs = e.detail.value;
    }
    if (Array.isArray(e.detail.value)) {
      this._excludedDocs = e.detail.value.length;
    }
    this.$.toolbar._resultsCount = this.resultsCount - this._excludedDocs;
  },

  _getProviderName(nxProvider) {
    return nxProvider && (nxProvider.provider || (nxProvider.getAttribute && nxProvider.getAttribute('provider')));
  },

  _getUserId() {
    return this._connectedUserId || null;
  },

  _cacheKey(userId, providerName) {
    // stable cache key: user + provider
    return `${userId}::${providerName}`;
  },

  // ------------------------------
  // Preference plumbing (generic)
  // ------------------------------

  _prefAcceptHeaders() {
    return { accept: 'text/plain,application/json' };
  },

  _parsePrefValue(raw) {
    // raw is typically: { entity-type: "preference", id: "...", value: "<json-string>" }
    if (!raw || !raw.value) {
      return {};
    }
    try {
      return JSON.parse(raw.value);
    } catch (e) {
      // tolerate legacy/plain values
      return {};
    }
  },

  /**
   * Configure preferences for /me/preferences/<key> GET/PUT.
   * This is your current "global" transport.
   */
  _configureGlobalPreferencesResource(prefKey) {
    this.$.preferences.path = `/me/preferences/${encodeURIComponent(prefKey)}`;
    this.$.preferences.params = null;
    this.$.preferences.enrichers = {};
    this.$.preferences.headers = this._prefAcceptHeaders();
    this.$.preferences.data = null;
  },

  /**
   * GET preference object from /me/preferences/<key>
   */
  async _getGlobalPreference(prefKey) {
    this._configureGlobalPreferencesResource(prefKey);
    this.$.preferences.contentType = 'application/json';
    const raw = await this.$.preferences.get();
    return this._parsePrefValue(raw);
  },

  /**
   * PUT preference object to /me/preferences/<key>
   * Uses text/plain payload (same as your current implementation).
   */
  async _putGlobalPreference(prefKey, obj) {
    const payload = JSON.stringify(obj || {});
    this._configureGlobalPreferencesResource(prefKey);
    this.$.preferences.contentType = 'text/plain';
    this.$.preferences.data = payload;
    await this.$.preferences.put();
  },

  /**
   * Configure preferences for /path/<docPath>/@preferences PUT.
   * This is your doc-level transport.
   */
  _configureDocPreferencesResource(docPath) {
    const normalized = docPath.startsWith('/') ? docPath.substring(1) : docPath;
    this.$.preferences.path = `/path/${normalized}/@preferences`;
    this.$.preferences.params = null;
    this.$.preferences.enrichers = {};
    this.$.preferences.headers = { accept: 'application/json' };
  },

  /**
   * PUT document preference (key/value) to /path/<docPath>/@preferences
   * Value is stored as JSON string (consistent with /me/preferences usage).
   */
  async _putDocPreference(docPath, key, obj) {
    this._configureDocPreferencesResource(docPath);
    this.$.preferences.contentType = 'application/json';
    const prefs = {};
    prefs[key] = JSON.stringify(obj || {});
    this.$.preferences.data = {
      'entity-type': 'userPreferences',
      preferences: prefs,
    };
    await this.$.preferences.put();
  },

  async _loadGlobalPrefs(enabled, nxProvider, connectedUserId) {
    if (!enabled) {
      return;
    }

    const providerName = this._getProviderName(nxProvider);
    if (!providerName) {
      return;
    }

    const userId = connectedUserId || this._getUserId();
    if (!userId) {
      return;
    }

    const cacheKey = this._cacheKey(userId, providerName);
    const cached = __globalPrefsCache.get(cacheKey);
    if (cached) {
      this.globalPrefs = cached;
      return;
    }

    try {
      const parsed = await this._getGlobalPreference(providerName);
      __globalPrefsCache.set(cacheKey, parsed);
      this.globalPrefs = parsed;
    } catch (e) {
      const empty = {};
      this.globalPrefs = empty;
    }
  },

  async saveGlobalResultsPrefs(prefsObj) {
    const providerName = this._getProviderName(this.nxProvider);
    if (!providerName) {
      throw new Error('Cannot save global results prefs: missing nxProvider.provider');
    }

    const userId = this._getUserId();
    if (!userId) {
      throw new Error('Cannot save global results prefs: missing user id');
    }

    await this._putGlobalPreference(providerName, prefsObj);

    const cacheKey = this._cacheKey(userId, providerName);
    __globalPrefsCache.set(cacheKey, prefsObj || {});
    this.globalPrefs = prefsObj || {};
  },

  _applyGlobalPrefs(enabled, prefs, view) {
    if (!enabled || !view || !prefs || Object.keys(prefs).length === 0) {
      return;
    }
    this._applyPrefsToView(view, prefs);
  },

  async saveDocPrefs(docPath, key, value) {
    if (!docPath) {
      throw new Error('Cannot save doc prefs: missing docPath');
    }
    if (!key) {
      throw new Error('Cannot save doc prefs: missing key');
    }
    await this._putDocPreference(docPath, key, value);
  },

  _getDocResultsPrefsKey() {
    // one stable key for doc-level "results table prefs" stored on each folder/doc
    return 'nuxeo.webui.searchResults.docResultsTable';
  },

  _applyDocPrefs(enabled, document, view) {
    if (!enabled || !document || !view) {
      return;
    }

    const key = this._getDocResultsPrefsKey();
    const prefs = this._getDocPrefsFromEnricher(document, key);

    if (!prefs) {
      return;
    }

    this._applyPrefsToView(view, prefs);
  },

  _applyPrefsToView(view, prefs) {
    if (!view || !prefs) {
      return;
    }
    this._isRestoring = true;
    try {
      view.settings = prefs;
    } finally {
      this._isRestoring = false;
    }
  },

  _debounceSave(debouncerField, fn, wait = 300) {
    this[debouncerField] = Debouncer.debounce(this[debouncerField], timeOut.after(wait), fn);
  },

  _getDocPrefsFromEnricher(doc, prefKey) {
    const prefsMap =
      doc &&
      doc.contextParameters &&
      doc.contextParameters.userPreferences &&
      doc.contextParameters.userPreferences.preferences;

    if (!prefsMap || typeof prefsMap !== 'object') {
      return null;
    }

    const rawValue = prefsMap[prefKey];
    if (!rawValue) {
      return null;
    }

    // stored as JSON string (recommended)
    if (typeof rawValue === 'string') {
      try {
        return JSON.parse(rawValue);
      } catch (e) {
        return null;
      }
    }

    // if backend ever returns already-parsed object
    if (typeof rawValue === 'object') {
      return rawValue;
    }

    return null;
  },
});

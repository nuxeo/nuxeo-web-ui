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

// global (search provider) prefs cache
const __globalPrefsCache = new Map();
// session-only GET /me/preferences promise
let __allGlobalPrefsPromise = null;

// doc prefs cache
const __docPrefsCache = new Map();

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
              on-quick-filters-changed="_handleUserQuickFilterToggle"
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

    // parsed object to bind to (columns order/sizes/sort etc.)
    globalPrefs: {
      type: Object,
      notify: true,
      value: () => {
        return {};
      },
    },

    // doc-level prefs applied to the view
    docPrefs: {
      type: Object,
      notify: true,
      value: () => {
        return {};
      },
    },

    _prefsSaveDebouncer: Object,

    _connectedUserId: {
      type: String,
    },

    _docPrefsSaveDebouncer: Object,

    // -------------------------
    // Preferences (auto decision)
    // -------------------------
    _shouldUseDocPrefs: {
      type: Boolean,
      computed: '_computeShouldUseDocPrefs(document)',
    },

    _shouldUseGlobalPrefs: {
      type: Boolean,
      computed: '_computeShouldUseGlobalPrefs(document, nxProvider)',
    },

    __hasBackendDocPrefs: {
      type: Boolean,
      value: false,
    },
  },

  observers: [
    '_selectAllChanged(view)',
    '_updateActionContext(displayMode, nxProvider.*, nxProvider.sort.*, selectedItems, columns.*, document, view.*)',

    // doc prefs (auto)
    '_loadDocPrefs(_shouldUseDocPrefs, document, _connectedUserId)',
    '_applyDocPrefs(_shouldUseDocPrefs, docPrefs, view)',

    // global prefs (auto)
    '_loadGlobalPrefs(_shouldUseGlobalPrefs, nxProvider, _connectedUserId)',
    '_applyGlobalPrefs(_shouldUseGlobalPrefs, globalPrefs, view, displayMode)',
    '_connectedUserChanged(_connectedUserId)',

    // Update localStorage key when name changes (different documents have different names)
    '_updateStorage(name, _connectedUserId)',
    '_enforcePendingQuickFilters(quickFilters.*)',
  ],

  listeners: {
    'settings-changed': '_updateActionContext',
  },

  ready() {
    this.$.nxcon.connect().then((user) => {
      this._connectedUserId = user && (user.id || user.uid || user.username);
      this._updateStorage();
    });
  },

  /**
   * Documents currently rendered in the active results view (used for selection and actions).
   *
   * Resolution order:
   * 1. `view.items` when the view already exposes a plain array (e.g. data table, grid).
   * 2. Otherwise `view.$.list.items` when the view delegates to an internal `iron-list`.
   *
   * Right after navigation or refresh, `view` may exist while `$` / `$.list` are not ready yet, or
   * reading `items` can throw inside iron-list. Those cases return `[]` so observers and toolbars
   * do not break.
   */
  get items() {
    if (!this.view) {
      return [];
    }
    try {
      if (Array.isArray(this.view.items)) {
        return this.view.items;
      }
      if (this.view.$ && this.view.$.list) {
        const listItems = this.view.$.list.items;
        return Array.isArray(listItems) ? listItems : [];
      }
    } catch (e) {
      /* Unsafe read during attach/refresh; treat as no rows yet */
      return [];
    }
    return [];
  },

  _handleUserQuickFilterToggle(e) {
    let eventFilters = this.quickFilters;
    if (Array.isArray(e?.detail?.value)) {
      eventFilters = e.detail.value;
    } else if (Array.isArray(e?.target?.quickFilters)) {
      eventFilters = e.target.quickFilters;
    }
    const filters = this._cloneQuickFilters(eventFilters);
    // Single clone suffices — assign shared reference where independent copies are not needed
    const requestId = this._nextQuickFiltersRequestId();
    this._setPendingQuickFilters(filters);

    // Keep provider/view in sync before fetching to avoid stale quick-filter state after navigation.
    if (this.nxProvider) {
      this.set('nxProvider.quickFilters', filters.slice());
    }
    if (this.view?.quickFilters !== undefined) {
      this.view.quickFilters = filters.slice();
    }

    this._scheduleQuickFilterFetch(requestId);
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

    // Flush apply debouncer
    if (this._applyDocPrefsDebouncer && this._applyDocPrefsDebouncer.flush) {
      this._applyDocPrefsDebouncer.flush();
    }

    this._clearPendingQuickFilters();

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
        if (this.view && typeof this.view.fetch === 'function') {
          this.view.fetch().then(resolve).catch(error);
        } else {
          resolve();
        }
      });
    });
  },

  reset() {
    if (this.view) {
      // Guard: only call reset if view exists and method is available.
      if (typeof this.view.reset === 'function') {
        this.view.reset();
      }
    }
  },

  _viewChanged(view, oldView) {
    if (oldView) {
      this.unlisten(oldView, 'columns-changed', '_columnsChanged');
      this.unlisten(oldView, 'selected-items-changed', '_selectedItemsChanged');
      this.unlisten(oldView, 'settings-changed', '_saveViewSettings');
      this.unlisten(oldView, 'items-changed', '_itemsChanged');
      this.unlisten(oldView, 'quick-filters-changed', '_handleViewQuickFiltersSync');
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
      this.listen(view, 'quick-filters-changed', '_handleViewQuickFiltersSync');
      this.listen(view, 'select-all-active-changed', '_selectAllActiveChanged');
      this.listen(view, '_excluded-items-changed', '_excludedDocsChanged');
      view.nxProvider = this.nxProvider;
      // update view - now safe as reset/fetch have defensive checks
      // reset first
      this.reset();

      // restore quick filters after reset — single clone shared safely across provider and view
      const restoredQuickFilters = this._cloneQuickFilters(this.quickFilters);
      if (this.nxProvider) {
        this.set('nxProvider.quickFilters', restoredQuickFilters);
      }

      if (view.quickFilters !== undefined) {
        view.quickFilters = restoredQuickFilters.slice();
      }

      // fetch after state restore
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
    const userId = this.$.nxcon.user?.id || this.$.nxcon.user?.uid || this.$.nxcon.user?.username;
    if (userId && this.name) {
      this._localStorageName = `${userId}-nuxeo-results-${this.name}`;
    }
  },

  _updateActionContext() {
    /* Always publish the base action context so slots receive a model even during
     * the timing window where items are not ready yet; only resolve items once
     * one of the supported data paths is available to avoid flicker.
     *
     * Note: During view initialization, this.items may temporarily return [] even when
     * hasList is true (iron-list not fully ready). This is acceptable because:
     * 1. The observer watches view.* and will fire again when items become available
     * 2. We listen to 'items-changed' event which fires when items are ready (line 581)
     * 3. The temporary [] is quickly replaced, and actions/toolbar update naturally
     */
    try {
      const hasItems = this.view && Array.isArray(this.view.items);
      const hasList = this.view && this.view.$ && this.view.$.list;

      const actionContext = {
        baseUrl: this.$.nxcon.url,
        displayMode: this.displayMode,
        nxProvider: this.nxProvider,
        selectedItems: this.selectedItems,
        columns: this.columns,
        document: this.document,
        selection: this.view && this.view.selectAllActive ? this.view : this.selectedItems,
      };

      if (hasItems || hasList) {
        actionContext.items = this.items;
      }

      this.actionContext = actionContext;
    } catch (e) {
      /* Observer must not throw or selection toolbar stops updating for the rest of the session */
    }
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
    // Guard: only call view method if view is ready.
    if (this.view && typeof this.view.clearSelection === 'function') {
      this.view.clearSelection();
    }
  },

  selectItems(items) {
    this.clearSelection();
    // Guard: only call view methods if view is ready.
    if (this.view && typeof this.view.selectItems === 'function') {
      this.view.selectItems(items);
    }
    if (this.view && typeof this.view.notifyResize === 'function') {
      this.view.notifyResize();
    }
  },

  refresh() {
    this.view.notifyResize();
  },

  _saveViewSettings() {
    if (this.view.settings && !this._isRestoring) {
      this.set('_settings.displayMode', this.displayMode);
      this.saveSettings();

      const isSettingsView = this.displayMode === 'table';

      // ---- doc level (content views) ----
      if (isSettingsView && this.document && this.document.path) {
        const docKey = this._getDocResultsPrefsKey();
        this._debounceSave('_docPrefsSaveDebouncer', () => {
          // Save to backend (primary)
          this.saveDocPrefs(this.document.path, docKey, this.view.settings)
            .then(() => {
              // Sync to localStorage on success (fallback cache)
              this.set(`_settings.${this.displayMode}`, this.view.settings);
              this.saveSettings();
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.warn('Failed to save document results preferences to backend, syncing to localStorage only', {
                path: this.document && this.document.path,
                key: docKey,
                error,
              });
              // Fallback: save to localStorage even if backend fails
              this.set(`_settings.${this.displayMode}`, this.view.settings);
              this.saveSettings();
            });
        });
        return;
      }

      // ---- global level (search providers) ----
      if (isSettingsView && this._shouldUseGlobalPrefs) {
        this._debounceSave('_prefsSaveDebouncer', () => {
          // Save to backend (primary)
          this.saveGlobalResultsPrefs(this.view.settings)
            .then(() => {
              // Sync to localStorage on success (fallback cache)
              this.set(`_settings.${this.displayMode}`, this.view.settings);
              this.saveSettings();
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.warn('Failed to save global results preferences to backend, syncing to localStorage only', error);
              // Fallback: save to localStorage even if backend fails
              this.set(`_settings.${this.displayMode}`, this.view.settings);
              this.saveSettings();
            });
        });
        return;
      }

      // ---- localStorage only (anonymous users, no backend prefs available) ----
      // This branch runs when neither doc nor global prefs are applicable
      this.set(`_settings.${this.displayMode}`, this.view.settings);
      this.saveSettings();
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

  _handleViewQuickFiltersSync(e) {
    let incomingFilters;
    if (Array.isArray(e?.detail?.value)) {
      incomingFilters = this._cloneQuickFilters(e.detail.value);
    } else if (this.nxProvider && Array.isArray(this.nxProvider.quickFilters)) {
      incomingFilters = this._cloneQuickFilters(this.nxProvider.quickFilters);
    }

    if (!incomingFilters) {
      return;
    }

    if (
      this._quickFiltersDirty &&
      !this._quickFiltersEqual(incomingFilters, this._pendingQuickFilters || this.quickFilters)
    ) {
      const pendingFilters = this._cloneQuickFilters(this._pendingQuickFilters || this.quickFilters);
      this.quickFilters = pendingFilters;
      if (this.nxProvider) {
        this.set('nxProvider.quickFilters', pendingFilters.slice());
      }
      if (this.view?.quickFilters !== undefined) {
        this.view.quickFilters = pendingFilters.slice();
      }
      this._scheduleQuickFilterFetch(this._quickFiltersRequestId);
      return;
    }

    this.quickFilters = incomingFilters;
    if (this._quickFiltersDirty && this._quickFiltersEqual(incomingFilters, this._pendingQuickFilters)) {
      this._clearPendingQuickFilters();
    }
  },

  _nextQuickFiltersRequestId() {
    this._quickFiltersRequestId = (this._quickFiltersRequestId || 0) + 1;
    return this._quickFiltersRequestId;
  },

  _setPendingQuickFilters(filters) {
    this.quickFilters = filters;
    this._pendingQuickFilters = filters.slice();
    this._quickFiltersDirty = true;
  },

  _clearPendingQuickFilters() {
    this._quickFiltersDirty = false;
    this._pendingQuickFilters = null;
  },

  _scheduleQuickFilterFetch(requestId) {
    this._quickFilterDebouncer = Debouncer.debounce(this._quickFilterDebouncer, timeOut.after(50), () => {
      this.fetch()
        .then(() => this._finalizeQuickFilterSync(requestId))
        .catch(() => this._finalizeQuickFilterSync(requestId));
    });
  },

  _finalizeQuickFilterSync(requestId) {
    if (!this._quickFiltersDirty || requestId !== this._quickFiltersRequestId) {
      return;
    }

    if (this._quickFiltersEqual(this.quickFilters, this._pendingQuickFilters)) {
      this._clearPendingQuickFilters();
    }
  },

  _cloneQuickFilters(filters) {
    if (!Array.isArray(filters)) {
      return [];
    }
    return filters.slice();
  },

  _quickFiltersEqual(a, b) {
    // Quick filters are always flat arrays of strings; JSON.stringify is safe here.
    // If filter entries ever become objects, switch to a deep-equality comparison.
    return JSON.stringify(Array.isArray(a) ? a : []) === JSON.stringify(Array.isArray(b) ? b : []);
  },

  _enforcePendingQuickFilters() {
    // Re-entrancy guard: setting this.quickFilters below re-triggers this observer via Polymer
    if (this._enforcingPending) return;
    if (!this._quickFiltersDirty || !this._pendingQuickFilters) {
      return;
    }

    if (this._quickFiltersEqual(this.quickFilters, this._pendingQuickFilters)) {
      return;
    }

    this._enforcingPending = true;
    try {
      const pendingFilters = this._cloneQuickFilters(this._pendingQuickFilters);
      this.quickFilters = pendingFilters;
      if (this.nxProvider) {
        this.set('nxProvider.quickFilters', pendingFilters.slice());
      }
      if (this.view?.quickFilters !== undefined) {
        this.view.quickFilters = pendingFilters.slice();
      }
    } finally {
      this._enforcingPending = false;
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
    return `${userId}::${providerName}`;
  },

  _docCacheKey(userId, docPath, prefKey) {
    return `${userId}::${docPath}::${prefKey}`;
  },

  // ------------------------------
  // Preference plumbing (generic)
  // ------------------------------

  // Returns Accept headers allowing both JSON (preferred) and legacy text/plain preference responses.
  _prefAcceptHeaders() {
    return { accept: 'application/json,text/plain' };
  },

  // Parses a single preference value from the /me/preferences map (usually a JSON string) into an object.
  _parsePrefMapValue(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};
    const s = value.trim();
    if (!s) return {};

    try {
      // Decode HTML entities before parsing
      const textarea = document.createElement('textarea');
      textarea.innerHTML = s;
      const decoded = textarea.value;
      const parsed = JSON.parse(decoded);
      return parsed;
    } catch (e) {
      return {};
    }
  },

  // Creates a JSON-safe deep copy of an object to avoid mutating cached/shared preference references.
  _deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj || {}));
    } catch (e) {
      return {};
    }
  },

  // Applies preferences to view by either clearing to defaults or applying saved settings.
  // Note: view.settings is a JS getter/setter, not a Polymer property, so we handle empty case explicitly.
  _applyPrefsToView(view, prefs) {
    if (!view) {
      return;
    }

    this._isRestoring = true;
    try {
      const newSettings = this._deepClone(prefs || {});
      const isEmpty = Object.keys(newSettings).length === 0;

      if (isEmpty && view.columns) {
        // Clear settings by resetting each column to its original defaults
        // This approach is future-proof: to add support for new customizable column properties,
        // just update the two sections marked with "EXTEND HERE" below.

        /**
         * Returns the default value for a given column property.
         *
         * EXTEND HERE: When adding support for new customizable column properties
         * (e.g., minWidth, maxWidth, align), add a new case statement below.
         */
        const getDefaultValue = (column, idx, prop) => {
          switch (prop) {
            case 'hidden':
              return column.hiddenBack || false;
            case 'order':
              return idx;
            case 'width':
              return null;
            default:
              return null;
          }
        };

        /**
         * EXTEND HERE: If adding support for new customizable properties,
         * add the property name to this array (e.g., 'minWidth', 'align').
         */
        const customizableProps = ['hidden', 'order', 'width'];

        // Reset all customizable properties to their defaults
        view.columns.forEach((column, idx) => {
          customizableProps.forEach((prop) => {
            const defaultValue = getDefaultValue(column, idx, prop);
            if (column[prop] !== defaultValue) {
              view.set(`columns.${idx}.${prop}`, defaultValue);
            }
          });
        });

        // Clear sort order
        if (view.sortOrder && view.sortOrder.length > 0) {
          view.sortOrder = [];
        }
      } else {
        // Apply settings via the setter
        view.settings = newSettings;
      }
    } finally {
      this._isRestoring = false;
    }
  },

  // Debounces preference-saving calls (e.g., while the user is resizing/reordering columns).
  _debounceSave(debouncerField, fn, wait = 300) {
    this[debouncerField] = Debouncer.debounce(this[debouncerField], timeOut.after(wait), fn);
  },

  // ------------------------------
  // Global prefs (/me/preferences) - ONLY for search providers
  // ------------------------------

  // Configures the nuxeo-resource instance to GET the full global preferences map from /me/preferences.
  _configureAllGlobalPreferencesResource() {
    this.$.preferences.path = '/me/preferences';
    this.$.preferences.params = null;
    this.$.preferences.enrichers = {};
    this.$.preferences.headers = this._prefAcceptHeaders();
    this.$.preferences.data = null;
  },

  // Fetches all global preferences once from the server and returns the raw preferences map { key: value, ... }.
  async _getAllGlobalPreferences() {
    this._configureAllGlobalPreferencesResource();
    this.$.preferences.contentType = 'application/json';
    try {
      const raw = await this.$.preferences.get();
      return (raw && raw.preferences) || {};
    } catch (error) {
      console.error('[nuxeo-results] Failed to fetch global preferences', error);
      return {}; // ← graceful degradation
    }
  },

  // Returns a cached in-flight promise for GET /me/preferences so multiple loads share one request per session.
  async _getAllGlobalPreferencesOnce() {
    if (!__allGlobalPrefsPromise) {
      __allGlobalPrefsPromise = this._getAllGlobalPreferences();
    }
    try {
      return await __allGlobalPrefsPromise;
    } catch (e) {
      __allGlobalPrefsPromise = null;
      throw e;
    }
  },

  // Configures the nuxeo-resource instance to PUT a single global preference key at /me/preferences/<key>.
  _configureGlobalPreferencesResource(prefKey) {
    this.$.preferences.path = `/me/preferences/${encodeURIComponent(prefKey)}`;
    this.$.preferences.params = null;
    this.$.preferences.enrichers = {};
    this.$.preferences.headers = this._prefAcceptHeaders();
    this.$.preferences.data = null;
  },

  // Saves (PUT) a single global preference object under /me/preferences/<key> using a text/plain JSON payload.
  async _putGlobalPreference(prefKey, obj) {
    const payload = JSON.stringify(obj || {});
    this._configureGlobalPreferencesResource(prefKey);
    this.$.preferences.contentType = 'text/plain';
    this.$.preferences.data = payload;
    await this.$.preferences.put();
  },

  // Loads global preferences for the current provider from the /me/preferences map and caches them per user+provider.
  async _loadGlobalPrefs(enabled, nxProvider, connectedUserId) {
    // never use global prefs when we are in document context (browse/collections)
    if (this.document && this.document.path) {
      this.globalPrefs = {};
      return;
    }

    if (!enabled) {
      this.globalPrefs = {};
      return;
    }

    const providerName = this._getProviderName(nxProvider);
    if (!providerName) {
      this.globalPrefs = {};
      return;
    }

    const userId = connectedUserId || this._getUserId();
    if (!userId) {
      this.globalPrefs = {};
      return;
    }

    const cacheKey = this._cacheKey(userId, providerName);

    if (__globalPrefsCache.has(cacheKey)) {
      this.globalPrefs = __globalPrefsCache.get(cacheKey);
      return;
    }

    try {
      const prefsMap = await this._getAllGlobalPreferencesOnce();

      if (!Object.prototype.hasOwnProperty.call(prefsMap, providerName)) {
        const empty = {};
        __globalPrefsCache.set(cacheKey, empty);
        this.globalPrefs = empty;
        return;
      }
      const parsed = this._parsePrefMapValue(prefsMap[providerName]);
      __globalPrefsCache.set(cacheKey, parsed);
      this.globalPrefs = parsed;
    } catch (e) {
      this.globalPrefs = {};
    }
  },

  // Persists global results prefs for the current provider (PUT) and updates in-session cache/state immediately.
  async saveGlobalResultsPrefs(prefsObj) {
    const providerName = this._getProviderName(this.nxProvider);
    if (!providerName) {
      throw new Error('Cannot save global results prefs: missing nxProvider.provider');
    }

    const userId = this._getUserId();
    if (!userId) {
      throw new Error('Cannot save global results prefs: missing user id');
    }

    const cloned = this._deepClone(prefsObj);

    await this._putGlobalPreference(providerName, cloned);

    const cacheKey = this._cacheKey(userId, providerName);
    __globalPrefsCache.set(cacheKey, cloned);
    this.globalPrefs = cloned;
  },

  // Applies global prefs to the table view only (avoids applying to other display modes).
  _applyGlobalPrefs(enabled, prefs, view, displayMode) {
    // never apply global prefs when we are in document context
    if (this.document && this.document.path) {
      return;
    }
    if (!enabled || displayMode !== 'table') {
      return;
    }

    if (!view) {
      return;
    }

    // Fallback chain: backend prefs → localStorage → table defaults
    let settingsToApply;

    // 1. Primary: backend prefs (from globalPrefs property)
    if (prefs && Object.keys(prefs).length > 0) {
      settingsToApply = prefs;
    }
    // 2. Fallback: localStorage (synced copy)
    else if (this._settings && this._settings[displayMode]) {
      settingsToApply = this._settings[displayMode];
    }
    // 3. Final fallback: table defaults (do nothing, let view use its defaults)
    else {
      return;
    }

    this._applyPrefsToView(view, settingsToApply);
  },

  // ------------------------------
  // Doc prefs (/path/.../@preferences) - ONLY for document context
  // ------------------------------

  // Configures the nuxeo-resource instance to PUT doc-level preferences to /path/<docPath>/@preferences.
  _configureDocPreferencesResource(docPath) {
    const normalized = docPath.startsWith('/') ? docPath.substring(1) : docPath;
    const encodedPath = normalized
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    this.$.preferences.path = `/path/${encodedPath}/@preferences`;
    this.$.preferences.params = null;
    this.$.preferences.enrichers = {};
    this.$.preferences.headers = { accept: 'application/json' };
    this.$.preferences.data = null;
  },

  // Saves (PUT) one doc preference key by sending a userPreferences payload to /path/<docPath>/@preferences.
  async _putDocPreference(docPath, key, obj) {
    this._configureDocPreferencesResource(docPath);
    this.$.preferences.contentType = 'application/json';

    const prefs = {};
    // store as JSON string so it matches enricher map format (string -> parse)
    prefs[key] = JSON.stringify(obj || {});

    this.$.preferences.data = {
      'entity-type': 'userPreferences',
      preferences: prefs,
    };

    await this.$.preferences.put();
  },

  // Persists doc-level results prefs (PUT) and updates in-session cache/state so the UI reflects it immediately.
  async saveDocPrefs(docPath, key, value) {
    if (!docPath) {
      throw new Error('Cannot save doc prefs: missing docPath');
    }
    if (!key) {
      throw new Error('Cannot save doc prefs: missing key');
    }
    const userId = this._getUserId();
    if (!userId) {
      throw new Error('Cannot save doc prefs: missing user id');
    }

    const cloned = this._deepClone(value);

    await this._putDocPreference(docPath, key, cloned);

    // update in-session cache
    const cacheKey = this._docCacheKey(userId, docPath, key);
    __docPrefsCache.set(cacheKey, cloned);
    this.docPrefs = cloned;
  },

  // Returns the stable preference key used to store/retrieve results table prefs on a document.
  _getDocResultsPrefsKey() {
    // Use this.name as primary identifier (includes context like -trashed suffix)
    // Fall back to document.uid if name not available
    const docId = this.name || this.document?.uid || 'nuxeo-results';
    return `documentPrefs.${docId}`;
  },

  // Extracts and parses doc prefs from the userPreferences document enricher (no additional HTTP call).
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

    if (typeof rawValue === 'string') {
      try {
        // Decode HTML entities before parsing
        const textarea = document.createElement('textarea');
        textarea.innerHTML = rawValue;
        const decoded = textarea.value;

        const parsed = JSON.parse(decoded);
        return parsed;
      } catch (e) {
        return null;
      }
    }

    if (typeof rawValue === 'object') {
      return rawValue;
    }

    return null;
  },

  // Loads doc prefs from in-session cache or from the document enricher (defaults if none exist).
  _loadDocPrefs(enabled, document, connectedUserId) {
    // Reset state and trigger observer with empty prefs first
    this.__hasBackendDocPrefs = false;
    this.docPrefs = {};

    if (!enabled || !document || !document.path) {
      return;
    }

    const userId = connectedUserId || this._getUserId();
    if (!userId) {
      return;
    }

    const prefKey = this._getDocResultsPrefsKey();
    const cacheKey = this._docCacheKey(userId, document.path, prefKey);

    if (__docPrefsCache.has(cacheKey)) {
      const cached = __docPrefsCache.get(cacheKey);
      this.docPrefs = cached;
      // Mark that we have backend prefs if cache has data
      this.__hasBackendDocPrefs = Object.keys(cached).length > 0;
      return;
    }

    // read from document enricher if present
    const enricherPrefs = this._getDocPrefsFromEnricher(document, prefKey);
    if (enricherPrefs) {
      __docPrefsCache.set(cacheKey, enricherPrefs);
      this.docPrefs = enricherPrefs;
      this.__hasBackendDocPrefs = true;
    }
  },

  _applyDocPrefs(enabled, prefs, view) {
    // Debounce to prevent multiple rapid observer calls
    this._applyDocPrefsDebouncer = Debouncer.debounce(this._applyDocPrefsDebouncer, timeOut.after(25), () => {
      this._applyDocPrefsImpl(enabled, prefs, view);
    });
  },

  _applyDocPrefsImpl(enabled, prefs, view) {
    if (!enabled || !view) {
      return;
    }

    // Fallback chain: backend prefs → localStorage → table defaults
    let settingsToApply;

    if (prefs && Object.keys(prefs).length > 0) {
      settingsToApply = prefs;
      this.__hasBackendDocPrefs = true;
    } else if (this._settings && this._settings[this.displayMode]) {
      // Only use localStorage if we never had backend prefs
      settingsToApply = this.__hasBackendDocPrefs ? {} : this._settings[this.displayMode];
    } else {
      settingsToApply = {};
    }

    this._applyPrefsToView(view, settingsToApply);
  },
  // -------------------------
  // Mode decision functions
  // -------------------------

  // Doc prefs are used for any browse/document context (including Collections), regardless of provider presence.
  _computeShouldUseDocPrefs(document) {
    return Boolean(document && document.path);
  },

  // Global prefs are ONLY for non-document contexts (e.g. search pages), so require "no document".
  _computeShouldUseGlobalPrefs(document, nxProvider) {
    if (document && document.path) {
      return false;
    }
    return Boolean(this._getProviderName(nxProvider));
  },

  _connectedUserChanged(newUserId, oldUserId) {
    // Clear cached promises and prefs when user changes (logout/login, impersonation, etc.)
    if (newUserId !== oldUserId && oldUserId) {
      if (__allGlobalPrefsPromise || __globalPrefsCache.size > 0 || __docPrefsCache.size > 0) {
        // eslint-disable-next-line no-console
        console.debug('[nuxeo-results] Clearing preference caches due to user change:', {
          from: oldUserId,
          to: newUserId,
        });
        __allGlobalPrefsPromise = null;
        __globalPrefsCache.clear();
        __docPrefsCache.clear();
      }
    }
  },
});

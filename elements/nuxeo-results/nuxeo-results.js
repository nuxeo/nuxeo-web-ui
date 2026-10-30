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
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
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
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { NuxeoScrollRestoreBehavior } from '../behaviors/nuxeo-scroll-restore-behavior.js';

const hasSelectAllEnabled = config.get('selection.selectAllEnabled', false);

// global (search provider) prefs cache
const __globalPrefsCache = new Map();
// session-only GET /me/preferences promise
let __allGlobalPrefsPromise = null;
// empty maps standing in for a failed GET /me/preferences: never cached, so a later load retries the request
const __unavailablePrefsMaps = new WeakSet();

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
        width: 2.5em;
        height: 2.5em;
        padding: 0.4em;
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
              label="[[i18n('results.sortBy')]]"
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
  behaviors: [RoutingBehavior, FormatBehavior, NotifyBehavior, NuxeoScrollRestoreBehavior],

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
     * Scope of the table preferences (column visibility, order, width, sort) persisted for a document
     * context:
     * - `layout` (default): shared by every document displayed with the same layout (see `prefsLayout`),
     *   so customizing the columns of one folder applies to all folders of the same type.
     * - `document`: specific to the current document.
     */
    prefsScope: {
      type: String,
      value: 'layout',
    },

    /**
     * Identifier of the layout sharing table preferences when `prefsScope` is `layout`.
     * Defaults to the document type combined with the element hosting this `nuxeo-results` (plus its `id`), so every
     * document of a type shares its preferences while distinct tables keep their own. Set it to share preferences
     * across document types reusing the same layout (e.g. a layout block).
     */
    prefsLayout: String,

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
     * If `true`, initializing a display mode does not fetch results, so loading the page executes
     * no query. Only the deferred *initial* fetch is suppressed: any user action that asks for
     * results — the enclosing search view's Search button, a sort change, the toolbar refresh or a
     * quick filter toggle — fetches as usual and lifts the deferral for later display-mode changes.
     */
    deferInitialFetch: {
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

    // identity of the table defining layout (host element + id), resolved on attach; '' when there is no host
    _prefsHost: String,

    // user preference key holding layout-scoped table prefs; empty when prefs are document-scoped
    _layoutPrefsKey: {
      type: String,
      computed: '_computeLayoutPrefsKey(prefsScope, prefsLayout, document, _prefsHost)',
    },

    // where the user's column changes apply: 'all' documents of the layout, or this 'document' only
    _settingsScope: {
      type: String,
      value: 'all',
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
    '_loadDocPrefs(_shouldUseDocPrefs, document, _connectedUserId, _layoutPrefsKey)',
    '_applyDocPrefs(_shouldUseDocPrefs, docPrefs, view)',
    '_updateViewSettingsScope(view, _layoutPrefsKey, _settingsScope)',

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

  created() {
    // whether a fetch has already been requested, which lifts any `deferInitialFetch` suppression
    this._fetched = false;
  },

  ready() {
    this.$.nxcon.connect().then((user) => {
      this._connectedUserId = user && (user.id || user.uid || user.username);
      this._updateStorage();
    });
  },

  attached() {
    const host = this.getRootNode()?.host;
    // the hosting element and its own id tell apart two tables of the same kind in one layout
    this._prefsHost = host ? [host.localName, host.id, this.id].filter(Boolean).join('.') : '';
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
    } catch {
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
      // remember the scroll position so it can be restored when the user returns
      this._srSaveAnchor();
      this._srDisarmScrollTracking();
      this.unlisten(this.view, 'columns-changed', '_columnsChanged');
      this.unlisten(this.view, 'selected-items-changed', '_selectedItemsChanged');
      this.unlisten(this.view, 'settings-changed', '_saveViewSettings');
      this.unlisten(this.view, 'settings-scope-selected', '_onSettingsScopeSelected');
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
    this._fetched = true;
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

  // fetch after state restore, unless the first fetch is deferred to an explicit search
  _fetchOnViewInit() {
    if (!this.deferInitialFetch || this._fetched) {
      this.fetch();
    }
  },

  _viewChanged(view, oldView) {
    if (oldView) {
      // remember the current scroll position before swapping/tearing down the view,
      // and re-arm restore so a display-mode switch keeps the position
      this._srSaveAnchor(oldView);
      this._srDisarmScrollTracking();
      this._srRearmRestore();
      this._teardownView(oldView);
    }
    if (view) {
      this._setupView(view);
    }
  },

  _teardownView(oldView) {
    this.unlisten(oldView, 'columns-changed', '_columnsChanged');
    this.unlisten(oldView, 'selected-items-changed', '_selectedItemsChanged');
    this.unlisten(oldView, 'settings-changed', '_saveViewSettings');
    this.unlisten(oldView, 'settings-scope-selected', '_onSettingsScopeSelected');
    this.unlisten(oldView, 'items-changed', '_itemsChanged');
    this.unlisten(oldView, 'quick-filters-changed', '_handleViewQuickFiltersSync');
    this.unlisten(oldView, 'select-all-active-changed', '_selectAllActiveChanged');
    this.unlisten(oldView, '_excluded-items-changed', '_excludedDocsChanged');
    // we need to clear the selected items and selection (removes selection synchronization)
    if (this.selectedItems) {
      this.selectedItems = [];
    }
    this.selectAllActive = false;
  },

  _setupView(view) {
    // initialize columns
    this.set('columns', view.columns);
    if (Array.isArray(view.columns)) {
      this.listen(view, 'columns-changed', '_columnsChanged');
    }

    // restore settings
    this._restoreViewSettings(view);

    // restore selection
    if (this.selectedItems) {
      this.selectedItems = []; // NXP-23186: this line removes selection synchronization between view modes
      this.selectItems(this.selectedItems.slice());
    }
    // listen for columns, settings and selection changed
    this.listen(view, 'selected-items-changed', '_selectedItemsChanged');
    this.listen(view, 'settings-changed', '_saveViewSettings');
    this.listen(view, 'settings-scope-selected', '_onSettingsScopeSelected');
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

    this._fetchOnViewInit();

    // keep the scroll anchor fresh while the user scrolls; the position is
    // re-applied once rows load (see `_itemsChanged` → `_srMaybeRestore`).
    // Guard against a stale deferred call after a fast view swap.
    afterNextRender(this, () => {
      if (this.view === view) {
        this._srArmScrollTracking(view);
      }
    });

    this.fire('search-results-view', { view, name: this.name });
  },

  _restoreViewSettings(view) {
    if (!this._settings) {
      return;
    }
    this.set('_settings.displayMode', this.displayMode);
    this.saveSettings();
    const settings = this._filterSettingsByCapabilities(view, this._settings[this.displayMode]);
    if (settings !== undefined) {
      view.settings = settings;
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
        const settings = this._filterSettingsByCapabilities(view, this._settings[name]);
        if (settings !== undefined) {
          view.settings = settings;
        }
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

  // Filters persisted view settings so that only capabilities enabled on the view are restored.
  // This prevents saved layout (column visibility, width/resize, order) from overriding the
  // template-declared layout when the corresponding capability is disabled on the view
  // (`settings-enabled`, `column-resize-enabled`, `column-reorder-enabled`).
  _filterSettingsByCapabilities(view, settings) {
    if (!settings) {
      return settings;
    }
    // Only nuxeo-data-table exposes column capability flags; other views (e.g. grid) restore as-is.
    if (view?.localName !== 'nuxeo-data-table') {
      return settings;
    }
    // Without the settings panel capability, do not restore any persisted layout;
    // the template-declared layout must win.
    if (!view.settingsEnabled) {
      return undefined;
    }
    const resizeEnabled = !!view.columnResizeEnabled;
    const reorderEnabled = !!view.columnReorderEnabled;
    if (resizeEnabled && reorderEnabled) {
      return settings;
    }
    const filtered = this._deepClone(settings);
    if (filtered.columns) {
      Object.keys(filtered.columns).forEach((key) => {
        const column = filtered.columns[key];
        if (!column) {
          return;
        }
        if (!resizeEnabled) {
          delete column.width;
          delete column.resized;
        }
        if (!reorderEnabled) {
          delete column.order;
        }
      });
    }
    return filtered;
  },

  restoreSettings() {
    // XXX _isRestoring is a control flag to prevent restoring from triggering a save (see WEBUI-581)
    this._isRestoring = true;
    if (this._settings && this.name) {
      if (this._settings.displayMode && this._settings.displayMode.length > 0) {
        this.displayMode = this._settings.displayMode;
      }
      if (this._settings[this.displayMode] && this.view) {
        const settings = this._filterSettingsByCapabilities(this.view, this._settings[this.displayMode]);
        if (settings !== undefined) {
          this.view.settings = settings;
        }
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
        // Snapshot the context now: the view may restore another document's prefs before the debounce fires
        const layoutKey = this._layoutPrefsKey;
        const documentOnly = Boolean(layoutKey) && this._settingsScope === 'document';
        const docKey = this._getDocResultsPrefsKey();
        const docPath = this.document.path;
        const storageName = this._localStorageName;
        const scopeVersion = this._getScopeVersion(docPath, docKey);
        const settings = this._deepClone(this.view.settings);
        const savedFilters = this._getDocFilters(this.document, this._getUserId());
        this._debounceSave('_docPrefsSaveDebouncer', () => {
          // Save to backend (primary): for this document only when the user chose so, otherwise shared by the layout
          let save;
          if (documentOnly) {
            if (this._getScopeVersion(docPath, docKey) !== scopeVersion) {
              // the user changed where column changes apply since then: don't bring the document's own columns back
              return;
            }
            save = this.saveDocPrefs(docPath, docKey, this._markDocumentOnly(settings));
          } else if (layoutKey) {
            // columns are shared by the layout; column filters stay with this document
            const { shared, filters } = this._splitFilters(settings);
            save = Promise.all([
              this._sharedPrefsChanged(layoutKey, shared) ? this.saveLayoutPrefs(layoutKey, shared) : null,
              this._saveDocFilters(docPath, `${docKey}.filters`, filters, savedFilters),
            ]);
          } else {
            save = this.saveDocPrefs(docPath, docKey, settings);
          }
          save
            .then(() => {
              this._columnSettingsSaved();
              // Sync to localStorage on success (fallback cache)
              this._syncTableSettings(storageName, settings);
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.warn('Failed to save document results preferences to backend, syncing to localStorage only', {
                path: docPath,
                key: layoutKey || docKey,
                error,
              });
              // Fallback: save to localStorage even if backend fails. The local copy is kept per document (`name`),
              // so with layout scope a failed save applies to this document only, until a later save succeeds.
              this._syncTableSettings(storageName, settings);
              this._notifyColumnSettingsSaveFailed();
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
              this._columnSettingsSaved();
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
              this._notifyColumnSettingsSaveFailed();
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

  // Keeps a browser copy of the table settings for the document they were changed on.
  // If the user has already moved to another document, that document's copy is left alone.
  _syncTableSettings(storageName, settings) {
    if (storageName === this._localStorageName) {
      this.set('_settings.table', settings);
      this.saveSettings();
      return;
    }
    if (!storageName) {
      return;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageName)) || {};
      stored.table = settings;
      window.localStorage.setItem(storageName, JSON.stringify(stored));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to sync results preferences to localStorage', { key: storageName, error });
    }
  },

  // Tells the user once that column changes were not saved to the server, rather than on every change while it fails.
  _notifyColumnSettingsSaveFailed() {
    if (this.__columnSettingsSaveFailed) {
      return;
    }
    this.__columnSettingsSaveFailed = true;
    this.notify({ message: this.i18n('results.columnSettings.saveFailed') });
  },

  // A successful save ends a failure streak, so the next failure is reported again.
  _columnSettingsSaved() {
    this.__columnSettingsSaveFailed = false;
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
    // rows (re)loaded — restore the remembered scroll position if one is pending
    this._srMaybeRestore();
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
    } catch {
      /* Stored preference values are user data and may predate the current format; fall back to defaults */
      return {};
    }
  },

  // Creates a JSON-safe deep copy of an object to avoid mutating cached/shared preference references.
  // Deliberately not structuredClone (sonar javascript:S7784): the clone is persisted as JSON to the
  // preference store, and the `{}` fallback below would turn a DataCloneError into a silent write of
  // empty preferences, discarding the user's saved column layout instead of surfacing an error.
  _deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj || {}));
    } catch (e) {
      return {};
    }
  },

  // Applies preferences to view by either clearing to defaults or applying saved settings.
  // Note: view.settings is a JS getter/setter, not a Polymer property, so we handle empty case explicitly.
  _applyPrefsToView(view, prefs, { clearMissingFilters = false } = {}) {
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

        // Remember each column's layout-declared width (from the `width` attribute), captured once.
        view.columns.forEach((column) => {
          if (
            column &&
            column._declaredWidth === undefined &&
            typeof column.hasAttribute === 'function' &&
            typeof column.getAttribute === 'function' &&
            column.hasAttribute('width')
          ) {
            const declaredWidth = column.getAttribute('width');
            if (declaredWidth) {
              column._declaredWidth = declaredWidth;
            }
          }
        });

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
              return column._declaredWidth || null;
            case 'filterValue':
              return '';
            default:
              return null;
          }
        };

        /**
         * EXTEND HERE: If adding support for new customizable properties,
         * add the property name to this array (e.g., 'minWidth', 'align').
         */
        const customizableProps = ['hidden', 'order', 'width', 'filterValue'];

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
        if (clearMissingFilters && view.columns) {
          // Filters belong to one document: clear the ones these settings don't have, so they don't carry over
          view.columns.forEach((column, idx) => {
            const key = column.field ? column.field : `col-${idx}`;
            if (column.filterValue && !newSettings.columns?.[key]?.filterValue) {
              view.set(`columns.${idx}.filterValue`, '');
            }
          });
        }
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

  // Runs requests on the shared `preferences` resource one at a time: the resource cancels a request still pending
  // when the next one starts, and reads its path only once the request is sent.
  _preferencesRequest(send) {
    const request = (this.__preferencesRequest || Promise.resolve()).catch(() => {}).then(send);
    this.__preferencesRequest = request;
    return request;
  },

  // Fetches all global preferences once from the server and returns the raw preferences map { key: value, ... }.
  async _getAllGlobalPreferences() {
    try {
      const raw = await this._preferencesRequest(() => {
        this._configureAllGlobalPreferencesResource();
        this.$.preferences.contentType = 'application/json';
        return this.$.preferences.get();
      });
      return (raw && raw.preferences) || {};
    } catch (error) {
      console.error('[nuxeo-results] Failed to fetch global preferences', error);
      // the endpoint is missing (older platform) or forbidden: that won't change during the session, so keep it
      if (error && (error.status === 404 || error.status === 403)) {
        return {};
      }
      const unavailable = {}; // ← graceful degradation: retried by the next load
      __unavailablePrefsMaps.add(unavailable);
      return unavailable;
    }
  },

  // Returns a cached in-flight promise for GET /me/preferences so multiple loads share one request per session.
  // A failed request is not kept, so the next load retries it.
  async _getAllGlobalPreferencesOnce() {
    if (!__allGlobalPrefsPromise) {
      __allGlobalPrefsPromise = this._getAllGlobalPreferences();
    }
    const promise = __allGlobalPrefsPromise;
    try {
      const prefsMap = await promise;
      if (this._isUnavailablePrefsMap(prefsMap) && __allGlobalPrefsPromise === promise) {
        __allGlobalPrefsPromise = null;
      }
      return prefsMap;
    } catch (e) {
      __allGlobalPrefsPromise = null;
      throw e;
    }
  },

  // Whether a preferences map stands in for a failed GET /me/preferences, and so must not be cached.
  _isUnavailablePrefsMap(prefsMap) {
    return __unavailablePrefsMaps.has(prefsMap);
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
    await this._preferencesRequest(() => {
      this._configureGlobalPreferencesResource(prefKey);
      this.$.preferences.contentType = 'text/plain';
      this.$.preferences.data = payload;
      return this.$.preferences.put();
    });
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

      // preferences could not be fetched: use the defaults now, without caching them, so the next load retries
      if (this._isUnavailablePrefsMap(prefsMap)) {
        this.globalPrefs = {};
        return;
      }

      if (!Object.hasOwn(prefsMap, providerName)) {
        const empty = {};
        __globalPrefsCache.set(cacheKey, empty);
        this.globalPrefs = empty;
        return;
      }
      const parsed = this._parsePrefMapValue(prefsMap[providerName]);
      __globalPrefsCache.set(cacheKey, parsed);
      this.globalPrefs = parsed;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load global results preferences, falling back to defaults', {
        provider: providerName,
        error,
      });
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

    const filteredSettings = this._filterSettingsByCapabilities(view, settingsToApply);
    if (filteredSettings === undefined) {
      return;
    }

    this._applyPrefsToView(view, filteredSettings);
  },

  // ------------------------------
  // Doc prefs (/path/.../@preferences) - ONLY for document context
  // ------------------------------

  // Configures the nuxeo-resource instance to PUT doc-level preferences to /path/<docPath>/@preferences.
  // The path is left unencoded on purpose: the Nuxeo JS client percent-encodes the whole request path
  // when it builds the URL, so encoding it here would double-encode names holding a space or any other
  // reserved character (`My Content` -> `My%2520Content`), which the server resolves to a missing document.
  _configureDocPreferencesResource(docPath) {
    const normalized = docPath.startsWith('/') ? docPath.substring(1) : docPath;
    this.$.preferences.path = `/path/${normalized}/@preferences`;
    this.$.preferences.params = null;
    this.$.preferences.enrichers = {};
    this.$.preferences.headers = { accept: 'application/json' };
    this.$.preferences.data = null;
  },

  // Saves (PUT) one doc preference key by sending a userPreferences payload to /path/<docPath>/@preferences.
  async _putDocPreference(docPath, key, obj) {
    const prefs = {};
    // store as JSON string so it matches enricher map format (string -> parse)
    prefs[key] = JSON.stringify(obj || {});

    await this._preferencesRequest(() => {
      this._configureDocPreferencesResource(docPath);
      this.$.preferences.contentType = 'application/json';
      this.$.preferences.data = {
        'entity-type': 'userPreferences',
        preferences: prefs,
      };
      return this.$.preferences.put();
    });
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
    const cacheKey = this._docCacheKey(userId, docPath, key);

    await this._queueDocWrite(cacheKey, () => this._putDocPreference(docPath, key, cloned));

    // update in-session cache
    __docPrefsCache.set(cacheKey, cloned);
    // Only apply to the view if the user has not moved to another document meanwhile
    if (!this.document?.path || this.document.path === docPath) {
      this.docPrefs = cloned;
    }
  },

  // Persists layout-scoped results prefs (PUT /me/preferences/<key>) shared by every document with the same layout,
  // and updates the in-session cache/state so the UI reflects it immediately.
  async saveLayoutPrefs(key, value) {
    if (!key) {
      throw new Error('Cannot save layout prefs: missing key');
    }
    const userId = this._getUserId();
    if (!userId) {
      throw new Error('Cannot save layout prefs: missing user id');
    }

    const cloned = this._splitFilters(value).shared;

    await this._putGlobalPreference(key, cloned);

    __globalPrefsCache.set(this._cacheKey(userId, key), cloned);
    // Only apply to the view if it still shows a document with this layout, for this user, using the shared columns
    if (
      this.document?.path &&
      this._layoutPrefsKey === key &&
      this._getUserId() === userId &&
      this._settingsScope !== 'document'
    ) {
      this.docPrefs = this._withDocFilters(cloned, this._getDocFilters(this.document, userId));
    }
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
      } catch {
        /* Stored preference values are user data and may predate the current format; fall back to defaults */
        return null;
      }
    }

    if (typeof rawValue === 'object') {
      return rawValue;
    }

    return null;
  },

  // Loads table prefs for a document context, in this order:
  // 1. the document's own prefs, when the user chose "This document only" for it;
  // 2. the layout-scoped prefs shared by every document with the same layout;
  // 3. the document's own prefs saved before prefs were layout-scoped (or with document scope);
  // 4. the defaults.
  _loadDocPrefs(enabled, document, connectedUserId, layoutPrefsKey) {
    // Invalidate any in-flight layout prefs load started for a previous document or layout
    this.__docPrefsLoadId = (this.__docPrefsLoadId || 0) + 1;
    this.__docPrefsPending = false;
    // Reset state and trigger observer with empty prefs first
    this.__hasBackendDocPrefs = false;
    this.docPrefs = {};
    this._settingsScope = 'all';

    if (!enabled || !document || !document.path) {
      return undefined;
    }

    // wait for the layout to be resolved on attach, so the prefs are not loaded under the wrong key first
    if (layoutPrefsKey === undefined && this._prefsHost === undefined) {
      return undefined;
    }

    const userId = connectedUserId || this._getUserId();
    if (!userId) {
      return undefined;
    }

    if (!layoutPrefsKey) {
      this._loadDocumentPrefs(document, userId);
      return undefined;
    }

    const ownPrefs = this._getDocumentPrefs(document, userId);
    if (this._isDocumentOnly(ownPrefs)) {
      this._settingsScope = 'document';
      this.docPrefs = ownPrefs;
      this.__hasBackendDocPrefs = true;
      return undefined;
    }

    const cacheKey = this._cacheKey(userId, layoutPrefsKey);
    if (__globalPrefsCache.has(cacheKey)) {
      this._useLayoutPrefs(__globalPrefsCache.get(cacheKey), document, userId);
      return undefined;
    }

    const loadId = this.__docPrefsLoadId;
    // apply nothing until the shared prefs are known, so other columns don't show briefly first
    this.__docPrefsPending = true;
    return this._getAllGlobalPreferencesOnce()
      .then((prefsMap) => {
        // A save completed while the GET was pending holds newer prefs than this response
        if (__globalPrefsCache.has(cacheKey)) {
          return __globalPrefsCache.get(cacheKey);
        }
        // preferences could not be fetched: fall back to the document prefs without caching, so the next load retries
        if (this._isUnavailablePrefsMap(prefsMap)) {
          return {};
        }
        const prefs = Object.hasOwn(prefsMap, layoutPrefsKey) ? this._parsePrefMapValue(prefsMap[layoutPrefsKey]) : {};
        __globalPrefsCache.set(cacheKey, prefs);
        return prefs;
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to load layout results preferences, falling back to document preferences', {
          key: layoutPrefsKey,
          error,
        });
        return __globalPrefsCache.get(cacheKey) || {};
      })
      .then((prefs) => {
        if (loadId === this.__docPrefsLoadId) {
          this.__docPrefsPending = false;
          this._useLayoutPrefs(prefs, document, userId);
          this._applyDocPrefs(true, this.docPrefs, this.view);
        }
      });
  },

  // Applies the layout-scoped prefs, or falls back to the document's own prefs when the layout has none yet.
  _useLayoutPrefs(prefs, document, userId) {
    if (prefs && Object.keys(prefs).length > 0) {
      this.docPrefs = this._withDocFilters(prefs, this._getDocFilters(document, userId));
      this.__hasBackendDocPrefs = true;
      return;
    }
    this._loadDocumentPrefs(document, userId);
  },

  // Loads the document's own prefs from the in-session cache or from the document enricher.
  _loadDocumentPrefs(document, userId) {
    const cached = __docPrefsCache.has(this._docCacheKey(userId, document.path, this._getDocResultsPrefsKey()));
    const prefs = this._getDocumentPrefs(document, userId);
    if (prefs) {
      this.docPrefs = prefs;
      // Mark that we have backend prefs: always when read from the document, only if not empty when cached
      this.__hasBackendDocPrefs = !cached || Object.keys(prefs).length > 0;
    }
  },

  // Returns the document's own prefs from the in-session cache or from the document enricher, or null.
  _getDocumentPrefs(document, userId) {
    const prefKey = this._getDocResultsPrefsKey();
    const cacheKey = this._docCacheKey(userId, document.path, prefKey);

    if (__docPrefsCache.has(cacheKey)) {
      return __docPrefsCache.get(cacheKey);
    }

    // read from document enricher if present
    const enricherPrefs = this._getDocPrefsFromEnricher(document, prefKey);
    if (enricherPrefs) {
      __docPrefsCache.set(cacheKey, enricherPrefs);
    }
    return enricherPrefs;
  },

  // Prefs saved for one document only are marked, so they are told apart from prefs saved per document before
  // prefs were shared by the layout.
  _markDocumentOnly(settings) {
    return { ...settings, scope: 'document' };
  },

  _isDocumentOnly(prefs) {
    return Boolean(prefs) && prefs.scope === 'document';
  },

  // Shows the "Apply column changes to" choice in the column settings, when the view supports it.
  // It is offered only when column settings are shared by the layout.
  _updateViewSettingsScope(view, layoutPrefsKey, scope) {
    if (!view || !('settingsScope' in view)) {
      return;
    }
    view.settingsScopeEnabled = Boolean(layoutPrefsKey);
    view.settingsScope = scope || 'all';
  },

  // Counts the user's scope changes per document, so saves queued before a change can tell they are out of date.
  _getScopeVersion(docPath, docKey) {
    return this.__scopeVersions?.get(`${docPath}|${docKey}`) || 0;
  },

  _bumpScopeVersion(docPath, docKey) {
    this.__scopeVersions = this.__scopeVersions || new Map();
    this.__scopeVersions.set(`${docPath}|${docKey}`, this._getScopeVersion(docPath, docKey) + 1);
  },

  // The user chose where column changes apply, in the column settings.
  _onSettingsScopeSelected(e) {
    const scope = e.detail?.scope;
    if (!this._layoutPrefsKey || !this.document?.path || !this.view || scope === this._settingsScope) {
      return;
    }
    const docPath = this.document.path;
    const docKey = this._getDocResultsPrefsKey();
    const previousScope = this._settingsScope;
    const previousLocal = this._settings?.table;
    this._settingsScope = scope;
    // The choice wins over what started before it: queued saves for this document and loads still in progress
    this._bumpScopeVersion(docPath, docKey);
    this.__docPrefsLoadId = (this.__docPrefsLoadId || 0) + 1;
    this.__docPrefsPending = false;
    let save;
    if (scope === 'document') {
      // keep the current columns for this document only
      save = this.saveDocPrefs(docPath, docKey, this._markDocumentOnly(this._deepClone(this.view.settings)));
    } else {
      // stop using this document's own columns, and show the ones shared by the layout again
      if (this._settings) {
        // the browser copy holds this document's own columns: drop it so they cannot come back
        this.set('_settings.table', null);
        this.saveSettings();
      }
      const { filters } = this._splitFilters(this.view.settings);
      const deleteAndKeepFilters = Promise.all([
        this._deleteDocPrefs(docPath, docKey),
        this._saveDocFilters(docPath, `${docKey}.filters`, filters),
      ]);
      // With column changes pending in the open dialog, keep what is shown: closing it saves those columns for all
      // documents of the type. Otherwise show the shared columns again.
      const keepShown = Boolean(e.detail?.pendingChanges);
      save = deleteAndKeepFilters.then(() => {
        if (!keepShown && this.document?.path === docPath) {
          this._loadDocPrefs(true, this.document, this._connectedUserId, this._layoutPrefsKey);
        }
      });
    }
    save
      .then(() => this._columnSettingsSaved())
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to save where column changes apply', { path: docPath, scope, error });
        // nothing was saved: go back to the previous choice, so the screen matches what is stored
        if (this.document?.path === docPath) {
          this._settingsScope = previousScope;
          if (this._settings && previousLocal !== undefined) {
            this.set('_settings.table', previousLocal);
            this.saveSettings();
          }
        }
        this._notifyColumnSettingsSaveFailed();
      });
  },

  // Runs writes to the same document preference one after another, so an older write never lands after a newer one.
  async _queueDocWrite(cacheKey, write) {
    this.__docPrefsWrites = this.__docPrefsWrites || new Map();
    const previous = this.__docPrefsWrites.get(cacheKey) || Promise.resolve();
    const next = previous.catch(() => {}).then(write);
    this.__docPrefsWrites.set(cacheKey, next);
    try {
      await next;
    } finally {
      if (this.__docPrefsWrites.get(cacheKey) === next) {
        this.__docPrefsWrites.delete(cacheKey);
      }
    }
  },

  // Removes the document's own table prefs (DELETE /path/<doc>/@preferences/<key>).
  async _deleteDocPrefs(docPath, key) {
    const cacheKey = this._docCacheKey(this._getUserId(), docPath, key);
    await this._queueDocWrite(cacheKey, () => this._removeDocPreference(docPath, key));
    __docPrefsCache.set(cacheKey, {});
  },

  // Deletes a single document preference (DELETE /path/<doc>/@preferences/<key>).
  async _removeDocPreference(docPath, key) {
    await this._preferencesRequest(() => {
      this._configureDocPreferencesResource(docPath);
      this.$.preferences.path = `${this.$.preferences.path}/${encodeURIComponent(key)}`;
      return this.$.preferences.remove();
    });
  },

  // Column filters stay with the document they were set on, even when the columns are shared by the layout.
  _splitFilters(settings) {
    const shared = this._deepClone(settings || {});
    const filters = {};
    Object.entries(shared.columns || {}).forEach(([key, column]) => {
      if (column?.filterValue) {
        filters[key] = { filterValue: column.filterValue };
        if (column.filterExpression) {
          filters[key].filterExpression = column.filterExpression;
        }
      }
      if (column) {
        delete column.filterValue;
        delete column.filterExpression;
      }
    });
    return { shared, filters };
  },

  _withDocFilters(prefs, filters) {
    const { shared } = this._splitFilters(prefs);
    Object.entries(filters || {}).forEach(([key, filter]) => {
      shared.columns = shared.columns || {};
      shared.columns[key] = { ...shared.columns[key], ...filter };
    });
    return shared;
  },

  _getDocFiltersKey() {
    return `${this._getDocResultsPrefsKey()}.filters`;
  },

  // The document's own column filters, from the in-session cache or the document enricher.
  _getDocFilters(document, userId) {
    if (!document?.path) {
      return {};
    }
    const key = this._getDocFiltersKey();
    const cacheKey = this._docCacheKey(userId, document.path, key);
    if (__docPrefsCache.has(cacheKey)) {
      return __docPrefsCache.get(cacheKey);
    }
    const filters = this._getDocPrefsFromEnricher(document, key) || {};
    __docPrefsCache.set(cacheKey, filters);
    return filters;
  },

  // Saves the document's own column filters, only when they changed.
  async _saveDocFilters(docPath, key, filters, savedFilters) {
    const cacheKey = this._docCacheKey(this._getUserId(), docPath, key);
    const current = savedFilters || __docPrefsCache.get(cacheKey) || {};
    if (JSON.stringify(current) === JSON.stringify(filters)) {
      return;
    }
    __docPrefsCache.set(cacheKey, filters);
    try {
      await this._queueDocWrite(cacheKey, () => this._putDocPreference(docPath, key, filters));
    } catch (error) {
      // not saved: forget the cached copy, so the next change writes the filters again
      __docPrefsCache.delete(cacheKey);
      throw error;
    }
  },

  // Whether the shared columns differ from what is already stored, so unchanged columns aren't written again.
  _sharedPrefsChanged(layoutKey, shared) {
    const cached = __globalPrefsCache.get(this._cacheKey(this._getUserId(), layoutKey));
    return !cached || JSON.stringify(cached) !== JSON.stringify(shared);
  },

  _applyDocPrefs(enabled, prefs, view) {
    // Debounce to prevent multiple rapid observer calls
    this._applyDocPrefsDebouncer = Debouncer.debounce(this._applyDocPrefsDebouncer, timeOut.after(25), () => {
      this._applyDocPrefsImpl(enabled, prefs, view);
    });
  },

  _applyDocPrefsImpl(enabled, prefs, view) {
    if (!enabled || !view || this.__docPrefsPending) {
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

    const filteredSettings = this._filterSettingsByCapabilities(view, settingsToApply);
    if (filteredSettings === undefined) {
      return;
    }

    this._applyPrefsToView(view, filteredSettings, { clearMissingFilters: true });
  },
  // -------------------------
  // Mode decision functions
  // -------------------------

  // Doc prefs are used for any browse/document context (including Collections), regardless of provider presence.
  _computeShouldUseDocPrefs(document) {
    return Boolean(document && document.path);
  },

  // Layout-scoped prefs are keyed by `prefsLayout` when set, otherwise by the document type and the table hosting
  // them, so every document of a type shares them while distinct tables (e.g. the trash listing) keep their own.
  // An empty key means the prefs are stored on the document itself; `undefined` means the host is not resolved yet.
  _computeLayoutPrefsKey(prefsScope, prefsLayout, document, prefsHost) {
    if (prefsScope === 'document') {
      return '';
    }
    if (prefsLayout) {
      return `layoutPrefs.${prefsLayout}`;
    }
    if (prefsHost === undefined) {
      return undefined;
    }
    const type = document?.type;
    if (!type) {
      return '';
    }
    return prefsHost ? `layoutPrefs.${type}.${prefsHost}` : `layoutPrefs.${type}`;
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

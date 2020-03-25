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
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner-lite.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-elements/nuxeo-search.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-permissions/nuxeo-document-permissions.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-quick-filters/nuxeo-quick-filters.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import './nuxeo-search-form-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';

/**
 `nuxeo-search-form`
 @group Nuxeo UI
 @element nuxeo-search-form
 */
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex">
      :host {
        @apply --layout-vertical;
        display: block;
        height: calc(var(--vh, 1vh) * 100);
        width: 100%;
      }

      [hidden] {
        display: none !important;
      }

      .buttons {
        @apply --buttons-bar;
      }

      .actions {
        @apply --layout-vertical;
        @apply --nx-actions;
        position: absolute;
        left: 0;
        bottom: 0;
        right: 0;
        margin: 0;
        padding: 1rem;
        background-color: var(--nuxeo-drawer-background);
      }

      .actions paper-button {
        @apply --nx-actions-button;
      }

      .auto-search {
        padding: 0.5rem;
      }

      .action-buttons {
        @apply --layout-horizontal;
      }

      nuxeo-data-list {
        height: calc(100vh - 61px - var(--nuxeo-app-top));
      }

      nuxeo-data-list {
        display: block;
        position: relative;
      }

      .filters {
        padding: 8px 16px;
        height: calc(100vh - 61px - var(--nuxeo-app-top));
        overflow: auto;
      }

      .switch {
        position: absolute;
        top: 0;
        right: 0;
        width: 60px;
        height: 53px;
        padding: 16px;
        z-index: 101;
        border-left: 1px solid var(--divider-color);
      }

      .switch:hover {
        background-color: var(--nuxeo-button-primary);
        color: var(--nuxeo-button-primary-text);
      }

      nuxeo-select {
        width: 100%;
        margin-right: 56px;
      }

      .unfocused-line.paper-input-container {
        background-color: transparent;
      }

      paper-input {
        --paper-input-container-input: {
          font-family: var(--nuxeo-app-font);
        }

        --paper-input-container-underline: {
          background-color: white;
        }

        --paper-input-container-underline-focus: {
          background-color: white;
        }

        --paper-input-container-label: {
          font-family: var(--nuxeo-app-font);
        }
      }

      .content {
        @apply --layout-flex;
        @apply --layout-vertical;
        height: calc(100% - 68px - var(--nuxeo-app-top));
        width: 100%;
      }

      .header {
        height: 53px;
        box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.1) inset;
        @apply --layout-horizontal;
        @apply --layout-center;
        background-color: var(--nuxeo-drawer-background);
      }

      .header h1 {
        font-size: 1rem;
        margin: 0.1em 0.2em 0 1.1em;
        font-weight: 500;
      }

      .header h1,
      .header .input-content.paper-input-container input {
        text-transform: uppercase;
      }

      .row {
        box-sizing: border-box;
        margin-bottom: 1rem;
        padding: 0 1rem;
        width: 100%;
      }

      .ellipsis {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      :host([loading]) .loadable {
        opacity: 0.25;
      }

      paper-spinner-lite {
        position: absolute;
        top: 45%;
        left: 50%;
        --paper-spinner-color: var(--default-primary-color);
      }

      .list-item {
        cursor: pointer;
        color: var(--nuxeo-drawer-text);
        padding: 1em;
        border-bottom: 1px solid var(--nuxeo-border);
      }

      .list-item:hover {
        @apply --nuxeo-block-hover;
      }

      .list-item.selected,
      .list-item:focus,
      .list-item.selected:focus {
        @apply --nuxeo-block-selected;
      }

      .list-item-info {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .list-item-property {
        opacity: 0.5;
        margin-right: 0.2em;
      }

      nuxeo-quick-filters {
        padding: 0.3em 0.5em;
        border-bottom: 1px solid var(--nuxeo-border);
        max-height: 7em;
        overflow: auto;
        font-size: 0.8rem;
      }

      #checkbox.paper-checkbox {
        border: 1px solid;
      }

      #search-container {
        height: 100%;
        position: relative;
      }
    </style>

    <nuxeo-page-provider
      id="provider"
      provider="[[provider]]"
      page-size="[[pageSize]]"
      aggregations="{{aggregations}}"
      enrichers="[[enrichers]]"
      params="[[params]]"
      quick-filters="{{_quickFilters}}"
      schemas="[[schemas]]"
      headers="[[headers]]"
      fetch-aggregates
      skip-aggregates$="[[skipAggregates]]"
      on-error="_onError"
    >
    </nuxeo-page-provider>

    <nuxeo-search id="saved-search"></nuxeo-search>

    <div id="search-container">
      <div class="header ellipsis search-header">
        <nuxeo-search
          id="saved-searches"
          headers="[[headers]]"
          searches="{{_searches}}"
          params="[[_computeSavedSearchesParams(provider)]]"
        ></nuxeo-search>
        <template is="dom-if" if="[[!onlyQueue]]">
          <nuxeo-select id="actionsDropdown" selected="{{selectedSearchIdx}}">
            <paper-item>[[i18n('searchForm.searchFilters')]]</paper-item>
            <template is="dom-repeat" items="[[_searches]]" as="search">
              <paper-item>[[search.title]]</paper-item>
            </template>
          </nuxeo-select>
          <template is="dom-if" if="[[queue]]">
            <paper-icon-button class="switch" icon="nuxeo:filter" id="toogleFilter" on-tap="_displayFiltersTapped">
            </paper-icon-button>
            <nuxeo-tooltip for="toogleFilter">[[i18n('searchForm.displayFilterView')]]</nuxeo-tooltip>
          </template>
          <template is="dom-if" if="[[!queue]]">
            <paper-icon-button
              class="switch"
              icon="nuxeo:view-list"
              id="toogleQueue"
              on-tap="displayQueueAndNavigateToFirst"
            >
            </paper-icon-button>
            <nuxeo-tooltip for="toogleQueue">[[i18n('searchForm.displayQueueView')]]</nuxeo-tooltip>
          </template>
        </template>
        <template is="dom-if" if="[[onlyQueue]]">
          <h1>[[i18n(label)]]</h1>
        </template>
      </div>

      <div class="content">
        <div id="filters" class="filters loadable" hidden$="{{queue}}">
          <nuxeo-search-form-layout
            id="layout"
            provider="[[provider]]"
            search-name="[[searchName]]"
            aggregations="[[aggregations]]"
            params="{{params}}"
            on-search-form-layout-changed="_formChanged"
          ></nuxeo-search-form-layout>
          <paper-spinner-lite active$="[[loading]]" hidden$="[[!loading]]"></paper-spinner-lite>
        </div>

        <div id="queue" hidden$="{{!queue}}">
          <template is="dom-if" if="[[_displayQuickFilters(_quickFilters)]]">
            <nuxeo-quick-filters quick-filters="{{_quickFilters}}" on-quick-filters-changed="refresh">
            </nuxeo-quick-filters>
          </template>
          <nuxeo-data-list
            nx-provider="provider"
            id="list"
            selected-item="{{selectedDocument}}"
            empty-label="[[i18n('searchForm.queue.noResults')]]"
            empty-label-when-filtered
            selection-enabled
            select-on-tap
          >
            <template>
              <div tabindex$="{{tabIndex}}" class$="[[_computedClass(selected)]]">
                <div class="list-item-box">
                  <div class="list-item-info">
                    <div class="vertical layout center">
                      <nuxeo-document-thumbnail document="[[item]]"></nuxeo-document-thumbnail>
                    </div>
                    <span class="list-item-title ellipsis">[[item.title]]</span>
                  </div>
                </div>
              </div>
            </template>
          </nuxeo-data-list>
        </div>
      </div>

      <div class="actions" hidden$="{{queue}}">
        <div class="auto-search" hidden$="[[!displayAutoControl]]">
          <paper-toggle-button checked="{{auto}}">[[i18n('searchForm.auto')]]</paper-toggle-button>
          <nuxeo-tooltip>[[i18n('searchForm.auto.description')]]</nuxeo-tooltip>
        </div>
        <div class="action-buttons">
          <paper-button noink class="reset" disabled$="[[!dirty]]" on-tap="_reset">
            [[i18n('command.Reset')]]
          </paper-button>
          <paper-button noink class="primary search" on-tap="_search" hidden$="[[auto]]">
            [[i18n('command.search')]]
          </paper-button>
        </div>
      </div>
    </div>

    <nuxeo-dialog id="saveDialog" with-backdrop reparent>
      <h2>[[i18n('searchForm.savePopup.heading')]]</h2>
      <paper-input id="savedSearchTitle" label="[[i18n('searchForm.savePopup.label')]]" autofocus no-label-float>
      </paper-input>
      <div class="buttons">
        <paper-button dialog-dismiss>[[i18n('command.cancel')]]</paper-button>
        <paper-button noink class="primary" on-tap="_saveSearch">[[i18n('command.save')]]</paper-button>
      </div>
    </nuxeo-dialog>

    <nuxeo-dialog id="renameDialog" with-backdrop reparent>
      <h2>[[i18n('searchForm.renamePopup.heading')]]</h2>
      <paper-input
        id="savedSearchRenameTitle"
        label="[[i18n('searchForm.renamePopup.label')]]"
        autofocus
        no-label-float
      >
      </paper-input>
      <div class="buttons">
        <paper-button dialog-dismiss>[[i18n('command.cancel')]]</paper-button>
        <paper-button noink class="primary" on-tap="_saveSearch">[[i18n('command.save')]]</paper-button>
      </div>
    </nuxeo-dialog>

    <nuxeo-dialog id="shareDialog" with-backdrop reparent opened="{{permissionsVisible}}">
      <h2>[[i18n('searchForm.shared.heading')]]</h2>
      <nuxeo-document-permissions
        doc-id="[[selectedSearch.id]]"
        visible="[[permissionsVisible]]"
      ></nuxeo-document-permissions>
      <div class="buttons">
        <paper-button dialog-dismiss>[[i18n('command.close')]]</paper-button>
      </div>
    </nuxeo-dialog>

    <nuxeo-dialog id="deleteDialog" with-backdrop reparent>
      <h2>[[i18n('searchForm.delete.heading')]]</h2>
      <div class="buttons">
        <paper-button dialog-dismiss>[[i18n('label.no')]]</paper-button>
        <paper-button noink class="primary" on-tap="_deleteSearch">[[i18n('label.yes')]]</paper-button>
      </div>
    </nuxeo-dialog>
  `,

  is: 'nuxeo-search-form',
  behaviors: [I18nBehavior, RoutingBehavior, IronResizableBehavior],

  properties: {
    /**
     * @ignore
     * The selected saved search.
     * */
    selectedSearch: {
      type: Object,
      notify: true,
      observer: '_selectedSearchChanged',
    },
    /**
     * @ignore
     * The selected saved search index.
     * */
    selectedSearchIdx: {
      type: Number,
      value: 0,
      observer: '_selectedSearchIdxChanged',
    },
    /**
     * The `nuxeo-page-provider` instance used to perform the search.
     * */
    provider: {
      type: String,
    },
    /**
     * The page size passed on to `provider` (number of results per page).
     * */
    pageSize: {
      type: Number,
      value: 40,
    },
    /**
     * The parameters passed on to `provider`.
     * Useful to do a mapping between the query parameters and the variables.
     * */
    params: {
      type: Object,
    },
    /**
     * List of content enrichers passed on to `provider`.
     * Already set by default are thumbnail, permissions and highlight.
     * More details on the [documentation site](https://doc.nuxeo.com/nxdoc/content-enrichers/).
     */
    enrichers: {
      type: String,
      value: 'thumbnail, permissions, highlight',
    },
    /**
     * @ignore
     * The headers passed on to `provider`.
     * Already set by default are 'fetch-document': 'properties' and 'translate-directoryEntry': 'label'.
     */
    headers: {
      type: Object,
      value: { 'fetch-document': 'properties', 'translate-directoryEntry': 'label' },
    },
    /**
     * The schemas passed on to `provider` (like `dublincore`, `uid`, `file`...).
     * */
    schemas: {
      type: String,
    },
    /**
     * @ignore
     * Gets or sets the mode, `true` if in queue mode, `false` otherwise.
     * */
    queue: {
      type: Boolean,
      value: false,
    },
    /**
     * @ignore
     * The selected document if in queue mode.
     * */
    selectedDocument: {
      type: Object,
      observer: '_selectedDocChanged',
      notify: true,
    },
    /**
     * @ignore
     * If `true`, the parameters for the currently selected search changed.
     * */
    dirty: {
      type: Boolean,
      value: false,
      notify: true,
    },
    /**
     * @ignore
     * If `true`, a previously saved search is selected.
     * */
    isSavedSearch: {
      type: Boolean,
      value: false,
      notify: true,
    },
    /**
     * @ignore
     * If `true`, only the queue title will be displayed in the header, without the actions dropdown.
     * */
    onlyQueue: {
      type: Boolean,
      value: false,
    },
    /**
     * Method used to build `params` from a loaded saved search.
     * */
    paramMutator: {
      type: Function,
      value() {
        return function(params) {
          const result = {};
          if (params) {
            // filter null values
            Object.keys(params).forEach((param) => {
              const value = params[param];
              if (value && param !== 'dc:title') {
                result[param] = value;
              }
            });
            // allow search to be visible on JSF UI
            if (!('cvd:contentViewName' in result)) {
              result['cvd:contentViewName'] = 'default_search';
            }
          }
          return result;
        };
      },
    },
    /**
     * @ignore
     * If `true`, requests from `provider` are in flight.
     * */
    loading: {
      type: Boolean,
      reflectToAttribute: true,
      value: false,
    },
    /**
     * The name of the search layout.
     * Usually the page provider name.
     * */
    searchName: String,
    /**
     * The aggregations returned by `provider`.
     * */
    aggregations: {
      type: Object,
    },
    /**
     * @ignore
     * If `true`, the current element is visible.
     * */
    visible: Boolean,
    /**
     * If `true`, automatically execute the search each time a param is changed.
     */
    auto: {
      type: Boolean,
      value: false,
    },
    /**
     * If `true`, display a toggle control to enable or disable auto mode.
     */
    displayAutoControl: {
      type: Boolean,
      value: false,
    },

    /**
     * The `nuxeo-results` element bound to this form.
     */
    results: {
      type: Object,
      notify: true,
    },

    /**
     * If `true`, aggregagtes from page provider definition will not be computed.
     */
    skipAggregates: Boolean,

    _searches: Array,
  },

  observers: [
    '_resetResults(provider, params.*, _quickFilters.*, query)',
    '_paramsChanged(params.*)',
    '_visibleChanged(auto, visible)',
  ],

  listeners: {
    'iron-resize': '_calculateViewportHeight',
  },

  _visibleChanged() {
    if (this.visible) {
      if (!this._searches) {
        this.$['saved-searches'].get();
        if (this.form && this.form.params !== undefined) {
          this.params = this.form.params;
        }
      }
      if (this.queue) {
        this.$.list.fetch();
      } else if (this.auto) {
        this._fetch(this.$.provider);
      }
    }
  },

  get nxProvider() {
    return this.$.provider;
  },

  get form() {
    return this.$.layout.element;
  },

  refresh() {
    if (this.queue) {
      this.$.list.fetch();
    }
    if (this.results) {
      this.results.reset();
      this._fetch(this.results);
    }
  },

  displayQueueAndNavigateToFirst() {
    this.displayQueue(0);
  },

  displayQueue(index) {
    this.queue = true;
    if (this.visible) {
      this.$.list.fetch().then(() => {
        if (typeof index === 'number') {
          this.$.list.scrollToIndex(index);
          this.$.list.selectIndex(index);
        }
      });
    }
  },

  _resetResults() {
    if (this.provider && this.params && this._quickFilters && this.query) {
      this.$.list._resetResults();
    }
  },

  _displayFiltersTapped() {
    this.displayFilters();
    this._navigateToResults();
  },

  displayFilters() {
    this.queue = false;
    this.fire('display-filters');
  },

  _navigateToResults() {
    this.fire('search-results');
  },

  _computedClass(isSelected) {
    let classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  },

  _selectedDocChanged(doc, old) {
    if ((doc && doc.path && !old) || (doc && doc.path && old && old.path && doc.path !== old.path)) {
      this.__renderDebouncer = Debouncer.debounce(this.__renderDebouncer, timeOut.after(150), () => {
        this.navigateTo('browse', doc.path);
      });
    }
  },

  _paramsChanged() {
    this.$.provider.page = 1;
    this.dirty = true;
    if (this.results && this.auto && this.visible) {
      this.__fetchDebouncer = Debouncer.debounce(this.__fetchDebouncer, timeOut.after(300), () => {
        this.results.reset();
        this._fetch(this.results);
      });
    }
  },

  _selectedSearchIdxChanged() {
    if (this._isSavedSearch()) {
      this.isSavedSearch = true;
      this.selectedSearch = this._searches[this.selectedSearchIdx - 1];
      this.params = this._mutateParams(this.selectedSearch.params);
      this._navigateToResults();
    } else {
      this._clear();
    }
    this.dirty = false;
  },

  _selectedSearchChanged() {
    if (this.selectedSearch) {
      this.params = this._mutateParams(this.selectedSearch.params);
      if (this.params && this.params.ecm_fulltext) {
        this.searchTerm = this.params.ecm_fulltext.replace('*', '');
        this.form.searchTerm = this.searchTerm;
      }
      this._fetch(this.$.provider);
    }
  },

  _isSavedSearch() {
    return this.selectedSearchIdx > 0;
  },

  _clear() {
    this.searchTerm = '';
    this.isSavedSearch = false;
    this.selectedSearch = null;
    if (this.form && this.form.clear !== undefined && typeof this.form.clear === 'function') {
      this.form.clear();
    }
    this.params = {};
    if (!this._isSavedSearch()) {
      this.dirty = false;
    }
    this.selectedSearchIdx = 0;
    this._resetResults();
    if (!this.auto) {
      this.aggregations = {};
      this._search();
    }
  },

  _search() {
    if (this.results) {
      this.results.reset();
      return this._fetch(this.results).then(this._navigateToResults);
    }
    if (this.visible) {
      // if the view is not initialized yet, navigating to the search will trigger a search and display the results
      this.navigateTo('search', this.searchName);
    }
    return Promise.resolve();
  },

  _reset() {
    if (!this.isSavedSearch) {
      this._clear();
    } else {
      const _el = this.$['saved-search'];
      _el.searchId = this.selectedSearch.id;
      _el.get().then((response) => {
        this.params = this._mutateParams(response.params);
        this.searchTerm = this.params.ecm_fulltext ? this.params.ecm_fulltext.replace('*', '') : '';
        this.form.searchTerm = this.searchTerm;
        this.dirty = false;
      });
    }
  },

  saveAs() {
    this.$$('#actionsDropdown').close();
    this.$.savedSearchTitle.value = '';
    this.$.saveDialog.open();
    this._saveAs = true;
  },

  save() {
    if (this.selectedSearchIdx === 0) {
      this.saveAs();
    } else {
      this._saveSearch();
    }
  },

  rename() {
    this._renaming = true;
    this.$$('#actionsDropdown').close();
    this.$.renameDialog.open();
    this.$.savedSearchRenameTitle.value = this.selectedSearch.title;
  },

  share() {
    this.$$('#actionsDropdown').close();
    this.$.shareDialog.open();
  },

  delete() {
    this.$$('#actionsDropdown').close();
    this.$.deleteDialog.open();
  },

  _saveSearch() {
    const _el = this.$['saved-search'];
    // save a new search
    if (this.selectedSearchIdx === 0 || this._saveAs) {
      _el.searchId = '';
      _el.data = {
        'entity-type': 'savedSearch',
        pageProviderName: this.provider,
        params: this.params,
        title: this.$.savedSearchTitle.value,
      };
      _el.post().then((search) => {
        const { id } = search;
        this.$.saveDialog.close();
        this.selectedSearch = search;
        this.$['saved-searches'].get().then(() => {
          this.selectedSearchIdx = this._searches.findIndex((s) => s.id === id) + 1;
        });
      });
    } else {
      // update an existing search
      _el.searchId = this.selectedSearch.id;
      _el.data = this.selectedSearch;
      if (this._renaming) {
        _el.data.title = this.$.savedSearchRenameTitle.value;
        _el.data.params = this._mutateParams(_el.data.params);
      } else {
        _el.data.params = this.params;
      }
      _el.put().then(() => {
        if (this._renaming) {
          this.$.renameDialog.close();
          this.$['saved-searches'].get().then(() => {
            this.set(`_searches.${this.selectedSearchIdx - 1}.title`, _el.data.title);
            // hack required to update the paper-input inside the paper-dropdown-menu
            const idx = this.selectedSearchIdx;
            this.selectedSearchIdx = 0;
            this.selectedSearchIdx = idx;
            this._renaming = false;
          });
        }
        this.dirty = false;
      });
    }
    this._saveAs = false;
  },

  _deleteSearch() {
    const _el = this.$['saved-search'];
    _el.searchId = this.selectedSearch.id;
    _el.remove().then(() => {
      this.$.deleteDialog.close();
      this.$['saved-searches'].get().then(() => {
        // hack required to update the paper-input inside the paper-dropdown-menu
        this.selectedSearchIdx = 0;
        this.selectedSearchIdx = this._searches.length;
      });
    });
  },

  _mutateParams(params) {
    return this.paramMutator ? this.paramMutator(params) : params;
  },

  _computeSavedSearchesParams() {
    return { pageProvider: this.provider };
  },

  _formChanged() {
    this._clear();

    if (this.queue) {
      this.displayQueue();
    } else {
      this.displayFilters();
    }

    // setup data binding
    this.form.addEventListener('params-changed', (e) => {
      // e.detail.path is params.prop_name eg: params.ecm_fulltext
      if (e.detail.path) {
        const param = e.detail.path.split('.')[1];
        this.set(`params.${param}`, e.detail.value);
        if (this.auto && this.visible) {
          this._navigateToResults();
        }
      }
    });
    this.skipAggregates = this.form.skipAggregates;
    this.form.addEventListener('skip-aggregates-changed', (e) => {
      this.notifyPath('skipAggregates', e.detail.value);
    });
    this.form.addEventListener('trigger-search', this._search.bind(this));
    if (!this.auto) {
      this.form.addEventListener('keypress', this._keyPressedListener.bind(this));
    }
  },

  _keyPressedListener(e) {
    // When Enter is pressed on an input element, the search should be triggered.
    if (e.keyCode === 13 && e.composedPath()[0].tagName.toLowerCase() === 'input') {
      this._search();
    }
  },

  _onError(e) {
    this.fire('notify', e.detail.error);
  },

  /**
   * Performs a fetch using the element passed as argument and controls the visibility of the loading spinner.
   */
  _fetch(el) {
    this.loading = true;
    return el
      .fetch()
      .then(() => {
        this.loading = false;
      })
      .catch((err) => {
        this.loading = false;
        throw err;
      });
  },

  _displayQuickFilters() {
    return this._quickFilters && this._quickFilters.length > 0;
  },

  _loadSavedSearch(id) {
    if (!id) {
      return;
    }
    const load = () =>
      (!this._searches ? this.$['saved-searches'].get() : Promise.resolve()).then(() => {
        this.selectedSearchIdx = this._searches.findIndex((s) => s.id === id) + 1;
        // XXX rely on debouncer to update the results request with the saved search params
        this._fetch(this.results);
      });
    if (this.results) {
      load();
    } else {
      this._loadSavedSearchListener = () => {
        if (this.results) {
          load();
          this.removeEventListener('results-changed', this._loadSavedSearchListener);
        }
      };
      this.addEventListener('results-changed', this._loadSavedSearchListener);
    }
  },

  // To fix NXP-27429 so action buttons can be displayed on mobile browsers
  _calculateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    this.updateStyles({
      '--vh': `${vh}px`,
    });
  },
});

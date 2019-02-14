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
`nuxeo-results-view`
@group Nuxeo UI
@element nuxeo-results-view
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-collapse/iron-collapse.js';
import './nuxeo-search-form-layout.js';
import './nuxeo-search-results-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex iron-flex-alignment">
      .ellipsis {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        display: block;
      }

      .capitalize {
        text-transform: capitalize;
      }

      .form {
        @apply --paper-card;
        padding: 0;
      }

      .header, #collapse {
        padding: 16px;
      }

      .buttons {
        @apply --buttons-bar;
      }

      .hidden {
        visibility: hidden;
      }

      .count {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-center-justified;
        background: var(--nuxeo-badge-background);
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        margin-left: 1em;
      }

      .filter {
        text-transform: uppercase;
      }

      .buttons {
        @apply --layout-horizontal;
      }
    </style>

    <nuxeo-page-provider id="provider" provider="[[provider]]" page-size="[[pageSize]]" aggregations="{{aggregations}}" enrichers="[[enrichers]]" params="[[_params]]" quick-filters="{{quickFilters}}" schemas="[[schemas]]" loading="{{loading}}" headers="[[headers]]" fetch-aggregates="" skip-aggregates\$="[[skipAggregates]]" on-error="_onError">
    </nuxeo-page-provider>

    <template is="dom-if" if="[[showFilters]]">
      <div class="form">
        <div class="header horizontal layout center">
          <a href="javascript:undefined" class="horizontal layout center" on-tap="toggleExpand">
            <span><iron-icon icon="[[_expandIcon(opened)]]" toggle=""></iron-icon></span>
            <span class="filter">[[i18n('resultsView.filters.heading')]]</span>
          </a>
          <div class\$="count [[_hideCounter]]">
            <span>[[_getFilterCount(_params.*)]]</span>
          </div>
          <div class="horizontal layout flex center end-justified">
            <paper-button noink="" on-tap="_clear" class\$="[[_hideCounter]]">
              [[i18n('command.clear')]]
            </paper-button>
          </div>
        </div>
        <iron-collapse id="collapse" opened="{{opened}}">
          <nuxeo-search-form-layout id="form" provider="[[provider]]" search-name="[[searchName]]" aggregations="[[aggregations]]" params="[[_params]]" on-search-form-layout-changed="_formChanged"></nuxeo-search-form-layout>
          <paper-spinner-lite active="[[loading]]"></paper-spinner-lite>
        </iron-collapse>
        <div class="buttons" hidden\$="[[!opened]]">
          <paper-button noink="" class="primary search" on-tap="_search" hidden\$="[[auto]]">
            [[i18n('command.search')]]
          </paper-button>
          <div class="horizontal layout flex end-justified">
            <paper-button noink="" class="clear" on-tap="_clear">
              [[i18n('command.clear')]]
            </paper-button>
          </div>
        </div>
      </div>
    </template>

    <template is="dom-if" if="[[visible]]">
      <nuxeo-search-results-layout id="results" search-name="[[searchName]]" nx-provider="[[_nxProvider]]" on-navigate="_navigateFromSearch" on-results-changed="_resultsChanged"></nuxeo-search-results-layout>
    </template>
`,

  is: 'nuxeo-results-view',
  behaviors: [I18nBehavior],

  properties: {
    /**
     * The id of the `nuxeo-page-provider` instance used to perform the search.
     */
    provider: {
      type: String
    },
    /**
     * The number of results per page.
     */
    pageSize: {
      type: Number,
      value: 40
    },
    /**
     * The query parameters passed on to `provider`.
     */
    params: {
      type: Object,
      observer: '_paramsChanged',
      value: {}
    },
    /**
     * List of content enrichers passed on to `provider`.
     * Already set by default are thumbnail, permissions and highlight.
     */
    enrichers: {
      type: String,
      value: 'thumbnail, permissions, highlight'
    },
    /**
     * The headers passed on to `provider`.
     * Already set by default are 'X-NXfetch.document': 'properties' and 'X-NXtranslate.directoryEntry': 'label'.
     */
    headers: {
      type: String,
      value: {'X-NXfetch.document': 'properties', 'X-NXtranslate.directoryEntry': 'label'}
    },
    /**
     * List of comma separated values of the document schemas to be returned.
     * All document schemas are returned by default.
     */
    schemas: {
      type: String
    },
    /**
     * If `true`, requests from `provider` are in flight.
     */
    loading: {
      type: Boolean,
      reflectToAttribute: true,
      value: false
    },
    /**
     * The name of the search layout.
     */
    searchName: String,
    /**
     * The aggregations returned by `provider`.
     */
    aggregations: {
      type: Object,
      observer: '_aggregationsChanged',
      notify: true
    },
    /**
     * Name of the quick filters to be displayed in case you don't want to display all of them.
     * Expected format : ['quickfilter1','quickfilter2'].
     */
    quickFilters: {
      type: Array,
      notify: true
    },
    /**
     * If `true`, the current element is visible.
     */
    visible: {
      type: Boolean,
      value: false
    },
    /**
     * If `true`, automatically execute the search when either `provider` or `params` changes.
     */
    auto: {
      type: Boolean,
      value: false
    },
    /**
     * If `true`, display the top filtering panel.
     */
    showFilters: {
      type: Boolean,
      value: false
    },
    /**
     * If `true`, opens the collapsible top filtering panel.
     */
    opened: {
      type: Boolean,
      value: false
    },
    /**
     * An external search form (containing its own page provider) will be used, instead of the embeded one.
     * In case this is set, the following properties should be ignored, as the behavior they affect will be
     * controlled by the search form: `provider`, `pageSize`, `params`, `schemas`, `enrichers`, `headers`,
     * `loading`, `aggregations`, `quickFilters` and `auto`.
     */
    searchForm: {
      type: Object,
      value: null,
      observer: '_searchFormChanged'
    },

    /**
     * If `true`, aggregates from page provider definition will not be computed.
     */
    skipAggregates: Boolean,

    _params: Object,
    _paramsCount: Number,
    _nxProvider: HTMLElement,
    _hideCounter: {
      type: String,
      computed: '_computeHideCounter(opened, _params.*)',
      value: 'hidden'
    }
  },

  ready: function() {
    if (!this._nxProvider) {
      this._nxProvider = this.$.provider;
    }
  },

  get form() {
    var form = this.$$('#form');
    return form && form.element;
  },

  get results() {
    return this.$$('#results');
  },

  toggleExpand: function() {
    this.$$('#collapse').toggle();
  },

  _expandIcon: function(opened) {
    return 'hardware:keyboard-arrow-' + (opened ? 'down' : 'right');
  },

  _getFilterCount: function() {
    if (this._params) {
      // subtract the number of original parameters (this._paramsCount)
      return Object.keys(this._params).length - this._paramsCount - ('highlight' in this._params ? 1 : 0);
    } else {
      return 0;
    }
  },

  _computeHideCounter: function(opened) {
    var count = this._getFilterCount();
    return opened || count === 0 ? 'hidden' : '';
  },

  _paramsChanged: function() {
    if (this.params) {
      // if the supplied params are a string, parse them; otherwise clone the object
      this._params = JSON.parse(typeof this.params === 'string' ? this.params : JSON.stringify(this.params));
      // cache the number of this.params to avoid having to parse json again if this.params is a string
      this._paramsCount = Object.keys(this._params).length;
    } else {
      this._params = {};
      this._paramsCount = 0;
    }
  },

  _search: function() {
    if (this.results) {
      this.results.reset();
      this.results.fetch();
    }
  },

  _aggregationsChanged: function() {
    if (this.form) {
      this.form.aggregations = this.aggregations;
    }
  },

  _onError: function(e) {
    this.fire('notify', e.detail.error);
    e.stopPropagation();
  },

  _clear: function() {
    if (this.form && this.form.clear !== undefined && typeof this.form.clear === 'function') {
      this.form.clear();
    }
    this._paramsChanged();
    if (!this.auto) {
      this.aggregations = {};
    }
    if (!this.auto && this.visible) {
      this._search();
    }
  },

  _formChanged: function(e) {
    this._clear();
    var form = e.detail.value;
    // setup data binding
    form.addEventListener('params-changed', function(e) {
      // e.detail.path is params.prop_name eg: params.ecm_fulltext
      if (e.detail.path) {
        var param = e.detail.path.split('.')[1];
        this.notifyPath('_params.' + param, e.detail.value);
        if (this.visible && this.auto) {
          this._search();
        }
      }
    }.bind(this));
    this.skipAggregates = form.skipAggregates;
    form.addEventListener('skip-aggregates-changed', function(e) {
      this.notifyPath('skipAggregates', e.detail.value);
    }.bind(this));
    form.addEventListener('trigger-search', this._search.bind(this));
    this._search();
  },

  _resultsChanged: function() {
    var results = this.results;
    if (this.searchForm && results) {
      this.searchForm.results = results.results;
    }
  },

  _searchFormChanged: function(searchForm) {
    if (searchForm) {
      this._nxProvider = searchForm.nxProvider;
      this.provider = this._nxProvider.provider;
      this.searchName = searchForm.searchName;
      var results = this.results;
      if (results) {
        searchForm.results = results.results;
      }
    }
  },

  _navigateFromSearch: function(e) {
    if (this.searchForm) {
      this.searchForm.displayQueue(e.detail.index);
    }
  }
});

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
`nuxeo-search-page`
@group Nuxeo UI
@element nuxeo-search-page
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/iron-flex-layout/iron-flex-layout.js';

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      .title {
        @apply --layout-flex;
      }

      nuxeo-saved-search-actions {
        @apply --layout-end-justified;
      }
    </style>

    <nuxeo-page>
      <div class="header" slot="header">
        <span class="title">[[i18n(heading)]]</span>
        <template is="dom-if" if="[[showSavedSearchActions]]">
          <nuxeo-saved-search-actions id="actions" class="actions" search-form="[[searchForm]]"></nuxeo-saved-search-actions>
        </template>
      </div>
      <div class="content">
        <nuxeo-results-view provider="[[provider]]" page-size="[[pageSize]]" params="[[params]]" quick-filters="{{quickFilters}}" schemas="[[schemas]]" enrichers="[[enrichers]]" headers="[[headers]]" loading="[[loading]]" search-name="[[searchName]]" aggregations="{{aggregations}}" visible="[[visible]]" auto="[[auto]]" show-filters="[[showFilters]]" opened="[[opened]]" search-form="[[searchForm]]"></nuxeo-results-view>
      </div>
    </nuxeo-page>
`,

  is: 'nuxeo-search-page',
  behaviors: [I18nBehavior],

  properties: {
    showSavedSearchActions: {
      type: Boolean,
      value: false
    },
    heading: String,
    /**
     * The `nuxeo-page-provider` instance used to perform the search.
     **/
    provider: String,
    /**
     * The page size passed on to `provider`.
     **/
    pageSize: Number,
    /**
     * The parameters passed on to `provider`.
     **/
    params: Object,
    /**
     * The schemas passed on to `provider`.
     **/
    schemas: String,
    /**
     * List of content enrichers passed on to `provider`.
     */
    enrichers: String,
    /**
     * The headers passed on to `provider`.
     */
    headers: String,
    /**
     * If `true`, requests from `provider` are in flight.
     **/
    loading: {
      type: Boolean,
      reflectToAttribute: true,
      value: false
    },
    /**
     * The name of the search layout.
     **/
    searchName: String,
    /**
     * The aggregations returned by `provider`.
     **/
    aggregations: {
      type: Object,
      notify: true
    },
    /**
     * Quick filters state of `provider`.
     */
    quickFilters: {
      type: Array,
      notify: true
    },
    /**
     * If `true`, the current element is visible.
     **/
    visible: {
      type: Boolean,
      value: false
    },
    /**
     * If `true`, automatically execute the search each time a param is changed.
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
    /*
     * If `true`, opens the collapsible top filtering panel.
     */
    opened: {
      type: Boolean,
      value: false
    },
    /*
     * An external search form (containing its own page provider) will be used, instead of the embeded one.
     * In case this is set, the following properties should be ignored, as the behavior they affect will be
     * controlled by the search form: `provider`, `pageSize`, `params`, `schemas`, `enrichers`, `headers`,
     * `loading`, `aggregations`, `quickFilters` and `auto`.
     */
    searchForm: Object
  }
});

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
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-select.js';
import '../nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
 `nuxeo-search-form-layout`
 @group Nuxeo UI
 @element nuxeo-search-form-layout
 */
Polymer({
  _template: html`
    <nuxeo-layout
      id="layout"
      href="[[_href]]"
      model="[[_formModel(provider, aggregations, params)]]"
      error="[[i18n('documentSearchForm.layoutNotFound', searchName)]]"
      on-element-changed="_formChanged"
    ></nuxeo-layout>
  `,

  is: 'nuxeo-search-form-layout',
  behaviors: [I18nBehavior, RoutingBehavior],

  importMeta: import.meta,

  properties: {
    /**
     * The `nuxeo-page-provider` instance used to perform the search.
     * */
    provider: String,
    /**
     * The name of the search layout.
     * */
    searchName: String,
    /**
     * The parameters passed on to `provider`.
     * */
    params: {
      type: Object,
      notify: true,
    },
    skipAggregates: {
      type: Boolean,
      notify: true,
    },
    /**
     * The aggregations returned by `provider`.
     * */
    aggregations: {
      type: Object,
      observer: '_aggregationsChanged',
    },
    /**
     * An object propagating key/values served by enclosing slot contents.
     */
    model: {
      type: Object,
      value() {
        return {};
      },
    },
    _href: {
      type: String,
    },
  },

  observers: ['_paramsChanged(params.*)', '_loadLayout(provider, searchName)'],

  get element() {
    return this.$.layout.element;
  },

  _paramsChanged() {
    if (this.element) {
      this.element.params = this.params;
    }
  },

  _aggregationsChanged() {
    if (this.element) {
      this.element.aggregations = this.aggregations;
    }
  },

  _loadLayout(provider, searchName) {
    const sName = (searchName || provider).toLowerCase();
    const name = ['nuxeo', sName, 'search-form'].join('-');
    /// #if NO_HTML_IMPORTS
    this.$.layout.importFn = () =>
      import(
        /* webpackMode: "eager" */
        /* webpackChunkName: "[request]" */
        // eslint-disable-next-line comma-dangle
        `./${sName}/${name}?entity="document"`
      ).then(() => name);
    /// #else
    this._href = this.resolveUrl(`${sName}/${name}.html`);
    /// #endif
  },

  _formModel() {
    return {
      provider: this.provider,
      params: this.params,
      aggregations: this.aggregations,
    };
  },

  _formChanged(e) {
    this.fire('search-form-layout-changed', e.detail);
    // forward params change events
    this.element.addEventListener('params-changed', (evt) => {
      this.notifyPath(evt.detail.path || 'params', evt.detail.value);
    });
    this.skipAggregates = this.element.skipAggregates;
    this.element.addEventListener('skip-aggregates-changed', (evt) => {
      this.notifyPath(evt.detail.path || 'skipAggregates', evt.detail.value);
    });
  },
});

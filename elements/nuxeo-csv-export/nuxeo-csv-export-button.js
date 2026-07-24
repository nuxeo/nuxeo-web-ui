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

import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { _fetchTypes } from '../fetch-types.js';

/**
`nuxeo-csv-export-button`
@group Nuxeo UI
@element nuxeo-csv-export-button
*/
Polymer({
  _template: html`
    <nuxeo-resource id="types"></nuxeo-resource>
    <nuxeo-operation-button
      id="btn"
      operation="Bulk.RunAction"
      input="[[provider]]"
      params="[[_params(provider, schemas, fields, _resolvedSchemas)]]"
      icon="nuxeo:csv-export"
      label="csvExportButton.label"
      show-label$="[[showLabel]]"
      poll-interval="[[pollInterval]]"
      error-label="csvExportButton.action.error"
      async
      download
    >
    </nuxeo-operation-button>
  `,

  is: 'nuxeo-csv-export-button',
  behaviors: [NotifyBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    /**
     * Page provider from which results are to be exported.
     */
    provider: {
      type: Object,
      observer: '_providerChanged',
    },
    /**
     * The interval to poll for the result, in milliseconds.
     */
    pollInterval: {
      type: Number,
      value: 1000,
    },
    /**
     * A comma separated list of schemas to be used to get the results.
     * If `null` or `undefined`, the schemas resolved from the `provider`'s result document types
     * (`_resolvedSchemas`) are used, falling back to the `provider`'s own schemas when the resolved
     * set is unavailable.
     */
    schemas: {
      type: String,
    },
    /**
     * A comma separated list of fields to be be exported.
     */
    fields: {
      type: String,
    },
    /**
     * `true` if the action should display the label, `false` otherwise.
     */
    showLabel: {
      type: Boolean,
      value: false,
    },

    /**
     * Current action status.
     */
    status: {
      type: Object,
      notify: true,
    },

    /**
     * The schemas to export, resolved from the document types present in the `provider` results unioned with the
     * `provider`'s display schemas. Used when neither `schemas` nor the `provider`'s schemas are enough to cover the
     * custom schemas of the exported documents. Computed internally, do not set.
     */
    _resolvedSchemas: {
      type: String,
    },
  },

  ready() {
    this.$.btn.addEventListener('poll-start', this._onPollStart.bind(this));
    this.$.btn.addEventListener('response', this._onResponse.bind(this));
    // resolve once the local DOM (`this.$.types`) exists, in case `provider` was data-bound before `ready`
    this._resolveSchemas();
  },

  attached() {
    // Re-wire the page-changed listener when the element is re-inserted with the SAME provider
    // instance — `_providerChanged` won't fire in that case — and re-resolve to catch any page
    // changes that happened while detached (otherwise `_resolvedSchemas` can be left stale).
    this._bindProviderPageChanged(this.provider);
    this._resolveSchemas();
  },

  detached() {
    // avoid leaking the current-page-changed listener when the element is removed (e.g. page/dom-if switch)
    this._unbindProviderPageChanged(this.provider);
  },

  _providerChanged(provider, oldProvider) {
    this._unbindProviderPageChanged(oldProvider);
    this._bindProviderPageChanged(provider);
    this._resolveSchemas();
  },

  _bindProviderPageChanged(provider) {
    if (!this._onProviderPageChanged) {
      this._onProviderPageChanged = () => this._resolveSchemas();
    }
    // addEventListener with the same listener reference is idempotent, so re-binding is safe.
    provider?.addEventListener?.('current-page-changed', this._onProviderPageChanged);
  },

  _unbindProviderPageChanged(provider) {
    if (this._onProviderPageChanged) {
      provider?.removeEventListener?.('current-page-changed', this._onProviderPageChanged);
    }
  },

  /**
   * Resolves the list of schemas to export from the document types present in the current `provider` results, so that
   * each exported document's own schemas (including custom ones) are included, without hardcoding schema names. The
   * `provider`'s display schemas are always kept so no currently exported column is lost. Falls back gracefully to the
   * `provider`'s schemas when the result types or their configuration are not available.
   */
  async _resolveSchemas() {
    // track the latest resolution so a slower in-flight call cannot overwrite a newer one with a stale type set
    const token = (this._resolveToken || 0) + 1;
    this._resolveToken = token;
    const provider = this.provider;
    if (!provider) {
      this._resolvedSchemas = undefined;
      return;
    }
    const schemas = new Set(this._toList(provider.schemas));
    const types = [...new Set((provider.currentPage || []).map((doc) => doc?.type).filter(Boolean))];
    if (types.length > 0 && this.$?.types) {
      try {
        const config = await this._fetchTypes();
        const doctypes = config?.doctypes || {};
        types.forEach((type) => {
          const info = doctypes[type];
          if (info && Array.isArray(info.schemas)) {
            info.schemas.forEach((schema) => schemas.add(schema));
          }
        });
      } catch (e) {
        // keep the provider's display schemas when the types configuration cannot be fetched
        console.warn('nuxeo-csv-export-button: could not resolve schemas from config/types', e);
      }
    }
    // ignore stale resolutions superseded by a newer call (provider change or a rapid page change)
    if (this._resolveToken === token) {
      this._resolvedSchemas = schemas.size > 0 ? [...schemas].join(',') : undefined;
    }
  },

  _fetchTypes() {
    return _fetchTypes(this.$.types);
  },

  _toList(value) {
    return value
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  },

  _params() {
    const actionParams = {};
    const schemas = this.schemas != null ? this.schemas : this._resolvedSchemas || this.provider?.schemas;
    if (schemas) {
      actionParams.schemas = this._toList(schemas);
    }
    if (this.fields) {
      actionParams.xpaths = this._toList(this.fields);
    }
    return {
      action: 'csvExport',
      parameters: JSON.stringify(actionParams),
    };
  },

  _onPollStart() {
    this.notify({ message: this.i18n('csvExportButton.action.poll') });
  },

  _onResponse() {
    this.notify({ message: this.i18n('csvExportButton.action.completed') });
  },
});

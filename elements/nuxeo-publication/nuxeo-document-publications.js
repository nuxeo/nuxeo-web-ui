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

import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import './nuxeo-unpublish-button.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      .results {
        @apply --layout-vertical;
        @apply --layout-flex;
        display: block;
        position: relative;
        min-height: calc(100vh - 17em - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
        margin-top: 8px;
      }

      .left-ellipsis {
        direction: rtl;
        text-align: left;
      }

      .right-ellipsis {
        direction: ltr;
        text-align: right;
      }

      .ellipsis {
        width: calc(100% - 38px);
        display: block;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .capitalize {
        text-transform: capitalize;
      }

      .resultActions {
        display: block;
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-end-justified;
      }

      .resultActions paper-icon-button {
        padding: 0.3em;
        margin-left: 4px;
      }
    </style>

    <nuxeo-operation id="unpublishOp" op="Document.Delete" sync-indexing></nuxeo-operation>
    <nuxeo-operation id="unpublishAllOp" op="Document.UnpublishAll" sync-indexing input="[[_src]]"></nuxeo-operation>
    <nuxeo-operation id="srcDocOp" op="Proxy.GetSourceDocument" input="[[document.uid]]"></nuxeo-operation>
    <nuxeo-operation id="publishOp" op="Document.PublishToSection"></nuxeo-operation>

    <nuxeo-page-provider
      id="provider"
      page-size="40"
      provider="nxql_search"
      params="[[_computeParams(_src)]]"
      sort='{"dc:modified": "desc", "uid:major_version": "desc", "uid:minor_version": "desc"}'
      enrichers="thumbnail, permissions, audit"
      headers='{"fetch-document": "properties", "translate-directoryEntry": "label"}'
      schemas="dublincore,common,uid,rendition"
    >
    </nuxeo-page-provider>

    <nuxeo-card heading="[[i18n('publication.details')]]">
      <div class="resultActions">
        <paper-button class="uppercase" on-tap="_unpublishAll" disabled$="[[!hasPublications]]"
          >[[i18n('publication.unpublishAll')]]</paper-button
        >
      </div>
      <nuxeo-data-table
        id="table"
        nx-provider="provider"
        class="results"
        items="{{publishedDocs}}"
        empty-label="[[i18n('publication.noPublications')]]"
        caption-text="[[i18n('publication.details')]]"
      >
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.path')]]" flex="200">
          <template>
            <nuxeo-document-thumbnail document="[[item]]"></nuxeo-document-thumbnail>
            <a class$="path ellipsis [[_ellipsisDirection()]]" href$="[[urlFor(item)]]">[[item.path]]&lrm;</a>
            <nuxeo-tooltip>[[item.path]]</nuxeo-tooltip>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.version')]]" flex="10">
          <template>
            <span class="version">[[formatVersion(item)]]</span>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('publication.rendition')]]" flex="10">
          <template>
            <span class="uppercase ellipsis rendition"> [[formatRendition(item.properties.rend:renditionName)]] </span>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('publication.publisher')]]" flex="40">
          <template>
            <nuxeo-user-tag user="[[_getPublisher(item)]]"></nuxeo-user-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('publication.publishDate')]]" flex="30">
          <template>
            <nuxeo-date datetime="[[_getPublishDate(item)]]"></nuxeo-date>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column flex="10">
          <template>
            <template is="dom-if" if="[[_canUnpublish(item)]]">
              <paper-button class="uppercase unpublish" on-tap="_unpublish"
                >[[i18n('publication.unpublish')]]</paper-button
              >
            </template>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column flex="10">
          <template>
            <template is="dom-if" if="[[_canRepublish(item)]]">
              <paper-button class="uppercase primary republish" on-tap="_republish"
                >[[i18n('publication.republish')]]</paper-button
              >
            </template>
          </template>
        </nuxeo-data-table-column>
      </nuxeo-data-table>
    </nuxeo-card>
  `,

  is: 'nuxeo-document-publications',
  behaviors: [NotifyBehavior, LayoutBehavior],

  properties: {
    document: Object,
    _src: Object,
    visible: Boolean,
    hasPublications: {
      type: Boolean,
      computed: '_hasPublications(publishedDocs)',
    },
  },

  observers: ['_fetchPublications(_src, visible)', '_observeDocument(document, visible)'],

  listeners: {
    'nx-publish-success': '_fetchPublications',
    'nx-unpublish-success': '_fetchPublications',
  },

  _observeDocument() {
    if (this.document && this.visible) {
      if (!this.document.isVersion) {
        this._src = this.document;
      } else {
        this.$.srcDocOp.execute().then((src) => {
          this._src = src;
        });
      }
    } else {
      this._src = null;
    }
  },

  _computeParams() {
    if (this._src) {
      const { uid } = this._src;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
        return;
      }
      return {
        queryParams: `${'SELECT * FROM Document WHERE ecm:isProxy = 1 AND ecm:isTrashed = 0 AND (rend:sourceVersionableId = "'}${uid}" OR ecm:proxyVersionableId = "${uid}")`,
      };
    }
  },

  _fetchPublications() {
    if (this.visible && this._src) {
      this.$.table.fetch();
    }
  },

  _unpublish(e) {
    if (e && e.target) {
      if (!window.confirm(this.i18n('publication.unpublish.confirm'))) {
        return;
      }
      const doc = e.target.parentNode.item;
      this.$.unpublishOp.input = doc;
      this.$.unpublishOp
        .execute()
        .then(() => {
          this.notify({ message: this.i18n('publication.unpublish.success') });
          this._fetchPublications();
        })
        .catch(() => {
          this.notify({ message: this.i18n('publication.unpublish.error') });
        });
    }
  },

  _republish(e) {
    if (e && e.target) {
      if (!window.confirm(this.i18n('publication.republish.confirm'))) {
        return;
      }
      const obsolete = e.target.parentNode.item;
      this.$.publishOp.params = {
        target: obsolete.parentRef,
        override: true,
        renditionName: obsolete.properties['rend:renditionName'],
      };
      this.$.publishOp.input = this._src.uid;
      this.$.publishOp
        .execute()
        .then(() => {
          this.notify({
            message: this.i18n('publication.internal.publish.success'),
          });
          this.fire('document-updated');
          this.fire('nx-publish-success');
        })
        .catch((err) => {
          this.notify({
            message: this.i18n('publication.internal.publish.error'),
          });
          throw err;
        });
    }
  },

  _canUnpublish(doc) {
    return doc && this.hasPermission(doc, 'WriteVersion');
  },

  _canRepublish(doc) {
    if (this._src && this._canUnpublish(doc)) {
      const pubMaj = doc.properties['uid:major_version'];
      const srcMaj = this._src.properties['uid:major_version'];
      if (pubMaj < srcMaj) {
        return true;
      }
      if (pubMaj === srcMaj) {
        const pubMin = doc.properties['uid:minor_version'];
        const srcMin = this._src.properties['uid:minor_version'];
        return pubMin < srcMin || (pubMin === srcMin && this._src.isCheckedOut);
      }
    }
    return false;
  },

  _hasPublications(docs) {
    return docs && docs.length > 0;
  },

  _unpublishAll() {
    if (!window.confirm(this.i18n('publication.unpublish.all.confirm'))) {
      return;
    }
    this.$.unpublishAllOp
      .execute()
      .then(() => {
        this.notify({ message: this.i18n('publication.unpublish.all.success') });
        this._fetchPublications();
      })
      .catch(() => {
        this.notify({ message: this.i18n('publication.unpublish.all.error') });
      });
  },

  _ellipsisDirection() {
    if (document.dir !== 'rtl') {
      return 'left-ellipsis';
    }
    return 'right-ellipsis';
  },
  _getPublisher(item) {
    if (item && item.contextParameters && item.contextParameters.audit) {
      const { audit } = item.contextParameters;
      const createdEvent = audit.find((event) => event.eventId === 'documentCreated');
      if (createdEvent && createdEvent.principalName) {
        return createdEvent.principalName;
      }
    }

    if (item && item.properties && item.properties['dc:publisher']) {
      return item.properties['dc:publisher'];
    }

    if (item && item.properties) {
      return item.properties['dc:lastContributor'];
    }
    return null;
  },

  _getPublishDate(item) {
    // Get the publish date from audit logs - find the "documentCreated" event for the proxy
    if (item && item.contextParameters && item.contextParameters.audit) {
      const { audit } = item.contextParameters;
      // Find the documentCreated event (the first event when the proxy was created)
      const createdEvent = audit.find((event) => event.eventId === 'documentCreated');
      if (createdEvent && createdEvent.eventDate) {
        return createdEvent.eventDate;
      }
    }
    // Fallback: try dc:publishDate if it exists
    if (item && item.properties && item.properties['dc:publishDate']) {
      return item.properties['dc:publishDate'];
    }
    // Last fallback: use dc:created (when the proxy was created)
    if (item && item.properties) {
      return item.properties['dc:created'];
    }
    return null;
  },
});

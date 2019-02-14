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

import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '../nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
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
        min-height: calc(100vh - 17em - var(--nuxeo-app-top));
        margin-top: 8px;
      }

      .ellipsis {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        display: block;
        width: calc(100% - 38px);
      }

      .capitalize {
        text-transform: capitalize;
      }

      .uppercase {
        text-transform: uppercase;
      }

      .resultActions {
        display: block;
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-end-justified;
      }

      .resultActions paper-icon-button {
        padding: .3em;
        margin-left: 4px;
      }

    </style>

    <nuxeo-operation id="unpublishOp" op="Document.Delete" sync-indexing="">
    </nuxeo-operation>
    <nuxeo-operation id="unpublishAllOp" op="Document.UnpublishAll" sync-indexing="" input="[[_src]]">
    </nuxeo-operation>
    <nuxeo-operation id="srcDocOp" op="Proxy.GetSourceDocument" input="[[document.uid]]">
    </nuxeo-operation>
    <nuxeo-operation id="publishOp" op="Document.PublishToSection">
    </nuxeo-operation>

    <nuxeo-page-provider id="provider" page-size="40" provider="nxql_search" params="[[_computeParams(_src)]]" sort="{&quot;dc:modified&quot;: &quot;desc&quot;, &quot;uid:major_version&quot;: &quot;desc&quot;, &quot;uid:minor_version&quot;: &quot;desc&quot;}" enrichers="thumbnail, permissions" headers="{&quot;X-NXfetch.document&quot;: &quot;properties&quot;, &quot;X-NXtranslate.directoryEntry&quot;: &quot;label&quot;}" schemas="dublincore,common,uid,rendition">
    </nuxeo-page-provider>

    <nuxeo-card heading="[[i18n('publication.details')]]">

      <div class="resultActions">
        <paper-button class="uppercase" on-tap="_unpublishAll" disabled\$="[[!hasPublications]]">[[i18n('publication.unpublishAll')]]</paper-button>
      </div>
      <nuxeo-data-table id="table" nx-provider="provider" class="results" items="{{publishedDocs}}" empty-label="[[i18n('publication.noPublications')]]">
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.title')]]" flex="200">
          <template>
            <nuxeo-document-thumbnail document="[[item]]"></nuxeo-document-thumbnail>
            <a class="path ellipsis" href\$="[[urlFor('browse', item.path)]]">[[item.path]]</a>
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
            <span class="uppercase ellipsis rendition">
              [[formatRendition(item.properties.rend:renditionName)]]
            </span>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('publication.publisher')]]" flex="40">
          <template>
            <!-- TODO check it is indeed the publisher, might be the dc:publisher field -->
            <nuxeo-user-tag user="[[item.properties.dc:lastContributor]]"></nuxeo-user-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('publication.publishDate')]]" flex="30">
          <template>
            <!-- TODO check it is indeed the publish date -->
            <nuxeo-date datetime="[[item.properties.dc:modified]]"></nuxeo-date>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column flex="10">
          <template>
            <template is="dom-if" if="[[_canUnpublish(item)]]">
              <paper-button class="uppercase unpublish" on-tap="_unpublish">[[i18n('publication.unpublish')]]</paper-button>
            </template>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column flex="10">
          <template>
            <template is="dom-if" if="[[_canRepublish(item)]]">
              <paper-button class="uppercase primary republish" on-tap="_republish">[[i18n('publication.republish')]]</paper-button>
            </template>
          </template>
        </nuxeo-data-table-column>
      </nuxeo-data-table>
    </nuxeo-card>
`,

  is: 'nuxeo-document-publications',
  behaviors: [Nuxeo.LayoutBehavior],

  properties: {
    document: Object,
    _src: Object,
    visible: Boolean,
    hasPublications: {
      type: Boolean,
      computed: '_hasPublications(publishedDocs)'
    }
  },

  observers: [
    '_fetchPublications(_src, visible)',
    '_observeDocument(document, visible)'
  ],

  listeners : {
    'nx-publish-success': '_fetchPublications',
    'nx-unpublish-success': '_fetchPublications'
  },

  _observeDocument: function() {
    if (this.document && this.visible) {
      if (!this.document.isVersion) {
        this._src = this.document;
      } else {
        this.$.srcDocOp.execute().then(function(src) {
          this._src = src;
        }.bind(this));
      }
    } else {
      this._src = null;
    }
  },

  _computeParams: function() {
    if (this._src) {
      var uid = this._src.uid;
      return {queryParams: 'SELECT * FROM Document WHERE ecm:isProxy = 1 AND ecm:isTrashed = 0' +
        'AND (rend:sourceVersionableId = "' +
        uid +
        '" OR ecm:proxyVersionableId = "' +
        uid +
        '")'
      };
    }
  },

  _fetchPublications: function() {
    if (this.visible && this._src) {
      this.$.table.fetch();
    }
  },

  _unpublish: function(e) {
    if (e && e.target) {
      if (!confirm(this.i18n('publication.unpublish.confirm'))) {
        return;
      }
      var doc = e.target.parentNode.item;
      this.$.unpublishOp.input = doc;
      this.$.unpublishOp.execute().then(function() {
        this.fire('notify', {'message': this.i18n('publication.unpublish.success')});
        this._fetchPublications();
      }.bind(this)).catch(function() {
        this.fire('notify', {'message': this.i18n('publication.unpublish.error')});
      }.bind(this));
    }
  },

  _republish: function(e) {
    if (e && e.target) {
      if (!confirm(this.i18n('publication.republish.confirm'))) {
        return;
      }
      var obsolete = e.target.parentNode.item;
      this.$.publishOp.params = {
        'target': obsolete.parentRef,
        'override': true,
        'renditionName': obsolete.properties['rend:renditionName']
      }
      this.$.publishOp.input = this._src.uid;
      this.$.publishOp.execute().then(function() {
        this.fire('notify', {
          'message': this.i18n('publication.internal.publish.success')
        });
        this.fire('document-updated');
        this.fire('nx-publish-success');
      }.bind(this)).catch(function(err) {
        this.fire('notify', {
          'message': this.i18n('publication.internal.publish.error')
        });
        throw err;
      }.bind(this));
    }
  },

  _canUnpublish: function(doc) {
    return doc && this.hasPermission(doc, 'Write');
  },

  _canRepublish: function(doc) {
    if (this._src && this._canUnpublish(doc)) {
      var pubMaj = doc.properties['uid:major_version'];
      var srcMaj = this._src.properties['uid:major_version'];
      if (pubMaj < srcMaj) {
        return true;
      } else if (pubMaj === srcMaj) {
        var pubMin = doc.properties['uid:minor_version'];
        var srcMin = this._src.properties['uid:minor_version'];
        return pubMin < srcMin || (pubMin === srcMin && this._src.isCheckedOut);
      }
    }
    return false;
  },

  _hasPublications: function(docs) {
    return docs && docs.length > 0;
  },

  _unpublishAll: function() {
    if (!confirm(this.i18n('publication.unpublish.all.confirm'))) {
      return;
    }
    this.$.unpublishAllOp.execute().then(function() {
      this.fire('notify', {'message': this.i18n('publication.unpublish.all.success')});
      this._fetchPublications();
    }.bind(this)).catch(function() {
      this.fire('notify', {'message': this.i18n('publication.unpublish.all.error')});
    });
  }
});

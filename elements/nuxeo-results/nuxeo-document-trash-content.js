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
`nuxeo-document-trash-content`
@group Nuxeo UI
@element nuxeo-document-trash-content
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-aggregation/nuxeo-dropdown-aggregation.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-grid/nuxeo-data-grid.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '../nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import '../nuxeo-data-grid/nuxeo-document-grid-thumbnail.js';
import { DocumentContentBehavior } from './nuxeo-document-content-behavior.js';
import './nuxeo-results.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      nuxeo-tag {
        margin-right: 2px;
      }

      .results {
        @apply --layout-vertical;
        @apply --layout-flex;
        min-height: var(--nuxeo-document-trash-content-min-height, calc(100vh - 168px - var(--nuxeo-app-top)));
        margin-bottom: var(--nuxeo-document-trash-content-margin-bottom, 0);
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
    </style>

    <nuxeo-connection id="nxcon"></nuxeo-connection>

    <nuxeo-operation id="opEmptyTrash" op="Document.EmptyTrash" params="{&quot;parent&quot;: &quot;[[document.uid]]&quot;}" sync-indexing=""></nuxeo-operation>

    <nuxeo-page-provider id="nxProvider" provider="[[provider]]" page-size="[[pageSize]]" aggregations="{{aggregations}}" enrichers="[[enrichers]]" params="[[params]]" schemas="[[schemas]]" headers="[[headers]]" fetch-aggregates="">
    </nuxeo-page-provider>

    <nuxeo-results id="results" display-mode="table" name="[[document.uid]]-trashed" nx-provider="[[nxProvider]]" selected-items="{{selectedItems}}" document="[[document]]" display-quick-filters="" display-sort="" sort-options="[[sortOptions]]">

      <div slot="actions">
        <template is="dom-if" if="[[hasPermission(document, 'Everything')]]">
          <paper-button noink="" on-tap="_emptyTrash">[[i18n('documentTrashContent.emptyTrash')]]</paper-button>
        </template>
      </div>

      <!-- Grid view -->
      <nuxeo-data-grid name="grid" icon="nuxeo:view-thumbnails" class="results" empty-label="[[emptyLabel]]" empty-label-when-filtered="[[emptyLabelWhenFiltered]]" selection-enabled="">
        <template>
          <nuxeo-document-grid-thumbnail class="grid-box" tabindex\$="{{tabIndex}}" selected\$="{{selected}}" index="[[index]]" doc="[[item]]" on-navigate="_navigate" selected-items="[[selectedItems]]">
          </nuxeo-document-grid-thumbnail>
        </template>
      </nuxeo-data-grid>

      <!-- Table view -->
      <nuxeo-data-table name="table" icon="nuxeo:view-list" class="results" settings-enabled="" empty-label="[[emptyLabel]]" empty-label-when-filtered="[[emptyLabelWhenFiltered]]" selection-enabled="" on-row-clicked="_navigate">
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.title')]]" field="dc:title" sort-by="dc:title" filter-by="title" flex="100">
          <template>
            <nuxeo-document-thumbnail document="[[item]]"></nuxeo-document-thumbnail>
            <a class="title ellipsis" href\$="[[urlFor('browse', item.path)]]" on-tap="_navigate">[[item.title]]</a>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.type')]]" field="type" hidden="">
          <template>
            <nuxeo-tag>[[item.type]]</nuxeo-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.modified')]]" field="dc:modified" sort-by="dc:modified" filter-by="dc_modified_agg" flex="50">
          <template is="header">
            <nuxeo-dropdown-aggregation placeholder="[[i18n('documentContentView.datatable.header.modified')]]" data="[[aggregations.dc_modified_agg]]" value="{{column.filterValue}}" multiple="">
            </nuxeo-dropdown-aggregation>
          </template>
          <template>
            <nuxeo-date datetime="[[item.properties.dc:modified]]"></nuxeo-date>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.lastContributor')]]" filter-by="dc_last_contributor_agg" field="dc:lastContributor" sort-by="dc:lastContributor" flex="50">
          <template is="header">
            <nuxeo-dropdown-aggregation placeholder="[[i18n('documentContentView.datatable.header.lastContributor')]]" data="[[aggregations.dc_last_contributor_agg]]" value="{{column.filterValue}}" multiple="">
            </nuxeo-dropdown-aggregation>
          </template>
          <template>
            <nuxeo-user-tag user="[[item.properties.dc:lastContributor]]"></nuxeo-user-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.state')]]" field="currentLifeCycleState" hidden="">
          <template><span class="capitalize">[[formatLifecycleState(item.state)]]</span></template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.version')]]" field="versionLabel" hidden="">
          <template>
            [[formatVersion(item)]]
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.created')]]" field="dc:created" sort-by="dc:created" flex="50" hidden="">
          <template>
            <nuxeo-date datetime="[[item.properties.dc:created]]"></nuxeo-date>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.author')]]" field="dc:creator" sort-by="dc:creator" hidden="">
          <template>
            <nuxeo-user-tag user="[[item.properties.dc:creator]]"></nuxeo-user-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.nature')]]" field="dc:nature" hidden="">
          <template>
            <nuxeo-tag hidden\$="[[!item.properties.dc:nature]]">
              [[formatDirectory(item.properties.dc:nature)]]
            </nuxeo-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.coverage')]]" field="dc:coverage" hidden="">
          <template>
            <nuxeo-tag hidden\$="[[!item.properties.dc:coverage]]">
              [[formatDirectory(item.properties.dc:coverage)]]
            </nuxeo-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.subjects')]]" field="dc:subjects" hidden="" flex="60">
          <template>
            <template is="dom-repeat" items="[[item.properties.dc:subjects]]" as="subject">
              <nuxeo-tag>[[formatDirectory(subject)]]</nuxeo-tag>
            </template>
          </template>
        </nuxeo-data-table-column>
      </nuxeo-data-table>

    </nuxeo-results>
`,

  is: 'nuxeo-document-trash-content',
  behaviors: [DocumentContentBehavior],

  properties: {
    /**
     * The name of the page provider to be used.
     */
    provider: {
      type: String,
      value: 'advanced_document_content'
    },
    /**
     * The number of results per page.
     */
    pageSize: {
      type: Number,
      value: 40
    },
    /**
     * List of comma separated values of the document schemas to be returned.
     * All document schemas are returned by default.
     */
    schemas: {
      type: String,
      value: 'dublincore,common,uid,file'
    },
    /**
     * List of content enrichers passed on to `provider`.
     * Already set by default are thumbnail, permissions and highlight.
     */
    enrichers: {
      type: String,
      value: 'thumbnail, permissions'
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
     * The label to be dislayed when there are no results.
     */
    emptyLabel: String,
    /**
     * The label to be dislayed when there are no results with filtering applied.
     */
    emptyLabelWhenFiltered: String
  },

  _emptyTrash: function() {
    this.$.opEmptyTrash.execute().then(function() {
      this.fire('notify', { message: this.i18n('documentTrashContent.emptyTrash.success') });
      this._refresh();
    }.bind(this)).catch(function(error) {
      this.fire('notify', { message: this.i18n('documentTrashContent.emptyTrash.error') });
      if (error.status !== 404) {
        throw error;
      }
    }.bind(this));
  },

  _computeParams: function(document) {
    return document ? {'ecm_parentId': document.uid, 'ecm_trashed': true} : {};
  },

  _computeSortOptions: function() {
    return [
      {field: 'dc:title', label: this.i18n('searchResults.sort.field.title'), order: 'asc'},
      {field: 'dc:created', label: this.i18n('searchResults.sort.field.created'), order: 'asc', selected: true},
      {field: 'dc:modified', label: this.i18n('searchResults.sort.field.modified'), order: 'desc'},
      {field: 'dc:lastContributor', label: this.i18n('searchResults.sort.field.lastContributor'), order: 'asc'}
    ];
  }
});

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
`nuxeo-default-results`
@group Nuxeo UI
@element nuxeo-default-results
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-grid/nuxeo-data-grid.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '../nuxeo-data-grid/nuxeo-document-grid-thumbnail.js';
import './nuxeo-results.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">

      nuxeo-data-table {
        min-height: calc(100vh - 9.3em);
      }

      nuxeo-data-grid, nuxeo-data-list {
        display: block;
        position: relative;
      }

      nuxeo-data-grid, nuxeo-data-list {
        min-height: calc(100vh - 8em);
      }

      .ellipsis {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        display: block;
      }

      .capitalize {
        text-transform: capitalize;
      }
    </style>

    <nuxeo-results id="results" display-mode="table" name="[[name]]" nx-provider="[[nxProvider]]" selected-items="{{selectedItems}}" display-quick-filters="">

      <slot name="selectionActions" slot="selectionActions"></slot>

      <nuxeo-data-grid name="grid" icon="nuxeo:view-thumbnails" empty-label="[[emptyLabel]]" empty-label-when-filtered="[[emptyLabelWhenFiltered]]" selection-enabled="">
        <template>
          <nuxeo-document-grid-thumbnail class="grid-box" tabindex\$="{{tabIndex}}" selected\$="{{selected}}" selected-items="[[selectedItems]]" index="[[index]]" doc="[[item]]" on-navigate="_navigate">
          </nuxeo-document-grid-thumbnail>
        </template>
      </nuxeo-data-grid>

      <nuxeo-data-table name="table" icon="nuxeo:view-list" settings-enabled="" empty-label="[[emptyLabel]]" empty-label-when-filtered="[[emptyLabelWhenFiltered]]" selection-enabled="" on-row-clicked="_navigate">
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.title')]]" field="dc:title" sort-by="dc:title" flex="100">
          <template>
            <nuxeo-document-thumbnail document="[[item]]"></nuxeo-document-thumbnail>
            <a class="title ellipsis" href\$="[[urlFor('browse', item.path)]]" on-tap="_navigateLink" data-index="[[index]]">
              [[item.title]]
            </a>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.type')]]" field="type" hidden="">
          <template>
            <nuxeo-tag>[[formatDocType(item.type)]]</nuxeo-tag>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.modified')]]" field="dc:modified" sort-by="dc:modified" flex="50">
          <template>
            <nuxeo-date datetime="[[item.properties.dc:modified]]"></nuxeo-date>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentContentView.datatable.header.lastContributor')]]" field="dc:lastContributor" sort-by="dc:lastContributor" flex="50">
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

  is: 'nuxeo-default-results',
  behaviors: [RoutingBehavior, FormatBehavior],

  properties: {
    nxProvider: Object,

    name: String,

    selectedItems: {
      type: Array,
      notify: true
    },

    emptyLabel: String,
    emptyLabelWhenFiltered: String
  },

  _refreshAndFetch: function() {
    this.$.results._refreshAndFetch();
  },

  get items() {
    if (this.shadowRoot) {
      return this.shadowRoot.querySelector('#results').items;
    }
    return null;
  },

  _navigate: function(e) {
    this.fire('navigate', {doc: (e.model || e.detail).item, index: (e.model || e.detail).index});
    e.stopPropagation();
  },

  _navigateLink: function(e) {
    e.detail = {item: this.items[e.target.dataIndex], index: e.target.dataIndex};
    this._navigate(e);
  }
});

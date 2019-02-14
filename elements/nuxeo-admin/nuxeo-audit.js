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
`nuxeo-audit`
@group Nuxeo UI
@element nuxeo-audit
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-elements/nuxeo-audit-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-directory-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '../nuxeo-app/nuxeo-page.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
Polymer({
  _template: html`
    <style>
      nuxeo-data-table {
        height: calc(100vh - 25em);
        min-height: 15em;
      }

      .row-container {
        @apply --layout-horizontal;
        @apply --layout-wrap;
      }

      .item {
        flex: 1 0 0;
        margin-right: 8px;
      }

      @media (max-width: 768px) {
        .item {
          min-width: 100%;
        }

        nuxeo-data-table {
          height: calc(100vh - 33em);
        }
      }
    </style>

    <nuxeo-audit-page-provider id="provider" page-size="40" provider-name="EVENTS_VIEW"></nuxeo-audit-page-provider>
    <nuxeo-page>
      <div slot="header">
        <span class="flex">[[i18n('audit.heading')]]</span>
      </div>
      <div>
        <nuxeo-card>
          <nuxeo-user-suggestion value="{{principalName}}" label="[[i18n('audit.username')]]" placeholder="[[i18n('audit.usernamePlaceholder')]]"></nuxeo-user-suggestion>

          <div class="row-container">
            <nuxeo-date-picker role="widget" class="item" value="{{startDate}}" label="[[i18n('audit.from')]]">
            </nuxeo-date-picker>
            <nuxeo-date-picker role="widget" class="item" value="{{endDate}}" label="[[i18n('audit.to')]]">
            </nuxeo-date-picker>
          </div>

          <div class="row-container">
            <nuxeo-directory-suggestion class="item" role="widget" label="[[i18n('audit.eventTypes')]]" directory-name="eventTypes" value="{{selectedEventTypes}}" multiple="true" placeholder="[[i18n('audit.selectEventTypes')]]" min-chars="0">
            </nuxeo-directory-suggestion>

            <nuxeo-directory-suggestion class="item" role="widget" label="[[i18n('audit.eventCategory')]]" directory-name="eventCategories" value="{{selectedEventCategory}}" placeholder="[[i18n('audit.selectEventCategory')]]" min-chars="0">
            </nuxeo-directory-suggestion>
          </div>
        </nuxeo-card>

        <nuxeo-card>
          <nuxeo-data-table id="table" paginable="" nx-provider="provider" empty-label="[[i18n('audit.empty')]]">
            <nuxeo-data-table-column name="[[i18n('audit.performedAction')]]" sort-by="eventId">
              <template>[[_formati18n('eventType.', item.eventId)]]</template>
            </nuxeo-data-table-column>
            <nuxeo-data-table-column name="[[i18n('audit.date')]]" sort-by="eventDate">
              <template><nuxeo-date datetime="[[item.eventDate]]"></nuxeo-date></template>
            </nuxeo-data-table-column>
            <nuxeo-data-table-column name="[[i18n('audit.username')]]" sort-by="principalName">
              <template>
                <nuxeo-user-tag user="[[item.principalName]]"></nuxeo-user-tag>
              </template>
            </nuxeo-data-table-column>
            <nuxeo-data-table-column name="[[i18n('audit.category')]]" sort-by="category">
              <template>[[_formati18n('eventCategory.', item.category)]]</template>
            </nuxeo-data-table-column>
            <nuxeo-data-table-column name="[[i18n('audit.document')]]">
              <template>[[_formatDocument(item)]]</template>
            </nuxeo-data-table-column>
            <nuxeo-data-table-column name="[[i18n('audit.comment')]]">
              <template>[[item.comment]]</template>
            </nuxeo-data-table-column>
          </nuxeo-data-table>
      </nuxeo-card>
      </div>
    </nuxeo-page>
`,

  is: 'nuxeo-audit',
  behaviors: [FormatBehavior],

  properties: {
    visible: {
      type: Boolean
    },
    entries: {
      type: Array,
      value: []
    },
    selectedEventTypes: {
      type: Array,
      value: []
    },
    selectedEventCategory: {
      type: String,
      value: ''
    },
    startDate: {
      type: String,
      value: ''
    },
    endDate: {
      type: String,
      value: ''
    },
    principalName: {
      type: String,
      value: ''
    }
  },

  observers: [
    '_refresh(startDate, endDate, selectedEventTypes.*, selectedEventCategory, principalName)'
  ],

  _formati18n: function(path, key) {
    return key ? this.i18n(path + key) : '';
  },

  _formatDocument: function(item) {
    if (item) {
      return (item.docUUID || '') + (item.docType ? ' (' + item.docType + ') ' : '') + (item.docPath || '');
    }
  },

  /* Builds the parameters object to be used on the query */
  _buildParams: function() {
    var params = {
      principalName: this.principalName
    };
    if (this.startDate) {
      params.startDate = this.startDate;
    }
    if (this.endDate) {
      params.endDate = this.endDate;
    }
    if (this.selectedEventTypes && this.selectedEventTypes.length > 0) {
      params.eventIds = this.selectedEventTypes.join();
    }
    if (this.selectedEventCategory) {
      params.eventCategory = this.selectedEventCategory;
    }
    return params;
  },

  _refresh: function() {
    if (this.visible) {
      this.$.provider.params = this._buildParams();
      this.$.table.fetch();
    }
  }
});

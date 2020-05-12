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
import '@nuxeo/nuxeo-elements/nuxeo-audit-page-provider.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import moment from '@nuxeo/moment';

/**
`nuxeo-document-history`
@group Nuxeo UI
@element nuxeo-document-history
*/
Polymer({
  _template: html`
    <style>
      .row-container {
        @apply --layout-horizontal;
        @apply --layout-wrap;
      }

      .row-container * {
        flex: 1 0 0;
        margin-right: 8px;
      }

      #table {
        height: calc(100vh - 370px);
      }
    </style>

    <nuxeo-audit-page-provider id="provider" page-size="40"></nuxeo-audit-page-provider>

    <nuxeo-card>
      <template is="dom-if" if="[[visible]]">
        <nuxeo-user-suggestion
          value="{{principalName}}"
          label="[[i18n('documentHistory.filter.username')]]"
          placeholder="[[i18n('documentHistory.filter.usernamePlaceholder')]]"
        ></nuxeo-user-suggestion>
        <div class="row-container">
          <nuxeo-date-picker role="widget" label="[[i18n('documentHistory.filter.after')]]" value="{{startDate}}">
          </nuxeo-date-picker>
          <nuxeo-date-picker role="widget" label="[[i18n('documentHistory.filter.before')]]" value="{{endDate}}">
          </nuxeo-date-picker>
        </div>
        <div class="row-container">
          <nuxeo-directory-suggestion
            class="item"
            role="widget"
            label="[[i18n('documentHistory.filter.eventType')]]"
            directory-name="eventTypes"
            value="{{selectedEventTypes}}"
            multiple="true"
            placeholder="[[i18n('documentHistory.filter.selectEventTypes')]]"
            min-chars="0"
          >
          </nuxeo-directory-suggestion>

          <nuxeo-directory-suggestion
            class="item"
            role="widget"
            label="[[i18n('documentHistory.filter.eventCategory')]]"
            directory-name="eventCategories"
            value="{{selectedEventCategory}}"
            placeholder="[[i18n('documentHistory.filter.selectEventCategory')]]"
            min-chars="0"
          >
          </nuxeo-directory-suggestion>
        </div>
      </template>
    </nuxeo-card>

    <nuxeo-card>
      <nuxeo-data-table id="table" paginable nx-provider="provider" empty-label="[[i18n('documentHistory.empty')]]">
        <nuxeo-data-table-column name="[[i18n('documentHistory.performedAction')]]" sort-by="eventId">
          <template>[[_formatActivity(item.eventId)]]</template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.date')]]" sort-by="eventDate">
          <template><nuxeo-date datetime="[[item.eventDate]]" format="LLL"></nuxeo-date></template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.username')]]" sort-by="principalName">
          <template><nuxeo-user-tag user="[[item.principalName]]"></nuxeo-user-tag></template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.category')]]" sort-by="category">
          <template>[[_formatActivity(item.category)]]</template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.comment')]]">
          <template>
            <a href$="[[_parseComment(item.comment)]]">[[_formatComment(item.comment)]]</a>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.state')]]">
          <template><nuxeo-tag uppercase>[[formatLifecycleState(item.docLifeCycle)]]</nuxeo-tag></template>
        </nuxeo-data-table-column>
      </nuxeo-data-table>
    </nuxeo-card>
  `,

  is: 'nuxeo-document-history',
  behaviors: [FormatBehavior, RoutingBehavior],

  properties: {
    document: Object,
    visible: {
      type: Boolean,
      value: false,
      observer: '_refresh',
    },
    principalName: {
      type: String,
      value: '',
    },
    startDate: {
      type: String,
      notify: true,
    },
    endDate: {
      type: String,
      notify: true,
    },
    selectedEventTypes: {
      type: Array,
      value: [],
    },
    selectedEventCategory: {
      type: String,
      value: '',
    },
  },

  observers: ['_refresh(startDate, endDate, selectedEventTypes.*, selectedEventCategory, principalName)'],

  _hasValidDate(dateAsString) {
    return dateAsString && dateAsString.length > 0;
  },

  _buildParams() {
    const params = {
      principalName: this.principalName,
    };
    if (this.selectedEventTypes && this.selectedEventTypes.length > 0) {
      params.eventIds = this.selectedEventTypes;
    }
    if (this.selectedEventCategory) {
      params.eventCategory = this.selectedEventCategory;
    }

    if (this._hasValidDate(this.startDate) && this._hasValidDate(this.endDate)) {
      const start = Date.parse(this.startDate);
      const end = Date.parse(this.endDate);
      if (start > end) {
        this.startDate = moment(end)
          .subtract(7, 'day')
          .format('YYYY-MM-DD');
      }
    }

    if (this._hasValidDate(this.startDate)) {
      params.startDate = this.startDate;
    }
    if (this._hasValidDate(this.endDate)) {
      params.endDate = this.endDate;
    }

    return params;
  },

  _refresh() {
    if (this.document && this.visible) {
      this.$.provider.page = 1;
      this.$.provider.docId = this.document.uid;
      this.$.provider.params = this._buildParams();
      this.$.table.fetch();
    }
  },

  _formatActivity(key) {
    return this.i18n(`activity.${key}`);
  },

  // XXX: Both parse and format methods shouldn't be needed after NXP-28820
  _parseComment(comment) {
    if (comment && /^\w+:(?:\w+-){2,}(?:\w+)$/.test(comment)) {
      // repoName:docId
      return this.urlFor('document', comment.split(':')[1]);
    }
    return null;
  },

  _formatComment(comment) {
    if (moment(comment, moment.ISO_8601).isValid()) {
      return this.formatDateTime(comment);
    }
    return comment;
  },
});

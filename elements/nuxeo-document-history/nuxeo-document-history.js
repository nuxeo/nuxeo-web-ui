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
`nuxeo-document-history`
@group Nuxeo UI
@element nuxeo-document-history
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@nuxeo/nuxeo-elements/nuxeo-audit-page-provider.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      #heading {
        @apply --layout-horizontal;
        @apply --layout-end-justified;
      }

      #table {
        height: calc(100vh - 370px);
      }

      nuxeo-date-picker {
        padding: 0 16px;
      }
    </style>

    <nuxeo-audit-page-provider id="provider" page-size="40"></nuxeo-audit-page-provider>

    <nuxeo-card>
      <div id="heading">
        <template is="dom-if" if="[[visible]]">
          <nuxeo-date-picker role="widget" label="[[i18n('documentHistory.filter.after')]]" value="{{startDate}}">
          </nuxeo-date-picker>
          <nuxeo-date-picker role="widget" label="[[i18n('documentHistory.filter.before')]]" value="{{endDate}}">
          </nuxeo-date-picker>
        </template>
      </div>
    </nuxeo-card>

    <nuxeo-card>
      <nuxeo-data-table id="table" paginable="" nx-provider="provider" empty-label="[[i18n('documentHistory.empty')]]">
        <nuxeo-data-table-column name="[[i18n('documentHistory.performedAction')]]" sort-by="eventId">
          <template>[[_formatActivity(item.eventId)]]</template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.date')]]" sort-by="eventDate">
          <template><nuxeo-date datetime="[[item.eventDate]]"></nuxeo-date></template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.username')]]" sort-by="principalName">
          <template><nuxeo-user-tag user="[[item.principalName]]"></nuxeo-user-tag></template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.category')]]" sort-by="category">
          <template>[[_formatActivity(item.category)]]</template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.comment')]]">
          <template>
            <a href\$="[[_parseComment(item.comment)]]">[[item.comment]]</a>
          </template>
        </nuxeo-data-table-column>
        <nuxeo-data-table-column name="[[i18n('documentHistory.state')]]">
          <template><nuxeo-tag uppercase="">[[formatLifecycleState(item.docLifeCycle)]]</nuxeo-tag></template>
        </nuxeo-data-table-column>
      </nuxeo-data-table>
    </nuxeo-card>
`,

  is: 'nuxeo-document-history',
  behaviors: [FormatBehavior, Nuxeo.RoutingBehavior],

  properties: {
    document: Object,
    visible: {
      type: Boolean,
      value: false,
      observer: '_refresh'
    },
    startDate: {
      type: String,
      notify: true,
      observer: '_observeStartDate'
    },
    endDate: {
      type: String,
      notify: true,
      observer: '_observeEndDate'
    }
  },

  _observeStartDate: function() {
    if (this.startDate && this.startDate.length > 0) {
      this.$.provider.params.startDate = this.startDate;
      if (this.endDate && this.endDate.length > 0) {
        var start = Date.parse(this.startDate);
        var end = Date.parse(this.endDate);
        if (start > end) {
          this.endDate = moment(start).add(7, 'day').format('YYYY-MM-DD');
        }
      }
      this._refresh();
    } else if(this.$.provider.params.startDate) {
      delete this.$.provider.params.startDate;
      this._refresh();
    }
  },

  _observeEndDate: function() {
    if (this.endDate && this.endDate.length > 0) {
      this.$.provider.params.endDate = this.endDate;
      if (this.startDate && this.startDate.length > 0) {
        var start = Date.parse(this.startDate);
        var end = Date.parse(this.endDate);
        if (start > end) {
          this.startDate = moment(end).subtract(7, 'day').format('YYYY-MM-DD');
        }
      }
      this._refresh();
    } else if(this.$.provider.params.endDate) {
      delete this.$.provider.params.endDate;
      this._refresh();
    }
  },

  _refresh: function() {
    if (this.document && this.visible) {
      this.$.provider.page = 1;
      this.$.provider.docId = this.document.uid;
      this.$.table.fetch();
    }
  },

  _formatActivity: function(key) {
    return this.i18n('activity.' + key);
  },

  _parseComment: function(comment) {
    if (comment) {
      var split = comment.split(':');
      if (split.length >= 2) {
        // split[0] is repo name, split[1] is doc id
        return this.urlFor('document', split[1]);
      }
      return null;
    }
    return null;
  }
});

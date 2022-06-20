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

import '@nuxeo/nuxeo-elements/nuxeo-audit-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date-picker.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-directory-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import moment from '@nuxeo/moment';

/**
`nuxeo-audit-search`
@group Nuxeo UI
@element nuxeo-audit-search
*/

class AuditSearch extends mixinBehaviors([FormatBehavior, RoutingBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style>
        .row-container {
          @apply --layout-horizontal;
          @apply --layout-wrap;
        }

        .row-container * {
          flex: 1;
        }

        .row-container :first-child {
          margin-inline-end: 8px;
        }

        #table {
          height: calc(100vh - 370px);
        }
      </style>

      <nuxeo-audit-page-provider id="provider" doc-id="[[document.uid]]" page-size="40"></nuxeo-audit-page-provider>

      <nuxeo-card>
        <nuxeo-user-suggestion
          value="{{principalName}}"
          label="[[i18n('audit.username')]]"
          placeholder="[[i18n('audit.usernamePlaceholder')]]"
        ></nuxeo-user-suggestion>
        <div class="row-container">
          <nuxeo-date-picker role="widget" label="[[i18n('audit.from')]]" value="{{startDate}}"> </nuxeo-date-picker>
          <nuxeo-date-picker role="widget" label="[[i18n('audit.to')]]" value="{{endDate}}"> </nuxeo-date-picker>
        </div>
        <div class="row-container">
          <nuxeo-directory-suggestion
            role="widget"
            label="[[i18n('audit.eventTypes')]]"
            directory-name="eventTypes"
            value="{{events}}"
            multiple="true"
            placeholder="[[i18n('audit.selectEventTypes')]]"
            min-chars="0"
          >
          </nuxeo-directory-suggestion>
          <nuxeo-directory-suggestion
            role="widget"
            label="[[i18n('audit.eventCategory')]]"
            directory-name="eventCategories"
            value="{{category}}"
            placeholder="[[i18n('audit.selectEventCategory')]]"
            min-chars="0"
          >
          </nuxeo-directory-suggestion>
        </div>
      </nuxeo-card>
      <nuxeo-card>
        <nuxeo-data-table id="table" paginable nx-provider="provider" empty-label="[[i18n('audit.empty')]]">
          <nuxeo-data-table-column name="[[i18n('audit.performedAction')]]" sort-by="eventId">
            <template>[[_formati18n('eventType.', item.eventId)]]</template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column name="[[i18n('audit.date')]]" sort-by="eventDate">
            <template><nuxeo-date datetime="[[item.eventDate]]"></nuxeo-date></template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column name="[[i18n('audit.username')]]" sort-by="principalName">
            <template><nuxeo-user-tag user="[[item.principalName]]"></nuxeo-user-tag></template>
          </nuxeo-data-table-column>
          <nuxeo-data-table-column name="[[i18n('audit.category')]]" sort-by="category">
            <template>[[_formati18n('eventCategory.', item.category)]]</template>
          </nuxeo-data-table-column>
          <template is="dom-if" if="[[!_isAvailable(document)]]">
            <nuxeo-data-table-column name="[[i18n('audit.document')]]">
              <template>
                <a href$="[[_getDocumentURL(item)]]">[[_formatDocument(item)]]</a>
              </template>
            </nuxeo-data-table-column>
          </template>
          <nuxeo-data-table-column name="[[i18n('audit.comment')]]">
            <template>
              <a href$="[[_parseComment(item.comment)]]">[[_formatComment(item.comment)]]</a>
            </template>
          </nuxeo-data-table-column>
          <template is="dom-if" if="[[_isAvailable(document)]]">
            <nuxeo-data-table-column name="[[i18n('audit.state')]]">
              <template><nuxeo-tag uppercase>[[formatLifecycleState(item.docLifeCycle)]]</nuxeo-tag></template>
            </nuxeo-data-table-column>
          </template>
        </nuxeo-data-table>
      </nuxeo-card>
    `;
  }

  static get is() {
    return 'nuxeo-audit-search';
  }

  static get properties() {
    return {
      visible: {
        type: Boolean,
        value: false,
        observer: '_refresh',
      },

      document: {
        type: Object,
        value: {},
      },

      principalName: {
        type: String,
        value: '',
      },

      startDate: {
        type: String,
        notify: true,
        observer: '_observeDates',
      },

      endDate: {
        type: String,
        notify: true,
        observer: '_observeDates',
      },

      events: {
        type: Array,
        value: [],
      },

      category: {
        type: String,
        value: '',
      },
    };
  }

  static get observers() {
    return ['_refresh(events.*, category, principalName, document)'];
  }

  get documentId() {
    return this.document ? this.document.uid : '';
  }

  get table() {
    return this.$.table;
  }

  _isAvailable(doc) {
    return doc && doc.uid;
  }

  _formati18n(path, key) {
    return key ? this.i18n(path + key) : '';
  }

  _buildParams() {
    const params = {
      principalName: this.principalName,
    };
    if (this.events && this.events.length > 0) {
      params.eventIds = this.documentId ? this.events : this.events.join();
    }
    if (this.category) {
      params.eventCategory = this.category;
    }

    if (this._hasValidDate(this.startDate)) {
      params.startDate = this.startDate;
    }
    if (this._hasValidDate(this.endDate)) {
      params.endDate = this.endDate;
    }

    return params;
  }

  _refresh() {
    if (!this.visible) {
      return;
    }
    this.$.provider.params = this._buildParams();
    this.table.fetch();
  }

  _hasValidDate(dateAsString) {
    return dateAsString && dateAsString.length > 0;
  }

  _observeDates() {
    const start = this._hasValidDate(this.startDate) && Date.parse(this.startDate);
    const end = this._hasValidDate(this.endDate) && Date.parse(this.endDate);
    const refresh = !start || !end || start < end;
    if (start && end && start > end) {
      this.startDate = moment(end)
        .subtract(7, 'day')
        .format('YYYY-MM-DD');
    }

    if (refresh) {
      this._refresh();
    }
  }

  // XXX: methods below (parsing and gettting url) shouldn't be needed after NXP-28820
  _formatDocument(item) {
    if (item) {
      return `${item.docType || ''}${item.docPath || ''}`;
    }
  }

  _getDocumentURL(item) {
    if (item && item.docUUID) {
      return this.urlFor('document', item.docUUID);
    }
  }

  _parseComment(comment) {
    if (comment && /^\w+:(?:\w+-){2,}(?:\w+)$/.test(comment)) {
      // repoName:docId
      return this.urlFor('document', comment.split(':')[1]);
    }
    return null;
  }

  _formatComment(comment) {
    if (moment(comment, moment.ISO_8601).isValid()) {
      return this.formatDateTime(comment);
    }
    return comment;
  }
}

customElements.define(AuditSearch.is, AuditSearch);

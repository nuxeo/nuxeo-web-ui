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

import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import '../nuxeo-document-storage/nuxeo-document-storage.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-recent-documents`
@group Nuxeo UI
@element nuxeo-recent-documents
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      .content {
        @apply --layout-vertical;
      }

      nuxeo-data-list {
        display: block;
        position: relative;
        min-height: calc(100vh - 61px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
      }

      .list-item {
        cursor: pointer;
        padding: 1em;
        border-bottom: 1px solid var(--nuxeo-border);
      }

      .list-item-title {
        display: inline-block;
        text-overflow: ellipsis;
        overflow: hidden;
      }

      .list-item-info {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .list-item:hover {
        @apply --nuxeo-block-hover;
      }

      .list-item.selected,
      .list-item:focus,
      .list-item.selected:focus {
        @apply --nuxeo-block-selected;
      }
    </style>

    <nuxeo-document-storage
      id="storage"
      name="nuxeo-recent-documents"
      documents="{{documents}}"
    ></nuxeo-document-storage>

    <div class="header">
      <h5>[[i18n('app.recentlyViewed')]]</h5>
    </div>
    <div class="content">
      <nuxeo-data-list
        items="[[documents]]"
        id="recentDocumentsList"
        as="document"
        selected-item="{{selectedRecent}}"
        selection-enabled
        select-on-tap
        empty-label="[[i18n('recentDocuments.empty')]]"
        empty-label-when-filtered="[[i18n('recentDocuments.empty')]]"
      >
        <template>
          <div tabindex$="{{tabIndex}}" class$="[[_computedClass(selected)]]">
            <div class="list-item-info">
              <nuxeo-document-thumbnail document="[[document]]"></nuxeo-document-thumbnail>
              <div class="list-item-title">[[document.title]]</div>
            </div>
          </div>
        </template>
      </nuxeo-data-list>
    </div>
  `,

  is: 'nuxeo-recent-documents',
  behaviors: [RoutingBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    documents: {
      type: Array,
      notify: true,
    },
    maxSize: {
      type: Number,
      value: 10,
    },
    selectedRecent: {
      type: Object,
      observer: '_selectedRecentChanged',
      notify: true,
    },
    currentDocument: {
      type: Object,
      observer: '_currentDocumentChanged',
    },
  },

  add(doc) {
    this.$.storage.add(doc);
    if (this.documents.length > this.maxSize) {
      this.splice('documents', -1, 1);
    }
  },

  contains(doc) {
    return this.$.storage.contains(doc);
  },

  remove(doc) {
    this.$.storage.remove(doc);
  },

  update(doc) {
    this.$.storage.remove(doc);
    this.$.storage.add(doc);
  },

  _computedClass(isSelected) {
    let classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  },

  _selectedRecentChanged(doc) {
    if (doc) {
      this.navigateTo(doc);
    }
  },

  _currentDocumentChanged(doc) {
    if (doc && !this.isTrashed(doc)) {
      if (!this.documents) {
        if (!this._localStorageLoaded) {
          this._localStorageLoaded = new Promise((resolve) => {
            this.addEventListener('iron-localstorage-load', (e) => resolve(e));
          });
        }
        this._localStorageLoaded.then(() => this._addOrUpdateStorage(doc));
      } else {
        this._addOrUpdateStorage(doc);
      }
    }
  },

  _addOrUpdateStorage(doc) {
    if (this.contains(doc)) {
      this.update(doc);
    } else {
      this.add(doc);
    }
  },
});

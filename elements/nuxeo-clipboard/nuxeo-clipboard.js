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
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import '../nuxeo-document-storage/nuxeo-document-storage.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-clipboard`
@group Nuxeo UI
@element nuxeo-clipboard
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        overflow: hidden;
      }

      .content {
        @apply --layout-vertical;
        height: calc(100vh - 61px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
      }

      nuxeo-data-list {
        display: block;
        position: relative;
        height: 100%;
        min-height: auto;
      }

      .list-item {
        cursor: pointer;
        padding: 1em;
        border-bottom: 1px solid var(--nuxeo-border);
      }

      .list-item:hover {
        @apply --nuxeo-block-hover;
      }

      .list-item.selected,
      .list-item:focus,
      .list-item.selected:focus {
        @apply --nuxeo-block-selected;
      }

      .list-item-box {
        @apply --layout-vertical;
      }

      .list-item-info {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .list-item-thumbnail {
        @apply --layout-vertical;
        @apply --layout-center;
      }

      .list-item-title {
        @apply --layout-flex;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .list-item iron-icon {
        display: block;
        @apply --nuxeo-action;
        color: var(--nuxeo-drawer-text);
      }

      .list-item iron-icon:hover {
        @apply --nuxeo-action-hover;
        color: var(--nuxeo-drawer-text);
      }

      .remove {
        padding: 0;
        width: 1.5em;
        height: 1.5em;
      }

      .toolbar {
        @apply --layout-horizontal;
        @apply --layout-center-justified;
        @apply --nx-actions;
        padding-bottom: 8px;
      }

      .tip {
        opacity: 0.5;
        display: block;
        font-weight: 300;
        padding: 8px;
        text-align: center;
        font-size: 1rem;
      }
    </style>

    <nuxeo-document-storage id="storage" name="nuxeo-clipboard" documents="{{documents}}"></nuxeo-document-storage>
    <nuxeo-operation
      id="op"
      input="docs:[[_uids(documents.*)]]"
      params="[[_opParams(targetDocument)]]"
      sync-indexing
    ></nuxeo-operation>

    <div class="header">
      <h5>[[i18n('app.clipboard')]]</h5>
    </div>

    <div class="content">
      <nuxeo-data-list
        items="[[documents]]"
        id="list"
        selected-item="{{selectedDocument}}"
        selection-enabled
        select-on-tap
        as="document"
        empty-label="[[i18n('clipboard.empty')]]"
        empty-label-when-filtered="[[i18n('clipboard.empty')]]"
      >
        <template>
          <div tabindex$="{{tabIndex}}" class$="[[_computedClass(selected)]]">
            <div class="list-item-box">
              <div class="list-item-info">
                <div class="list-item-thumbnail">
                  <nuxeo-document-thumbnail document="[[document]]"></nuxeo-document-thumbnail>
                </div>
                <div class="list-item-title">[[document.title]]</div>
                <iron-icon class="remove" icon="nuxeo:remove" alt="Remove" on-tap="_remove"></iron-icon>
              </div>
            </div>
          </div>
        </template>
      </nuxeo-data-list>

      <div class="tip">
        [[i18n('clipboard.tip')]]
      </div>

      <div class="toolbar">
        <div class="actions">
          <paper-button
            id="paste"
            on-tap="execute"
            data-op="Document.Copy"
            disabled="[[!canPaste(documents, targetDocument, documents.splices)]]"
            noink
            class="primary clear"
          >
            <iron-icon icon="nuxeo:copy"></iron-icon>
            [[i18n('clipboard.copy')]]
          </paper-button>
          <nuxeo-tooltip for="paste">[[i18n('clipboard.copy')]]</nuxeo-tooltip>
          <paper-button
            id="move"
            on-tap="execute"
            data-op="Document.Move"
            disabled="[[!canPaste(documents, targetDocument, documents.splices)]]"
            noink
            class="primary clear"
          >
            <iron-icon icon="nuxeo:move"></iron-icon>
            [[i18n('clipboard.move')]]
          </paper-button>
          <nuxeo-tooltip for="move">[[i18n('clipboard.move')]]</nuxeo-tooltip>
        </div>
      </div>
    </div>
  `,

  is: 'nuxeo-clipboard',
  behaviors: [RoutingBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    documents: {
      type: Array,
      notify: true,
    },
    targetDocument: {
      type: Object,
      observer: '_documentChanged',
    },
    selectedDocument: {
      type: Object,
      observer: '_observeSelectedDocument',
    },
  },

  observers: ['_observeDocuments(documents.splices)'],

  _observeDocuments() {
    if (this.documents) {
      this.fire('nx-clipboard-updated', { docCount: this.documents.length });
    }
  },

  _documentChanged(newValue) {
    if (newValue && this.contains(newValue)) {
      const document = this.$.storage.get(newValue);
      if (document && document.title !== newValue.title) {
        this.$.storage.update(document, { title: newValue.title });
      }
    }
  },

  add(docs) {
    let uids = [];

    if (docs instanceof Array) {
      docs.forEach((doc) => {
        this.$.storage.add(doc);
      });
      uids = docs.map((doc) => doc.uid);
    } else {
      this.$.storage.add(docs);
      uids.push(docs.uid);
    }
    this.fire('added-to-clipboard', { docIds: uids });
  },

  contains(doc) {
    return this.$.storage.contains(doc);
  },

  remove(doc) {
    this.$.storage.remove(doc);
  },

  canPaste(documents, doc) {
    if (!documents || documents.length === 0 || !this.hasFacet(doc, 'Folderish')) {
      return false;
    }
    return doc.contextParameters && doc.contextParameters.subtypes
      ? documents.every((entry) => doc.contextParameters.subtypes.map((e) => e.type).indexOf(entry.type) > -1)
      : true;
  },

  execute(evt) {
    const operation = evt.currentTarget.dataset.op;
    this.$.op.op = operation;
    this.$.op.execute().then((response) => {
      this.documents = [];
      this.fire('clipboard-action-performed', { operation, documents: response && response.entries });
    });
  },

  _remove(evt) {
    evt.stopImmediatePropagation();
    this.remove(evt.model.document);
    this.fire('removed-from-clipboard', { docId: evt.model.document.uid });
  },

  _uids() {
    if (this.documents && this.documents !== null) {
      return this.documents.map((doc) => doc.uid).join(',');
    }
    return '';
  },

  _opParams() {
    if (this.targetDocument) {
      return {
        target: this.targetDocument.uid,
      };
    }
  },

  _observeSelectedDocument(doc) {
    if (doc) {
      this.navigateTo(doc);
    }
  },

  _computedClass(isSelected) {
    let classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  },
});

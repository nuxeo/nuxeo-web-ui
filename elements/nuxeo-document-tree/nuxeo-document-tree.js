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

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-tree/nuxeo-tree.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

/**
`nuxeo-document-tree`
@group Nuxeo UI
@element nuxeo-document-tree
*/
Polymer({
  _template: html`
    <style include="iron-flex iron-positioning nuxeo-styles">
      :host {
        display: block;
        --nuxeo-tree-theme: {
          padding: 1em;
          color: var(--nuxeo-drawer-text);
        }
        --nuxeo-tree-node-theme: {
          min-height: 24px;
        }
        --nuxeo-tree-children-theme: {
          padding-left: 1em;
        }
        --nuxeo-tree-node-more-theme: {
          line-height: 1.3em;
          display: inline-block;
          vertical-align: text-top;
          margin-left: 1.3em;
          word-break: break-word;
        }
      }

      .content {
        padding: 5px 0;
        overflow: auto;
        height: calc(100vh - 72px - var(--nuxeo-app-top));
      }

      .node-name {
        line-height: 1.3em;
        display: inline-block;
        vertical-align: text-top;
        margin-left: 1.3em;
        word-break: break-word;
      }

      a {
        @apply --nuxeo-link;
      }

      a:hover {
        @apply --nuxeo-link-hover;
      }

      #root a,
      a:active,
      a:visited,
      a:focus {
        color: var(--nuxeo-drawer-text);
      }

      iron-icon {
        opacity: 0.3;
        width: 1.3rem;
        margin-right: -1.6em;
        margin-top: -0.07rem;
      }

      [toggle] {
        cursor: pointer;
      }

      .parents {
        line-height: 1.5em;
      }

      .parents + nuxeo-tree {
        padding: 6px 5px;
      }

      .parents > nuxeo-tree {
        padding: 4px 5px;
      }

      .parents a {
        @apply --layout-horizontal;
        padding: 0.35em;
        color: var(--nuxeo-drawer-text);
        border-bottom: 1px solid var(--nuxeo-border);
      }

      .parents span {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        display: block;
        min-width: 1.3em;
      }

      .parent {
        padding: 0.12em 0 0;
      }

      paper-spinner {
        height: 1.1rem;
        width: 1.1rem;
        margin-right: -1.4em;
      }

      .noPermission {
        opacity: 0.5;
        font-weight: 300;
        padding: 1.5em 0.7em;
        text-align: center;
        font-size: 1.1rem;
      }
    </style>

    <nuxeo-document
      id="doc"
      doc-path="[[docPath]]"
      response="{{document}}"
      enrichers="hasFolderishChild"
    ></nuxeo-document>

    <nuxeo-page-provider
      id="children"
      provider="tree_children"
      enrichers="hasFolderishChild"
      schemas="dublincore,common"
    >
    </nuxeo-page-provider>

    <div class="header" hidden$="[[!label]]">[[i18n(label)]]</div>

    <div class="content">
      <div class="parents" hidden$="[[_noPermission]]">
        <a href$="[[urlFor('browse', '/')]]" class="layout horizontal" hidden$="[[_hideRoot(document)]]">
          <span><iron-icon icon="icons:chevron-left"></iron-icon></span>
          <span class="parent">[[i18n('browse.root')]]</span>
        </a>
        <template is="dom-repeat" items="[[parents]]" as="item">
          <a href$="[[urlFor('browse', item.path)]]">
            <span><iron-icon icon="icons:chevron-left"></iron-icon></span>
            <span class="parent">[[item.title]]</span>
          </a>
        </template>
      </div>
      <nuxeo-tree id="tree" data="[[document]]" controller="[[controller]]" node-key="uid">
        <template class="horizontal layout">
          <template class="flex" is="dom-if" if="[[!isLeaf]]">
            <paper-spinner active$="[[loading]]"></paper-spinner>
            <iron-icon icon="[[_expandIcon(opened)]]" toggle hidden$="[[loading]]"></iron-icon>
          </template>
          <span class="node-name flex">
            <a href$="[[urlFor('browse', item.path)]]">[[_title(item)]]</a>
          </span>
        </template>
      </nuxeo-tree>
      <div class="noPermission" hidden$="[[!_noPermission]]">[[i18n('browse.tree.noDocument')]]</div>
    </div>
  `,

  is: 'nuxeo-document-tree',
  behaviors: [RoutingBehavior, I18nBehavior, FiltersBehavior],

  properties: {
    controller: Object,
    auto: {
      type: Boolean,
      value: false,
    },
    rootDocPath: {
      type: String,
      value: '/',
      observer: '_rootDocPathChanged',
    },
    docPath: {
      type: String,
      value: '/',
    },
    document: {
      type: Object,
      observer: '_documentChanged',
    },
    currentDocument: {
      type: Object,
      observer: '_currentDocumentChanged',
    },
    parents: {
      type: Array,
      value: [],
    },
    label: String,
    visible: {
      type: Boolean,
    },
    cannotSee: {
      type: Boolean,
      value: false,
    },
    _noPermission: {
      type: Boolean,
      value: false,
    },
  },

  observers: ['_fetchDocument(docPath, visible)'],

  ready() {
    window.addEventListener('nuxeo-documents-deleted', (e) => {
      this.removeDocuments(e.detail.documents);
    });

    window.addEventListener('refresh-display', () => {
      this._fetchDocument();
    });

    this.controller = {
      getChildren: function(node, page) {
        this.$.children.params = [node.uid];
        this.$.children.page = page;
        return this.$.children.fetch().then((data) => {
          return {
            items: data.entries,
            isNextAvailable: this.$.children.isNextPageAvailable,
          };
        });
      }.bind(this),

      isLeaf(node) {
        const hasFolderishChild = node.contextParameters && node.contextParameters.hasFolderishChild;
        return !hasFolderishChild;
      },
    };
  },

  _hideRoot(doc) {
    return this.rootDocPath !== '/' || (doc && doc.type && doc.type === 'Root');
  },

  _fetchDocument() {
    if (this.visible && this.docPath) {
      this._noPermission = false;
      this.$.doc.execute().catch((err) => {
        if (err && err.status === 403) {
          this._noPermission = true;
        } else {
          throw err;
        }
      });
    }
  },

  _currentDocumentChanged() {
    const doc = this.currentDocument;
    if (doc && doc.path && doc.path.startsWith(this.rootDocPath)) {
      if (this.docPath === doc.path && this.document && this.document.title !== doc.title) {
        // If document is the same as before but its name changed, get the document again
        this.$.doc.get();
      }

      if (this.docPath !== doc.path && !this.hasFacet(doc, 'HiddenInNavigation')) {
        this.$.tree.style.display = 'none';
        this.parents = [];

        if (doc.type === 'Root') {
          this.docPath = doc.path;
          return;
        }

        const { entries } = doc.contextParameters.breadcrumb;
        const lastEntry = entries[entries.length - 1];
        if (this.hasFacet(lastEntry, 'Folderish') || entries.length === 1) {
          this.docPath = lastEntry.path;
        } else {
          this.docPath = entries[entries.length - 2].path;
        }

        for (let i = 0; i < entries.length - 1; i++) {
          const entry = entries[i];
          if (!this.hasFacet(entry, 'HiddenInNavigation') && entry.path.startsWith(this.rootDocPath)) {
            this.push('parents', entry);
          }
        }
      }
    }
  },

  _documentChanged() {
    if (this.document) {
      this.$.tree.style.display = 'block';
    }
  },

  _rootDocPathChanged() {
    this.docPath = this.rootDocPath;
  },

  _expandIcon(opened) {
    return `hardware:keyboard-arrow-${opened ? 'down' : 'right'}`;
  },

  _icon(opened) {
    return opened ? 'icons:folder-open' : 'icons:folder';
  },

  _title(item) {
    return item.type === 'Root' ? this.i18n('browse.root') : item.title;
  },

  removeDocuments(documents) {
    const uids = documents.map((doc) => doc.uid);
    this.$.tree.removeNodes(uids);
  },
});

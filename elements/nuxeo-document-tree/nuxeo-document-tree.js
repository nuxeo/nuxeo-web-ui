/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';
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
        };
        --nuxeo-tree-node-theme: {
          min-height: 24px;
        };
        --nuxeo-tree-children-theme: {
          padding-left: 1em;
        };
        --nuxeo-tree-node-more-theme: {
          line-height: 1.3em;
          display: inline-block;
          vertical-align: text-top;
          margin-left: 1.3em;
          word-break: break-word;
        };
      }

      :host([dir='rtl']) {
        --nuxeo-tree-children-theme: {
          padding-right: 1em;
        };
      }

      .content {
        padding: 5px 0;
        overflow: auto;
        height: calc(100vh - 72px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
      }

      .node-name {
        line-height: 1.3em;
        display: inline-block;
        vertical-align: text-top;
        margin-left: 1.3em;
        word-break: break-word;
      }

      :host([dir='rtl']) .node-name {
        display: inline;
      }

      a {
        @apply --nuxeo-link;
      }

      a:hover {
        @apply --nuxeo-link-hover-color;
      }

      #root a,
      a:active,
      a:visited,
      a:focus {
        color: var(--nuxeo-drawer-text);
      }

      iron-icon {
        opacity: 0.7;
        width: 1.3rem;
        margin-right: -1.6em;
        margin-top: -0.07rem;
      }

      :host([dir='rtl']) iron-icon {
        margin-right: 0;
      }

      [toggle] {
        cursor: pointer;
      }

      /* The row takes the focus, but the ring is drawn on the arrow so the indicator stays on the
         part of the row that actually expands. The row's own outline is suppressed only because the
         arrow replaces it; the spinner is covered too, so expanding a node never leaves the focused
         row with no visible indicator while its children load. */
      [role='treeitem']:focus-visible {
        outline: none;
      }

      [role='treeitem']:focus-visible iron-icon[toggle]:not([hidden]),
      [role='treeitem']:focus-visible paper-spinner[active] {
        outline: 2px solid black;
        outline-offset: 0.2px;
        border-radius: 3px;
        box-shadow: 0 0 3px black;
        background-color: rgba(0, 0, 0, 0);
      }

      /* aria-describedby text has to stay in the accessibility tree, so this is moved off screen
         rather than hidden with display: none. */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        white-space: nowrap;
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

      .header h5 {
        margin: 0;
      }

      .loaddata {
        display: none;
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

    <div class="header" hidden$="[[!label]]">
      <h5>[[i18n(label)]]</h5>
    </div>

    <div class="content">
      <div class="parents" hidden$="[[_noPermission]]">
        <a href$="[[urlFor('document', '/')]]" class="layout horizontal" hidden$="[[_hideRoot(document)]]">
          <span aria-hidden="true"><iron-icon icon="[[toggleChevronIcon]]"></iron-icon></span>
          <span class="parent">[[i18n('browse.root')]]</span>
        </a>
        <template is="dom-repeat" items="[[parents]]" as="item">
          <a href$="[[urlFor(item)]]">
            <span><iron-icon icon="[[toggleChevronIcon]]"></iron-icon></span>
            <span class="parent">[[item.title]]</span>
          </a>
        </template>
      </div>
      <!-- "collapsed" alone leaves it to the listener to know the row can be opened, so expandable
           rows also point at this hint. One shared node keeps the wording identical on every row and
           out of the row's accessible name; nuxeo-tree slots its nodes into the light DOM, so the
           rows share this shadow root and the id resolves. -->
      <span id="toggleHint" class="sr-only">[[i18n('browse.tree.toggleHint')]]</span>
      <!-- role="tree" belongs on the element that owns the treeitems; on the wrapper it also swallowed
           the breadcrumb links, which a tree is not allowed to contain. -->
      <nuxeo-tree id="tree" role="tree" data="[[document]]" controller="[[controller]]" node-key="uid">
        <template class="horizontal layout">
          <!-- The row itself is the disclosure control, per the ARIA treeview pattern: it owns
               aria-expanded and takes the focus, and the arrow is decorative. Duplicating the state
               on an inner button made screen readers announce every toggle twice and folded the
               arrow's label into the row name ("Expand Domain Domain"). -->
          <div
            role="treeitem"
            aria-expanded$="[[_ariaExpanded(opened, isLeaf)]]"
            aria-describedby$="[[_toggleHintId(isLeaf)]]"
            tabindex$="[[_treeItemTabIndex(isLeaf)]]"
            on-keydown="_handleKeydown"
          >
            <template class="flex" is="dom-if" if="[[!isLeaf]]">
              <paper-spinner active$="[[loading]]" aria-hidden="true"></paper-spinner>
              <iron-icon icon="[[_expandIcon(opened)]]" toggle hidden$="[[loading]]" aria-hidden="true"></iron-icon>
              <template is="dom-if" if="[[loading]]">
                <span class="loaddata" aria-live="polite">[[_loading(loading)]]</span>
              </template>
            </template>
            <span class="node-name flex">
              <a href$="[[urlFor(item)]]">[[_title(item)]]</a>
            </span>
          </div>
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
    _isRtl: {
      type: Boolean,
      value: false,
      observer: '_onRtlChange',
    },
  },

  observers: ['_fetchDocument(docPath, visible)'],

  ready() {
    if (!this.hasAttribute('dir')) {
      const direction = document.documentElement.getAttribute('dir');
      this.setAttribute('dir', direction);
    }
    this._checkRtl();
    window.addEventListener('nuxeo-documents-deleted', (e) => {
      if (e.detail.documents) {
        this.removeDocuments(e.detail.documents);
        return;
      }
      // when in select all mode we don't have a list of documents in the event detail
      this._fetchDocument();
    });

    window.addEventListener('refresh-display', () => {
      this._fetchDocument();
    });

    window.addEventListener('document-created', this._fetchDocument.bind(this));

    this.controller = {
      getChildren: function (node, page) {
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

  _checkRtl() {
    const dir = document.documentElement.getAttribute('dir');
    this._isRtl = dir === 'rtl';
  },

  _onRtlChange() {
    this.toggleChevronIcon = this._isRtl ? 'icons:chevron-right' : 'icons:chevron-left';
  },

  _hideRoot(doc) {
    return this.rootDocPath !== '/' || (doc && doc.type && doc.type === 'Root');
  },

  _fetchDocument() {
    if (this.visible && this.docPath) {
      this.__fetchDebouncer = Debouncer.debounce(this.__fetchDebouncer, timeOut.after(150), () => {
        this._noPermission = false;
        this.$.doc.execute().catch((err) => {
          if (err && err.status === 403) {
            this._noPermission = true;
          } else {
            throw err;
          }
        });
      });
    }
  },

  _handleKeydown(event) {
    // ArrowDown is reserved for moving focus down the tree, so only Enter and Space toggle here.
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    // Enter on the document link nested in the row must still follow the link.
    const treeItem = event.currentTarget;
    if (event.target !== treeItem) {
      return;
    }
    const icon = treeItem.querySelector('iron-icon[toggle]');
    if (!icon) {
      return;
    }
    const expanded = treeItem.getAttribute('aria-expanded') === 'true';
    // Let nuxeo-tree-node flip `opened`; the aria-expanded binding follows from it.
    icon.click();
    this.dispatchEvent(
      new CustomEvent('tree-node-toggled', {
        detail: { expanded: !expanded, target: treeItem },
        bubbles: true,
        composed: true,
      }),
    );
    event.preventDefault(); // Prevent default scrolling or focus behavior
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
        this.docPath = entries[entries.length - 1].path;

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
    if (this.document && this.hasFacet(this.document, 'Folderish')) {
      this.$.tree.style.display = 'block';
    }
  },

  _rootDocPathChanged() {
    this.docPath = this.rootDocPath;
  },

  _expandIcon(opened) {
    const iconDirection = this._isRtl ? 'left' : 'right';
    return `hardware:keyboard-arrow-${opened ? 'down' : iconDirection}`;
  },

  // Only rows that can expand are focusable, so leaves do not add a tab stop that does nothing.
  _treeItemTabIndex(isLeaf) {
    return isLeaf ? undefined : '0';
  },

  // Leaves cannot be opened, so telling their listener how to expand them would be wrong.
  _toggleHintId(isLeaf) {
    return isLeaf ? undefined : 'toggleHint';
  },

  // Polymer serializes a bound boolean as '' or drops the attribute, neither of which is a valid
  // aria-expanded value, so the state is stringified explicitly. Leaves get no attribute at all:
  // aria-expanded="false" on an end node announces it as collapsed-but-expandable.
  _ariaExpanded(opened, isLeaf) {
    if (isLeaf) {
      return undefined;
    }
    return opened ? 'true' : 'false';
  },

  _icon(opened) {
    return opened ? 'icons:folder-open' : 'icons:folder';
  },

  _title(item) {
    return item.type === 'Root' ? this.i18n('browse.root') : item.title;
  },

  _loading(loading) {
    return loading ? this.i18n('label.loading') : '';
  },

  removeDocuments(documents) {
    const uids = documents.map((doc) => doc.uid);
    this.$.tree.removeNodes(uids);
  },
});

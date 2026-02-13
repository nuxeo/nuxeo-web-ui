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

      :host([dir='rtl']) {
        --nuxeo-tree-children-theme: {
          padding-right: 1em;
        }
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
        color: var(--sat-drawer-item-font-color, var(--nuxeo-drawer-text));
        font-weight: (var(--sat-drawer-item-font-weight));
        font-size: var(--sat-drawer-item-font-size);
        line-height: var(--sat-drawer-item-line-height);
        letter-spacing: var(--sat-drawer-item-letter-spacing);
      }

      a:hover {
        @apply --nuxeo-link-hover-color;
      }

      /* Highlight the currently selected/active node */
      #content:has(a.selected) {
        background-color: var(--sat-drawer-item-selected-background);
        border-radius: 54px;
        min-height: 25px;
        padding: 5px 0;
      }

      nuxeo-tree-node {
        padding-top: 14px;
      }

      nuxeo-tree {
        margin-left: 18px;
      }
      #root a,
      a:active,
      a:visited,
      a:focus {
        color: var(--sat-drawer-item-font-color, var(--nuxeo-drawer-text));
        font-weight: (var(--sat-drawer-item-font-weight));
        font-size: var(--sat-drawer-item-font-size);
        line-height: var(--sat-drawer-item-line-height);
        letter-spacing: var(--sat-drawer-item-letter-spacing);
      }

      iron-icon {
        opacity: 1;
        width: 1.8rem;
        height: 1.8rem;
        margin-right: -1.4em;
        margin-top: 0rem;
        margin-left: -0.2em;
      }

      :host([dir='rtl']) iron-icon {
        margin-right: 10em;
      }

      [toggle] {
        cursor: pointer;
      }

      [toggle]:focus {
        outline: 2px solid black;
        outline-offset: 0.2px;
        border-radius: 3px;
        box-shadow: 0 0 3px black;
        background-color: rgba(0, 0, 0, 0);
      }

      .parents {
        line-height: 1.5em;
      }

      .parents + nuxeo-tree {
        padding: 0;
      }

      .parents > nuxeo-tree {
        padding: 0;
      }

      .parents a {
        @apply --layout-horizontal;
        padding-top: 12px;
        margin-left: 18px;
        color: var(--nuxeo-drawer-text);
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
        color: var(--sat-drawer-item-font-color);
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
        @apply --sat-header-h5;
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

    <div class="content" role="tree">
      <div class="parents" hidden$="[[_noPermission]]">
        <a
          href$="[[urlFor('document', '/')]]"
          class="layout horizontal"
          hidden$="[[_hideRoot(document)]]"
          on-click="_handleNodeClick"
          data-path="/"
        >
          <span aria-hidden="true"><iron-icon icon="[[toggleChevronIcon]]"></iron-icon></span>
          <span class="parent">[[i18n('browse.root')]]</span>
        </a>
        <template is="dom-repeat" items="[[parents]]" as="item">
          <a href$="[[urlFor(item)]]" on-click="_handleNodeClick" data-path$="[[item.path]]">
            <span><iron-icon icon="[[toggleChevronIcon]]"></iron-icon></span>
            <span class="parent">[[item.title]]</span>
          </a>
        </template>
      </div>
      <nuxeo-tree id="tree" data="[[document]]" controller="[[controller]]" node-key="uid">
        <template class="horizontal layout">
          <div role="treeitem" aria-expanded="[[opened]]">
            <template class="flex" is="dom-if" if="[[!isLeaf]]">
              <paper-spinner active$="[[loading]]" aria-hidden="true"></paper-spinner>
              <iron-icon
                icon="[[_expandIcon(opened)]]"
                toggle
                hidden$="[[loading]]"
                tabindex="0"
                role="button"
                aria-hidden="false"
                aria-label="Toggle expand/collapse"
                on-keydown="_handleKeydown"
              ></iron-icon>
              <template is="dom-if" if="[[loading]]">
                <span class="loaddata" aria-live="polite">[[_loading(loading)]]</span>
              </template>
            </template>
            <span class$="node-name flex [[_leafClass(isLeaf)]]">
              <a href$="[[urlFor(item)]]" on-click="_handleNodeClick" data-path$="[[item.path]]">[[_title(item)]]</a>
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

  attached() {
    // Restore selection highlighting after component is attached
    this.async(() => {
      this._updateSelectionHighlight();
    }, 0);
  },

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
    const icon = event.target;
    const treeItem = icon.closest('[role="treeitem"]');
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      // Toggle aria-expanded state
      const expanded = treeItem.getAttribute('aria-expanded') === 'true';
      treeItem.setAttribute('aria-expanded', !expanded);
      // Manually trigger the click event on the chevron icon
      icon.click();
      // Dispatch custom event for external handling
      this.dispatchEvent(
        new CustomEvent('tree-node-toggled', {
          detail: { expanded: !expanded, target: treeItem },
          bubbles: true,
          composed: true,
        }),
      );
      event.preventDefault(); // Prevent default scrolling or focus behavior
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
          // Update selection highlight when document changes
          this.async(() => {
            this._updateSelectionHighlight();
          }, 0);
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
      // Update selection highlight when current document changes
      this.async(() => {
        this._updateSelectionHighlight();
      }, 0);
    }
  },

  _documentChanged() {
    if (this.document && this.hasFacet(this.document, 'Folderish')) {
      this.$.tree.style.display = 'block';
      // Update selection when tree data loads
      this.async(() => {
        this._updateSelectionHighlight();
      }, 0);
    }
  },

  _rootDocPathChanged() {
    this.docPath = this.rootDocPath;
  },

  _expandIcon(opened) {
    const iconDirection = this._isRtl ? 'left' : 'right';
    return `hardware:keyboard-arrow-${opened ? 'down' : iconDirection}`;
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

  _leafClass(isLeaf) {
    return isLeaf ? 'leaf' : '';
  },

  /**
   * Handle node click to update selection highlighting
   */
  _handleNodeClick(e) {
    const clickedLink = e.currentTarget;
    const clickedPath = clickedLink.getAttribute('data-path');

    // Store the selected path for persistence
    if (clickedPath) {
      sessionStorage.setItem('nuxeo-tree-selected-path', clickedPath);
    }

    // Update highlight immediately
    this._updateSelectionHighlight(clickedPath);
  },

  /**
   * Update the selection highlighting in the tree
   * Only one node should be highlighted at a time
   */
  _updateSelectionHighlight(selectedPath) {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Determine which path should be highlighted
      const pathToHighlight =
        selectedPath ||
        sessionStorage.getItem('nuxeo-tree-selected-path') ||
        (this.currentDocument && this.currentDocument.path);

      if (!pathToHighlight) return;

      // Get all links in the tree (both in nuxeo-tree and parents)
      const allLinks = this.shadowRoot.querySelectorAll('a[data-path], .parents a');

      // Remove 'selected' class from all links
      allLinks.forEach((link) => {
        link.classList.remove('selected');
      });

      // Add 'selected' class to the matching link - EXACT match only
      allLinks.forEach((link) => {
        const linkPath = link.getAttribute('data-path');
        // Only match if paths are EXACTLY the same
        if (linkPath && linkPath === pathToHighlight) {
          link.classList.add('selected');
        }
      });

      // Also check dynamically loaded tree nodes
      const treeElement = this.$.tree;
      if (treeElement && treeElement.shadowRoot) {
        const treeLinks = treeElement.shadowRoot.querySelectorAll('a[data-path]');
        treeLinks.forEach((link) => {
          link.classList.remove('selected');
          const linkPath = link.getAttribute('data-path');
          if (linkPath === pathToHighlight) {
            link.classList.add('selected');
          }
        });
      }
    });
  },
});

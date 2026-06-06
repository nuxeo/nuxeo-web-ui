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
import '@polymer/iron-icons/hardware-icons.js';
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
          padding: 0;
        };
        --nuxeo-tree-node-theme: {
          min-height: 48px;
        };
        /* Satori tree: 15px indent per nesting level */
        --nuxeo-tree-children-theme: {
          padding-left: 15px;
        };
        --nuxeo-tree-node-more-theme: {
          display: inline-flex;
          align-items: center;
          min-height: 48px;
          margin-left: 48px;
          line-height: 20px;
          word-break: break-word;
        };
      }

      :host([dir='rtl']) {
        --nuxeo-tree-children-theme: {
          padding-right: 15px;
          padding-left: 0;
        };
      }

      .content {
        padding: 0px 4px 0px 4px;
        overflow: auto;
        background-color: var(--sat-drawer-content-background, transparent);
        height: calc(100vh - 72px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
      }

      /* Satori Tree item row — 48px, icon slot + label (Figma 128:53423) */
      .tree-row,
      [role='treeitem'] {
        display: flex;
        align-items: flex-start;
        min-height: 48px;
        border-radius: 4px;
        box-sizing: border-box;
      }

      /* 48×48 expand/collapse area; spinner and chevron share the same slot */
      .tree-toggle-slot,
      .tree-icon-slot {
        position: relative;
        flex: 0 0 48px;
        width: 48px;
        height: 48px;
        box-sizing: border-box;
      }

      .tree-toggle-slot iron-icon[toggle],
      .tree-toggle-slot paper-spinner,
      .tree-icon-slot iron-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 24px;
        height: 24px;
        margin: 0;
        padding: 0;
        opacity: 1;
        transform: translate(-50%, -50%);
      }

      .node-name {
        flex: 1;
        min-width: 0;
        padding: 14px 12px 14px 0;
        box-sizing: border-box;
        @apply --sat-drawer-item;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      :host([dir='rtl']) .node-name {
        padding: 14px 0 14px 12px;
      }

      a {
        @apply --nuxeo-link;
        @apply --sat-drawer-item;
      }

      a:hover {
        color: var(--sat-drawer-item-font-color, var(--nuxeo-drawer-text));
      }

      /* Active / selected row — Satori pill (@apply --sat-drawer-item-selected in theme) */
      .parents a.selected,
      [role='treeitem'].selected {
        @apply --sat-drawer-item-selected;
      }

      [role='treeitem'].selected a {
        color: var(--sat-drawer-item-font-color, var(--nuxeo-drawer-text));
      }

      nuxeo-tree-node {
        padding-top: 0;
      }

      nuxeo-tree {
        margin-left: 0;
      }

      [toggle] {
        cursor: pointer;
      }

      [toggle]:focus {
        outline: 2px solid var(--sat-drawer-item-font-color, var(--nuxeo-drawer-text));
        outline-offset: 2px;
        border-radius: 1000px;
        background-color: transparent;
      }

      .parents {
        line-height: 20px;
      }

      .parents a.tree-row {
        align-items: center;
      }

      .parents .parent {
        padding-top: 0;
        padding-bottom: 0;
      }

      .parents + nuxeo-tree {
        padding: 0;
      }

      .parents > nuxeo-tree {
        padding: 0;
      }

      .parents a {
        display: flex;
        align-items: center;
        min-height: 48px;
        margin: 0;
        padding: 0;
        border-radius: 4px;
        @apply --sat-drawer-item;
        border-bottom: none;
        text-decoration: none;
      }

      .parent {
        flex: 1;
        min-width: 0;
        padding: 14px 12px 14px 0;
        box-sizing: border-box;
        @apply --sat-drawer-item;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      :host([dir='rtl']) .parent {
        padding: 14px 0 14px 12px;
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
        /* Apply Satori header styling globally */
        @apply --sat-section-header;
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
          class="tree-row"
          hidden$="[[_hideRoot(document)]]"
          on-click="_handleNodeClick"
          data-path="/"
        >
          <span class="tree-icon-slot" aria-hidden="true"><iron-icon icon="[[toggleChevronIcon]]"></iron-icon></span>
          <span class="parent">[[i18n('browse.root')]]</span>
        </a>
        <template is="dom-repeat" items="[[parents]]" as="item">
          <a href$="[[urlFor(item)]]" class="tree-row" on-click="_handleNodeClick" data-path$="[[item.path]]">
            <span class="tree-icon-slot"><iron-icon icon="[[toggleChevronIcon]]"></iron-icon></span>
            <span class="parent">[[item.title]]</span>
          </a>
        </template>
      </div>
      <nuxeo-tree id="tree" data="[[document]]" controller="[[controller]]" node-key="uid">
        <template>
          <div role="treeitem" class="tree-row" aria-expanded="[[opened]]">
            <template is="dom-if" if="[[!isLeaf]]">
              <div class="tree-toggle-slot">
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
              </div>
              <template is="dom-if" if="[[loading]]">
                <span class="loaddata" aria-live="polite">[[_loading(loading)]]</span>
              </template>
            </template>
            <template is="dom-if" if="[[isLeaf]]">
              <span class="tree-toggle-slot" aria-hidden="true"></span>
            </template>
            <span class="node-name">
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
    this._debounceHighlightUpdate();

    // Listen for browser back/forward button navigation
    this._boundPopStateHandler = this._handlePopState.bind(this);
    globalThis.addEventListener('popstate', this._boundPopStateHandler);

    // Listen for location changes (Polymer routing)
    this._boundLocationChangedHandler = this._handleLocationChanged.bind(this);
    globalThis.addEventListener('location-changed', this._boundLocationChangedHandler);

    // Set up observer for dynamically loaded tree nodes
    this._setupTreeObserver();
  },

  detached() {
    // Clean up event listeners
    if (this._boundPopStateHandler) {
      globalThis.removeEventListener('popstate', this._boundPopStateHandler);
    }
    if (this._boundLocationChangedHandler) {
      globalThis.removeEventListener('location-changed', this._boundLocationChangedHandler);
    }
    if (this._treeObserver) {
      this._treeObserver.disconnect();
    }
  },

  ready() {
    if (!this.hasAttribute('dir')) {
      const direction = document.documentElement.getAttribute('dir');
      this.setAttribute('dir', direction);
    }
    this._checkRtl();
    globalThis.addEventListener('nuxeo-documents-deleted', (e) => {
      if (e.detail.documents) {
        this.removeDocuments(e.detail.documents);
        return;
      }
      // when in select all mode we don't have a list of documents in the event detail
      this._fetchDocument();
    });

    globalThis.addEventListener('refresh-display', () => {
      this._fetchDocument();
    });

    globalThis.addEventListener('document-created', this._fetchDocument.bind(this));

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
          // Update sessionStorage to sync with current document
          sessionStorage.setItem('nuxeo.tree.selectedPath', doc.path);
          // Update selection highlight when document changes
          this._retryHighlightUpdate(doc.path);
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
      // Update sessionStorage to sync with current document (important for back button)
      if (doc.path) {
        sessionStorage.setItem('nuxeo.tree.selectedPath', doc.path);
      }
      // Update selection highlight when current document changes with retry logic
      this._retryHighlightUpdate(doc.path);
    }
  },

  _documentChanged() {
    if (this.document && this.hasFacet(this.document, 'Folderish')) {
      this.$.tree.style.display = 'block';
      // Update selection when tree data loads with retry for async rendering
      this._retryHighlightUpdate();
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
    const clickedPath = clickedLink.dataset.path;

    // Store the selected path for persistence
    if (clickedPath) {
      sessionStorage.setItem('nuxeo.tree.selectedPath', clickedPath);
    }

    // Update highlight with debouncing
    this._debounceHighlightUpdate(clickedPath);
  },

  /**
   * Handle browser back/forward button navigation
   */
  _handlePopState() {
    // When user uses back/forward button, update highlight after a short delay
    // to allow currentDocument to be updated first
    this._retryHighlightUpdate();
  },

  /**
   * Handle location change events from routing
   */
  _handleLocationChanged() {
    // Update highlight when route changes
    this._retryHighlightUpdate();
  },

  /**
   * Setup MutationObserver to watch for dynamically added tree nodes
   */
  _setupTreeObserver() {
    if (this._treeObserver) {
      return;
    }

    // Observe changes to the tree structure
    this._treeObserver = new MutationObserver(() => {
      // When tree nodes are added, update highlighting
      this._debounceHighlightUpdate();
    });

    // Start observing the tree container
    const treeContainer = this.shadowRoot.querySelector('.content');
    if (treeContainer) {
      this._treeObserver.observe(treeContainer, {
        childList: true,
        subtree: true,
      });
    }
  },

  /**
   * Debounced highlight update to prevent race conditions
   */
  _debounceHighlightUpdate(selectedPath) {
    this.__highlightDebouncer = Debouncer.debounce(this.__highlightDebouncer, timeOut.after(50), () => {
      this._updateSelectionHighlight(selectedPath);
    });
  },

  /**
   * Retry highlight update with delays to handle async tree rendering
   * This is important for browser back/forward navigation and dynamic content
   */
  _retryHighlightUpdate(selectedPath, attempt = 0) {
    const maxAttempts = 10;
    const delay = attempt === 0 ? 100 : 200;

    this.__retryDebouncer = Debouncer.debounce(this.__retryDebouncer, timeOut.after(delay), () => {
      const result = this._updateSelectionHighlight(selectedPath);

      // If no element was highlighted and we haven't exceeded max attempts, retry
      if (!result && attempt < maxAttempts) {
        this._retryHighlightUpdate(selectedPath, attempt + 1);
      }
    });
  },

  /**
   * Update the selection highlighting in the tree
   * Only one node should be highlighted at a time
   * Returns true if an element was highlighted, false otherwise
   */
  _updateSelectionHighlight(selectedPath) {
    // Determine which path should be highlighted
    // Priority: explicit path > currentDocument > sessionStorage
    const pathToHighlight =
      selectedPath || this.currentDocument?.path || sessionStorage.getItem('nuxeo.tree.selectedPath');

    if (!pathToHighlight) return false;

    let highlighted = false;

    // Get all links in the tree (both in nuxeo-tree and parents)
    const allLinks = this.shadowRoot.querySelectorAll('a[data-path], .parents a');

    const clearSelectedRow = (link) => {
      link.classList.remove('selected');
      const treeItem = link.closest('[role="treeitem"]');
      if (treeItem) {
        treeItem.classList.remove('selected');
      }
    };

    const markSelectedRow = (link) => {
      link.classList.add('selected');
      const treeItem = link.closest('[role="treeitem"]');
      if (treeItem) {
        treeItem.classList.add('selected');
      }
    };

    // Remove 'selected' class from all links (and their tree rows)
    allLinks.forEach((link) => {
      clearSelectedRow(link);
    });

    // Add 'selected' class to the matching link - EXACT match only
    allLinks.forEach((link) => {
      const linkPath = link.dataset.path;
      // Only match if paths are EXACTLY the same
      if (linkPath && linkPath === pathToHighlight) {
        markSelectedRow(link);
        highlighted = true;
      }
    });

    // Also check dynamically loaded tree nodes in shadow DOM
    const treeElement = this.$.tree;
    if (treeElement) {
      // Check both shadow DOM and light DOM for tree nodes
      const checkTreeLinks = (root) => {
        if (!root) return;
        const treeLinks = root.querySelectorAll('a[data-path]');
        treeLinks.forEach((link) => {
          clearSelectedRow(link);
          const linkPath = link.dataset.path;
          if (linkPath === pathToHighlight) {
            markSelectedRow(link);
            highlighted = true;
          }
        });
      };

      // Check shadow DOM
      if (treeElement.shadowRoot) {
        checkTreeLinks(treeElement.shadowRoot);
      }

      // Check light DOM
      checkTreeLinks(treeElement);

      // Check nested tree nodes that might have their own shadow DOMs
      const nestedTrees = treeElement.querySelectorAll('nuxeo-tree-node');
      nestedTrees.forEach((node) => {
        if (node.shadowRoot) {
          checkTreeLinks(node.shadowRoot);
        }
      });
    }

    return highlighted;
  },
});

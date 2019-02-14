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
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';

import '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';

/**
 * @polymerBehavior Nuxeo.DocumentContentBehavior
 */
export const DocumentContentBehavior = [IronResizableBehavior, Nuxeo.LayoutBehavior, {
  properties: {
    /**
     * The document to be displayed.
     */
    document: Object,
    /**
     * `true` if the current element is visible, `false` otherwise.
     */
    visible: {
      type: Boolean,
      value: false
    },
    /**
     * The currently selected items in the results view.
     */
    selectedItems: {
      type: Array,
      notify: true
    },
    params: {
      type: Object,
      computed: '_computeParams(document)'
    },
    /**
     * The sort options.
     */
    sortOptions: {
      type: Array,
      computed: '_computeSortOptions(i18n)'
    },
    _dropTargetFilter: {
      type: Function,
      value: function() {
        return this._dropTargetFilter.bind(this);
      }
    }
  },

  listeners: {
    'document-created': '_handleDocumentCreated',
    'iron-resize': '_computeVisible'
  },

  observers: [
    '_refresh(params, visible)'
  ],

  attached: function() {
    this.nxProvider = this.pageProvider;
    this._dragoverHandler = this._dragoverImport.bind(this);
    this._dragleaveHandler = this._dragleaveImport.bind(this);
    this._dropHandler = this._dropImport.bind(this);
    this._setupDnD();
  },

  detached: function() {
    this._teardownDnD();
    this._dragoverHandler = null;
    this._dragleaveHandler = null;
    this._dropHandler = null;
    this.nxProvider = null;
  },

  /**
   * Gets the currently selected view.
   */
  get view() {
    return this.$$('.results.iron-selected');
  },

  /**
   * The `nuxeo-results` element.
   */
  get results() {
    return this.$$('nuxeo-results');
  },

  /**
   * The `nuxeo-page-provider` element.
   */
  get pageProvider() {
    return this.$$('nuxeo-page-provider');
  },

  _navigate: function(e) {
    this.fire('navigate', {doc: (e.model || e.detail).item});
    e.stopPropagation();
  },

  _refresh: function() {
    if (this.document && this.visible) {
      this.results.fetch();
    }
  },

  _canSort: function(document, options) {
    return !(document && this.hasFacet(document, 'Orderable')) && Array.isArray(options) && options.length > 0;
  },

  _displaySort: function(document, field) {
    return this._canSort(document) ? field : undefined;
  },

  // function used by nuxeo-data-grid and nuxeo-data-table to check if a list item is a drop target
  _dropTargetFilter: function(el, model) {
    return model && (this.hasFacet(model.item, 'Folderish') || this.hasFacet(model.item, 'Collection'));
  },

  _hasWritePermission: function (doc) {
    return doc && this.hasPermission(doc, 'Write');
  },

  _handleDocumentCreated: function() {
    this.fire('document-updated');
  },

  _computeVisible: function() {
    this.visible = Boolean(this.offsetWidth || this.offsetHeight);
  },

  _dragoverImport: function(e) {
    e.preventDefault();
    this.fire('notify', { message: this.i18n('documentContentView.drag.import'), duration: 0 });
    this._toggleDragging(true);
  },

  _dragleaveImport: function() {
    this.fire('notify', { close: true });
    this._toggleDragging(false);
  },

  _dropImport: function(e) {
    e.preventDefault();
    this.fire('notify', { close: true });
    this._toggleDragging(false);
    this.fire('create-document', { files: e.dataTransfer.files });
  },

  _toggleDragging: function(flag) {
    var view = this.view;
    if (view) {
      this.toggleClass('dragging', flag, view);
    }
  },

  _setupDnD: function() {
    var results = this.results;
    if (results) {
      results.addEventListener('dragover', this._dragoverHandler);
      results.addEventListener('dragleave', this._dragleaveHandler);
      results.addEventListener('drop', this._dropHandler);
    }
  },

  _teardownDnD: function() {
    var results = this.results;
    if (results) {
      results.removeEventListener('dragover', this._dragoverHandler);
      results.removeEventListener('dragleave', this._dragleaveHandler);
      results.removeEventListener('drop', this._dropHandler);
    }
  },

  _computeParams: function(document) {
    return document ? { 'ecm_parentId': document.uid, 'ecm_trashed': this.isTrashed(document) } : {};
  },

  _computeSortOptions: function() {
    return [
      {field: 'dc:title', label: this.i18n('searchResults.sort.field.title'), order: 'asc'},
      {field: 'dc:created', label: this.i18n('searchResults.sort.field.created'), order: 'asc', selected: true},
      {field: 'dc:modified', label: this.i18n('searchResults.sort.field.modified'), order: 'desc'},
      {field: 'dc:lastContributor', label: this.i18n('searchResults.sort.field.lastContributor'), order: 'asc'},
      {field: 'state', label: this.i18n('searchResults.sort.field.state'), order: 'asc'},
      {field: 'dc:nature', label: this.i18n('searchResults.sort.field.nature'), order: 'asc'},
      {field: 'dc:coverage', label: this.i18n('searchResults.sort.field.coverage'), order: 'asc'}
    ];
  }
}];

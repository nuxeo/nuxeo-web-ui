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

import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-path-suggestion/nuxeo-path-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-quick-filters/nuxeo-quick-filters.js';

import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-action-button-styles.js';
import '@polymer/paper-drawer-panel/paper-drawer-panel.js';
import '@polymer/paper-header-panel/paper-header-panel.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/communication-icons.js';
import '@polymer/iron-icons/editor-icons.js';
import '@polymer/iron-icons/hardware-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/notification-icons.js';
import '@polymer/iron-icons/social-icons.js';
import './nuxeo-app/nuxeo-progress-indicator.js';
import './nuxeo-app/nuxeo-menu-item.js';
import './nuxeo-app/nuxeo-menu-icon.js';
import './nuxeo-app/nuxeo-page.js';
import './nuxeo-app/nuxeo-page-item.js';
import './nuxeo-app/nuxeo-offline-banner.js';
import './nuxeo-app/nuxeo-expired-session.js';
import './nuxeo-document-creation/nuxeo-document-creation-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-elements/nuxeo-task-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import './nuxeo-browser/nuxeo-breadcrumb.js';
import './nuxeo-document-storage/nuxeo-document-storage.js';
import './nuxeo-results/nuxeo-results.js';
import '../i18n/i18n.js';
import '../themes/base.js';
import '../themes/loader.js';
import './nuxeo-search-page.js';
import './search/nuxeo-search-form.js';
// import './nuxeo-admin/nuxeo-user-group-management-page.js';
import './nuxeo-mobile/nuxeo-mobile-banner.js';
import './nuxeo-cloud-services/nuxeo-oauth2-consumed-tokens.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';

import { Performance } from './performance.js';

// temporary extensible doc type registry
window.nuxeo = window.nuxeo || {};
window.nuxeo.importBlacklist = window.nuxeo.importBlacklist || [
  'Workspace',
  'Folder',
  'OrderedFolder',
  'Collection',
  'Domain',
  'Root',
];

setPassiveTouchGestures(true);

/**
`nuxeo-app`
@group Nuxeo UI
@element nuxeo-app
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      /**
        * iOS fix for NXP-25986: prevent \`paper-header-panel\` from creating a new stacking context
        * for more details, see: https://github.com/PolymerElements/paper-dialog/issues/44#issuecomment-172013206
        * this will only work for iOS since it's the only supporting \`-webkit-overflow-scrolling\`
        */
      :host {
        --paper-header-panel-container: {
          -webkit-overflow-scrolling: auto;
        }
      }

      paper-header-panel,
      iron-pages paper-header-panel {
        --paper-header-panel-body: {
          background: var(--nuxeo-page-background);
        }
        height: 100%;
      }

      paper-drawer-panel {
        top: var(--nuxeo-app-top);
        height: calc(100% - var(--nuxeo-app-top));
      }

      paper-drawer-panel[narrow] {
        --paper-drawer-panel-left-drawer-container: {
          z-index: 100;
        }
        --paper-drawer-panel-scrim: {
          z-index: 2;
        }
      }

      /* logo */
      #logo {
        position: fixed;
        width: var(--nuxeo-sidebar-width);
        height: 53px;
        top: var(--nuxeo-app-top);
        left: 0;
        z-index: 102;
        box-sizing: border-box;
        outline: none;
        background-color: var(--nuxeo-sidebar-background);
      }

      #logo img {
        width: var(--nuxeo-sidebar-width);
        height: 53px;
      }

      /* menu */
      #menu {
        @apply --nuxeo-sidebar;
        position: fixed;
        width: var(--nuxeo-sidebar-width);
        height: calc(100% - 54px);
        z-index: 100;
        padding: 53px 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
      }

      #logo:hover img {
        background: rgba(0, 0, 0, 0.2);
        color: var(--nuxeo-sidebar-menu-hover);
      }

      #logo:hover img {
        filter: brightness(110%);
        -webkit-filter: brightness(110%);
      }

      /* Apply margin-top: auto to all settings and then reset them, except the first one */
      #menu > .settings {
        margin-top: auto;
      }

      #menu > .settings ~ .settings {
        margin: 0;
        order: 1;
      }

      @media (max-width: 1024px), (max-height: 700px) {
        #drawer .toggle {
          display: none;
        }
      }

      /* drawer */
      #drawer {
        overflow: auto;
        width: 100%;
      }

      #drawer .toggle {
        position: absolute;
        right: -16px;
        top: 0;
        width: 16px;
        height: 100%;
        cursor: pointer;
      }

      #drawer .toggle iron-icon {
        visibility: hidden;
        color: var(--nuxeo-drawer-background);
        background-color: var(--nuxeo-drawer-text);
        width: 16px;
        height: 48px;
        top: calc(50% - 24px);
        opacity: 0.6;
      }

      #drawer:hover .toggle iron-icon,
      #drawer .toggle:hover iron-icon {
        visibility: visible;
      }

      #drawer iron-pages {
        @apply --layout-vertical;
        color: var(--nuxeo-drawer-text);
        width: calc(100% - var(--nuxeo-sidebar-width));
        height: 100vh;
        margin-left: var(--nuxeo-sidebar-width);
        background-color: var(--nuxeo-drawer-background);
      }

      #drawer nuxeo-menu-item:hover,
      #drawer list-item:hover {
        @apply --nuxeo-block-hover;
      }

      #drawer .list-item.selected,
      #drawer nuxeo-menu-item.iron-selected,
      #drawer .list-item:focus,
      #drawer nuxeo-menu-item:focus,
      #drawer .list-item.selected:focus,
      #drawer nuxeo-menu-item.iron-selected:focus {
        @apply --nuxeo-block-selected;
      }

      #drawer nuxeo-menu-item {
        @apply --nuxeo-sidebar-item-theme;
        --nuxeo-menu-item-link {
          @apply --nuxeo-sidebar-item-link;
        }
      }

      #drawer .profile nuxeo-menu-item:last-of-type {
        @apply --layout-vertical;
        border: none;
        justify-content: flex-end;
      }

      #drawerToggle {
        position: absolute;
        top: 5px;
        left: 6px;
        z-index: 99;
        background-color: var(--nuxeo-drawer-background);
      }

      nuxeo-document-create-button.admin {
        display: none;
      }

      #toast {
        display: flex;
        align-items: center;
        padding: 0 24px;
        justify-content: space-between;
      }
    </style>

    <nuxeo-offline-banner message="[[i18n('app.offlineBanner.message')]]"></nuxeo-offline-banner>

    <nuxeo-expired-session message="[[i18n('app.expiredSession.message')]]"></nuxeo-expired-session>

    <nuxeo-connection id="nxcon" user="{{currentUser}}" url="{{url}}"></nuxeo-connection>

    <nuxeo-document id="doc" doc-id="[[docId]]" doc-path="[[docPath]]"></nuxeo-document>

    <nuxeo-sardine hidden></nuxeo-sardine>

    <nuxeo-operation id="userWorkspace" op="User.GetUserWorkspace"></nuxeo-operation>
    <nuxeo-operation id="moveDocumentsOp" sync-indexing></nuxeo-operation>

    <nuxeo-task-page-provider id="tasksProvider" page-size="1"></nuxeo-task-page-provider>
    <nuxeo-resource
      id="task"
      path="/task/[[currentTaskId]]"
      headers='{"fetch-document": "properties", "translate-directoryEntry": "label", "fetch-directoryEntry": "parent", "fetch-task": "targetDocumentIds,actors"}'
    ></nuxeo-resource>

    <!-- app layout -->
    <paper-drawer-panel
      id="drawerPanel"
      narrow="{{isNarrow}}"
      drawer-width="[[drawerWidth]]"
      responsive-width="720px"
      edge-swipe-sensitivity="0"
    >
      <div slot="drawer">
        <!-- logo -->
        <a id="logo" href$="[[urlFor('home')]]" on-click="_resetTaskSelection">
          <img src$="[[_logo(baseUrl)]]" alt="[[i18n('accessibility.logo')]]" />
        </a>

        <!-- menu -->
        <paper-listbox
          id="menu"
          selected="{{selectedTab}}"
          attr-for-selected="name"
          selected-class="selected"
          on-iron-activate="_toggleDrawer"
        >
          <nuxeo-slot name="DRAWER_ITEMS" model="[[actionContext]]"></nuxeo-slot>
          <nuxeo-menu-icon
            name="administration"
            icon="nuxeo:admin"
            label="app.administration"
            class="settings"
            hidden$="[[!hasAdministrationPermissions(currentUser)]]"
          >
          </nuxeo-menu-icon>
          <nuxeo-menu-icon
            name="profile"
            src="[[currentUser.contextParameters.userprofile.avatar.data]]"
            icon="nuxeo:user-settings"
            label="app.account"
            class="settings"
          >
          </nuxeo-menu-icon>
        </paper-listbox>

        <!-- drawer -->
        <div id="drawer">
          <iron-pages
            id="drawer-pages"
            selected="[[selectedTab]]"
            attr-for-selected="name"
            selected-attribute="visible"
            on-iron-items-changed="_updateSearch"
          >
            <nuxeo-slot name="DRAWER_PAGES" model="[[actionContext]]"></nuxeo-slot>

            <template is="dom-if" if="[[hasAdministrationPermissions(currentUser)]]">
              <div name="administration">
                <div class="header">[[i18n('app.administration')]]</div>
                <iron-selector selected="{{selectedAdminTab}}" attr-for-selected="name">
                  <nuxeo-slot name="ADMINISTRATION_MENU" model="[[actionContext]]"></nuxeo-slot>
                </iron-selector>
              </div>
            </template>

            <div name="profile" class="layout vertical">
              <div class="header">[[_displayUser(currentUser)]]</div>
              <iron-selector selected="{{selectedProfileTab}}" attr-for-selected="name">
                <nuxeo-slot name="USER_MENU" model="[[actionContext]]"></nuxeo-slot>
                <nuxeo-menu-item name="logout" label="app.user.signOut" link="[[_logout(url)]]"></nuxeo-menu-item>
              </iron-selector>
            </div>
          </iron-pages>

          <div class="toggle" on-tap="_closeDrawer" hidden$="[[!drawerOpened]]">
            <iron-icon icon="icons:chevron-left"></iron-icon>
          </div>
        </div>
      </div>

      <!-- pages -->
      <paper-header-panel slot="main" mode="seamed">
        <iron-pages id="pages" selected="[[page]]" attr-for-selected="name" selected-attribute="visible">
          <nuxeo-slot name="PAGES" model="[[actionContext]]"></nuxeo-slot>

          <nuxeo-home name="home"></nuxeo-home>

          <nuxeo-browser
            name="browse"
            id="browser"
            document="[[currentDocument]]"
            selected-tab="{{docAction}}"
            clipboard="[[clipboard]]"
          ></nuxeo-browser>

          <nuxeo-search-page
            name="search"
            id="searchResults"
            heading="searchResults.results"
            search-form="[[searchForm]]"
            show-saved-search-actions
          ></nuxeo-search-page>

          <nuxeo-tasks id="tasks-dashboard" name="tasks" current="[[currentTask]]"></nuxeo-tasks>

          <nuxeo-admin
            name="admin"
            user="[[currentUser]]"
            selected="[[selectedAdminTab]]"
            route-params="[[routeParams]]"
            on-error="_onError"
          ></nuxeo-admin>

          <nuxeo-profile name="profile" selected="[[selectedProfileTab]]" user="[[currentUser]]"></nuxeo-profile>

          <nuxeo-themes name="themes" selected="[[selectedProfileTab]]"></nuxeo-themes>

          <nuxeo-diff-page id="diff" name="diff"></nuxeo-diff-page>

          <nuxeo-page name="error">
            <div slot="header"></div>
            <div>
              <nuxeo-card>
                <nuxeo-error id="error"></nuxeo-error>
              </nuxeo-card>
            </div>
          </nuxeo-page>
        </iron-pages>

        <paper-icon-button
          id="drawerToggle"
          icon="menu"
          on-tap="_openDrawer"
          hidden$="[[!isNarrow]]"
        ></paper-icon-button>
        <nuxeo-suggester id="suggester"></nuxeo-suggester>
      </paper-header-panel>
    </paper-drawer-panel>

    <nuxeo-document-create-button
      class$="[[page]]"
      parent="[[currentParent]]"
      hidden$="[[isMobile]]"
    ></nuxeo-document-create-button>
    <nuxeo-document-create-popup
      id="importPopup"
      parent="[[currentParent]]"
      default-path="/"
    ></nuxeo-document-create-popup>

    <nuxeo-progress-indicator visible="[[loading]]"></nuxeo-progress-indicator>

    <paper-toast id="toast">
      <paper-icon-button icon="icons:close" on-tap="_dismissToast" hidden$="[[!_dismissible]]"></paper-icon-button>
    </paper-toast>

    <nuxeo-keys keys="/ ctrl+space s" on-pressed="_showSuggester"></nuxeo-keys>
    <nuxeo-keys keys="d" on-pressed="showHome"></nuxeo-keys>
    <nuxeo-keys keys="m" on-pressed="_focusMenu"></nuxeo-keys>

    <nuxeo-mobile-banner document="[[currentDocument]]" is-mobile="{{isMobile}}"></nuxeo-mobile-banner>
  `,

  is: 'nuxeo-app',
  behaviors: [RoutingBehavior, FormatBehavior, FiltersBehavior],
  importMeta: import.meta,
  properties: {
    productName: {
      type: String,
      value: 'Nuxeo',
    },

    baseUrl: {
      type: String,
      value: '/',
      observer: '_baseUrlChanged',
    },

    loading: {
      type: Boolean,
      value: false,
    },

    page: {
      type: String,
      observer: '_pageChanged',
    },

    selectedTab: String,
    selectedAdminTab: String,

    currentDocument: Object,
    currentParent: Object,
    docId: String,
    docPath: String,
    docAction: {
      type: String,
      value: 'view',
    },

    searchName: {
      type: String,
      observer: '_updateSearch',
    },

    taskCount: Number,

    drawerWidth: {
      type: String,
      value: '52px',
    },

    drawerOpened: {
      type: Boolean,
      value: false,
    },

    keyEventTarget: {
      type: Object,
      value() {
        return document.body;
      },
    },

    currentTask: {
      type: Object,
      value: null,
    },

    currentUser: {
      type: Object,
      observer: '_observeCurrentUser',
    },

    userWorkspace: {
      type: String,
    },

    actionContext: {
      type: Object,
      computed:
        '_actionContext(currentDocument, currentUser, currentTask, taskCount,' +
        ' clipboard, clipboardDocCount, userWorkspace, routeParams)',
    },

    clipboard: {
      type: Object,
      value: null,
    },

    clipboardDocCount: {
      type: Number,
      value: 0,
      notify: true,
    },

    _dismissible: {
      type: Boolean,
      value: false,
    },

    routeParams: String,

    _routedSearch: {
      type: Object,
    },
  },

  listeners: {
    'document-updated': 'refresh',
    'create-document': '_showDocumentCreationWizard',
    'document-created': '_handleDocumentCreated',
    workflowStarted: '_refreshAndFetchTasks',
    workflowAbandoned: '_refreshAndFetchTasks',
    workflowTaskAssignment: '_workflowTaskAssigned',
    workflowTaskProcess: '_workflowTaskProcess',
    workflowTaskProcessed: '_refreshAndFetchTasks',
    'added-to-clipboard': '_onAddedToClipboard',
    'add-to-clipboard': '_onAddToClipboard',
    'clipboard-action-performed': '_onClipboardAction',
    'added-to-collection': '_documentAddedToCollection',
    'removed-from-clipboard': '_documentRemovedFromClipboard',
    'removed-from-collection': '_documentRemovedFromCollection',
    'file-deleted': '_documentFileDeleted',
    'added-to-favorites': '_documentAddedToFavorites',
    'removed-from-favorites': '_documentRemovedFromFavorites',
    'document-subscribed': '_documentSubscribed',
    'document-unsubscribed': '_documentUnsubscribed',
    'document-locked': '_documentLocked',
    'document-unlocked': '_documentUnlocked',
    'theme-changed': '_themeChanged',
    'search-results': '_showSearchResults',
    navigate: '_navigate',
    'collection-loaded': '_updateCollectionMenu',
    notify: '_notify',
    'nx-clipboard-updated': '_clipboardUpdated',
    'document-deleted': '_documentDeleted',
    'document-untrashed': '_documentUntrashed',
    'nuxeo-documents-deleted': '_documentsDeleted',
    'nuxeo-documents-untrashed': '_documentsUntrashed',
    'nuxeo-documents-dropped': '_documentsDropped',
    'nuxeo-diff-documents': '_diffDocuments',
  },

  observers: ['_computeSharedActionContext(currentUser)', '_updateTitle(page, i18n)'],

  ready() {
    this.$.drawerPanel.closeDrawer();

    this.$.drawerPanel.$.drawer.addEventListener('transitionend', () => {
      this.$.drawerPanel.notifyResize();
    });

    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason && e.reason.status === 404) {
        this.showError(404, e.reason.message, this._errorUrl());
      }
    });

    // NXP-25311: stop loading bar if an error occurs
    window.onerror = function() {
      this.loading = false;
    }.bind(this);

    this.removeAttribute('unresolved');

    Performance.mark('nuxeo-app.ready');
  },

  _resetTaskSelection() {
    this.currentTask = null;
    this.currentTaskId = null;
  },

  refresh() {
    if (this.page === 'search') {
      this._refreshSearch();
    } else if ((this.docPath && this.docPath.length > 0) || (this.docId && this.docId.length > 0)) {
      this.load('browse', this.docId, this.docPath, this.docAction);
    } else {
      this.navigateTo('home');
    }
  },

  loadTask(id) {
    if (id && id.length > 0) {
      this.loading = true;
      this.currentTaskId = id;
      this.$.task
        .get()
        .then((task) => {
          this._defineTaskAndNavigate(task);
          this.loading = false;
        })
        .catch((error) => {
          if (error.status === 403) {
            this._fetchTaskCount();
            this.navigateTo('tasks');
            this.loading = false;
          }
        });
    } else {
      this._defineTaskAndNavigate();
    }
  },

  _defineTaskAndNavigate(task) {
    this.currentTask = task;
    this.show('tasks');
  },

  _getSavedSearchForm() {
    if (!this._routedSearch) {
      return null;
    }
    return this.$$(`nuxeo-search-form[provider="${this._routedSearch.properties['saved:providerName']}"]`);
  },

  _loadSavedSearch() {
    const savedSearchForm = this._getSavedSearchForm(this._routedSearch);
    if (savedSearchForm && savedSearchForm.getAttribute('search-name') === this.searchName) {
      savedSearchForm._loadSavedSearch(this._routedSearch.uid);
      this._routedSearch = null;
    }
  },

  _redirectSavedSearch() {
    const savedSearchForm = this._getSavedSearchForm();
    if (savedSearchForm) {
      const name = savedSearchForm.getAttribute('search-name');
      if (!this._searchOnLoad) {
        this.navigateTo('search', name);
        this._loadSavedSearch();
      }
    }
  },

  load(page, id, path, action) {
    this.loading = true;
    this.docId = id;
    this.docPath = path;
    this.$.doc.headers = this._computeHeaders();
    this.$.doc.enrichers = this._computeEnrichers();
    this.$.doc
      .get()
      .then((doc) => {
        if (this.docId && doc.facets.includes('SavedSearch')) {
          this._routedSearch = doc;
          this._redirectSavedSearch();
          this.loading = false;
          return;
        }
        if (this.docId && !doc.isVersion) {
          this.docId = '';
          this.docPath = doc.path;
        }
        this.currentParent = this.hasFacet(doc, 'Folderish')
          ? doc
          : doc.contextParameters.breadcrumb.entries.slice(-2, -1)[0];
        this.set('currentDocument', doc);
        this.docAction = action;
        this.loading = false;
        this.show(page);
      })
      .catch((err) => {
        this.showError(err.status, this.i18n('browse.error'), err.message);
      });
  },

  showError(code, msg, url) {
    this.loading = false;
    const errorEl = this.$.error;
    errorEl.code = code;
    errorEl.message = msg;
    errorEl.url = url;
    this.show('error');
  },

  show(page, route) {
    this.page = page;
    this.routeParams = route;
  },

  showDiff(id1, id2) {
    this.show('diff');
    const params = [id1, id2];
    // let's keep current context only if it includes the ids already in the params
    if (this.$.diff.docIds && params.every((el) => this.$.diff.docIds.indexOf(el) > -1)) {
      const otherIds = this.$.diff.docIds.find((id) => params.indexOf(id) === -1);
      this.$.diff.docIds = null;
      this.$.diff.docIds = params.concat(otherIds).filter(Boolean);
    } else {
      this.$.diff.docIds = [id1, id2];
    }
  },

  _diffDocuments(e) {
    this.navigateTo('page', 'diff');
    this.$.diff.docIds = null;
    this.$.diff.docIds = e.detail.documents.map((doc) => doc.uid);
  },

  _updateTitle() {
    const title = [];
    switch (this.page) {
      case 'browse':
        if (this.currentDocument && this.currentDocument.title) {
          title.push(this.currentDocument.title);
          if (this.currentDocument.type === 'Collections') {
            title.push(this.i18n('app.title.collections'));
          } else if (this.hasFacet(this.currentDocument, 'Collection')) {
            if (this.currentDocument.type === 'Favorites') {
              title.push(this.i18n('app.title.favorites'));
            } else {
              title.push(this.i18n('app.title.collection'));
            }
          }
        }
        break;

      case 'search':
        if (this.searchForm) {
          if (this.searchForm.selectedSearch && this.searchForm.selectedSearch.title) {
            title.push(this.searchForm.selectedSearch.title);
          } else if (this.searchForm.searchName) {
            title.push(this.i18n(`app.title.search.${this.searchForm.searchName}`));
          }
        }
        title.push(this.i18n('app.title.search'));
        break;

      case 'tasks':
        if (this.currentTask) {
          title.push(this.i18n(this.currentTask.workflowModelName));
          title.push(this.i18n(this.currentTask.name));
        } else {
          title.push(this.i18n(`app.title.${this.page}`));
        }
        break;

      case 'admin':
        if (this.selectedAdminTab) {
          title.push(this.i18n(`app.title.admin.${this.selectedAdminTab}`));
        }
        title.push(this.i18n(`app.title.${this.page}`));
        break;

      default:
        title.push(this.i18n(`app.title.${this.page}`));
    }
    title.push(this.productName);
    document.title = title.join(' - ');
  },

  _baseUrlChanged() {
    RoutingBehavior.baseUrl = this.baseUrl;
  },

  _logo(baseUrl) {
    return `${baseUrl}themes/${localStorage.getItem('theme') || 'default'}/logo.png`;
  },

  showHome(e) {
    e.detail.keyboardEvent.preventDefault();
    this.show('home');
  },

  _actionContext() {
    return {
      document: this.currentDocument,
      user: this.currentUser,
      taskCount: this.taskCount,
      currentTask: this.currentTask,
      clipboardDocCount: this.clipboardDocCount,
      clipboard: this.clipboard,
      actionContext: this.actionContext,
      userWorkspace: this.userWorkspace,
      routeParams: this.routeParams,
    };
  },

  _computeSharedActionContext() {
    if (this.currentUser) {
      window.nuxeo.slots.setSharedModel({ user: this.currentUser });
    }
  },

  _focusMenu(e) {
    e.detail.keyboardEvent.preventDefault();
    this.$.menu.focus();
  },

  _showSuggester(e) {
    e.detail.keyboardEvent.preventDefault();
    this.$.suggester.toggle();
  },

  _showDocumentCreationWizard(e) {
    if (e.detail.keyboardEvent) {
      e.detail.keyboardEvent.preventDefault();
    }
    if (e.detail.files) {
      this.$.importPopup.toggleDialogImport(e.detail.files);
    } else if (e.detail.type) {
      this.$.importPopup.toggleDialogCreate(e.detail.type);
    } else {
      this.$.importPopup.toggleDialog();
    }
  },

  _navigate(e) {
    if (e.detail.doc) {
      this.navigateTo('browse', e.detail.doc.path, e.detail.docAction);
      if (e.detail.isFromCollection) {
        this.$$('#collectionsForm').displayMembers(e.detail.srcDoc, e.detail.index);
      }
    }
    if (e.detail.task) {
      const tasksDrawer = this.$$('nuxeo-tasks-drawer');
      if (!tasksDrawer || !tasksDrawer.visible) {
        this.navigateTo('tasks', e.detail.task.id);
      } else {
        tasksDrawer.$.tasks.selectTask(e.detail.index, e.detail.task, e.detail.params);
      }
    }
  },

  // lookup the search
  _updateSearch() {
    this.searchForm = this.$$(`[search-name='${this.searchName}']`);
    if (this.searchForm && this._searchOnLoad) {
      this.searchForm._search().then(() => {
        this._loadSavedSearch();
        this._searchOnLoad = false;
      });
    } else {
      this._redirectSavedSearch();
    }
  },

  /**
   * Gets current search form (if any) and refreshes it. Useful to handle file deletion/restore when the user has a
   * search page open.
   */
  _refreshSearch() {
    this.searchForm = this.$$(`[search-name='${this.searchName}']`);
    if (this.searchForm) {
      this.searchForm.refresh();
    }
  },

  _updateCollectionMenu(e) {
    this.$$('#collectionsForm').loadCollection(e.detail.collection);
  },

  _showSearchResults(e) {
    const target = e.composedPath()[0];
    this.navigateTo('search', target.searchName);
  },

  _toggleDrawer(e) {
    if (this._selected === e.detail.selected && this.drawerOpened) {
      this._closeDrawer();
    } else {
      this._openDrawer();
    }
    this._selected = e.detail.selected;
  },

  _openDrawer() {
    this.drawerWidth = '350px';
    this.drawerOpened = true;
    const { drawerPanel } = this.$;
    if (drawerPanel.narrow) {
      drawerPanel.openDrawer();
    }
    if (!this.selectedTab) {
      const drawer = this.$['drawer-pages'];
      drawer.selectIndex(0);
      this.selectedTab = drawer.selected;
    }
  },

  _closeDrawer() {
    this.drawerWidth = '52px';
    this.drawerOpened = false;
    this.$.drawerPanel.closeDrawer();
  },

  _fetchTaskCount() {
    this.$.tasksProvider.fetch().then((response) => {
      this.taskCount = response.resultsCount;
    });
  },

  _refreshAndFetchTasks() {
    // let's refresh the current document since it might have been changed (ex: state and version)
    this.fire('document-updated');
    this._fetchTaskCount();
    this._resetTaskSelection();
    const tasksDrawer = this.$$('nuxeo-tasks-drawer');
    if (tasksDrawer.visible) {
      tasksDrawer.$.tasks.fetch();
    }
  },

  _workflowTaskProcess(e) {
    this.navigateTo('tasks', e.detail.task.id);
  },

  _workflowTaskAssigned() {
    this.loadTask(this.currentTaskId);
  },

  _onAddedToClipboard(e) {
    this._toast(
      this.i18n(
        e.detail.docIds && e.detail.docIds.length > 1
          ? 'app.documents.addedToClipboard'
          : 'app.document.addedToClipboard',
      ),
    );
  },

  _onAddToClipboard(e) {
    if (e.detail.documents && this.clipboard) {
      this.clipboard.add(e.detail.documents);
    }
  },

  _onClipboardAction(e) {
    if (e && e.detail && e.detail.operation === 'Document.Move') {
      const recents = this.$$('#recent');
      if (recents) {
        e.detail.documents.forEach((doc) => {
          recents.update(doc);
        });
      }
    }
    this.fire('document-updated');
  },

  _observeCurrentUser() {
    if (this.currentUser) {
      this.$.userWorkspace.execute().then((response) => {
        this.userWorkspace = response.path;
      });
      this.$.tasksProvider.params = {
        userId: this.currentUser.id,
      };
      this._fetchTaskCount();
    }
  },

  _displayUser(user) {
    if (user) {
      let result = '';
      if (user.properties.firstName) {
        result += user.properties.firstName;
      }
      if (user.properties.lastName) {
        if (result.length > 0) {
          result += ' ';
        }
        result += user.properties.lastName;
      }
      if (result.length === 0) {
        result = user.id;
      }
      return result;
    }
  },

  _toast(text) {
    this._notify({ detail: { message: text } });
  },

  _documentAddedToCollection(e) {
    this._toast(this.i18n(e.detail.docIds ? 'app.documents.addedToCollection' : 'app.document.addedToCollection'));
  },

  _documentRemovedFromCollection() {
    this._toast(this.i18n('app.document.removedFromCollection'));
  },

  _documentRemovedFromClipboard() {
    this._toast(this.i18n('app.document.removedFromClipboard'));
  },

  _documentAddedToFavorites() {
    this._toast(this.i18n('app.document.addedToFavorites'));
  },

  _documentRemovedFromFavorites() {
    this._toast(this.i18n('app.document.removedFromFavorites'));
  },

  _documentSubscribed() {
    this._toast(this.i18n('app.document.subscribed'));
  },

  _documentUnsubscribed() {
    this._toast(this.i18n('app.document.unsubscribed'));
  },

  _documentLocked() {
    this._toast(this.i18n('app.document.locked'));
    this.fire('document-updated');
  },

  _documentUnlocked() {
    this._toast(this.i18n('app.document.unlocked'));
    this.fire('document-updated');
  },

  _documentDeleted(e) {
    this._toast(this.i18n(`app.document.deleted.${e.detail.error ? 'error' : 'success'}`));
    // navigate to parent
    if (!e.detail.error) {
      this._removeFromClipboard([e.detail.doc]);
      this._removeFromRecentlyViewed([e.detail.doc]);
      const enrichers = e.detail.doc.contextParameters;
      if (enrichers) {
        const docAction = e.detail.hard ? 'trash' : null;
        if (enrichers.firstAccessibleAncestor) {
          this._navigate({ detail: { doc: enrichers.firstAccessibleAncestor, docAction } });
        } else if (enrichers.breadcrumb) {
          const { entries } = enrichers.breadcrumb;
          if (entries.length > 1) {
            this._navigate({ detail: { doc: entries[entries.length - 2], docAction } });
          }
        }
      }
      this._refreshSearch();
    }
  },

  _documentUntrashed(e) {
    this._toast(this.i18n(`app.document.untrashed.${e.detail.error ? 'error' : 'success'}`));
    if (e.detail.doc && !e.detail.error) {
      this._navigate({ detail: { doc: e.detail.doc } });
      this._refreshSearch();
    }
  },

  _documentsDeleted(e) {
    if (e.detail.error) {
      const docs = e.detail.documents;
      let msg = this.i18n(docs && docs.length > 1 ? 'app.documents.deleted.error' : 'app.document.deleted.error');
      if (e.detail.error.response.status === 403) {
        msg = `${msg} ${this.i18n('error.403')}`;
      }
      this._toast(msg);
    } else {
      this._removeFromClipboard(e.detail.documents);
      this._removeFromRecentlyViewed(e.detail.documents);
      this._fetchTaskCount();
      this._toast(this.i18n('app.documents.deleted.success'));
      this._refreshSearch();
    }
  },

  _documentsUntrashed(e) {
    this._toast(this.i18n(`app.documents.untrashed.${e.detail.error ? 'error' : 'success'}`));
    this._refreshSearch();
  },

  _documentFileDeleted() {
    this._toast(this.i18n('app.document.fileDeleted'));
    this.fire('document-updated');
  },

  _themeChanged() {
    this._toast(this.i18n('themes.applying'));
    window.location.reload();
  },

  _handleDocumentCreated(e) {
    if (!e.detail.response.entries || e.detail.response.entries.length === 1) {
      const doc = e.detail.response.entries ? e.detail.response.entries[0] : e.detail.response;
      this._toast(this.i18n('app.createdDocument', `${this.formatDocType(doc.type)} ${doc.title}`));
    } else {
      this._toast(this.i18n('app.createdDocuments', e.detail.response.entries.length));
    }
  },

  _documentsDropped(e) {
    if (this.hasFacet(e.detail.targetDocument, 'Collection')) {
      this._addDocumentsToCollection(e.detail.documents, e.detail.targetDocument);
    } else {
      this._moveDocumentsToContainer(e.detail.documents, e.detail.targetDocument);
    }
  },

  _moveDocumentsToContainer(documents, target) {
    this.$.moveDocumentsOp.op = 'Document.Move';
    this.$.moveDocumentsOp.params = { target: target.uid };
    this.$.moveDocumentsOp.input = `docs:${documents.map((doc) => doc.uid).join(',')}`;
    this.$.moveDocumentsOp.execute().then(() => {
      this.fire('document-updated');
      this._toast(this.i18n('app.documents.moved', documents.length, target.title));
    });
  },

  _addDocumentsToCollection(documents, target) {
    this.$.moveDocumentsOp.op = 'Document.AddToCollection';
    this.$.moveDocumentsOp.params = { collection: target.uid };
    this.$.moveDocumentsOp.input = `docs:${documents.map((doc) => doc.uid).join(',')}`;
    this.$.moveDocumentsOp.execute().then(() => {
      this.fire('document-updated');
      this._toast(
        this.i18n(documents.length === 1 ? 'app.document.addedToCollection' : 'app.documents.addedToCollection'),
      );
    });
  },

  _errorUrl() {
    return window.location.href;
  },

  _onError(e) {
    this.showError(e.detail.code, e.detail.message, this._errorUrl());
  },

  _logout() {
    return `${this.$.nxcon.url}/logout`;
  },

  _pageChanged(page, oldPage) {
    if (page !== null) {
      let el = this.$.pages.selectedItem;
      // selectItem might be undefined
      // https://github.com/PolymerElements/iron-pages/issues/52
      if (!el) {
        el = dom(this.$.pages).querySelector(`[name=${page}]`);
      }
      if (!el) {
        this.showError(404, '', page);
        return;
      }
      // if we are switching from a previous page, then we need to remove the performance listener from it
      // and create a mark to be used for next measurements
      if (oldPage !== undefined) {
        const oldPageEl = dom(this.$.pages).querySelector(`[name=${oldPage}]`);
        oldPageEl.removeEventListener('dom-change', this.__performanceListener);
        Performance.markUnique('nuxeo-app.page-changed');
      }
      // add performance listener to current page to track the last dom-change event
      this.__performanceListener = function() {
        const name = `${el.tagName.toLocaleLowerCase()}.dom-changed`;
        // a measure will be performed from the last page switch or, if this is the first page load,
        // from when navigation started to the current moment
        const mark = performance.getEntriesByName('nuxeo-app.page-changed', 'mark').pop();
        Performance.measureUnique(name, mark && mark.name);
        Performance.markUnique('nuxeo-app.page-loaded');
      };
      el.addEventListener('dom-change', this.__performanceListener);
      this.loading = true;
      // check if page is already registered (vulcanized)
      if (!(el instanceof PolymerElement)) {
        const tag = el.tagName.toLowerCase();
        importHref(
          this.resolveUrl(`${tag}.html`),
          this._loadElements.bind(this),
          () => {
            this.showError(404, '', `${tag}.html`);
          },
          true,
        );
      } else {
        // load elements if navigating directly to pages which are not lazy loaded (e.g. searches)
        this._loadElements();
      }
    }
  },

  _loadElements() {
    afterNextRender(this, () => {
      import(/* webpackChunkName: "elements" */ './elements.js').then(() => {
        this.loading = false;
      });
    });
  },

  _notify(e) {
    const options = e.detail;
    if (options.close) {
      this.$.toast.close();
    }
    if (options.message) {
      this.$.toast.text = options.message;
      this.$.toast.duration = options.duration !== undefined ? options.duration : 3000;
      this.set('_dismissible', !!options.dismissible);
      this.$.toast.open();
    }
  },

  _dismissToast() {
    this.$.toast.toggle();
  },

  _clipboardUpdated(e) {
    this.clipboard = this.clipboard || this.$$('#clipboard');
    this.set('clipboardDocCount', e.detail.docCount);
  },

  _removeFromClipboard(docs) {
    if (Array.isArray(docs)) {
      docs.forEach((doc) => {
        this.clipboard.remove(doc);
      });
    }
  },

  _removeFromRecentlyViewed(docs) {
    if (Array.isArray(docs)) {
      const recent = this.$$('#recent');
      if (recent) {
        docs.forEach((doc) => {
          recent.remove(doc);
        });
      }
    }
  },

  _computeEnrichers() {
    return Nuxeo.UI && Nuxeo.UI.config && Nuxeo.UI.config.enrichers;
  },

  _computeHeaders() {
    const headers = {
      'translate-directoryEntry': 'label',
    };

    const fetch = (Nuxeo.UI && Nuxeo.UI.config && Nuxeo.UI.config.fetch) || {};

    // add required fetchers
    const required = { document: ['lock'], directoryEntry: ['parent'], task: ['actors'] };

    Object.keys(required).forEach((k) => {
      fetch[k] = fetch[k] || [];
      required[k].forEach((v) => {
        if (!fetch[k].includes(v)) {
          fetch[k].push(v);
        }
      });
    });

    // generate fetch headers
    Object.keys(fetch).forEach((f) => {
      headers[`fetch-${f}`] = fetch[f].join(',');
    });

    return headers;
  },
});

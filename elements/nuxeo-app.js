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
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import { FiltersBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import { PageProviderDisplayBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-page-provider-display-behavior.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { UploaderBehavior } from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-uploader-behavior.js';
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
import './nuxeo-results/nuxeo-document-content-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import './nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import './nuxeo-browser/nuxeo-breadcrumb.js';
import './nuxeo-recent-documents/nuxeo-recent-documents.js';
import '../i18n/i18n.js';
import '../themes/base.js';
import '../themes/loader.js';
import './nuxeo-search-page.js';
import './search/nuxeo-search-form.js';
// import './nuxeo-admin/nuxeo-user-group-management-page.js';
import './nuxeo-mobile/nuxeo-mobile-banner.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href.js';

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

// expose behaviors for compat
Nuxeo.I18nBehavior = I18nBehavior;
Nuxeo.RoutingBehavior = RoutingBehavior;
Nuxeo.LayoutBehavior = LayoutBehavior;
Nuxeo.FiltersBehavior = FiltersBehavior;
Nuxeo.PageProviderDisplayBehavior = PageProviderDisplayBehavior;
Nuxeo.UploaderBehavior = UploaderBehavior;
Nuxeo.FormatBehavior = FormatBehavior;

// Export Polymer and PolymerElement for 1.x and 2.x compat
window.Polymer = Polymer;
window.PolymerElement = PolymerElement;
window.importHref = importHref;

// inspired by https://github.com/treosh/uxm
export const Performance = {
  /** metrics * */

  getFirstPaint() {
    if (typeof PerformancePaintTiming !== 'undefined') {
      const fp = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-paint');
      return fp ? Math.round(fp.startTime) : null;
    }
    // fallback for Edge and FF if dom.performance.time_to_non_blank_paint.enabled:true
    const fpt = performance.timing.timeToNonBlankPaint || performance.timing.msFirstPaint;
    return fpt ? fpt - performance.timing.fetchStart : null;
  },

  getFirstContentfulPaint() {
    if (typeof PerformancePaintTiming === 'undefined') {
      return null;
    }
    const fcp = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : null;
  },

  getOnLoad() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.loadEventEnd - performance.timing.fetchStart;
  },

  getDomContentLoaded() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.domContentLoadedEventEnd - performance.timing.fetchStart;
  },

  /** optional metrics * */

  getDeviceType(ua) {
    // get device type
    // based on https://github.com/matthewhudson/current-device/blob/master/src/index.js
    // returns “phone”, “tablet”, or “desktop”
    ua = (ua || this.getUserAgent()).toLowerCase();
    const find = function(str) {
      return ua.indexOf(str) !== -1;
    };

    // windows
    const isWindows = find('windows');
    const isWindowsPhone = isWindows && find('phone');
    const isWindowsTablet = isWindows && (find('touch') && !isWindowsPhone);

    // ios
    const isIphone = !isWindows && find('iphone');
    const isIpod = find('ipod');
    const isIpad = find('ipad');

    // android
    const isAndroid = !isWindows && find('android');
    const isAndroidPhone = isAndroid && find('mobile');
    const isAndroidTablet = isAndroid && !find('mobile');

    // detect device
    const isPhone = isAndroidPhone || isIphone || isIpod || isWindowsPhone;
    const isTablet = isIpad || isAndroidTablet || isWindowsTablet;
    if (isPhone) {
      return 'phone';
    }
    return isTablet ? 'tablet' : 'desktop';
  },

  getEffectiveConnectionType() {
    const conn =
      typeof navigator !== 'undefined'
        ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
        : null;
    return conn ? conn.effectiveType : null;
  },

  getUrl() {
    return window.location.href;
  },

  getUserAgent() {
    return window.navigator.userAgent;
  },

  getUserTiming() {
    if (!performance || typeof PerformanceMark === 'undefined') {
      return null;
    }
    const marks = performance.getEntriesByType('mark').map((mark) => {
      return { type: 'mark', name: mark.name, startTime: Math.round(mark.startTime) };
    });
    const measures = performance.getEntriesByType('measure').map((measure) => {
      return {
        type: 'measure',
        name: measure.name,
        startTime: Math.round(measure.startTime),
        duration: Math.round(measure.duration),
      };
    });
    return marks.concat(measures);
  },

  getResources() {
    if (!performance || typeof PerformanceResourceTiming === 'undefined') {
      return null;
    }
    return performance
      .getEntriesByType('navigation')
      .concat(performance.getEntriesByType('resource'))
      .map((entry) => {
        return {
          url: entry.name,
          type: entry.initiatorType,
          transfered: entry.transferSize,
          size: entry.decodedBodySize,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
        };
      });
  },

  getLongTasks() {
    if (typeof window.__lt === 'undefined') {
      return null;
    }
    return window.__lt.e.map((longTask) => {
      return {
        startTime: Math.round(longTask.startTime),
        duration: Math.round(longTask.duration),
      };
    });
  },

  getNetworkStats() {
    const resources = this.getResources();
    const lastResource = this.getResources()
      .sort((a, b) => a.startTime > b.startTime)
      .pop();
    return {
      finish: lastResource && lastResource.startTime + lastResource.duration,
      requestCount: resources.length,
      transferSize: resources.map((resource) => resource.transfered).reduce((a, b) => a + b),
      size: resources.map((resource) => resource.size).reduce((a, b) => a + b),
    };
  },

  /** reporting * */

  mark(...args) {
    if (performance && performance.mark) {
      performance.mark(...args);
    }
  },

  clearMarks(...args) {
    if (performance && performance.clearMarks) {
      performance.clearMarks(...args);
    }
  },

  markUnique(...args) {
    this.clearMarks(args[0]);
    this.mark(...args);
  },

  measure(...args) {
    if (performance && performance.measure) {
      // temporary fix for Edge: https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/4933422/
      performance.measure(...Array.from(args).filter(Boolean));
    }
  },

  clearMeasures(...args) {
    if (performance && performance.clearMarks) {
      performance.clearMeasures(...args);
    }
  },

  measureUnique(...args) {
    this.clearMeasures(args[0]);
    this.measure(...args);
  },

  report(options) {
    if (typeof options === 'undefined') {
      options = {};
    }
    const result = {
      domContentLoaded: this.getDomContentLoaded(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      firstPaint: this.getFirstPaint(),
      onLoad: this.getOnLoad(),
      userAgent: this.getUserAgent(),
      userTiming: this.getUserTiming(),
    };
    if (options.deviceType || options.all) {
      result.deviceType = this.getDeviceType();
    }
    if (options.effectiveConnectionType || options.all) {
      result.effectiveConnectionType = this.getEffectiveConnectionType();
    }
    if (options.url || options.all) {
      result.url = this.getUrl();
    }
    if (options.longTasks || options.all) {
      result.longTasks = this.getLongTasks();
    }
    if (options.resources || options.all) {
      result.resources = this.getResources();
    }
    if (options.networkStats || options.all) {
      result.networkStats = this.getNetworkStats();
    }
    return result;
  },
};

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
        --paper-drawer-panel-left-drawer-container: {
          z-index: 100;
        }
        --paper-drawer-panel-scrim: {
          z-index: 2;
        }
        top: var(--nuxeo-app-top);
        height: calc(100% - var(--nuxeo-app-top));
      }

      paper-header-panel {
        --paper-header-panel-container: {
          -webkit-overflow-scrolling: unset; /* NXP-24576: fix for selection toolbar on iOS */
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
      }

      #logo:hover img {
        background: rgba(0, 0, 0, 0.2);
        color: var(--nuxeo-sidebar-menu-hover);
      }

      #logo:hover img {
        filter: brightness(110%);
        -webkit-filter: brightness(110%);
      }

      #menu .profile-icon,
      #menu .admin-icon {
        position: fixed;
        height: 48px;
        bottom: 0;
        left: 0;
      }

      #menu .admin-icon {
        bottom: 48px;
      }

      @media (max-width: 1024px), (max-height: 700px) {
        #menu .profile-icon,
        #menu .admin-icon {
          position: relative;
          bottom: auto;
        }
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
        width: 294px;
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
    </style>

    <nuxeo-offline-banner message="[[i18n('app.offlineBanner.message')]]"></nuxeo-offline-banner>

    <nuxeo-expired-session message="[[i18n('app.expiredSession.message')]]"></nuxeo-expired-session>

    <nuxeo-connection id="nxcon" user="{{currentUser}}" url="{{url}}"></nuxeo-connection>

    <nuxeo-document id="doc" doc-id="[[docId]]" doc-path="[[docPath]]" response="{{currentDocument}}"></nuxeo-document>

    <nuxeo-sardine hidden></nuxeo-sardine>

    <nuxeo-operation id="userWorkspace" op="User.GetUserWorkspace"></nuxeo-operation>
    <nuxeo-operation id="moveDocumentsOp" sync-indexing></nuxeo-operation>

    <nuxeo-resource id="tasks" path="/task" headers='{"X-NXfetch.task": "targetDocumentIds,actors"}'></nuxeo-resource>
    <nuxeo-resource
      id="task"
      path="/task/[[currentTaskId]]"
      headers='{"X-NXfetch.document": "properties", "X-NXfetch.task": "targetDocumentIds,actors"}'
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
        <a id="logo" href$="[[urlFor('home')]]">
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
          <nuxeo-slot slot="DRAWER_ITEMS" model="[[actionContext]]"></nuxeo-slot>
          <nuxeo-menu-icon
            name="administration"
            icon="nuxeo:admin"
            label="app.administration"
            class="admin-icon"
            hidden$="[[!_hasAdministrationPermissions(currentUser)]]"
          >
          </nuxeo-menu-icon>
          <nuxeo-menu-icon
            name="profile"
            src="[[currentUser.contextParameters.userprofile.avatar.data]]"
            icon="nuxeo:user-settings"
            label="app.account"
            class="profile-icon"
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
            <nuxeo-slot slot="DRAWER_PAGES" model="[[actionContext]]"></nuxeo-slot>

            <template is="dom-if" if="[[_hasAdministrationPermissions(currentUser)]]">
              <div name="administration">
                <div class="header">[[i18n('app.administration')]]</div>
                <iron-selector selected="{{selectedAdminTab}}" attr-for-selected="name">
                  <nuxeo-slot slot="ADMINISTRATION_MENU" model="[[actionContext]]"></nuxeo-slot>
                </iron-selector>
              </div>
            </template>

            <div name="profile" class="layout vertical">
              <div class="header">[[_displayUser(currentUser)]]</div>
              <iron-selector selected="{{selectedProfileTab}}" attr-for-selected="name">
                <nuxeo-slot slot="USER_MENU" model="[[actionContext]]"></nuxeo-slot>
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
          <nuxeo-slot slot="PAGES" model="[[actionContext]]"></nuxeo-slot>

          <nuxeo-home name="home" tasks="[[tasks]]"></nuxeo-home>

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

          <nuxeo-tasks id="tasks-dashboard" name="tasks" tasks="[[tasks]]" current="[[currentTask]]"></nuxeo-tasks>

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
  behaviors: [RoutingBehavior, I18nBehavior, FiltersBehavior],
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

    tasks: Array,

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
        '_actionContext(currentDocument, currentUser, tasks, currentTask, taskCount,' +
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

  observers: ['_computeSharedActionContext(currentUser)'],

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

    // NXP-25311: stop loading bar if an error occures
    window.onerror = function() {
      this.loading = false;
    }.bind(this);

    this.removeAttribute('unresolved');

    Performance.mark('nuxeo-app.ready');
  },

  refresh() {
    if ((this.docPath && this.docPath.length > 0) || (this.docId && this.docId.length > 0)) {
      this.load('browse', this.docId, this.docPath, this.docAction);
    } else {
      this.navigateTo('page');
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
            this._fetchTasks();
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

  load(page, id, path, action) {
    this.loading = true;
    this.docId = id;
    this.docPath = path;
    this.docAction = action;
    this.$.doc.headers = this._computeHeaders();
    this.$.doc.enrichers = this._computeEnrichers();
    this.$.doc
      .get()
      .then((doc) => {
        if (this.docId && !doc.isVersion) {
          this.docId = '';
          this.docPath = doc.path;
        }
        const recent = this.$$('#recent');
        if (recent && !doc.isTrashed) {
          if (recent.contains(doc)) {
            recent.update(doc);
          } else {
            recent.add(doc);
          }
        }
        this.currentParent = this.hasFacet(doc, 'Folderish')
          ? doc
          : doc.contextParameters.breadcrumb.entries.slice(-2, -1)[0];
        this.set('currentDocument', doc);
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
    this._updateTitle();
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
      tasks: this.tasks,
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
      this.navigateTo('browse', e.detail.doc.path);
      if (e.detail.isFromCollection) {
        this.$$('#collectionsForm').displayMembers(e.detail.srcDoc, e.detail.index);
      }
    }
  },

  // lookup the search
  _updateSearch() {
    this.searchForm = this.$$(`[search-name='${this.searchName}']`);
    if (this.searchForm && this._searchOnLoad) {
      this.searchForm._search();
      this._searchOnLoad = false;
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
    if (e.detail.provider) {
      this.$$('#collectionsForm').loadCollection(e.detail.collection, e.detail.provider);
    }
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

  _fetchTasks() {
    this.$.tasks.params = { userId: this.currentUser.id };
    this.$.tasks.get().then((response) => {
      this.tasks = response.entries;
      this.taskCount = this.tasks.length;
    });
  },

  _refreshAndFetchTasks() {
    // let's refresh the current document since it might have been changed (ex: state and version)
    this.refresh();
    this._fetchTasks();
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

  _observeCurrentUser() {
    if (this.currentUser) {
      this.$.userWorkspace.execute().then((response) => {
        this.userWorkspace = response.path;
      });
      this._fetchTasks();
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
  },

  _documentUnlocked() {
    this._toast(this.i18n('app.document.unlocked'));
  },

  _documentDeleted(e) {
    this._toast(this.i18n(`app.document.deleted.${e.detail.error ? 'error' : 'success'}`));
    // navigate to parent
    if (!e.detail.error) {
      this._removeFromClipboard([e.detail.doc]);
      this._removeFromRecentlyViewed([e.detail.doc]);
      const enrichers = e.detail.doc.contextParameters;
      if (enrichers) {
        if (enrichers.firstAccessibleAncestor) {
          this._navigate({ detail: { doc: enrichers.firstAccessibleAncestor } });
        } else if (enrichers.breadcrumb) {
          const { entries } = enrichers.breadcrumb;
          if (entries.length > 1) {
            this._navigate({ detail: { doc: entries[entries.length - 2] } });
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
      this._fetchTasks();
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
      this._toast(this.i18n('app.createdDocument', `${doc.type.toLowerCase()} ${doc.title}`));
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

  _hasAdministrationPermissions(user) {
    return user.isAdministrator || this.isMember(user, 'powerusers');
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

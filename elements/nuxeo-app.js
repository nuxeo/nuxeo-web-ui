/**
@license
©2026 Hyland Software, Inc. and its affiliates. All rights reserved. 
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

import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-elements/nuxeo-operation.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { config } from '@nuxeo/nuxeo-elements';
import '@nuxeo/nuxeo-ui-elements/nuxeo-filter.js';
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
import { NuxeoAppDrawerResizeBehavior } from './behaviors/nuxeo-app-drawer-resize-behavior.js';
import { NuxeoAnonymousBehavior } from './behaviors/nuxeo-anonymous-behavior.js';
import { NuxeoInactivityBehavior } from './behaviors/nuxeo-inactivity-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-page-provider.js';
import '@nuxeo/nuxeo-elements/nuxeo-task-page-provider.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-resize-handle.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import '@material/mwc-snackbar';
import './nuxeo-browser/nuxeo-breadcrumb.js';
import './nuxeo-browser/nuxeo-repositories.js';
import './nuxeo-document-storage/nuxeo-document-storage.js';
import './nuxeo-results/nuxeo-results.js';
import '../i18n/i18n.js';
import '../themes/base.js';
import { getValidTheme } from '../themes/loader.js';
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
const MAX_TOASTS = 3; // max number of toasts that can be displayed simultaneously besides the default one
// Gap between clearing and refilling the live region. A synchronous clear/set pair is coalesced into a
// single mutation, so without it a repeated message would not be announced again.
const ARIA_ANNOUNCE_DELAY_MS = 150;
// Gap between two consecutive messages, so each one lands as its own mutation and is queued by the
// screen reader in order rather than overwriting the one before it.
const ANNOUNCE_SPACING_MS = 500;
// A long-running bulk operation reports progress every second; cap the backlog so those updates cannot
// pile up faster than they are spoken. The newest messages are the ones worth keeping.
const MAX_QUEUED_ANNOUNCEMENTS = 3;
const ANNOUNCER_ID = 'nuxeo-toast-announcer';

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
        --app-header-background-rear-layer: {
          -webkit-overflow-scrolling: auto;
        };
      }

      /* Layout base */
      app-drawer-layout {
        display: flex;
        flex-direction: row;
      }

      /* Drawer */
      app-drawer {
        top: var(--nuxeo-app-top, 0);
        bottom: var(--nuxeo-app-bottom, 0);
        height: calc(100% - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
      }

      /* Main content */
      app-header-layout {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        background: var(--nuxeo-page-background);
        height: 100%;
        overflow: hidden;
      }

      main {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow: auto;

        /*
         * The document create button floats over the bottom-right corner of this area, so the end
         * of a scrollable page always sits underneath it. That is barely noticeable at 100% zoom
         * but costs half the viewport once the page reflows (400% zoom of 1280px leaves 320x256
         * CSS px), leaving the last rows unreachable. Publish the strip the button covers so page
         * content regions can reserve it and every row can be scrolled clear of the button.
         */
        --nuxeo-page-content-safe-area-bottom: var(--nuxeo-document-create-button-safe-area);
      }

      /* logo */
      #logo {
        position: fixed;
        width: var(--nuxeo-sidebar-width);
        height: var(--nuxeo-drawer-header-height, 53px);
        top: var(--nuxeo-app-top);
        z-index: 102;
        box-sizing: border-box;
        background-color: var(--nuxeo-sidebar-background);
        display: block;
      }

      :host([dir='ltr']) #logo {
        left: 0;
        right: auto;
      }

      #logo img {
        width: var(--nuxeo-sidebar-width);
        height: var(--nuxeo-drawer-header-height, 53px);
      }

      :host([dir='rtl']) #logo {
        right: 0px;
        height: var(--nuxeo-drawer-header-height, 53px);
        left: auto;
      }

      /* NXENG-527: Single scrollable container for home shortcut and menu below the pinned logo.
         Prevents scrollbar overlap by keeping it within the column boundary. */
      #menuContainer {
        position: fixed;
        top: calc(var(--nuxeo-app-top, 0px) + var(--nuxeo-drawer-header-height, 53px));
        height: calc(
          100vh - var(--nuxeo-drawer-header-height, 53px) - (var(--nuxeo-app-top, 0px) + var(--nuxeo-app-bottom, 0px))
        );
        width: var(--nuxeo-sidebar-width);
        z-index: 100;
        box-sizing: border-box;
        overflow-x: hidden;
        overflow-y: auto;
        background-color: var(--nuxeo-sidebar-background);
        display: flex;
        flex-direction: column;
      }

      :host([dir='ltr']) #menuContainer {
        left: 0;
        right: auto;
      }

      :host([dir='rtl']) #menuContainer {
        right: 0;
        left: auto;
      }

      /* NXENG-527: home shortcut positioned outside paper-listbox (navigation only, no drawer)
         but inside scroll area with other icons. */
      .home-link {
        position: relative;
        width: var(--nuxeo-sidebar-width);
        flex-shrink: 0;
        margin-top: 43px;
        background-color: var(--nuxeo-sidebar-background);
        display: block;
        text-decoration: none;
      }

      /* menu */
      #menu {
        @apply --nuxeo-sidebar;
        position: relative;
        width: var(--nuxeo-sidebar-width);
        z-index: 100;
        padding: 0;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
      }

      #menu nuxeo-menu-icon {
        flex-shrink: 0;
      }

      /* Apply margin-top: auto to all settings and then reset them, except the first one */
      #menu > .settings {
        margin-top: auto;
      }

      #menu > .settings ~ .settings {
        margin: 0;
        order: 1;
      }

      #drawer-pages {
        width: 100%;
      }

      @media (max-width: 1024px), (max-height: 700px) {
        #drawer .toggle {
          display: none;
        }
      }

      #drawer {
        position: relative;
        box-sizing: border-box;
        height: 100%;
        overflow: visible;
        width: var(--app-drawer-width, 350px);
        transition: width 0.3s ease;
        /* Drawer separator border (Hyland themes) or none for classic theme */
        border-right: var(--hyland-drawer-separator-border, none);
      }
      /* NXENG-527: mirror the separator for RTL layouts. */
      :host([dir='rtl']) #drawer {
        border-right: none;
        border-left: var(--hyland-drawer-separator-border, none);
      }

      /* Disable transition while the user is actively dragging the drawer resize handle */
      :host([drawer-resizing]) #drawer {
        transition: none;
      }

      #drawer .toggle {
        position: absolute;
        right: -16px;
        top: 0;
        width: 16px;
        height: 100%;
        cursor: pointer;
        z-index: 10;
      }

      :host([dir='rtl']) #drawer .toggle {
        left: -16px;
        right: auto;
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
        visibility: visible !important;
      }

      :host([drawer-resizing]) {
        cursor: ew-resize;
        user-select: none;
      }

      #drawer iron-pages {
        @apply --layout-vertical;
        color: var(--nuxeo-drawer-text);
        width: calc(100% - var(--nuxeo-sidebar-width));
        height: calc(100vh - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
        margin-left: var(--nuxeo-sidebar-width);
        /* NXENG-527: the secondary nav (all drawer pages) shares the main content surface on Hyland
           themes; classic falls back to the original drawer background. */
        background-color: var(--hyland-page-surface-background, var(--nuxeo-drawer-background));
      }

      :host([dir='rtl']) #drawer iron-pages {
        margin-right: var(--nuxeo-sidebar-width);
        margin-left: 0;
      }

      #drawer nuxeo-menu-item {
        @apply --nuxeo-sidebar-item-theme;
        --nuxeo-menu-item-link {
          @apply --nuxeo-sidebar-item-link;
        }
        /* NXENG-527: hover/selected styling now lives inside nuxeo-menu-item (via --hyland-drawer-item /
           --hyland-drawer-item-selected), so drop the drawer-level pill border here. */
        border: none !important;
      }

      /* NXENG-527: secondary-nav section header (Administration, user settings/profile). */
      .header h5 {
        @apply --hyland-section-header;
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

      #drawerToggle svg,
      #drawerToggle g,
      #drawerToggle path {
        tabindex: -1;
      }

      :host([dir='rtl']) #drawerToggle {
        right: 6px;
      }

      nuxeo-document-create-button.admin {
        display: none;
      }

      /* The create button is hidden on the administration page, so nothing has to be reserved there. */
      nuxeo-admin {
        --nuxeo-page-content-safe-area-bottom: 0px;
      }

      #snackbarPanel {
        position: absolute;
        bottom: 0;
        left: 0px;
        display: flex;
        flex-direction: column-reverse;
        margin-left: 50px;
      }

      :host([dir='rtl']) #snackbarPanel {
        left: auto;
        right: 0px;
        margin-right: 50px;
        margin-left: 0px;
      }

      mwc-snackbar {
        position: relative !important;
        left: 0 !important;
        top: 0 !important;
        z-index: 103;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: white;
        --mdc-typography-body2-font-size: 14px;
      }

      :host([dir='rtl']) mwc-snackbar {
        right: 0 !important;
        left: auto !important;
      }

      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: lightgrey;
        border: 1px dotted gray;
        color: #000;
        padding: 8px 16px;
        z-index: 1000;
        text-decoration: none;
        transition: top 0.2s ease;
      }

      .skip-link:focus {
        top: 0;
      }

      .skip-link:hover {
        outline: none;
        text-decoration: none;
      }

      main {
        outline: none;
      }

      main:focus-visible {
        outline: 2px solid #0a84ff;
        outline-offset: -3px;
      }

      /* Safari fallback */
      main:focus {
        outline: 2px solid #0a84ff;
        outline-offset: -3px;
      }

      /* Hide Safari fallback outline unless keyboard tabbing */
      main:not(.user-is-tabbing):focus {
        outline: none;
      }
    </style>
    <header role="banner">
      <a href="#mainContent" id="skipLink" class="skip-link">[[i18n('app.skiptoMainContent.message')]]</a>
      <nuxeo-suggester id="suggester"></nuxeo-suggester>

      <nuxeo-offline-banner message="[[i18n('app.offlineBanner.message')]]"></nuxeo-offline-banner>

      <nuxeo-expired-session message="[[i18n('app.expiredSession.message')]]"></nuxeo-expired-session>
    </header>
    <nuxeo-connection id="nxcon" user="{{currentUser}}" url="{{url}}"></nuxeo-connection>

    <!-- WEBUI-1987: lightweight authenticated request used to renew the server HTTP session while the
         user is active (session.timeout is the server session timeout, which plain client activity would
         not otherwise keep alive). -->
    <nuxeo-resource id="keepAlive" path="me"></nuxeo-resource>

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

    <app-drawer-layout id="drawerPanel" fullbleed responsive-width="720px">
      <!-- Drawer -->
      <aside>
        <app-drawer
          id="drawerMenu"
          swipe-open
          align$="[[_drawerAlign(_isRTL)]]"
          opened="{{drawerOpened}}"
          hidden$="[[isDrawerHidden(isNarrow, drawerOpened)]]"
        >
          <div role="list">
            <!-- Logo: decorative only, home navigation handled by menu shortcut below -->
            <div id="logo">
              <img src$="[[_logo(baseUrl)]]" alt="[[i18n('accessibility.logo')]]" />
            </div>

            <!-- Scrollable container for home shortcut and menu (below pinned logo) -->
            <div id="menuContainer">
              <!-- Home shortcut: placed outside paper-listbox to navigate home without triggering
                   the secondary-nav drawer. Focus and activation are managed by nuxeo-menu-icon. -->
              <nuxeo-menu-icon
                class="home-link"
                name="home"
                route="home"
                icon="nuxeo:home"
                label="app.home"
                on-click="_resetTaskSelection"
              ></nuxeo-menu-icon>

              <!-- menu -->
              <paper-listbox
                id="menu"
                selected="{{selectedTab}}"
                attr-for-selected="name"
                selected-class="selected"
                on-iron-activate="_toggleDrawer"
                aria-label$="[[i18n('app.drawer')]]"
                aria-expanded="[[drawerOpened]]"
                on-keyup="_toggleDrawer"
              >
                <nuxeo-slot name="DRAWER_ITEMS" model="[[actionContext]]"></nuxeo-slot>
                <nuxeo-menu-icon
                  name="administration"
                  icon="nuxeo:admin"
                  label="app.administration"
                  class="settings"
                  hidden$="[[!hasAdministrationPermissions(currentUser)]]"
                ></nuxeo-menu-icon>
                <nuxeo-menu-icon
                  name="profile"
                  src="[[currentUser.contextParameters.userprofile.avatar.data]]"
                  icon="nuxeo:user-settings"
                  label="app.account"
                  class="settings"
                ></nuxeo-menu-icon>
              </paper-listbox>
            </div>

            <!-- drawer content -->
            <div id="drawer" style="width: {{drawerWidth}}">
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
                    <div class="header">
                      <h5>[[i18n('app.administration')]]</h5>
                    </div>
                    <iron-selector selected="{{selectedAdminTab}}" attr-for-selected="name">
                      <nuxeo-slot name="ADMINISTRATION_MENU" model="[[actionContext]]"></nuxeo-slot>
                    </iron-selector>
                  </div>
                </template>

                <div name="profile" class="layout vertical">
                  <div class="header">
                    <h5>[[_displayUser(currentUser)]]</h5>
                  </div>
                  <iron-selector selected="{{selectedProfileTab}}" attr-for-selected="name">
                    <nuxeo-slot name="USER_MENU" model="[[actionContext]]"></nuxeo-slot>
                    <nuxeo-menu-item name="logout" label="app.user.signOut" link="[[_logout(url)]]"></nuxeo-menu-item>
                  </iron-selector>
                </div>
              </iron-pages>

              <div class="toggle" on-tap="_closeDrawer" hidden$="[[!drawerOpened]]">
                <iron-icon icon="[[toggleChevronIcon]]"></iron-icon>
              </div>

              <nuxeo-resize-handle
                id="drawerResizeHandle"
                edge="end"
                dir$="[[_resizeHandleDir(_isRTL)]]"
                label-key="app.drawer.resize"
                tooltip-position$="[[_drawerResizeTooltipPosition(_isRTL)]]"
                hidden$="[[_drawerResizeHidden]]"
                aria-value-min="[[_drawerResizeAriaMin]]"
                aria-value-max="[[_drawerResizeAriaMax]]"
                aria-value-now="[[_drawerResizeAriaNow]]"
                on-resize-step="_onDrawerResizeStep"
                on-resize-bound="_onDrawerResizeBound"
                on-resize-reset="_onDrawerResizeReset"
                on-resize-drag-start="_onDrawerResizeDragStart"
                on-resize-drag="_onDrawerResizeDrag"
                on-resize-drag-end="_onDrawerResizeDragEnd"
              ></nuxeo-resize-handle>
            </div>
          </div>
        </app-drawer>
      </aside>
      <!-- Main content -->
      <app-header-layout>
        <app-header reveals effects="waterfall">
          <app-toolbar>
            <paper-icon-button
              id="drawerToggle"
              icon="menu"
              on-tap="_openDrawer"
              hidden$="[[!isNarrow]]"
              aria-label$="[[i18n('command.menu')]]"
              tabindex="-1"
            ></paper-icon-button>
          </app-toolbar>
        </app-header>

        <main id="mainContent" tabindex="-1">
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
        </main>
      </app-header-layout>
    </app-drawer-layout>

    <!-- new app layout ends -->

    <nuxeo-document-create-button class$="[[page]]" parent="[[currentParent]]"></nuxeo-document-create-button>
    <nuxeo-document-create-popup
      id="importPopup"
      parent="[[currentParent]]"
      default-path="/"
    ></nuxeo-document-create-popup>

    <nuxeo-progress-indicator visible="[[loading]]"></nuxeo-progress-indicator>

    <!-- vertical panel to display multiple notifications -->
    <div id="snackbarPanel">
      <mwc-snackbar id="toast" leading>
        <paper-icon-button id="abort" slot="action" hidden></paper-icon-button>
        <paper-icon-button id="copy" icon="icons:content-copy" slot="action" hidden></paper-icon-button>
        <paper-icon-button
          id="dismiss"
          slot="dismiss"
          icon="icons:close"
          hidden$="[[!_dismissible]]"
          aria-label$="[[i18n('command.close')]]"
        ></paper-icon-button>
      </mwc-snackbar>
    </div>

    <nuxeo-keys keys="/ ctrl+space s" on-pressed="_showSuggester"></nuxeo-keys>
    <nuxeo-keys keys="d" on-pressed="showHome"></nuxeo-keys>
    <nuxeo-keys keys="m" on-pressed="_focusMenu"></nuxeo-keys>

    <nuxeo-mobile-banner document="[[currentDocument]]" is-mobile="{{isMobile}}"></nuxeo-mobile-banner>
  `,

  is: 'nuxeo-app',
  behaviors: [
    RoutingBehavior,
    FormatBehavior,
    FiltersBehavior,
    NuxeoAppDrawerResizeBehavior,
    NuxeoAnonymousBehavior,
    NuxeoInactivityBehavior,
  ],
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

    sidebarWidth: {
      type: String,
    },

    drawerOpened: {
      type: Boolean,
      value: false,
      notify: true,
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

    _isRTL: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
      observer: '_directionChanged',
    },
    isNarrow: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
    },
  },

  listeners: {
    'document-updated': 'refresh',
    'create-document': '_showDocumentCreationWizard',
    'document-created': '_handleDocumentCreated',
    'nuxeo-shrink-drawer': '_onShrinkDrawerRequest',
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

  observers: [
    '_computeSharedActionContext(currentUser)',
    '_updateTitle(page, i18n, currentDocument, searchForm, currentTask, selectedAdminTab)',
    '_handleNarrowChange(isNarrow)',
  ],

  ready() {
    this.skipLinkEvent();
    this._checkRtl();
    this.homeToMenuNavigation();
    this._updateIsNarrow();

    const main = this.$.mainContent;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && main) {
        main.classList.add('user-is-tabbing');
      }
    });

    window.addEventListener('mousedown', () => {
      if (main) {
        main.classList.remove('user-is-tabbing');
      }
    });

    this._boundUpdateIsNarrow = () => this._updateIsNarrow();
    window.addEventListener('resize', this._boundUpdateIsNarrow);
    /** Handles {@link nuxeo-document-page}'s `nuxeo-layout-updated` (see ELEMENTS-1844 implementation strategy §3.4a). */
    this._onDescendantLayoutUpdated = () => this._notifyLayoutChanged();
    this.addEventListener('nuxeo-layout-updated', this._onDescendantLayoutUpdated);

    this.$.drawerMenu.opened = false; // close
    this.drawerWidth = this.sidebarWidth = getComputedStyle(this).getPropertyValue('--nuxeo-sidebar-width');
    this._drawerOpenWidth = this._loadStoredDrawerWidth();
    this._updateDrawerResizeAria();

    const { toast } = this.$;
    // HACK - by changing the position to relative, we can stack snackbars (and tweak the internal label)
    // HACK - hardcode the fixed width for the internal panel
    toast.addEventListener('MDCSnackbar:opening', () => {
      toast.mdcRoot.style.position = 'relative';
      toast.mdcRoot.querySelector('.mdc-snackbar__label').style.webkitFontSmoothing = 'auto';
      toast.mdcRoot.querySelector('.mdc-snackbar__surface').style.width = '344px';
      this._muteSnackbarLabel(toast);
    });

    // Create the live region up front: screen readers track regions that were present before the text
    // changed, and ignore one that appears already carrying its message.
    this._getAnnouncer();

    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason && e.reason.status === 404) {
        this.showError(404, e.reason.message, this._errorUrl());
      }
    });

    // NXP-25311: stop loading bar if an error occurs
    window.onerror = function () {
      this.loading = false;
    }.bind(this);

    this.removeAttribute('unresolved');

    // WEBUI-1987: wire the inactivity timer + 401->logout redirect once here (ready() always runs).
    // attached() only re-arms after a real detach (see _inactivityNeedsRearm), so the initial
    // ready()+attached() sequence does not issue a duplicate startup keep-alive or churn listeners.
    this._setupInactivityTimer();
    this._setupUnauthorizedRedirect();

    Performance.mark('nuxeo-app.ready');
    this.$.menu.addEventListener('keyup', (event) => {
      this._toggleDrawer(event, { detail: { selected: event.target.getAttribute('name') } });
    });

    // Remove interactive attributes from home link to fix accessibility issue.
    // PaperItemBehavior adds role/tabindex/aria-disabled to the host, but the inner <a>
    // already provides the interactive control. This causes nested-interactive violations
    // and double Tab stops. Strip these attributes to make the host a plain container.
    // The inner <a> carries its own aria-label (see nuxeo-menu-icon), so it stays named.
    const homeLink = this.shadowRoot?.querySelector('.home-link');
    if (homeLink) {
      homeLink.removeAttribute('tabindex');
      homeLink.removeAttribute('role');
      homeLink.removeAttribute('aria-disabled');
    }

    // fire resize event during drawer animation for elements that need to adapt to size changes (nuxeo-data-table etc)
    // Filter to transitions on the drawer element itself; descendant transitions
    // (e.g. resize-handle hover) bubble up and would otherwise spuriously start the resize loop.
    const { drawer } = this.$;
    drawer.addEventListener('transitionrun', (e) => {
      if (e.target === drawer) {
        this._resizeDuringAnimation();
      }
    });
    drawer.addEventListener('transitionstart', (e) => {
      if (e.target === drawer) {
        this._resizeDuringAnimation();
      }
    });
  },

  _resizeDuringAnimation() {
    // continuously fire resize during animation
    if (this._resizeLoop) {
      cancelAnimationFrame(this._resizeLoop);
    }

    const loop = () => {
      window.dispatchEvent(new Event('resize'));
      this._resizeLoop = requestAnimationFrame(loop);
    };

    // start loop
    this._resizeLoop = requestAnimationFrame(loop);

    // stop loop after animation completes, cleanup and do one final resize
    const { drawer } = this.$;
    drawer.addEventListener(
      'transitionend',
      () => {
        cancelAnimationFrame(this._resizeLoop);
        this._resizeLoop = null;
        // one final resize to settle everything
        window.dispatchEvent(new Event('resize'));
      },
      { once: true },
    );
  },

  // Arrow-key navigation between the home shortcut and the menu. Handlers are named methods
  // (not inline closures) so they can be unit-tested without firing key events at the listbox.
  homeToMenuNavigation() {
    const home = this.shadowRoot?.querySelector('.home-link');
    const { menu } = this.$;
    if (!home || !menu) {
      return;
    }
    // Retain the bound handlers so detached() can remove them and re-adding is idempotent.
    this._boundHomeShortcutKeydown = this._boundHomeShortcutKeydown || this._onHomeShortcutKeydown.bind(this);
    this._boundMenuEdgeKeydown = this._boundMenuEdgeKeydown || this._onMenuEdgeKeydown.bind(this);
    this._homeMenuNav = { home, menu };
    home.addEventListener('keydown', this._boundHomeShortcutKeydown);
    menu.addEventListener('keydown', this._boundMenuEdgeKeydown);
  },

  // Visible menu items, excluding hidden ones.
  _homeMenuVisibleItems() {
    const menu = this._homeMenuNav?.menu;
    if (!menu) {
      return [];
    }
    return Array.from(menu.querySelectorAll('nuxeo-menu-icon, [name]')).filter((el) => !el.hasAttribute('hidden'));
  },

  // Focus the home shortcut's inner link, falling back to the host.
  _focusHomeShortcut() {
    const home = this._homeMenuNav?.home;
    if (!home) {
      return;
    }
    const anchor = home.shadowRoot?.querySelector('a');
    (anchor || home).focus();
  },

  // On home: ArrowDown focuses the first menu item, ArrowUp the last.
  _onHomeShortcutKeydown(e) {
    const items = this._homeMenuVisibleItems();
    if (!items.length) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  },

  // On menu edges: ArrowUp on the first item or ArrowDown on the last returns focus to home.
  _onMenuEdgeKeydown(e) {
    const items = this._homeMenuVisibleItems();
    if (!items.length) {
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = e.target;
    if ((e.key === 'ArrowUp' && active === first) || (e.key === 'ArrowDown' && active === last)) {
      e.preventDefault();
      this._focusHomeShortcut();
    }
  },

  attached() {
    // WEBUI-1987: only re-arm after a real detach/re-attach cycle. ready() already did the initial
    // wiring, so re-running setup here on the first attach would issue a redundant keep-alive request
    // and churn the activity listeners for no benefit.
    if (this._inactivityNeedsRearm) {
      this._inactivityNeedsRearm = false;
      this._setupInactivityTimer();
      this._setupUnauthorizedRedirect();
      // detached() removed the home<->menu arrow-key handlers; re-arm them here to mirror the
      // inactivity timer. Re-adding is idempotent (bound handler refs are retained).
      this.homeToMenuNavigation();
    }
  },

  detached() {
    if (this._boundUpdateIsNarrow) {
      window.removeEventListener('resize', this._boundUpdateIsNarrow);
    }
    this.removeEventListener('nuxeo-layout-updated', this._onDescendantLayoutUpdated);
    if (this._homeMenuNav) {
      this._homeMenuNav.home.removeEventListener('keydown', this._boundHomeShortcutKeydown);
      this._homeMenuNav.menu.removeEventListener('keydown', this._boundMenuEdgeKeydown);
    }
    this._teardownInactivityTimer();
    this._teardownUnauthorizedRedirect();
    this._cancelPendingAnnouncement();
    this._inactivityNeedsRearm = true; // re-arm from the next attached()
  },

  skipLinkEvent() {
    const { skipLink, mainContent } = this.$;
    let skipLinkActivated = true; // only active once after load/top

    const handleFirstTab = (e) => {
      if (!skipLinkActivated || e.key !== 'Tab') {
        return;
      }
      // Another handler (e.g. a modal/overlay focus trap such as nuxeo-dialog, which runs in the
      // capture phase) already handled this Tab to keep focus inside the dialog. Consume the
      // first-tab state instead of jumping to the skip link, otherwise the jump is merely deferred
      // to the next Tab and focus escapes the modal to the background skip link.
      if (e.defaultPrevented) {
        skipLinkActivated = false;
        return;
      }
      skipLinkActivated = false; // deactivate until page cycle resets
      e.preventDefault();
      skipLink.focus({ preventScroll: true });
    };

    // Activate skip link only once after load
    const attachTabListener = () => {
      document.addEventListener('keydown', handleFirstTab);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachTabListener);
    } else {
      attachTabListener();
    }

    // Re-arm skip link when focus is cycled back to body/top
    document.addEventListener('focusin', (e) => {
      if (e.target === document.body || e.target === skipLink) {
        skipLinkActivated = true;
      }
    });

    // Helper to focus main content
    const activateMainContent = (e) => {
      e.preventDefault();
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    };

    // Activate skip link with Enter, Space, or click
    skipLink.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') activateMainContent(e);
    });
    skipLink.addEventListener('click', activateMainContent);
  },

  _checkRtl() {
    const dir = document.documentElement.getAttribute('dir');
    this._isRTL = dir === 'rtl';
  },

  /** Bound on `nuxeo-resize-handle` (avoids unreliable :host-context through app-drawer). */
  _resizeHandleDir(isRTL) {
    return isRTL ? 'rtl' : 'ltr';
  },

  _drawerResizeTooltipPosition(isRTL) {
    return isRTL ? 'left' : 'right';
  },

  _directionChanged(isRTL) {
    if (isRTL) {
      this.$.drawerPanel.setAttribute('align', 'end');

      this.toggleChevronIcon = 'icons:chevron-right';
    } else {
      this.$.drawerPanel.setAttribute('align', 'start');
      this.toggleChevronIcon = 'icons:chevron-left';
    }
  },

  _resetTaskSelection() {
    this.currentTask = null;
    this.currentTaskId = null;
  },

  refresh() {
    if (this.page === 'search') {
      this._refreshSearch();
    } else if (this.page === 'tasks') {
      this.loadTask(this.currentTaskId);
    } else if ((this.docPath && this.docPath.length > 0) || (this.docId && this.docId.length > 0)) {
      const id = this.docId || (this.currentDocument && this.currentDocument.uid);
      this.load('browse', id, this.docPath, this.docAction);
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
          const targetDoc = task?.targetDocumentIds?.[0];
          if (task?.state === 'ended' && targetDoc?.uid) {
            this._loadDocument({ uid: targetDoc.uid, path: targetDoc.path, page: 'browse' }, { applyState: false })
              .then((doc) => {
                this._navigateAfterTaskProcessed(doc);
              })
              .catch((error) => {
                this._handleTaskLoadError(error);
              });
            return;
          }
          this._defineTaskAndNavigate(task);
          this.loading = false;
        })
        .catch((error) => {
          this._handleTaskLoadError(error);
        });
    } else {
      this._defineTaskAndNavigate();
    }
  },

  _defineTaskAndNavigate(task) {
    this.currentTask = task;
    this.show('tasks');
  },

  _navigateAfterTaskProcessed(doc) {
    if (!doc) {
      this.loading = false;
      return;
    }
    const nextTaskId = doc.contextParameters?.pendingTasks?.find((task) => task?.id)?.id;
    if (nextTaskId) {
      this.navigateTo('tasks', nextTaskId);
      return;
    }
    this.show('browse');
    this.navigateTo(doc);
    this.loading = false;
  },

  _handleTaskLoadError(error) {
    if (error?.status === 403) {
      this._fetchTaskCount();
      this.navigateTo('tasks');
    } else {
      this.showError(error?.status, this.i18n('browse.error'), error?.message);
    }
    this.loading = false;
  },

  _handleDocumentRefreshError(err) {
    if (err?.['entity-type'] === 'exception' && err.status === 403) {
      this.navigateTo('tasks');
    } else {
      this.showError(err?.status, this.i18n('browse.error'), err?.message);
    }
    this.loading = false;
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

  /**
   * Loads a document in the app. The document is loaded based on the `uid` or `path` passed in `docParams`.
   * If the document is successfuly retrieved, it is retuned by the method, except if the document representes a saved
   * search, in which case `undefined` is returned.
   */
  _loadDocument(docParam, { applyState = true } = {}) {
    this.loading = true;
    this.docId = docParam.uid;
    this.docPath = docParam.path;
    this.$.doc.headers = this._computeHeaders();
    const page = (docParam && docParam.page) || 'browse';
    // compute enrichers for the intended target page
    this.$.doc.enrichers = this._computeDocumentEnrichersForPage(page);

    return this.$.doc.get().then((doc) => {
      if (this.docId && doc.facets.includes('SavedSearch')) {
        this._routedSearch = doc;
        this._redirectSavedSearch();
        this.loading = false;
        return;
      }
      if (applyState) {
        this._applyDocumentFromLoad(doc);
      }
      this.loading = false;
      return doc;
    });
  },

  _applyDocumentFromLoad(doc) {
    if (this.docId && !doc.isVersion) {
      this.docId = '';
      this.docPath = doc.path;
    }
    this.currentParent = this.hasFacet(doc, 'Folderish')
      ? doc
      : doc.contextParameters.breadcrumb.entries.slice(-2, -1)[0];
    this.set('currentDocument', doc);
  },

  load(page, uid, path, action) {
    this._loadDocument({ uid, path, page })
      .then((doc) => {
        if (doc) {
          this.docAction = action;
          this.show(page);
        }
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') {
          return;
        }
        // WEBUI-1857: an anonymous user hitting a 403 is redirected to the login page (preserving the
        // permalink) instead of being shown a dead-end permission error page.
        if (this._isAnonymousForbidden(err)) {
          this._redirectAnonymousToLogin();
          return;
        }
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
    if (this.$.diff.docIds && params.every((el) => this.$.diff.docIds.includes(el))) {
      const otherIds = this.$.diff.docIds.find((id) => !params.includes(id));
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
    if (!this.page) return;
    const title = [];
    switch (this.page) {
      case 'browse':
        if (this.currentDocument && this.currentDocument.title) {
          // The repository root has no dc:title, so the server returns its uid as the title.
          // Mirror the breadcrumb/clipboard behavior and show the localized root label instead
          // of a raw UUID, so the browser tab title stays meaningful and consistent for
          // screen-reader users navigating between tabs (WEBUI-1876).
          title.push(this.currentDocument.type === 'Root' ? this.i18n('browse.root') : this.currentDocument.title);
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
          title.push(this.i18n(this.currentTask.workflowModelName), this.i18n(this.currentTask.name));
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
    // WEBUI-1935: resolve the logo from the same theme the loader applied. getValidTheme()
    // handles branding-mode resolution and the deployment default even when nothing is
    // persisted yet (first-time user); reading raw localStorage would wrongly fall back to
    // 'default' and show the classic logo beside a Hyland UI.
    return `${baseUrl}themes/${getValidTheme()}/logo.png`;
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
      this.navigateTo(e.detail.doc, e.detail.docAction);
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

  _refreshCollections() {
    const form = this.$$('#collectionsForm');
    if (form && form.visible) {
      form._refreshCollections();
    }
  },

  _updateCollectionMenu(e) {
    this.$$('#collectionsForm').loadCollection(e.detail.collection);
  },

  _showSearchResults(e) {
    const target = e.composedPath()[0];
    this.navigateTo('search', target.searchName);
  },

  _toggleDrawer(e, selectedObj) {
    const selectedItem = e.type === 'keyup' ? selectedObj : e;
    const selectedItemDetailSelected =
      selectedItem.detail && selectedItem.detail.selected ? selectedItem.detail.selected : 0;
    if (this._selected === selectedItemDetailSelected && this.drawerOpened) {
      requestAnimationFrame(() => {
        this._closeDrawer();
      });
    } else {
      this._selected = this.selectedTab = selectedItemDetailSelected;
      this._openDrawer();
    }
  },

  /** Open drawer at stored/clamped width and sync the resize-handle ARIA values. */
  _openDrawer() {
    this.drawerWidth = `${this._computeOpenDrawerWidth()}px`;
    this._updateDrawerResizeAria();
    this.drawerOpened = true;
    const { drawerPanel } = this.$;
    if (drawerPanel.narrow) {
      drawerPanel.openDrawer();
    }
    const drawer = this.$['drawer-pages'];
    if (!this.selectedTab) {
      drawer.selectIndex(0);
    } else {
      drawer.select(this.selectedTab);
    }
    this.selectedTab = drawer.selected;
  },

  _closeDrawer() {
    this.drawerWidth = this.sidebarWidth;
    this.drawerOpened = false;
    const drawerMenu = this.$ && this.$.drawerMenu;
    drawerMenu.removeAttribute('opened');
    this.selectedTab = '';
  },

  _fetchTaskCount() {
    this.$.tasksProvider.fetch().then((response) => {
      this.taskCount = response.resultsCount;
    });
  },

  _refreshAndFetchTasks(e) {
    const taskProcessed = e?.type === 'workflowTaskProcessed';
    // let's refresh the current document since it might have been changed (ex: state and version)
    if (this.currentDocument) {
      const loadOptions = taskProcessed ? { applyState: false } : {};
      this._loadDocument(this.currentDocument, loadOptions)
        .then((doc) => {
          if (taskProcessed) {
            this._navigateAfterTaskProcessed(doc);
          } else {
            this.show('browse');
          }
        })
        .catch((err) => {
          this._handleDocumentRefreshError(err);
        });
    }
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
      // WEBUI-2189: run the post-login restore here rather than from ready(): with anonymous auth enabled
      // the app boots as Guest before a real user resolves, and restoring from ready() would consume the
      // saved page for the wrong (or no) user. By the time a real currentUser resolves the router is
      // listening, so navigating to the saved deep link works. The restore method itself skips anonymous
      // users and only navigates for the user who saved the page.
      this._restoreRequestedUrlAfterLogin();
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
        result = user.properties?.username || user.name || user.id;
      }
      return result;
    }
  },

  _toast(text) {
    this._notify({ detail: { message: text } });
  },

  _documentAddedToCollection(e) {
    // details object might be empty if the event was triggered by a bulk add to collection
    if (!this._isEmpty(e.detail)) {
      this._toast(this.i18n(e.detail.docIds ? 'app.documents.addedToCollection' : 'app.document.addedToCollection'));
    }
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
      if (this.hasFacet(e.detail.doc, 'Collection')) {
        this._refreshCollections();
      }
      this._refreshSearch();
    }
  },

  _documentUntrashed(e) {
    this._toast(this.i18n(`app.document.untrashed.${e.detail.error ? 'error' : 'success'}`));
    if (e.detail.doc && !e.detail.error) {
      this._navigate({ detail: { doc: e.detail.doc } });
      if (this.hasFacet(e.detail.doc, 'Collection')) {
        this._refreshCollections();
      }
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
      e.detail.message = msg;
      this._notify(e);
    } else if (this._isEmpty(e.detail)) {
      // details object is empty if this was triggered by a bulk delete action
      this._fetchTaskCount();
      this._refreshCollections();
      this._refreshSearch();
      // Note: we don't have a list of documents so we can't call _removeFromClipboard() and _removeFromRecentlyViewed()
    } else {
      this._removeFromClipboard(e.detail.documents);
      this._removeFromRecentlyViewed(e.detail.documents);
      this._fetchTaskCount();
      e.detail.message = this.i18n('app.documents.deleted.success');
      this._notify(e);
      if (e.detail.documents && e.detail.documents.some((doc) => this.hasFacet(doc, 'Collection'))) {
        this._refreshCollections();
      }
      this._refreshSearch();
    }
  },

  _documentsUntrashed(e) {
    // details object might be empty if the event was triggered by a bulk untrash action
    if (this._isEmpty(e.detail)) {
      this._refreshCollections();
      this._refreshSearch();
    } else {
      this._toast(this.i18n(`app.documents.untrashed.${e.detail.error ? 'error' : 'success'}`));
      if (e.detail.documents && e.detail.documents.some((doc) => this.hasFacet(doc, 'Collection'))) {
        this._refreshCollections();
      }
      this._refreshSearch();
    }
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

  async _pageChanged(page, oldPage) {
    if (page !== null) {
      // wait for a while in case page is being contributed by an addon
      const el = await new Promise((resolve) => {
        let timeout;
        let poll;
        const done = (e) => {
          clearInterval(poll);
          clearTimeout(timeout);
          resolve(e);
        };
        poll = setInterval(() => {
          // selectItem might be undefined
          // https://github.com/PolymerElements/iron-pages/issues/52
          const e = this.$.pages.selectedItem || dom(this.$.pages).querySelector(`[name=${page}]`);
          if (e) {
            done(e);
          }
        }, 100);
        timeout = setTimeout(() => done(), 1000);
      });

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
      this.__performanceListener = function () {
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

  /**
   * Setup a new toast with the necessary listeners (and styling hacks).
   */
  _newToast(id, callback) {
    const toast = document.createElement('mwc-snackbar');
    toast.setAttribute('id', id);
    toast.setAttribute('leading', true);
    toast.innerHTML = `
      <paper-button id="abort" slot="action">${this.i18n('app.snackbar.abortButton')}</paper-button>
      <paper-icon-button id="copy" icon="icons:content-copy" slot="action"></paper-icon-button>
      <nuxeo-tooltip for="copy" position="top">${this.i18n('app.snackbar.copyButton.tooltip')}</nuxeo-tooltip>
      <paper-icon-button id="dismiss" icon="icons:close" slot="dismiss"></paper-icon-button>`;

    // HACK - by changing the position to relative, we can stack snackbars (and tweak the internal label)
    // HACK - hardcode the fixed width for the internal panel
    // HACK - intercept the call to the action handler, to prevent closing/opening the snackbar when clicking
    // the copy button
    toast.addEventListener('MDCSnackbar:opening', () => {
      toast.mdcRoot.style.position = 'relative';
      toast.mdcRoot.querySelector('.mdc-snackbar__label').style.webkitFontSmoothing = 'auto';
      toast.mdcRoot.querySelector('.mdc-snackbar__surface').style.width = '344px';
      this._muteSnackbarLabel(toast);

      const defaultAction = toast.mdcFoundation.handleActionButtonClick.bind(toast);
      toast.mdcFoundation.handleActionButtonClick = () => {
        if (toast.__state.errorDetails) {
          navigator.clipboard.writeText(toast.__state.errorDetails);
          return;
        }
        defaultAction();
      };
    });
    // set the initial state of the snackbar
    toast.__state = {};

    // listen to the closed event to track dismiss and custom action
    toast.addEventListener('MDCSnackbar:closed', (e) => {
      if (e.detail.reason === 'action' && callback) {
        toast.__state = { dismissed: false, aborted: true };
        callback();
        // remove the toast if the action was aborted
        toast.remove();
      } else if (e.detail.reason === 'dismiss') {
        const state = toast.__state;
        if (state && state.ended) {
          toast.__state = null;
          // remove the toast if the action has ended
          toast.remove();
        } else {
          // do not remove the toast, otherwise it will show up before the end of the task
          toast.__state.dismissed = true;
        }
      }
    });
    return toast;
  },

  _getToastFor(source, data) {
    let { toast } = this.$;
    const { abort, dismissible } = data;
    if (!source) {
      this.set('_dismissible', !!dismissible);
    } else {
      // use the source (commandId) to identify the snack (in order to update it later)
      const id = `snack_${source.replaceAll('-', '')}`;
      toast = this.$.snackbarPanel.querySelector(`#${id}`);
      if (!toast) {
        toast = this._newToast(id, abort);
        this.$.snackbarPanel.appendChild(toast);
      }
    }
    return toast;
  },

  _notify(e) {
    const { commandId } = e.detail;
    const toast = this._getToastFor(commandId, e.detail);
    const { abort, close, dismissible, duration, errorDetails, message } = e.detail;

    // if the size of the panel is higher than the max value, we need to dismiss the oldest
    const snackbars = this.$.snackbarPanel.querySelectorAll('mwc-snackbar[open]');
    if (snackbars.length > MAX_TOASTS) {
      const snackbar = snackbars[0];
      snackbar.close('dismiss');
    }

    if (close) {
      toast.close();
    }
    if (message) {
      // if the toast was dismissed, then we shouldn't display it until the action ends
      const state = toast.__state;
      if (state && (state.dismissed || state.aborted) && abort) {
        return;
      }
      if (state && !abort) {
        toast.__state.ended = true;
      }
      if (state && errorDetails) {
        toast.__state.errorDetails = errorDetails;
      }

      // update the snackbar properties
      toast.querySelector('#abort').hidden = !abort;
      toast.querySelector('#dismiss').hidden = !dismissible;
      toast.querySelector('#copy').hidden = !errorDetails;
      toast.labelText = message;
      toast.timeoutMs = -1;

      // if it is not sticky, we treat it just like any other toast
      if (duration !== undefined && duration === 0) {
        toast.timeoutMs = -1;
      } else if (duration !== undefined && duration > 0) {
        toast.timeoutMs = Math.max(4000, duration);
      } else {
        toast.timeoutMs = 4000;
      }

      if (toast.open) {
        toast.close();
      }
      toast.show();
      this._announce(message);
    }
  },

  /**
   * Takes the snackbar's own label out of the accessibility tree, so a message is not announced twice.
   *
   * From its second open onwards mwc-snackbar clears the label and restores it ARIA_LIVE_DELAY_MS later,
   * precisely to provoke an announcement. That text is already spoken by our own region, and the two land
   * about a second apart. `aria-hidden` is what silences it: the directive rewrites `aria-live` when its
   * timer fires, so setting that instead would be undone (WEBUI-1880).
   */
  _muteSnackbarLabel(toast) {
    const label = toast.mdcRoot?.querySelector('.mdc-snackbar__label');
    if (label) {
      label.setAttribute('aria-hidden', 'true');
    }
  },

  /**
   * Returns the shared live region, creating it on first use.
   *
   * WEBUI-1880: mwc-snackbar builds its own live region lazily, inside a subtree that is hidden until
   * the toast opens, so screen readers never see the text change and stay silent. This region replaces
   * it. It is appended to the document body rather than declared in this element's template because
   * Narrator does not reliably observe live regions nested in shadow DOM.
   */
  _getAnnouncer() {
    if (!this._announcer?.isConnected) {
      let announcer = document.getElementById(ANNOUNCER_ID);
      if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = ANNOUNCER_ID;
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        // Clipped rather than hidden: display none, visibility hidden, zero height and zero opacity
        // all take the node out of the accessibility tree, which would stop it announcing.
        announcer.style.cssText =
          'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;' +
          'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;';
        document.body.appendChild(announcer);
      }
      this._announcer = announcer;
    }
    return this._announcer;
  },

  /**
   * Queues `message` for announcement by screen readers.
   *
   * Messages are queued rather than replaced because a single event is often reported twice in the same
   * tick by different elements: finishing a CSV export makes `nuxeo-csv-export-button` announce "CSV
   * export is ready" and, one microtask later, `nuxeo-operation-button` announce its own bulk summary.
   * Overwriting a pending message would silence the first of the pair (WEBUI-1880).
   *
   * A duplicate is only dropped while its twin has yet to be spoken — still queued, or still in the
   * clear phase. Once the text has landed in the region it has been announced, so an identical message
   * arriving later is a new event and is spoken again.
   */
  _announce(message) {
    if (!message) {
      return;
    }
    this._announceQueue = this._announceQueue || [];
    let previous = null;
    if (this._announceQueue.length) {
      previous = this._announceQueue[this._announceQueue.length - 1];
    } else if (this._announceClearing) {
      previous = this._announcingMessage;
    }
    if (previous === message) {
      return; // the same event reported twice; no need to say it twice
    }
    this._announceQueue.push(message);
    if (this._announceQueue.length > MAX_QUEUED_ANNOUNCEMENTS) {
      this._announceQueue.shift();
    }
    this._pumpAnnouncements();
  },

  _pumpAnnouncements() {
    if (this._announceTimeout || !this._announceQueue || this._announceQueue.length === 0) {
      return;
    }
    const announcer = this._getAnnouncer();
    const message = this._announceQueue.shift();
    this._announcingMessage = message;
    this._announceClearing = true;
    // A live region is only announced when its text changes, so clear it first: without this an
    // identical consecutive toast produces no mutation and stays silent.
    announcer.textContent = '';
    this._announceTimeout = setTimeout(() => {
      announcer.textContent = message;
      this._announceClearing = false;
      this._announceTimeout = setTimeout(() => {
        this._announceTimeout = null;
        this._announcingMessage = null;
        this._pumpAnnouncements();
      }, ANNOUNCE_SPACING_MS);
    }, ARIA_ANNOUNCE_DELAY_MS);
  },

  _cancelPendingAnnouncement() {
    if (this._announceTimeout) {
      clearTimeout(this._announceTimeout);
      this._announceTimeout = null;
    }
    this._announcingMessage = null;
    this._announceClearing = false;
    this._announceQueue = [];
  },

  _clipboardUpdated(e) {
    this.clipboard = this.clipboard || this.$$('#clipboard');
    this.set('clipboardDocCount', e.detail.docCount);
  },

  _removeFromClipboard(docs) {
    if (this.clipboard && Array.isArray(docs)) {
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

  _appendEnricher(listOrCsv, value) {
    const v = (value || '').trim();
    if (!v) {
      return listOrCsv;
    }

    // Array case (your current config.get('enrichers').document is an array)
    if (Array.isArray(listOrCsv)) {
      const list = listOrCsv.map((e) => (e ? String(e).trim() : '')).filter(Boolean);
      if (!list.includes(v)) {
        list.push(v);
      }
      return list;
    }

    // String case
    const list = (listOrCsv || '')
      .split(',')
      .map((e) => e && e.trim())
      .filter(Boolean);

    if (!list.includes(v)) {
      list.push(v);
    }
    return list.join(',');
  },

  _computeDocumentEnrichersForPage(page) {
    const base = config.get('enrichers') || {};

    // clone so we don't mutate the global config enrichers object
    const enrichers = { ...base };
    // preserve existing document/blob enrichers, only append when needed
    if (page === 'browse') {
      enrichers.document = this._appendEnricher(enrichers.document, 'userPreferences');
    }

    return enrichers;
  },

  _computeEnrichers() {
    return config.get('enrichers');
  },

  _computeHeaders() {
    const headers = {
      'translate-directoryEntry': 'label',
    };

    const fetch = config.get('fetch', {});

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

  /**
   * Checks if an object doesn't have properties
   */
  _isEmpty(obj) {
    return Object.keys(obj).length === 0;
  },

  /** Update narrow flag, re-clamp drawer width, refresh ARIA, and reflow main/document content. */
  _updateIsNarrow() {
    if (this._suppressLayoutResizeHandler) {
      return;
    }
    this.isNarrow = window.innerWidth <= 720;
    this._reclampDrawerWidth();
    this._updateDrawerResizeAria();
    // Drawer width may be unchanged while main/document layout still needs iron-resize.
    this._notifyLayoutChanged();
  },

  /**
   * Reflow descendants after a pane width change.
   *
   * @param {{ includeWindowResize?: boolean }} [options]
   *   - `includeWindowResize: false` — iron-resize only (drawer drag / key-repeat coalescing).
   *   - `includeWindowResize: true` (default) — also synthesise `window.resize` for
   *     `nuxeo-document-page` viewport reclamp and other legacy listeners; suppressed
   *     from re-entering `_updateIsNarrow` to avoid feedback loops.
   */
  _runLayoutNotify({ includeWindowResize = true } = {}) {
    const drawerPanel = this.$?.drawerPanel;
    if (drawerPanel && typeof drawerPanel.notifyResize === 'function') {
      drawerPanel.notifyResize();
    }
    if (includeWindowResize) {
      this._suppressLayoutResizeHandler = true;
      globalThis.dispatchEvent(new Event('resize'));
      this._suppressLayoutResizeHandler = false;
    }
  },

  /** Defer layout notify to the next frame so width/CSS updates are applied first. */
  _notifyLayoutChanged() {
    if (this._layoutNotifyRaf != null) {
      return;
    }
    this._layoutNotifyRaf = requestAnimationFrame(() => {
      this._layoutNotifyRaf = null;
      this._runLayoutNotify();
    });
  },

  isDrawerHidden(isNarrow, drawerOpened) {
    if (isNarrow) {
      return !drawerOpened;
    }
    return false;
  },

  /** On narrow ↔ wide transitions, sync drawer state and reflow main/drawer content. */
  _handleNarrowChange(isNarrow) {
    if (isNarrow) {
      this.drawerOpened = false;
      // Reflow main content after switching to overlay layout (zoom edge case).
      this._notifyLayoutChanged();
      return;
    }
    // Zoom out: drawer may still look open while drawerOpened is false — resync.
    const currentWidthPx = Number.parseInt(this.drawerWidth, 10) || 0;
    const sidebarPx = this._sidebarPx();
    if (!this.drawerOpened && currentWidthPx > sidebarPx) {
      this.drawerOpened = true;
    }
    this._notifyLayoutChanged();
  },
});

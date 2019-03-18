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

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-filters-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-user-group-management.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-user-group-latest.js';
import '../nuxeo-app/nuxeo-page.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-user-group-management-page`
@group Nuxeo UI
@element nuxeo-user-group-management-page
*/
Polymer({
  _template: html`
    <nuxeo-page>
      <div slot="header">
        <span class="flex">[[i18n('admin.usersAndGroups.heading')]]</span>
      </div>
      <div>
        <template is="dom-if" if="[[visible]]">
          <nuxeo-user-group-management id="management" page="{{page}}"></nuxeo-user-group-management>
          <template is="dom-if" if="[[_displayLatest]]">
            <nuxeo-user-group-latest></nuxeo-user-group-latest>
          </template>
        </template>
      </div>
    </nuxeo-page>
`,

  is: 'nuxeo-user-group-management-page',
  behaviors: [I18nBehavior, RoutingBehavior],

  properties: {
    visible: {
      type: Boolean,
      observer: '_visibleChanged',
    },
    page: {
      type: String,
      value: 'search',
      observer: '_observePage',
    },
    entity: {
      type: Object,
      value: {},
      observer: '_entityChanged',
    },
    /**
     * The route under which this page is available.
     */
    route: {
      type: String,
      value: 'page',
    },
    /**
     * An array with the route parameters. This page expects two parameters: the first is the entity
     * type (user or group), and the second is the entity id.
     */
    routeParams: {
      type: Array,
      observer: '_routeParamsChanged',
    },
  },

  listeners: {
    'goHome': '_handleUGMgoHome',
    'manageUser': '_handleUGMmanageUser',
    'manageGroup': '_handleUGMmanageGroup',
  },

  _routeParamsChanged(route) {
    if (route && route.length === 2) {
      this.entity = { type: route[0], id: route[1] };
    } else {
      this.entity = {};
    }
  },

  _entityChanged() {
    if (!this.visible) {
      return;
    }
    const management = this.$$('nuxeo-user-group-management');
    if (!management) {
      return;
    }
    if (this.entity && this.entity.id && this.entity.type) {
      if (this.entity.type === 'group') {
        management.selectedGroup = this.entity.id;
        management.page = 'manage-group';
      } else if (this.entity.type === 'user') {
        management.selectedUser = this.entity.id;
        management.page = 'manage-user';
      }
    } else {
      management.$$('nuxeo-user-group-search')._searchTermChanged();
      this.page = 'search';
    }
  },

  _visibleChanged() {
    if (this.visible) {
      this.async(() => {
        this._entityChanged();
      });
    }
  },

  _displayLatest() {
    return this.page === 'search';
  },

  _handleUGMgoHome() {
    this.entity = {};
    this.navigateTo(this.route, 'user-group-management');
  },

  _handleUGMmanageUser(e) {
    this.entity = {type: 'user', id: e.detail.user};
    const url = `${ 'user-group-management' }/${ this.entity.type }/${ this.entity.id }`;
    this.navigateTo(this.route, url);
  },

  _handleUGMmanageGroup(e) {
    this.entity = {type: 'group', id: e.detail.group};
    const url = `${ 'user-group-management' }/${ this.entity.type }/${ this.entity.id }`;
    this.navigateTo(this.route, url);
  },

  _observePage() {
    this._displayLatest = this.page === "search";
  },
});

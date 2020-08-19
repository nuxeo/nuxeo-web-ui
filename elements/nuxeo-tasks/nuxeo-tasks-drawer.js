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

import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import './nuxeo-tasks-list.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-tasks-drawer`
@group Nuxeo UI
@element nuxeo-tasks-drawer
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      .tasks-dashboard {
        padding: 0.7em 1em;
        display: block;
        border-top: 1px solid var(--nuxeo-border);
      }
    </style>

    <div class="header">
      <h5>[[i18n('app.tasks')]]</h5>
    </div>
    <nuxeo-tasks-list id="tasks" current="[[currentTask]]"></nuxeo-tasks-list>
    <div class="tasks-dashboard">
      <paper-button id="link" class="text small" on-click="_navigateToDashboard"
        >[[i18n('app.viewTasksDashboard')]]</paper-button
      >
    </div>
  `,

  is: 'nuxeo-tasks-drawer',
  behaviors: [RoutingBehavior, I18nBehavior],

  properties: {
    tasks: Array,
    currentTask: Object,
    visible: Boolean,
  },

  observers: ['_observeVisible(visible)'],

  _observeVisible(visible) {
    if (visible) {
      this.$.tasks.fetch();
    }
  },

  _navigateToDashboard() {
    this.navigateTo('tasks');
  },
});

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

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-delete-document-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-untrash-document-button.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-tag.js';
import '../nuxeo-publication/nuxeo-publication-info-bar.js';
import '../nuxeo-restore-version-button/nuxeo-restore-version-button.js';
import '../nuxeo-workflow-graph/nuxeo-workflow-graph.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-document-info-bar`
@group Nuxeo UI
@element nuxeo-document-info-bar
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex">
      .bar {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-justified;
        padding: 8px;
        margin-bottom: 16px;
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04);
        background-color: var(--nuxeo-box);
      }

      .bar.task {
        background: black;
        color: white;
      }

      .bar.record {
        background: black;
        color: white;
      }

      .item {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-flex;
      }

      a.viewGraph {
        text-decoration: underline;
        margin-right: 1em;
      }

      iron-icon {
        margin: 0 0.5em;
        width: 1.5em;
      }
    </style>

    <nuxeo-connection id="nxcon" user="{{currentUser}}"></nuxeo-connection>

    <nuxeo-resource id="worfklow" path="/workflow"></nuxeo-resource>
    <nuxeo-resource id="task" path="/task" headers='{"fetch-task": "targetDocumentIds,actors"}'></nuxeo-resource>
    <nuxeo-resource id="user" path="/user"></nuxeo-resource>

    <!-- workflows -->
    <template is="dom-repeat" items="[[workflows]]" as="workflow">
      <nuxeo-workflow-graph id="graph-[[workflow.id]]" workflow-id="[[workflow.id]]"></nuxeo-workflow-graph>
      <div class="bar workflow">
        <div class="item">
          <iron-icon class="icon" icon="icons:perm-data-setting"></iron-icon>
          <template is="dom-if" if="[[!_isCurrentUser(workflow.initiator, currentUser)]]">
            <nuxeo-user-tag user="[[workflow.initiator]]"></nuxeo-user-tag>
          </template>
          <span>[[_labelForInitiatedWf(workflow, currentUser)]]</span>
        </div>
        <a class="viewGraph" on-tap="_toggleGraphDialog">[[i18n('documentPage.route.view.graph')]]</a>
        <template is="dom-if" if="[[_hasPermissionToAbandon(workflow.initiator, currentUser)]]">
          <paper-button class="primary" on-tap="_abandonWorkflow" noink
            >[[i18n('documentPage.abandon.workflow')]]</paper-button
          >
        </template>
      </div>
    </template>

    <!-- tasks -->
    <template is="dom-repeat" items="[[tasks]]" as="task">
      <div class="bar task">
        <div class="item">
          <iron-icon class="icon" icon="icons:assignment-turned-in"></iron-icon>
          <span
            >[[i18n('documentPage.to.process')]]
            <nuxeo-date datetime="[[task.dueDate]]"></nuxeo-date>
          </span>
        </div>
        <paper-button class="primary" on-tap="_processTask" noink>[[i18n('documentPage.process.task')]]</paper-button>
      </div>
    </template>

    <!-- Record -->
    <template is="dom-if" if="[[isUnderRetentionOrLegalHold(document)]]">
      <div id="retentionInfoBar" class="bar record">
        <div class="layout horizontal center flex">
          <template is="dom-if" if="[[document.hasLegalHold]]">
            <iron-icon icon="nuxeo:hold"></iron-icon>
            <span id="legalHold">[[i18n('documentPage.legalHold')]]</span>
          </template>
          <template is="dom-if" if="[[document.retainUntil]]">
            <iron-icon icon="nuxeo:retain"></iron-icon>
            <template is="dom-if" if="[[!isRetentionDateIndeterminate(document)]]">
              <span id="retention" hidden="[[document.hasLegalHold]]">[[_computeRetentionUntiLabel(document)]]</span>
            </template>
            <template is="dom-if" if="[[isRetentionDateIndeterminate(document)]]">
              <span id="indeterminateRetention" hidden="[[document.hasLegalHold]]">
                [[i18n('documentPage.retainIndeterminate')]]
              </span>
            </template>
          </template>
        </div>
      </div>
    </template>

    <!-- trash -->
    <template is="dom-if" if="[[isTrashed(document)]]">
      <div id="trashedInfoBar" class="bar trashed">
        <div class="layout horizontal center flex">
          <iron-icon icon="icons:info"></iron-icon>
          <span>[[i18n('documentPage.trash.info')]]</span>
        </div>
        <template is="dom-if" if="[[!hasPermission(document, 'Write')]]">
          <div>[[i18n('documentPage.trash.noPermissionToRestore')]]</div>
        </template>
        <template is="dom-if" if="[[hasPermission(document, 'Write')]]">
          <nuxeo-untrash-document-button document="[[document]]"></nuxeo-untrash-document-button>
        </template>
        <template is="dom-if" if="[[hasPermission(document, 'Everything')]]">
          <nuxeo-delete-document-button document="[[document]]" hard></nuxeo-delete-document-button>
        </template>
      </div>
    </template>

    <!-- version -->
    <template is="dom-if" if="[[isVersion(document)]]">
      <div id="versionInfoBar" class="bar version">
        <div class="layout horizontal center">
          <iron-icon icon="icons:info"></iron-icon>
          <span
            >[[i18n('versions.info', document.properties.uid:major_version,
            document.properties.uid:minor_version)]]</span
          >
        </div>
        <nuxeo-restore-version-button document="[[document]]"></nuxeo-restore-version-button>
      </div>
    </template>

    <!-- proxy/publication -->
    <template is="dom-if" if="[[isPublication(document)]]">
      <nuxeo-publication-info-bar document="[[document]]"></nuxeo-publication-info-bar>
    </template>
  `,

  is: 'nuxeo-document-info-bar',
  behaviors: [LayoutBehavior],

  properties: {
    document: {
      type: Object,
    },
    tasks: {
      type: Array,
      computed: '_tasks(document)',
    },
    workflows: {
      type: Array,
      computed: '_workflows(document)',
    },
    _wfTasks: Array,
  },

  _computeRetentionUntiLabel(doc) {
    return this.i18n('documentPage.retainUntil', this.formatDateTime(doc.retainUntil));
  },

  _tasks(doc) {
    return doc && doc.contextParameters && doc.contextParameters.pendingTasks ? doc.contextParameters.pendingTasks : [];
  },

  _workflows(doc) {
    return doc && doc.contextParameters && doc.contextParameters.runningWorkflows
      ? doc.contextParameters.runningWorkflows
      : [];
  },

  _processTask(e) {
    this.fire('workflowTaskProcess', { task: e.model.task });
  },

  ready() {
    this.$.nxcon.connect().then((user) => {
      this.currentUser = user;
    });
  },

  _isCurrentUser(userId) {
    return this.currentUser && this.currentUser.id === userId;
  },

  _labelForInitiatedWf(workflow) {
    if (this._isCurrentUser(workflow.initiator)) {
      return this.i18n('documentPage.initiated.workflow.currentUser', this.i18n(workflow.title));
    }
    return this.i18n('documentPage.initiated.workflow', this.i18n(workflow.title));
  },

  _abandonWorkflow(e) {
    if (window.confirm(this.i18n('documentPage.abandon.workflow.confirm'))) {
      this.$.worfklow.path = `/workflow/${e.model.workflow.id}`;
      this.$.worfklow.remove().then(() => {
        this.fire('workflowAbandoned', { workflow: e.model.workflow });
      });
    }
  },

  /**
   * Checks if current user has permission to abandon a workflow.
   */
  _hasPermissionToAbandon(initiator) {
    return this._isCurrentUser(initiator) || (this.currentUser && this.currentUser.isAdministrator);
  },

  _toggleGraphDialog(e) {
    this.$$(`#graph-${e.model.workflow.id}`).show();
  },
});

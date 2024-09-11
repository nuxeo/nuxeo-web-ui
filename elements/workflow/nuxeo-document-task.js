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

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-form/iron-form.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import '../nuxeo-workflow-graph/nuxeo-workflow-graph.js';
import './nuxeo-document-task-assignment-popup.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';

/**
`nuxeo-document-task`
@group Nuxeo UI
@element nuxeo-document-task
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      nuxeo-workflow-graph {
        position: relative;
      }

      #task-body {
        @apply --layout-vertical;
      }

      .heading {
        @apply --layout-horizontal;
        @apply --layout-justified;
      }

      .vertical {
        @apply --layout-vertical;
        justify-content: center;
      }

      .horizontal {
        @apply --layout-horizontal;
      }

      h5 {
        margin: 0;
      }

      .options {
        @apply --layout-horizontal;
        @apply --layout-start;
        @apply --layout-end-justified;
        @apply --layout-flex;
      }

      .spaced {
        margin: 16px 0;
      }

      .date {
        color: var(--nuxeo-warn-text, #fb6107);
      }

      .view-graph {
        color: var(--nuxeo-primary-color, #0066ff);
        font-weight: bolder;
      }
      
      .info {
        margin-bottom: 1rem;
      }
      
      .info > iron-icon {
        color: var(--nuxeo-validated, #42BE65);
        margin-inline-end: 0.5rem;
        min-width: 1.5rem;
      }
      
      .info > span {
        font-weight: 600;
      }

      .read-only {
        pointer-events: none;
        opacity: 0.6;
      }
    </style>

    <nuxeo-resource id="taskRequest" path="/task/[[task.id]]/[[action]]" data="{{taskData}}"></nuxeo-resource>

    <div id="task-body">
      <iron-pages selected="[[_selectedTab]]" attr-for-selected="name">
        <div name="resolution">
          <nuxeo-workflow-graph id="graph" workflow-id="[[task.workflowInstanceId]]"></nuxeo-workflow-graph>
          <nuxeo-document-task-assignment-popup
            id="assignmentDialog"
            task="[[task]]"
            action="[[action]]"
          ></nuxeo-document-task-assignment-popup>

          <template is="dom-if" if="[[_isTaskInEndState(task)]]">
            <div class="info horizontal">
                <iron-icon icon="icons:assignment-turned-in"></iron-icon>
                <span>[[i18n('tasks.alreadyProcessed')]]</span>
            </div>
          </template>

          <div class="heading">
            <div class="vertical">
              <h5>[[i18n(task.name)]]</h5>
            </div>

            <template is="dom-if" if="[[!_isTaskInEndState(task)]]">
              <div class="options">
                <paper-button
                  id="reassignBtn"
                  class="text"
                  noink
                  dialog-confirm
                  on-tap="_toggleAssignmentDialog"
                  data-args="reassign"
                  hidden$="[[!task.taskInfo.allowTaskReassignment]]"
                  >[[i18n('tasks.reassign')]]</paper-button
                >
                <paper-button
                  id="delegateBtn"
                  class="text"
                  noink
                  dialog-confirm
                  on-tap="_toggleAssignmentDialog"
                  data-args="delegate"
                  >[[i18n('tasks.delegate')]]</paper-button
                >
              </div>
            </template>
          </div>
          <a href="#" on-tap="_toggleGraphDialog" class="view-graph">[[i18n('tasks.viewGraph')]]</a>
          <div class="horizontal spaced">
            <span>[[i18n(tasks.directive)]]</span>
          </div>
          <div id="assignedActors" class="vertical spaced">
            <span>[[i18n('tasks.actors.assigned')]]</span>
            <template is="dom-if" if="[[_hasActorType(task.actors, 'group')]]">
              <nuxeo-tags type="group" items="[[_getActorsByType(task.actors, 'group')]]"></nuxeo-tags>  
            </template>
            <template is="dom-if" if="[[_hasActorType(task.actors, 'user')]]">
              <nuxeo-tags type="user" items="[[_getActorsByType(task.actors, 'user')]]"></nuxeo-tags>
            </template>
          </div>
          <template is="dom-if" if="[[_delegatedActorsExist(task.delegatedActors)]]">
            <div id="delegatedActors" class="vertical spaced">
              <span>[[i18n('tasks.actors.delegated')]]</span>
              <template is="dom-if" if="[[_hasActorType(task.delegatedActors, 'group')]]">
                <nuxeo-tags type="user" items="[[_getActorsByType(task.delegatedActors, 'group')]]"></nuxeo-tags>
              </template>
              <template is="dom-if" if="[[_hasActorType(task.delegatedActors,'user')]]">
                <nuxeo-tags type="user" items="[[_getActorsByType(task.delegatedActors, 'user')]]"></nuxeo-tags>
              </template>
            </div>
          </template>
          <div class="vertical spaced">
            <label>[[i18n('documentTask.dueDate')]]</label>
            <div class="date">
              <nuxeo-date datetime="[[task.dueDate]]" format="relative"></nuxeo-date>
            </div>
          </div>

          <div class$="[[_computeLayoutVisibility(task)]]">
            <nuxeo-layout
              id="layout"
              href="[[_href]]"
              model="[[_model]]"
              error="[[i18n('documentView.layoutNotFound', task.nodeName)]]"
              on-element-changed="_elementChanged"
            ></nuxeo-layout>
          </div>

          <div class="horizontal">
            <template is="dom-if" if="[[!_isTaskInEndState(task)]]">
              <div class="options">
                <template is="dom-repeat" items="[[task.taskInfo.taskActions]]">
                  <paper-button
                    noink
                    dialog-confirm
                    class="primary"
                    name$="[[item.name]]"
                    on-tap="_processTask"
                    disabled$="[[processing]]"
                  >
                    [[i18n(item.label)]]</paper-button
                  >
                </template>
              </div>
            </template>
        </div>
      </iron-pages>
    </div>
  `,

  is: 'nuxeo-document-task',
  behaviors: [NotifyBehavior, RoutingBehavior, FormatBehavior],
  importMeta: import.meta,
  properties: {
    task: {
      type: Object,
    },

    action: {
      type: String,
    },

    _href: {
      type: String,
    },

    _model: {
      type: Object,
    },

    _selectedTab: {
      type: String,
      value: 'resolution',
    },

    processing: {
      type: Boolean,
      value: false,
      readOnly: true,
    },
  },

  observers: ['_updateTaskLayout(task)'],

  _elementChanged() {
    this._model = { document: this.task.targetDocumentIds[0], task: this.task };
  },

  /**
   * Returns the name for the current layout element
   */
  _updateTaskLayout(task) {
    if (task) {
      this._href = null;
      const layout = ['nuxeo', task.nodeName.toLowerCase(), 'layout'].join('-');
      this._href = this.resolveUrl(`${task.workflowModelName.toLowerCase()}/${layout}.html`);
    }
  },

  validate() {
    return this.$.layout.validate();
  },

  async _processTask(e) {
    const { validate } = e.model.item;
    this._setProcessing(true);
    if (validate && !(await this.validate())) {
      const elementsToValidate = this.$.layout._getValidatableElements(this.$.layout.element.root);
      const invalidField = elementsToValidate.find((node) => node.invalid);
      if (invalidField) {
        invalidField.scrollIntoView();
        invalidField.focus();
      }
      this._setProcessing(false);
      return;
    }
    this.action = e.model.item.name;
    this.taskData = {
      'entity-type': 'task',
      id: this.$.layout.element.task.id,
      variables: this.$.layout.element.task.variables,
    };
    this.$.taskRequest
      .put()
      .then((task) => {
        this.fire('workflowTaskProcessed', { task });
      })
      .catch((error) => {
        if (error.status === 409 || error.status === 403) {
          this.notify({
            message: this.i18n(`tasks.submit.error.${error.status === 409 ? 'alreadyFinished' : 'noPermissions'}`),
            dismissible: true,
            duration: 30000,
          });
          this.fire('workflowTaskProcessed');
        } else {
          this.notify({ message: this.i18n('tasks.submit.error') });
          throw error;
        }
      })
      .finally(() => this._setProcessing(false));
  },

  _toggleGraphDialog(e) {
    e.preventDefault();
    this.$.graph.show();
  },

  _toggleAssignmentDialog(e) {
    this.action = e.target.dataset.args;
    this.$.assignmentDialog.openPopup();
  },

  _delegatedActorsExist(delegatedActors) {
    return !!delegatedActors && delegatedActors.length > 0;
  },

  _computeLayoutVisibility(task) {
    return this._isTaskInEndState(task) ? 'read-only' : '';
  },

  _isTaskInEndState(task) {
    return task && task.state === 'ended';
  },

  _hasActorType(actors, type) {
    return actors && Array.isArray(actors) && actors.findIndex((actor) => actor['entity-type'] === type) >= 0;
  },

  _getActorsByType(actors, type) {
    return actors && Array.isArray(actors) && actors.filter((actor) => actor['entity-type'] === type);
  },
});

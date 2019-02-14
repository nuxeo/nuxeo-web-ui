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
/**
`nuxeo-document-task`
@group Nuxeo UI
@element nuxeo-document-task
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-form/iron-form.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import '../nuxeo-workflow-graph/nuxeo-workflow-graph.js';
import './nuxeo-document-task-assignment-popup.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
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
      }

      .horizontal {
        @apply --layout-horizontal;
      }

      h3 {
        margin-bottom: 0;
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
    </style>

    <nuxeo-resource id="taskRequest" path="/task/[[task.id]]/[[action]]" data="{{taskData}}"></nuxeo-resource>

    <div id="task-body">

      <iron-pages selected="[[_selectedTab]]" attr-for-selected="name">
        <div name="resolution">
          <nuxeo-workflow-graph id="graph" workflow-id="[[task.workflowInstanceId]]"></nuxeo-workflow-graph>
          <nuxeo-document-task-assignment-popup id="assignmentDialog" task="[[task]]" action="[[action]]"></nuxeo-document-task-assignment-popup>

          <div class="heading">
            <div class="vertical">
              <h3>[[i18n(task.name)]]</h3>
              <a href="javascript:undefined" on-tap="_toggleGraphDialog" class="view-graph">[[i18n('tasks.viewGraph')]]</a>
            </div>
            <div class="options">
              <paper-button id="reassignBtn" noink="" dialog-confirm="" on-tap="_toggleAssignmentDialog" data-args="reassign" hidden\$="[[!task.taskInfo.allowTaskReassignment]]">[[i18n('tasks.reassign')]]</paper-button>
              <paper-button id="delegateBtn" noink="" dialog-confirm="" on-tap="_toggleAssignmentDialog" data-args="delegate">[[i18n('tasks.delegate')]]</paper-button>
            </div>
          </div>
          <div class="horizontal spaced">
            <span>[[i18n(tasks.directive)]]</span>
          </div>
          <div id="assignedActors" class="vertical spaced">
            <span>[[i18n('tasks.actors.assigned')]]</span>
            <nuxeo-tags type="user" items="[[task.actors]]"></nuxeo-tags>
          </div>
          <template is="dom-if" if="[[_delegatedActorsExist(task.delegatedActors)]]">
            <div id="delegatedActors" class="vertical spaced">
              <span>[[i18n('tasks.actors.delegated')]]</span>
              <nuxeo-tags type="user" items="[[task.delegatedActors]]"></nuxeo-tags>
            </div>
          </template>
          <div class="vertical spaced">
            <label>[[i18n('documentTask.dueDate')]]</label>
            <div class="date">
              <nuxeo-date datetime="[[task.dueDate]]" format="relative"></nuxeo-date>
            </div>
          </div>

          <nuxeo-layout id="layout" href="[[_href]]" model="[[_model]]" error="[[i18n('documentView.layoutNotFound', task.nodeName)]]" on-element-changed="_elementChanged"></nuxeo-layout>

          <div class="horizontal">
            <div class="options">
              <template is="dom-repeat" items="[[task.taskInfo.taskActions]]">
                <paper-button noink="" dialog-confirm="" class="primary" name\$="[[item.name]]" on-tap="_processTask">[[i18n(item.label)]]</paper-button>
              </template>
            </div>
          </div>

        </div>
      </iron-pages>
    </div>
`,

  is: 'nuxeo-document-task',
  behaviors: [Nuxeo.RoutingBehavior, FormatBehavior],

  properties: {
    task: {
      type: Object
    },

    action: {
      type: String
    },

    _href: {
      type: String
    },

    _model: {
      type: Object
    },

    _selectedTab: {
      type: String,
      value: 'resolution'
    }
  },

  observers: [
    '_updateTaskLayout(task)'
  ],

  _elementChanged: function() {
    this._model = { document: this.task.targetDocumentIds[0], task: this.task };
  },

  /**
   * Returns the name for the current layout element
   */
  _updateTaskLayout: function(task) {
    if (task) {
      this._href = null;
      var layout = ['nuxeo', task.nodeName.toLowerCase(), 'layout'].join('-');
      this._href = this.resolveUrl(task.workflowModelName.toLowerCase() + '/' + layout + '.html');
    }
  },

  validate: function() {
    return this.$.layout.validate();
  },

  _processTask: function(e) {
    var validate = e.model.item.validate;
    if (!validate || this.validate()) {
      this.action = e.model.item.name;
      this.taskData = {
        'entity-type': 'task',
        id: this.$.layout.element.task.id,
        variables: this.$.layout.element.task.variables
      };
      this.$.taskRequest.put().then(function(task) {
        this.fire('workflowTaskProcessed', { task: task });
      }.bind(this));
    }
  },

  _toggleGraphDialog: function() {
    this.$.graph.show();
  },

  _toggleAssignmentDialog: function(e) {
    this.action = e.target.dataset.args;
    this.$.assignmentDialog.openPopup();
  },

  _delegatedActorsExist: function(delegatedActors) {
    return !!delegatedActors && delegatedActors.length > 0;
  }
});

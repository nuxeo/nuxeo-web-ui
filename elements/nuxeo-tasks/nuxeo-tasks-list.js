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
`nuxeo-tasks-list`
@group Nuxeo UI
@element nuxeo-tasks-list
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex">
      :host {
        display: block;
        position: relative;
        height: calc(100vh - 7.7em);
      }

      .task-box {
        line-height: 155%;
      }

      .task-box + .task-box {
        border-top: 1px solid var(--divider-color);
      }

      .task-property {
        opacity: .5;
        margin-right: .5rem;
      }

      .taskDoc .doc-title, .date {
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 85%;
        overflow: hidden;
      }

      .date {
        color: var(--nuxeo-warn-text);
      }

      .list-item {
        cursor: pointer;
        padding: 1em;
        border-bottom: 1px solid var(--nuxeo-border);
      }

      .list-item:hover {
        @apply --nuxeo-block-hover;
      }

      .list-item.selected,
      .list-item:focus,
      .list-item.selected:focus {
        @apply --nuxeo-block-selected;
      }

      nuxeo-data-list {
        display: block;
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        min-height: auto;
      }

      /* fix IE11 tap selection not working for task list items (NXP-21833) */
      .task-box {
        pointer-events: none;
        @apply --layout-vertical;
      }
      /* prevent previous fix from disabling the default nuxeo-user-tag click behavior (NXP-21833) */
      .task-box nuxeo-date {
        pointer-events: all;
      }

      .task-name {
        font-weight: bold;
        text-transform: uppercase;
      }

      .horizontal {
        @apply --layout-horizontal;
        @apply --layout-center;
      }
    </style>

    <nuxeo-data-list items="[[tasks]]" id="list" as="task" selected-item="{{_selection}}" empty-label="[[i18n('tasksList.noTasks')]]" selection-enabled="" select-on-tap="">
      <template>
        <div tabindex\$="{{tabIndex}}" class\$="[[_computedClass(selected)]]">
          <div class="task-box">
            <div class="horizontal layout center">
              <span class="task-name">[[i18n(task.name)]]</span>
            </div>
            <div class="task-detail">
              <div class="taskDoc horizontal">
                <span class="doc-title">[[task.targetDocumentIds.0.title]]</span>
              </div>
              <div class="horizontal">
                <span class="due-date task-property">[[i18n('tasksList.dueDate')]]</span>
                <span class="date"> <nuxeo-date datetime="[[task.dueDate]]" format="relative"></nuxeo-date></span>
              </div>
            </div>
            <div class="horizontal">
              <span class="workflow-name">[[i18n(task.workflowModelName)]]</span>
            </div>
          </div>
        </div>
      </template>
    </nuxeo-data-list>
`,

  is: 'nuxeo-tasks-list',
  behaviors: [RoutingBehavior, I18nBehavior],

  properties: {
    tasks: Array,

    current: {
      type: Object,
      observer: '_currentChanged'
    },

    _selection: {
      type: Object,
      observer: '_selectionChanged'
    },

    /**
     * Set to true to prevent from fire event to navigate to the task.
     **/
    noNavigation: Boolean
  },

  _selectionChanged: function() {
    if (this._selection && !this.noNavigation) {
      this.navigateTo('tasks', this._selection.id);
    }
  },

  _currentChanged: function(newVal, oldVal) {
    if (newVal && oldVal && newVal.id === oldVal.id) {
      return;
    }
    if (newVal && this.tasks) {
      for (var i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].id === newVal.id) {
          this.$.list.selectItem(this.tasks[i]);
          break;
        }
      }
    } else {
      var _exists = this.tasks && this.tasks.indexOf(oldVal) > -1;
      // make sure this task still exists to avoid iron-list exceptions
      if (_exists) {
        this.$.list.deselectItem(oldVal);
      }
    }
  },

  _computedClass: function(isSelected) {
    var classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  }
});

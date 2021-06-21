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
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-list/nuxeo-data-list.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-date.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-tasks-list`
@group Nuxeo UI
@element nuxeo-tasks-list
*/
Polymer({
  _template: html`
    <style include="iron-flex">
      :host {
        display: block;
        position: relative;
        height: calc(100vh - 7.7em - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
      }

      .task-box {
        line-height: 155%;
      }

      .task-box + .task-box {
        border-top: 1px solid var(--divider-color);
      }

      .task-due-date {
        opacity: 0.5;
        margin-right: 0.5rem;
      }

      .taskDoc .doc-title,
      .date {
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

      .task-name {
        font-weight: bold;
      }

      .horizontal {
        @apply --layout-horizontal;
        @apply --layout-center;
      }
    </style>

    <nuxeo-connection id="nx"></nuxeo-connection>

    <nuxeo-task-page-provider id="tasksProvider"></nuxeo-task-page-provider>
    <nuxeo-data-list
      nx-provider="tasksProvider"
      id="list"
      as="task"
      selected-item="{{_selection}}"
      empty-label="[[i18n('tasksList.noTasks')]]"
      selection-enabled
      select-on-tap
    >
      <template>
        <div tabindex$="{{tabIndex}}" class$="[[_computedClass(selected)]]">
          <div class="task-box">
            <div class="horizontal layout center">
              <span class="task-name">[[i18n(task.name)]]</span>
            </div>
            <div>
              <div class="taskDoc horizontal">
                <span class="doc-title">[[task.targetDocumentIds.0.title]]</span>
              </div>
              <div class="horizontal">
                <span class="task-due-date">[[i18n('tasksList.dueDate')]]</span>
                <span class="date">
                  <nuxeo-date datetime="[[task.dueDate]]" format="relative"></nuxeo-date>
                </span>
              </div>
            </div>
            <div class="horizontal">
              <span>[[i18n(task.workflowModelName)]]</span>
            </div>
          </div>
        </div>
      </template>
    </nuxeo-data-list>
  `,

  is: 'nuxeo-tasks-list',
  behaviors: [RoutingBehavior, I18nBehavior],

  properties: {
    current: {
      type: Object,
      observer: '_currentChanged',
    },

    _selection: {
      type: Object,
      observer: '_selectionChanged',
    },

    /**
     * Set to true to prevent from fire event to navigate to the task.
     * */
    noNavigation: Boolean,
  },

  ready() {
    this.$.nx.connect().then((user) => {
      this.$.tasksProvider.params = {
        userId: user.id,
      };
    });
  },

  _selectionChanged() {
    if (this._selection && !this.noNavigation) {
      this.navigateTo('tasks', this._selection.id);
    }
  },

  selectTask(index, task, { offset, pageSize }) {
    let fetch;
    const tasks = this.$.list.items;
    if (tasks.find((item) => item.id === task.id)) {
      fetch = Promise.resolve();
    } else {
      fetch = this.fetch(offset, pageSize);
    }
    fetch.then(() => {
      if (tasks[index] && tasks[index].id !== task.id) {
        index = tasks.findIndex((item) => item.id === task.id);
      }
      this.$.list.scrollToIndex(index);
      this.$.list.selectIndex(index);
    });
  },

  _currentChanged(newVal, oldVal) {
    if (
      (newVal && oldVal && newVal.id === oldVal.id) ||
      (this._selection && newVal && this._selection.id === newVal.id)
    ) {
      return;
    }
    const tasks = this.$.list.items;
    if (newVal && tasks) {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === newVal.id) {
          this.$.list.selectItem(tasks[i]);
          break;
        }
      }
    } else if (oldVal) {
      const task = tasks.find((item) => item.id === oldVal.id);
      // make sure this task still exists to avoid iron-list exceptions
      if (task) {
        this.$.list.deselectItem(task);
      }
    }
  },

  _computedClass(isSelected) {
    let classes = 'list-item';
    if (isSelected) {
      classes += ' selected';
    }
    return classes;
  },

  fetch(offset, pageSize = this.$.tasksProvider.pageSize) {
    if (offset) {
      return this.$.list._fetchRange(offset, offset + pageSize, false);
    }
    return this.$.list.fetch();
  },
});

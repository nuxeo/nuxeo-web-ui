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
`nuxeo-document-task-assignment-popup`
@group Nuxeo UI
@element nuxeo-document-task-assignment-popup
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/iron-form/iron-form.js';

import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tags.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-textarea.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-user-suggestion.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }
    </style>

    <nuxeo-resource id="taskAssignment" path="/task/[[task.id]]/[[action]]" params="[[params]]"></nuxeo-resource>

    <nuxeo-dialog id="assignmentDialog" with-backdrop="" no-auto-focus="">
      <h2>[[i18n(task.name)]]</h2>
      <paper-dialog-scrollable>
        <iron-form id="assignmentForm">
          <form>
            <nuxeo-user-suggestion name="userGroup" label="[[i18n('tasks.assignment.userOrGroup')]]" value="{{actors}}" multiple="true" required="true" placeholder="[[i18n('tasks.assignment.placeholder')]]">
            </nuxeo-user-suggestion>
            <nuxeo-textarea id="commentText" label="[[i18n('tasks.assignment.comment')]]" placeholder="[[i18n('tasks.assignment.placeholder')]]" value="[[comment]]" max-rows="4">
            </nuxeo-textarea>
          </form>
        </iron-form>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button id="cancel" noink="" dialog-dismiss="">[[i18n('command.close')]]</paper-button>
        <paper-button id="confirm" noink="" class="primary" on-click="_processAssignment">[[_getActionLabel(action, i18n)]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-document-task-assignment-popup',
  behaviors: [I18nBehavior],

  properties: {
    task: {
      type: Object
    },

    action: {
      type: String
    }
  },

  openPopup: function() {
    this._resetPopup();
    this.$.assignmentDialog.open();
  },

  _getActionLabel: function(action, i18n) {
    return i18n('tasks.' + action);
  },

  _processAssignment: function() {
    if (this.$.assignmentForm.validate()) {
      this.params['comment'] = this.comment;
      this.params[this.action === 'delegate' ? 'delegatedActors' : 'actors'] = this.actors;

      this.$.taskAssignment.put().then(function(task) {
        this.$.assignmentDialog.close();
        this.fire('workflowTaskAssignment', { task: task });
      }.bind(this));
    }
  },

  _resetPopup: function() {
    this.actors = [];
    this.comment = null;
    this.params = {};

    this.$.assignmentForm.reset();
  }
});

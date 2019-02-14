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
`nuxeo-confirm-button`
@group Nuxeo UI
@element nuxeo-confirm-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      :host {
        display: block;
      }

      .title {
        margin: 16px;
        text-align: center;
      }

      .dialog {
        margin: 0;
        padding: 0;
        border-radius: 4px;
      }

      .actions {
        @apply --layout-horizontal;
        @apply --layout-justified;
        margin: 8px;
        padding: 0;
        text-align: right;
      }
    </style>

    <paper-button noink="" id="button" class="primary" on-tap="_toggleDialog">
      <slot></slot>
    </paper-button>

    <nuxeo-dialog id="dialog" class="dialog" no-overlap="" horizontal-align="auto" vertical-align="auto" on-iron-overlay-closed="_dismiss">
      <div class="title">[[dialogTitle]]</div>
      <div class="actions">
        <paper-button noink="" dialog-dismiss="">[[dialogDismiss]]</paper-button>
        <paper-button noink="" dialog-confirm="" class="primary" on-tap="_confirm">[[dialogConfirm]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-confirm-button',

  properties: {
    dialogTitle: {
      type: String,
      value: 'Are you sure?'
    },
    dialogConfirm: {
      type: String,
      value: 'Yes'
    },
    dialogDismiss: {
      type: String,
      value: 'No'
    },
    _model: {
      type: Object
    }
  },

  ready: function() {
    this.$.dialog.positionTarget = this.$.button;
  },

  _toggleDialog: function(e) {
    this._model = e.model;
    this.$.dialog.toggle();
  },

  _confirm: function() {
    this.fire('confirm', {model: this._model});
  },

  _dismiss: function() {
    this.fire('dismiss', {model: this._model});
  }
});

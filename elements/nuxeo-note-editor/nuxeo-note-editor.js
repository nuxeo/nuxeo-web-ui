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
`nuxeo-note-editor`
@group Nuxeo UI
@element nuxeo-note-editor
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-preview.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-html-editor.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="nuxeo-styles iron-flex iron-flex-alignment">
      :host {
        display: block;
      }

      .main {
        position: relative;
      }

      .edit {
        position: absolute;
      }

      #editNote.edit {
        right: 10px;
        top: 10px;
      }

      #editHtml.edit {
        left: 0;
        bottom: 0;
        padding: 0;
        width: 24px;
        height: 24px;
        z-index: 1;
      }

      .html-editor-container paper-textarea {
        padding: 0;
      }

      paper-textarea,
      nuxeo-document-preview,
      nuxeo-html-editor {
        display: block;
        min-height: calc(80vh - 132px);
      }

      paper-textarea {
        --paper-input-container-underline: {
          border-bottom: none 0;
        };
        --paper-input-container-underline-focus: {
          border-bottom: none 0;
        };
      }

    </style>

    <nuxeo-document id="note" doc-id="[[document.uid]]"></nuxeo-document>

    <div class="main">

      <template is="dom-if" if="[[_isHTML(document)]]">
        <div class="html-editor-container">
          <paper-icon-button id="editHtml" class="edit" icon="[[_computeHtmlEditIcon(_viewMode)]]" on-tap="_toggleHtmlSource" hidden\$="[[!_canEdit(document)]]"></paper-icon-button>
          <paper-tooltip for="editHtml" position="right">[[_computeHtmlEditLabel(_viewMode, i18n)]]</paper-tooltip>
          <template is="dom-if" if="[[_viewMode]]">
            <nuxeo-html-editor value="{{_value}}" read-only="[[!_canEdit(document)]]"></nuxeo-html-editor>
          </template>
          <template is="dom-if" if="[[!_viewMode]]">
            <paper-textarea value="{{_value}}" no-label-float="" placeholder="[[i18n('noteViewLayout.placeholder')]]"></paper-textarea>
          </template>
          <div class="layout horizontal end-justified">
            <paper-button name="editorSave" noink="" class="primary" on-tap="_editorSave" hidden\$="[[!_canEdit(document)]]">[[i18n('command.save')]]</paper-button>
          </div>
        </div>
      </template>

      <template is="dom-if" if="[[!_isHTML(document)]]">
        <template is="dom-if" if="[[_viewMode]]">
          <paper-icon-button id="editNote" class="edit" icon="nuxeo:edit" on-tap="_edit" hidden\$="[[!_canEdit(document)]]"></paper-icon-button>
          <paper-tooltip for="editNote" position="bottom">[[i18n('command.edit')]]</paper-tooltip>
          <nuxeo-document-preview document="[[document]]"></nuxeo-document-preview>
        </template>
        <template is="dom-if" if="[[!_viewMode]]">
          <paper-textarea value="{{_value}}" no-label-float="" placeholder="[[i18n('noteViewLayout.placeholder')]]"></paper-textarea>
          <div class="layout horizontal end-justified">
            <paper-button noink="" on-tap="_cancel">[[i18n('command.cancel')]]</paper-button>
            <paper-button name="editorSave" noink="" class="primary" on-tap="_editorSave">[[i18n('command.save')]]</paper-button>
          </div>
        </template>
      </template>

    </div>
`,

  is: 'nuxeo-note-editor',
  behaviors: [Nuxeo.LayoutBehavior],

  properties: {
    document: {
      type: Object,
      observer: '_documentChanged'
    },
    _viewMode: {
      type: Boolean,
      value: true
    },
    _value: {
      type: String,
      value: ''
    }
  },

  _documentChanged: function() {
    this._value = this.document.properties['note:note'];
  },

  _isHTML: function() {
    return this.document && this.document.properties['note:mime_type'] === 'text/html';
  },

  _computeHtmlEditIcon: function() {
    return this._viewMode ? 'icons:code' : 'nuxeo:edit';
  },

  _computeHtmlEditLabel: function() {
    return this._viewMode ? this.i18n('noteEditor.editSource') : this.i18n('noteEditor.editRich');
  },

  _editorSave: function() {
    this.$.note.data = {
      'entity-type': 'document',
      uid: this.document.uid,
      properties: {
        'note:note': this._value
      }
    };
    this.$.note.put().then(function() {
      this.fire('notify', {message: this.i18n('noteViewLayout.note.saved')});
      this._viewMode = true;
      this.fire('document-updated');
    }.bind(this));
  },

  _isMutable: function(document) {
    return !this.hasFacet(document, 'Immutable') && document.type !== 'Root' && !this.isTrashed(document);
  },

  _canEdit: function(document) {
    return document.type !== 'Root' && this.hasPermission(document, 'Write') && this._isMutable(document);
  },

  _edit: function() {
    this._value = this.document.properties['note:note'];
    this._viewMode = false;
  },

  _cancel: function() {
    this._value = '';
    this._viewMode = true;
  },

  _toggleHtmlSource: function() {
    this._viewMode = !this._viewMode;
  }
});

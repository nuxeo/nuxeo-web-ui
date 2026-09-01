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

import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import { NotifyBehavior } from '@nuxeo/nuxeo-elements/nuxeo-notify-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-preview.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-html-editor.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-note-editor`
@group Nuxeo UI
@element nuxeo-note-editor
*/
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

      #editNote.edit,
      #editHtmlNote.edit {
        right: 10px;
        top: 10px;
      }

      :host([dir='rtl']) #editNote.edit,
      :host([dir='rtl']) #editHtmlNote.edit {
        left: 10px;
        right: auto;
      }

      #editHtml.edit {
        left: 0;
        bottom: 0;
        padding: 0;
        width: 24px;
        height: 24px;
        z-index: 1;
      }

      :host([dir='rtl']) #editHtml.edit {
        left: auto;
        right: 0;
      }

      .html-editor-container paper-textarea {
        padding: 0;
      }

      paper-textarea,
      nuxeo-document-preview {
        display: block;
        min-height: calc(80vh - 90px);
      }

      #htmlPreview {
        display: block;
        width: 100%;
        min-height: calc(80vh - 90px);
        border: none;
        overflow: hidden;
      }

      nuxeo-html-editor {
        min-height: calc(80vh - 90px);
        height: var(--nuxeo-note-editor-html-height);
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
          <template is="dom-if" if="[[!_editing]]">
            <paper-icon-button
              id="editHtmlNote"
              class="edit"
              icon="nuxeo:edit"
              on-tap="_editHtml"
              hidden$="[[!_canEdit(document)]]"
              aria-labelledby="editHtmlNoteTooltip"
            ></paper-icon-button>
            <paper-tooltip for="editHtmlNote" position="bottom" id="editHtmlNoteTooltip"
              >[[i18n('command.edit')]]</paper-tooltip
            >
            <!-- The note is authored by users, so it is rendered in a sandbox without
                 allow-scripts: no inline handler, javascript: URL or embedded script can run.
                 allow-same-origin is granted only so the frame can be measured for sizing;
                 without allow-scripts nothing inside the frame can act on that access. -->
            <iframe
              id="htmlPreview"
              sandbox="allow-same-origin"
              title$="[[i18n('noteEditor.htmlPreview')]]"
              srcdoc$="[[_computeHtmlPreview(document)]]"
              on-load="_resizeHtmlPreview"
            ></iframe>
          </template>
          <template is="dom-if" if="[[_editing]]">
            <paper-icon-button
              id="editHtml"
              class="edit"
              icon="[[_computeHtmlEditIcon(_viewMode)]]"
              on-tap="_toggleHtmlSource"
              aria-labelledby="editHtmlTooltip"
            ></paper-icon-button>
            <paper-tooltip for="editHtml" position="right" id="editHtmlTooltip"
              >[[_computeHtmlEditLabel(_viewMode, i18n)]]</paper-tooltip
            >
            <template is="dom-if" if="[[_viewMode]]">
              <nuxeo-html-editor value="{{_value}}"></nuxeo-html-editor>
            </template>
            <template is="dom-if" if="[[!_viewMode]]">
              <paper-textarea
                value="{{_value}}"
                no-label-float
                placeholder="[[i18n('noteViewLayout.placeholder')]]"
              ></paper-textarea>
            </template>
            <div class="layout horizontal end-justified">
              <paper-button noink on-tap="_cancel">[[i18n('command.cancel')]]</paper-button>
              <paper-button name="editorSave" noink class="primary" on-tap="_editorSave"
                >[[i18n('command.save')]]</paper-button
              >
            </div>
          </template>
        </div>
      </template>

      <template is="dom-if" if="[[!_isHTML(document)]]">
        <template is="dom-if" if="[[_viewMode]]">
          <paper-icon-button
            id="editNote"
            class="edit"
            icon="nuxeo:edit"
            on-tap="_edit"
            hidden$="[[!_canEdit(document)]]"
            aria-labelledby="editNoteTooltip"
          ></paper-icon-button>
          <paper-tooltip for="editNote" position="bottom" id="editNoteTooltip">[[i18n('command.edit')]]</paper-tooltip>
          <nuxeo-document-preview document="[[document]]"></nuxeo-document-preview>
        </template>
        <template is="dom-if" if="[[!_viewMode]]">
          <paper-textarea
            value="{{_value}}"
            no-label-float
            placeholder="[[i18n('noteViewLayout.placeholder')]]"
          ></paper-textarea>
          <div class="layout horizontal end-justified">
            <paper-button noink on-tap="_cancel">[[i18n('command.cancel')]]</paper-button>
            <paper-button name="editorSave" noink class="primary" on-tap="_editorSave"
              >[[i18n('command.save')]]</paper-button
            >
          </div>
        </template>
      </template>
    </div>
  `,

  is: 'nuxeo-note-editor',
  behaviors: [NotifyBehavior, LayoutBehavior],

  properties: {
    document: {
      type: Object,
      observer: '_documentChanged',
    },
    _viewMode: {
      type: Boolean,
      value: true,
    },
    /**
     * Whether an HTML note is being edited. HTML notes are displayed as stored until the user
     * opts in to editing, because the rich text editor cannot represent every HTML construct.
     */
    _editing: {
      type: Boolean,
      value: false,
    },
    _value: {
      type: String,
      value: '',
    },
  },

  ready() {
    if (!this.hasAttribute('dir')) {
      const direction = document.documentElement.getAttribute('dir');
      this.setAttribute('dir', direction);
    }
  },

  _documentChanged(document, previous) {
    this._value = this.document.properties['note:note'];
    // Editing state belongs to the document being edited: showing a different note must not
    // drop the reader straight into the editor. A refresh of the same document is left alone
    // so an in-progress edit survives it.
    if (previous && previous.uid !== document.uid) {
      this._viewMode = true;
      this._editing = false;
    }
  },

  _computeHtmlPreview(document) {
    const content = (document && document.properties && document.properties['note:note']) || '';
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      body { margin: 0; font-family: var(--nuxeo-app-font, Inter, sans-serif); font-size: 13px; color: #333; }
      table { border-collapse: collapse; }
      img { max-width: 100%; }
    </style></head><body>${content}</body></html>`;
  },

  _resizeHtmlPreview(e) {
    const frame = e.target;
    const body = frame.contentDocument && frame.contentDocument.body;
    if (body) {
      frame.style.height = `${body.scrollHeight + 32}px`;
    }
  },

  _isHTML() {
    return this.document && this.document.properties['note:mime_type'] === 'text/html';
  },

  _computeHtmlEditIcon() {
    return this._viewMode ? 'icons:code' : 'nuxeo:edit';
  },

  _computeHtmlEditLabel() {
    return this._viewMode ? this.i18n('noteEditor.editSource') : this.i18n('noteEditor.editRich');
  },

  _editorSave() {
    this.$.note.data = {
      'entity-type': 'document',
      uid: this.document.uid,
      properties: {
        'note:note': this._value,
      },
    };
    this.$.note.put().then(() => {
      this.notify({ message: this.i18n('noteViewLayout.note.saved') });
      this._viewMode = true;
      this._editing = false;
      this.fire('document-updated');
    });
  },

  _isMutable(document) {
    return !this.hasFacet(document, 'Immutable') && document.type !== 'Root' && !this.isTrashed(document);
  },

  _canEdit(document) {
    return document.type !== 'Root' && this.hasPermission(document, 'WriteProperties') && this._isMutable(document);
  },

  _edit() {
    this._value = this.document.properties['note:note'];
    this._viewMode = false;
  },

  _editHtml() {
    this._value = this.document.properties['note:note'];
    this._viewMode = true;
    this._editing = true;
  },

  _cancel() {
    this._value = '';
    this._viewMode = true;
    this._editing = false;
  },

  _toggleHtmlSource() {
    this._viewMode = !this._viewMode;
  },
});

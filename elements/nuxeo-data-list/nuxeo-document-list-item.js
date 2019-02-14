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
`nuxeo-document-list-item`
@group Nuxeo UI
@element nuxeo-document-list-item
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-download-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-favorites-toggle-button.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '../nuxeo-document-highlight/nuxeo-document-highlights.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment">
      :host {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;
      }

      .listBox {
        display: block;
        margin: 0 .4em .8em;
        position: relative;
        background-color: var(--nuxeo-box);
        box-shadow: 0 3px 5px rgba(0,0,0,0.04);;
        padding: 0;
        filter: 0.1s ease-out, filter 0.1s ease-out;
        -webkit-filter: 0.1s ease-out, filter 0.1s ease-out;
        border: 2px solid transparent;
      }

      .listBox:hover,
      .listBox:focus {
        border: 2px solid var(--nuxeo-link-hover-color);
        box-shadow: 0 3px 5px rgba(0,0,0,0.04);
      }

      .listBox .title {
        margin-bottom: .4em;
      }

      .listBox:hover .title {
        color: var(--nuxeo-link-hover-color);
      }

      .thumbnailContainer {
        background-color: rgba(0,0,0,0.1);
        width: 10rem;
        height: 10rem;
        position: relative;
      }

      .thumbnailContainer img {
        height: auto;
        width: auto;
        max-height: 100%;
        max-width: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
      }

      .dataContainer {
        padding: .5rem 1rem;
      }

      .dataContainer p {
        margin: 0 0 .4em;
        font-size: .75rem;
      }

      .listBox .select {
        display: none;
        position: absolute;
        top: 1rem;
        left: 1rem;
        border: 2px solid #ddd;
        background-color: var(--nuxeo-box);
        z-index: 2;
        border-radius: 3em;
      }

      .select paper-icon-button {
        margin: 0;
        padding: .3em;
        box-sizing: border-box;
      }

      .listBox .select,
      .select paper-icon-button {
        width: 2.5em;
        height: 2.5em;
      }

      .select:hover paper-icon-button {
        color: #fff;
      }

      .title {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        display: block;
      }

      .listBox .actions {
        display: none;
        background-color: var(--nuxeo-box);
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        min-height: 2.5em;
        width: 10rem;
      }

      .actions ::content paper-icon-button ::content iron-icon {
        @apply --nuxeo-action;
      }

      .actions ::content paper-icon-button:hover ::content iron-icon {
        @apply --nuxeo-action-hover;
      }

      .listBox:hover .actions,
      .listBox:hover .select,
      .listBox[selection-mode] .select {
        display: block;
      }

      .listBox:hover .select:hover {
        border: 2px solid var(--nuxeo-button-primary);
        background-color: var(--nuxeo-button-primary);
      }

      :host([selected]) .listBox .select,
      :host([selected]) .listBox:hover .select:hover {
        border: 2px solid var(--nuxeo-grid-selected);
        background-color: var(--nuxeo-grid-selected);
        display: block;
      }

      :host([selected]) .select paper-icon-button {
        color: #fff;
      }

      :host([selected]) .listBox {
        border: 2px solid var(--nuxeo-grid-selected);
        box-shadow: 0 3px 5px rgba(0,0,0,0.04);
      }

      :host(.droptarget-hover) .listBox {
        border: 2px dashed var(--nuxeo-grid-selected);
      }

      .typeSelection paper-button {
        width: var(--nuxeo-document-creation-form-button-width, 128px);
        height: var(--nuxeo-document-creation-form-button-height, 128px);
        box-shadow: none;
        background-color: var(--nuxeo-dialog-buttons-bar);
      }

      nuxeo-document-highlights {
        font-size: .85rem;
      }

      .vignette {
        display: flex;
      }

    </style>

    <div class="listBox grid-box" selection-mode\$="[[selectionMode]]">
      <div class="horizontal layout">
        <div class="vignette thumbnailContainer" on-tap="handleClick">
          <img src="[[_thumbnail(doc)]]">
        </div>
        <div class="dataContainer flex" on-tap="handleClick">
          <div class="horizontal layout center">
            <a class="title flex">
              <div class="title">[[doc.title]]</div>
            </a>
            <nuxeo-tag>[[formatDocType(doc.type)]]</nuxeo-tag>
          </div>
          <nuxeo-document-highlights highlights="[[doc.contextParameters.highlight]]"></nuxeo-document-highlights>
        </div>
        <div class="actions">
          <nuxeo-favorites-toggle-button document="[[doc]]"></nuxeo-favorites-toggle-button>
          <nuxeo-download-button document="[[doc]]"></nuxeo-download-button>
        </div>
        <div class="select">
          <paper-icon-button noink="" icon="icons:check" title="select" on-tap="_onCheckBoxTap"></paper-icon-button>
        </div>
      </div>
    </div>
`,

  is: 'nuxeo-document-list-item',
  behaviors: [FormatBehavior, RoutingBehavior],

  properties: {
    doc: {
      type: Object,
      notify: true
    },

    offset: {
      type: Number,
      value: -1
    },

    selected: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },

    selectedItems: {
      type: Array,
      value: []
    },

    index: {
      type: Number
    }
  },

  observers: [
    '_selectedItemsChanged(selectedItems.splices)'
  ],

  _thumbnail: function(doc) {
    return doc && doc.uid && doc.contextParameters && doc.contextParameters.thumbnail &&
           doc.contextParameters.thumbnail.url ? doc.contextParameters.thumbnail.url : '';
  },

  handleClick: function(e) {
    if (this.selectionMode) {
      this._toogleSelect(e);
    } else if (!(e.ctrlKey || e.shiftKey || e.metaKey || e.button === 1)) {
      this.fire('navigate', {item: this.doc, index: this.index});
    }
  },

  _onCheckBoxTap: function(e) {
    this._toogleSelect(e);
  },

  _toogleSelect: function(e) {
    this.selected = !this.selected;
    this.fire('selected', {index: this.index, shiftKey: e.detail.sourceEvent.shiftKey});
  },

  _selectedItemsChanged: function() {
    this.selectionMode = this.selectedItems && this.selectedItems.length > 0;
  }
});

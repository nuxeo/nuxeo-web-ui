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
`nuxeo-document-grid-thumbnail`
@group Nuxeo UI
@element nuxeo-document-grid-thumbnail
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-download-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-favorites-toggle-button.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        outline: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;
      }

      a {
        @apply --nuxeo-link;
      }

      .bubbleBox {
        display: block;
        margin: 0 .4em .8em;
        position: relative;
        width: 220px;
        height: 260px;
        background-color: var(--nuxeo-box);
        box-shadow: 0 3px 5px rgba(0,0,0,0.04);;
        padding: 0;
        filter: 0.1s ease-out, filter 0.1s ease-out;
        -webkit-filter: 0.1s ease-out, filter 0.1s ease-out;
        border: 2px solid transparent;
      }

      .bubbleBox:hover,
      .bubbleBox:focus {
        z-index: 500;
        border: 2px solid var(--nuxeo-link-hover-color);
        box-shadow: 0 3px 5px rgba(0,0,0,0.04);
      }

      .bubbleBox .title {
        margin-bottom: .4em;
      }

      .bubbleBox:hover .title {
        color: var(--nuxeo-link-hover-color);
      }

      .thumbnailContainer {
        background-color: rgba(0,0,0,0.1);
        width: 100%;
        height: 190px;
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
        padding: .3em .8em;
      }

      .dataContainer p {
        margin: 0 0 .4em;
        font-size: .75rem;
      }

      .bubbleBox .select {
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

      .bubbleBox .select,
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

      .bubbleBox .actions {
        display: none;
        background-color: var(--nuxeo-box);
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        min-height: 2.5em;
      }

      .actions paper-icon-button iron-icon {
        @apply --nuxeo-action;
      }

      .actions paper-icon-button:hover iron-icon {
        @apply --nuxeo-action-hover;
      }

      .bubbleBox:hover .actions,
      .bubbleBox:hover .select,
      .bubbleBox[selection-mode] .select {
        display: block;
      }

      .bubbleBox:hover .select:hover {
        border: 2px solid var(--nuxeo-button-primary);
        background-color: var(--nuxeo-button-primary);
      }

      :host([selected]) .bubbleBox .select,
      :host([selected]) .bubbleBox:hover .select:hover {
        border: 2px solid var(--nuxeo-grid-selected);
        background-color: var(--nuxeo-grid-selected);
        display: block;
      }

      :host([selected]) .select paper-icon-button {
        color: #fff;
      }

      :host([selected]) .bubbleBox {
        border: 2px solid var(--nuxeo-grid-selected);
        box-shadow: 0 3px 5px rgba(0,0,0,0.04);
      }

      :host(.droptarget-hover) .bubbleBox {
        border: 2px dashed var(--nuxeo-grid-selected);
      }

    </style>

    <div class="bubbleBox grid-box" selection-mode\$="[[selectionMode]]">
      <div class="thumbnailContainer" on-tap="handleClick">
        <img src="[[_thumbnail(doc)]]">
      </div>
      <template is="dom-if" if="[[_hasDocument(doc)]]">
        <a class="title" href\$="[[urlFor('browse', doc.path)]]" on-tap="handleClick">
          <div class="dataContainer">
            <div class="title">[[doc.title]]</div>
            <nuxeo-tag>[[formatDocType(doc.type)]]</nuxeo-tag>
          </div>
        </a>
        <div class="actions">
          <nuxeo-favorites-toggle-button document="[[doc]]"></nuxeo-favorites-toggle-button>
          <nuxeo-download-button document="[[doc]]"></nuxeo-download-button>
        </div>
        <div class="select">
          <paper-icon-button noink="" icon="icons:check" title="select" on-tap="_onCheckBoxTap"></paper-icon-button>
        </div>
      </template>
    </div>
`,

  is: 'nuxeo-document-grid-thumbnail',
  behaviors: [FormatBehavior, Nuxeo.RoutingBehavior],

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

  _selectedItemsChanged: function(){
    this.selectionMode = this.selectedItems && this.selectedItems.length > 0;
  },

  _hasDocument: function() {
    return this.doc && this.doc.uid;
  }
});

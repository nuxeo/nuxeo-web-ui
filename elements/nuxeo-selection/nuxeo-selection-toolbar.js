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
### Styling

The following custom properties and mixins are available for styling:

Custom property                        | Description                        | Default
---------------------------------------|------------------------------------|-----------------------
`--nuxeo-selection-toolbar-background` | Background color                   | #000
`--nuxeo-selection-toolbar-text`       | Text color                         | #fff
`--nuxeo-selection-toolbar-link`       | Link color                         | #fff
`--nuxeo-selection-toolbar-link-hover` | Link hover color                   | #000
`--nuxeo-selection-toolbar`            | Mixin applied to the toolbar       | `{}`

`nuxeo-selection-toolbar`
@group Nuxeo UI
@element nuxeo-selection-toolbar
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import '../nuxeo-document-thumbnail/nuxeo-document-thumbnail.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style is="iron-flex iron-flex-alignment nuxeo-styles">
      :host {
        font-family: var(--nuxeo-app-font);
      }

      .toolbar {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-fit;
        height: 60px;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 199;
        padding: 0 2em;
        font-weight: 300;
        box-shadow: 0 0 3px rgba(0,0,0,0.4);
        background: var(--nuxeo-selection-toolbar-background, #000);
        color: var(--nuxeo-selection-toolbar-text, #fff);
        @apply --nuxeo-selection-toolbar;
      }

      .actions {
        @apply --layout-horizontal;
        @apply --layout-center;
        @apply --layout-flex;
        @apply --layout-end-justified;
      }

      .count {
        font-weight: 600;
      }

      #selectedItemsPopup {
        margin-top: 196px;
      }

      .horizontal {
        @apply --layout-flex;
        @apply --layout-horizontal;
      }

      /* links */
      a, a:active, a:visited, a:focus {
        display: inline-block;
        vertical-align: bottom;
        text-decoration: underline;
        margin-left: 1em;
        color: var(--nuxeo-selection-toolbar-link, #fff);
        cursor: pointer;
      }
      a:hover {
        color: var(--nuxeo-selection-toolbar-link-hover, #000);
      }
    </style>

    <div class="horizontal center layout" id="content">
      <div id="selectionToolbar" class="toolbar">
        <div class="selection">
          <span class="count">[[i18n('selectionToolbar.selected.items', selectedItems.length)]]</span>
          <a class="selectionLink" on-tap="toogleSelectedItemsPopup">
            <span>[[i18n('selectionToolbar.display.selection')]]</span>
          </a>
          <a class="selectionLink" on-tap="clearSelection">
            <span>[[i18n('command.clear')]]</span>
          </a>
        </div>
        <div class="actions">
          <slot></slot>
        </div>
      </div>
    </div>

    <nuxeo-dialog id="selectedItemsPopup" no-auto-focus="" with-backdrop="">
      <h2>[[i18n('selectionToolbar.dialog.heading')]]</h2>
      <paper-dialog-scrollable>
        <template is="dom-repeat" items="[[selectedItems]]">
          <div class="layout horizontal center">
            <nuxeo-document-thumbnail document="[[item]]"></nuxeo-document-thumbnail><div>[[item.title]]</div>
          </div>
        </template>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button dialog-dismiss="">[[i18n('command.close')]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-selection-toolbar',
  behaviors: [I18nBehavior],

  properties: {
    hidden: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },
    selectedItems: {
      type: Object,
      value: [],
      notify: true
    },
    _isDisplayToolbar: {
      type: Boolean,
      value: false
    }
  },

  observers: [
    '_observeSelectedItems(selectedItems)'
  ],

  _observeSelectedItems: function() {
    this.hidden = !this.selectedItems || (this.selectedItems.length === 0);
  },

  toogleSelectedItemsPopup: function() {
    this.$$('#selectedItemsPopup').toggle();
  },

  clearSelection: function() {
    this.fire('clear-selected-items');
  }
});

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
`nuxeo-document-create-button`
@group Nuxeo UI
@element nuxeo-document-create-button
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-elements/nuxeo-document.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-slots.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import '../nuxeo-document-creation-stats/nuxeo-document-creation-stats.js';
import '../nuxeo-keys/nuxeo-keys.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      paper-fab {
        width: var(--nuxeo-document-create-button-width, 56px);
        height: var(--nuxeo-document-create-button-height, 56px);
        color: var(--nuxeo-button-primary-text);
        --paper-fab-background: var(--nuxeo-button-primary);
        --paper-fab-keyboard-focus-background: var(--nuxeo-button-primary-focus);
        @apply --nuxeo-document-create-button;
        transition: color 0.25s ease-in-out;
      }

      paper-fab:hover,
      paper-fab:focus {
        background-color: var(--nuxeo-button-primary-focus);
      }

      #tray {
        position: absolute;
        bottom: 32px;
        right: 32px;
        z-index: 10;
      }

      #shortcuts {
        opacity: 0;
        transition: opacity 0.25s ease-in-out;
      }

      #shortcuts.open {
        opacity: 1;
      }

      nuxeo-document-create-shortcuts {
        --nuxeo-document-create-shortcut-margin: 0 0 16px 0;
      }
    </style>

    <nuxeo-document id="defaultDoc" doc-path="[[parent.path]]" enrichers="permissions, subtypes" response="{{parent}}">
    </nuxeo-document>

    <div id="tray" on-mouseenter="_onMouseEnter" on-mouseleave="_onMouseLeave">
      <div id="shortcuts" class\$="[[_animateOpen(shortcutsVisible)]]">
        <div hidden\$="[[!shortcutsVisible]]">
          <nuxeo-slot slot="DOCUMENT_CREATE_ACTIONS" model="[[actionContext]]"></nuxeo-slot>
        </div>
      </div>

      <paper-fab id="createBtn" noink="" icon="nuxeo:add" on-tap="_displayWizard"></paper-fab>
       <!-- nuxeo-tooltip does not play nice (in shadycss) when attached to elements that are position: absolute -->
       <paper-tooltip for="createBtn" position="left">[[i18n('documentCreateButton.tooltip')]]</paper-tooltip>
    </div>

    <nuxeo-document-creation-stats id="creationStats"></nuxeo-document-creation-stats>

    <nuxeo-keys keys="c" on-pressed="_displayWizard"></nuxeo-keys>
`,

  is: 'nuxeo-document-create-button',
  behaviors: [I18nBehavior],

  properties: {
    parent: {
      type: Object,
      observer: '_parentChanged'
    },
    subtypes: {
      type: Array
    },
    shortcutsVisible: {
      type: Boolean,
      value: false
    },
    actionContext: {
      type: Object,
      value: function() {
        return {};
      },
      computed: '_actionContext(shortcutsVisible,subtypes)'
    }
  },

  listeners: {
    'create-document': '_hideShortcuts'
  },

  _parentChanged: function() {
    if (this.parent) {
      if (!this.parent.contextParameters || !this.parent.contextParameters.subtypes ||
        !this.parent.contextParameters.permissions) {
        this.$.defaultDoc.get();
      } else {
        var subtypes = (this.parent.contextParameters && this.parent.contextParameters.subtypes) ?
          this.parent.contextParameters.subtypes.map(function(type) {
            type.id = type.type.toLowerCase();
            return type;
          }) : [];
        var filteredSubtypes = [];
        if (this._canCreateIn(this.parent)) {
          subtypes.forEach(function(type) {
            if (type.facets.indexOf('HiddenInCreation') === -1) {
              filteredSubtypes.push(type.id);
            }
          }.bind(this));
        }
        this.set('subtypes', filteredSubtypes);
      }
    }
  },

  _canCreateIn: function(document) {
    if (document && document.contextParameters && document.contextParameters.permissions) {
      return document.contextParameters.permissions.indexOf('Write') > -1 ||
        document.contextParameters.permissions.indexOf('Everything') > -1;
    } else {
      return false;
    }
  },

  _actionContext: function() {
    return {hostVisible: this.shortcutsVisible, subtypes: this.subtypes};
  },

  _showShortcuts: function() {
    this.shortcutsVisible = true;
  },

  _hideShortcuts: function() {
    this.shortcutsVisible = false;
  },

  _onMouseEnter: function() {
    this._showShortcuts();
  },

  _onMouseLeave: function() {
    this._hideShortcuts();
  },

  _displayWizard: function(e) {
    if (!this.hidden) {
      this.fire('create-document', e.detail);
    }
  },

  _animateOpen: function() {
    return this.shortcutsVisible ? 'open' : '';
  }
});

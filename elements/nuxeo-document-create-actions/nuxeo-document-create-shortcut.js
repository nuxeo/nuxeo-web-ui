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
`nuxeo-document-create-shortcut`
@group Nuxeo UI
@element nuxeo-document-create-shortcut
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-fab/paper-fab.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style is="custom-style">
      :host {
        display: inline-block;
      }

      #createBtn {
        color: var(--nuxeo-button-primary-text);
        --paper-fab-background: var(--nuxeo-button-primary);
        --paper-fab-keyboard-focus-background: var(--nuxeo-button-primary-focus);
      }

      paper-fab:hover,
      paper-fab:focus {
        background-color: var(--nuxeo-button-primary-focus);
      }

      paper-fab {
        --paper-fab-iron-icon: {
          filter: brightness(100);
        }
      }

    </style>

    <paper-fab mini="" noink="" id="createBtn" src="[[icon]]" on-tap="_tap"></paper-fab>
    <nuxeo-tooltip for="createBtn" position="left">[[i18n(label)]]</nuxeo-tooltip>
`,

  is: 'nuxeo-document-create-shortcut',
  behaviors: [I18nBehavior],

  properties: {
    type: String,
    icon: String,
    label: String
  },

  _tap: function() {
    this.fire('create-document', {type: this.type});
  }
});

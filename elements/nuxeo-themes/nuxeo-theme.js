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
`nuxeo-theme`
@group Nuxeo UI
@element nuxeo-theme
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-image/iron-image.js';
import '@polymer/paper-button/paper-button.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-card.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      nuxeo-card[selected] {
        border: 2px solid var(--default-primary-color);
        border-radius: 3px;
      }

      iron-image {
        width: 100%;
        height: 250px;
        margin-bottom: 8px;
        background-color: rgba(0,0,0,0.05);
      }

      .details {
        @apply --layout-horizontal;
        @apply --layout-justified;
        @apply --layout-center;
      }

      .label {
        margin-left: 8px;
      }

      paper-button {
        @apply --nx-button-primary;
      }

      paper-button[disabled] {
        @apply --nx-button-disabled;
      }
    </style>

    <nuxeo-card selected\$="[[_selected(name)]]">
      <iron-image src="[[_image(name)]]" sizing="contain"></iron-image>
      <div class="details">
        <div class="label">[[_label(name)]]</div>
        <paper-button on-tap="_apply" noink="" disabled\$="[[_selected(name)]]">
          [[_button(name)]]
        </paper-button>
      </div>
    </nuxeo-card>
`,

  is: 'nuxeo-theme',
  behaviors: [I18nBehavior],

  properties: {
    name: String,
    title: String,
    preview: String
  },

  _image: function(name) {
    return (this.preview) ? this.preview : 'themes/' + name + '/preview.jpg';
  },

  _label: function(name) {
    return (this.title) ? this.title : this.i18n('themes.' + name);
  },

  _button: function(name) {
    return this.i18n('themes.' + (this._selected(name) ? 'current' : 'apply'));
  },

  _selected: function(name) {
    var theme = localStorage.getItem('theme');
    return (theme) ? theme === name : name === 'default';
  },

  _apply: function() {
    localStorage.setItem('theme', this.name);
    this.fire('theme-changed', {theme: this.name});
  }
});

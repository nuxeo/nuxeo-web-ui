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
`nuxeo-page-item`
@group Nuxeo UI
@element nuxeo-page-item
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        outline: none;
        user-select: none;
        text-transform: uppercase;
        cursor: pointer;
        color: var(--disabled-text-color);
        margin: 0 0 0 16px;
        padding: 12px 6px 8px 6px;
        border-bottom: 2px solid transparent;
      }

      :host(:hover) {
        border-bottom: 2px solid var(--nuxeo-app-header-pill-hover);
        color: var(--nuxeo-app-header-pill-hover);
      }

      :host(.iron-selected) {
        border-bottom: 2px solid var(--nuxeo-app-header-pill-active);
        color: var(--nuxeo-app-header-pill-active);
      }
    </style>

    <div>[[i18n(label)]]</div>
`,

  is: 'nuxeo-page-item',
  behaviors: [I18nBehavior],

  properties: {

    /**
     * Item name
     */
    name: {
      type: String
    },

    /**
     * The 18n label key
     */
    label: {
      type: String
    }
  }
});

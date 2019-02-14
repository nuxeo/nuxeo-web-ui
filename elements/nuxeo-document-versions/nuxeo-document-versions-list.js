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
`nuxeo-document-versions-list`
@group Nuxeo UI
@element nuxeo-document-versions-list
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import '@polymer/paper-styles/element-styles/paper-material-styles.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style include="paper-material-styles">
      :host {
        display: inline-block;
        background: var(--nuxeo-box);
        @apply --paper-material-elevation-1;
      }

      #list-actions {
        @apply --layout-vertical;
        @apply --layout-center;
        @apply --buttons-bar;
        padding: 8px;
      }
    </style>

    <div id="list-items">
      <slot name="items"></slot>
    </div>

    <div id="list-actions">
      <slot name="actions"></slot>
    </div>
`,

  is: 'nuxeo-document-versions-list',

  behaviors: [
    IronOverlayBehavior
  ],

  ready: function() {
    this.horizontalAlign = 'left';
    this.verticalAlign = 'auto';
  }
});

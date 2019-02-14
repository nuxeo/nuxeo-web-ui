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
`nuxeo-document-thumbnail`
@group Nuxeo UI
@element nuxeo-document-thumbnail
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        height: 32px;
        width: 32px;
        position: relative;
        flex: none;
      }

      img {
        height: auto;
        width: auto;
        max-height: 100%;
        max-width: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto 8px auto auto;
        box-sizing: border-box;
        border-radius: 3px;
        filter: brightness(1.2);
        -webkit-filter: brightness(1.2);
      }
    </style>

    <img id="img" src="[[_thumbnail(document)]]" alt="[[_title(document)]]" on-error="_error">
`,

  is: 'nuxeo-document-thumbnail',
  behaviors: [I18nBehavior],

  properties: {
    document: Object
  },

  _thumbnail: function(doc) {
    return doc && doc.uid && doc.contextParameters && doc.contextParameters.thumbnail &&
           doc.contextParameters.thumbnail.url ? doc.contextParameters.thumbnail.url : '';
  },

  _error: function() {
    this.$.img.src = 'images/blank.png';
  },

  _title: function(doc) {
    return doc && doc.title ? this.i18n('accessibility.thumbnail', doc.title) : '';
  }
});

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
`nuxeo-document-layout`
@group Nuxeo UI
@element nuxeo-document-layout
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
Polymer({
  _template: html`
    <nuxeo-layout id="layout" href="[[_href]]" model="[[_model]]" error="[[i18n('documentView.layoutNotFound', document.type)]]" on-element-changed="_elementChanged">
    </nuxeo-layout>
`,

  is: 'nuxeo-document-layout',
  behaviors: [I18nBehavior],
  importMeta: import.meta,
  properties: {
    document: {
      type: Object,
      notify: true
    },
    layout: {
      type: String,
      value: 'view'
    },
    _model: {
      type: Object,
      notify: true,
      value: {}
    },
    _href: {
      type: String,
      notify: true
    }
  },

  observers: ['_loadLayout(document, layout)'],

  get element() {
    return this.$.layout.element;
  },

  validate: function() {
    return this.$.layout.validate();
  },

  _loadLayout: function(document, layout) {
    if (document) {
      if (!this.previousDocument || (document.type === this.previousDocument.type)) {
        this._model = {document: document};
      }
      if (!this.previousDocument || (document.uid !== this.previousDocument.uid)) {
        this._href = null; // force layout restamp
      }
      var doctype = document.type.toLowerCase();
      var name = ['nuxeo', doctype, layout, 'layout'].join('-');
      this._href = this.resolveUrl(doctype + '/' + name + '.html');
    } else if (document === undefined) {
      // XXX undefined is used to notify a cancel to inner elements
      this._model = {document: document};
    }
    this.previousDocument = document;
  },

  _elementChanged: function() {
    this._model = {document: this.document};
    // forward document path change events
    this.element.addEventListener('document-changed', function(e) {
      this.notifyPath(e.detail.path, e.detail.value);
    }.bind(this));
    afterNextRender(this, function() {
      // fire the `document-layout-changed` event only after flush
      this.fire('document-layout-changed', {
        element: this.element,
        layout: this.layout
      });
    }.bind(this));
  }
});

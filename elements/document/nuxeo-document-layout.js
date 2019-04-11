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
import '@polymer/polymer/polymer-legacy.js';

import '@nuxeo/nuxeo-ui-elements/nuxeo-layout.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { importHref } from '@nuxeo/nuxeo-ui-elements/import-href';

/**
`nuxeo-document-layout`
@group Nuxeo UI
@element nuxeo-document-layout
*/
Polymer({
  /* _template: html`
    <nuxeo-layout
      id="layout"
      href="[[_href]]"
      model="[[_model]]"
      error="[[i18n('documentView.layoutNotFound', document.type)]]"
      on-element-changed="_elementChanged"
    >
    </nuxeo-layout>
  `, */

  is: 'nuxeo-document-layout',
  behaviors: [I18nBehavior],
  importMeta: import.meta,
  properties: {
    document: {
      type: Object,
      notify: true,
    },
    layout: {
      type: String,
      value: 'view',
    },
    _model: {
      type: Object,
      notify: true,
      value: {},
    },
  },

  observers: ['_loadLayout(document, layout)'],

  validate() {
    if (this.element && typeof this.element.validate === 'function') {
      return this.element.validate();
    }
    // workaroud for https://github.com/PolymerElements/iron-form/issues/218, adapted from iron-form.html
    let valid = true;
    if (this.element) {
      const elements = this._getValidatableElements(this.element.root);
      for (let el, i = 0; i < elements.length; i++) {
        el = elements[i];
        valid = (el.validate ? el.validate() : el.checkValidity()) && valid;
      }
    }
    return valid;
  },

  _loadLayout(document, layout) {
    if (document) {
      /* if (!this.previousDocument || document.type === this.previousDocument.type) {
        this._model = { document };
      }
      if (!this.previousDocument || document.uid !== this.previousDocument.uid) {
        this._href = null; // force layout restamp
      } */
      const doctype = document.type.toLowerCase();
      const name = ['nuxeo', doctype, layout, 'layout'].join('-');
      this.element = window.document.createElement(name);
      if (this.hasChildNodes()) {
        this.replaceChild(this.element, this.firstChild);
      } else {
        this.appendChild(this.element);
      }
      /// #if USE_HTML_IMPORTS
      const href = this.resolveUrl(`${doctype}/${name}.html`);
      importHref(href, this._onLayoutLoaded.bind(this));
      /// #else
      import(/* webpackMode: "eager" */
      /* webpackChunkName: "[request]" */
      `./${doctype}/${name}?entity="document"`).then(this._onLayoutLoaded.bind(this));
      /// #endif
      /* this._href = this.resolveUrl(`${doctype}/${name}.html`); */
    } /*  else if (document === undefined) {
      // XXX undefined is used to notify a cancel to inner elements
      this._model = { document };
    } */
    // this.previousDocument = document;
  },

  _onLayoutLoaded() {
    this.element.document = this.document;
    this.element.addEventListener('document-changed', (e) => {
      this.notifyPath(e.detail.path, e.detail.value);
    });
    afterNextRender(this, () => {
      // fire the `document-layout-changed` event only after flush
      this.fire('document-layout-changed', {
        element: this.element,
        layout: this.layout,
      });
    });
  },

  _getValidatableElements(parent) {
    const nodes = dom(parent).querySelectorAll('*');
    const submittable = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.disabled) {
        if (node.validate || node.checkValidity) {
          submittable.push(node);
        } else if (node.root) {
          Array.prototype.push.apply(submittable, this._getValidatableElements(node.root));
        }
      }
    }
    return submittable;
  },

  /* _elementChanged() {
    this._model = { document: this.document };
    // forward document path change events
    this.element.addEventListener('document-changed', (e) => {
      this.notifyPath(e.detail.path, e.detail.value);
    });
    afterNextRender(this, () => {
      // fire the `document-layout-changed` event only after flush
      this.fire('document-layout-changed', {
        element: this.element,
        layout: this.layout,
      });
    });
  }, */
});

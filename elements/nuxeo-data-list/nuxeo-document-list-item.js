/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { FormatBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-format-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-download-button.js';
import '@nuxeo/nuxeo-ui-elements/actions/nuxeo-favorites-toggle-button.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag.js';
import '../nuxeo-document-highlight/nuxeo-document-highlights.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { applyThumbnailFallback, blurSelectionCheckOnPointerDeselect } from '../common-utils.js';

/**
`nuxeo-document-list-item`
@group Nuxeo UI
@element nuxeo-document-list-item
*/
Polymer({
  _template: html`
    <style include="iron-flex iron-flex-alignment">
      :host {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;
      }

      .listBox {
        display: block;
        margin: 0 0.4em 0.8em;
        position: relative;
        background-color: var(--nuxeo-box);
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04);
        padding: 0;
        filter:
          0.1s ease-out,
          filter 0.1s ease-out;
        -webkit-filter:
          0.1s ease-out,
          filter 0.1s ease-out;
        border: 2px solid transparent;
      }

      .listBox:hover,
      .listBox:focus {
        border: 2px solid var(--nuxeo-link-hover-color);
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04);
      }

      .listBox .title {
        margin-bottom: 0.4em;
      }

      .listBox:hover .title {
        color: var(--nuxeo-link-hover-color);
      }

      .thumbnailContainer {
        background-color: rgba(0, 0, 0, 0.1);
        width: 10rem;
        height: 10rem;
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
        padding: 0.5rem 1rem;
      }

      .dataContainer p {
        margin: 0 0 0.4em;
        font-size: 0.75rem;
      }

      .listBox .select {
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
        padding: 0.3em;
        box-sizing: border-box;
      }

      .listBox .select,
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

      /* The title is a link, so drop the browser default link colour and underline and keep the
         row's own colour. The hover and focus rules above are more specific, so they still
         recolor the title. */
      a.title {
        color: inherit;
        text-decoration: none;
      }

      .listBox .actions {
        display: none;
        background-color: var(--nuxeo-box);
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        min-height: 2.5em;
        width: 10rem;
      }

      .listBox:hover .actions,
      .listBox:hover .select,
      .listBox[selection-mode] .select {
        display: block;
      }

      .listBox:hover .select:hover {
        border: 2px solid var(--nuxeo-button-primary);
        background-color: var(--nuxeo-button-primary);
      }

      :host([selected]) .listBox .select,
      :host([selected]) .listBox:hover .select:hover {
        border: 2px solid var(--nuxeo-grid-selected);
        background-color: var(--nuxeo-grid-selected);
        display: block;
      }

      :host([selected]) .select paper-icon-button {
        color: #fff;
      }

      :host([selected]) .listBox {
        border: 2px solid var(--nuxeo-grid-selected);
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04);
      }

      :host(.droptarget-hover) .listBox {
        border: 2px dashed var(--nuxeo-grid-selected);
      }

      .typeSelection paper-button {
        width: var(--nuxeo-document-creation-form-button-width, 128px);
        height: var(--nuxeo-document-creation-form-button-height, 128px);
        box-shadow: none;
        background-color: var(--input-background, rgba(0, 0, 0, 0.05));
      }

      nuxeo-document-highlights {
        font-size: 0.85rem;
      }

      .vignette {
        display: flex;
      }

      /* apply hover styles when host is focused (or any child is focused) */
      .listBox:hover,
      :host(:focus) .listBox,
      :host(:focus-within) .listBox {
        border: 2px solid var(--nuxeo-link-hover-color);
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04);
      }

      /* make title color match hover when host/child focused */
      .listBox:hover .title,
      :host(:focus) .listBox .title,
      :host(:focus-within) .listBox .title {
        color: var(--nuxeo-link-hover-color);
      }

      :host(:focus-within) .listBox .actions,
      :host(:focus-within) .listBox .select,
      :host(:focus-within) [selection-mode] .select {
        display: block;
      }

      :host(:focus-visible) {
        outline: none !important; /* override default outline */
        box-shadow: none !important;
      }
    </style>

    <div class="listBox grid-box" selection-mode$="[[selectionMode]]">
      <div class="horizontal layout">
        <div class="vignette thumbnailContainer" on-tap="handleClick" on-keydown="_handleKeydown">
          <img crossorigin="anonymous" src="[[_thumbnail(doc)]]" on-error="_onError" alt$="[[doc.title]]" />
        </div>
        <div class="dataContainer flex" on-tap="handleClick" on-keydown="_handleKeydown">
          <div class="horizontal layout center">
            <!-- WEBUI-1882: the title holds the document URL so the browser context menu offers
                 "Open Link in New Tab" and "Open Link in New Window", as it already does in the
                 grid and table views. Being a real link, it is also the keyboard stop for the row
                 content, which is why the div around it no longer carries one: a link announces
                 itself and its menu can be opened with the context menu key, while a plain
                 focusable div could do neither. -->
            <a class="title flex" href$="[[_documentUrl(doc, urlFor)]]" on-keydown="_onTitleKeydown">
              <div class="title">[[doc.title]]</div>
            </a>
            <nuxeo-tag>[[formatDocType(doc.type)]]</nuxeo-tag>
          </div>
          <nuxeo-document-highlights highlights="[[doc.contextParameters.highlight]]"></nuxeo-document-highlights>
        </div>
        <div class="actions">
          <nuxeo-favorites-toggle-button document="[[doc]]"></nuxeo-favorites-toggle-button>
          <nuxeo-download-button document="[[doc]]"></nuxeo-download-button>
        </div>
        <div class="select">
          <paper-icon-button
            noink
            icon="icons:check"
            title="[[_computeTitle(doc)]]"
            on-tap="_onCheckBoxTap"
            on-keydown="_handleKeydown"
          ></paper-icon-button>
        </div>
      </div>
    </div>
  `,

  is: 'nuxeo-document-list-item',
  behaviors: [FormatBehavior, RoutingBehavior],

  properties: {
    doc: {
      type: Object,
      notify: true,
    },

    offset: {
      type: Number,
      value: -1,
    },

    selected: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
    },

    selectedItems: {
      type: Array,
      value: [],
    },

    index: {
      type: Number,
      reflectToAttribute: true,
    },
  },

  observers: ['_selectedItemsChanged(selectedItems.splices)'],

  _thumbnail(doc) {
    if (
      doc &&
      doc.uid &&
      doc.contextParameters &&
      doc.contextParameters.thumbnail &&
      doc.contextParameters.thumbnail.url
    ) {
      if (!this.isFollowRedirectEnabled()) {
        const splitter = doc.contextParameters.thumbnail.url.indexOf('?') > -1 ? '&' : '?';
        doc.contextParameters.thumbnail.url = `${doc.contextParameters.thumbnail.url}${splitter}clientReason=view`;
      }
      return doc.contextParameters.thumbnail.url;
    }
    return '';
  },

  // Resolves the document URL for the title link. Reverse routing throws for an item that is not
  // a routable document, and the list can hold such an item while it recycles its rows, so fall
  // back to no href rather than letting the row fail to render. The link is then inert and the
  // row still opens the document on click, as it always did.
  // The binding also passes urlFor, which this method does not need: it makes the href recompute
  // once the router is known, since urlFor is only resolved from the element when called.
  _documentUrl(doc) {
    if (!doc?.uid) {
      return undefined;
    }
    try {
      // Anything falsy has to stay undefined, which is what makes Polymer drop the attribute.
      // An empty string would be serialized into href="", a link back to the current page.
      return this.urlFor(doc) || undefined;
    } catch {
      return undefined;
    }
  },

  isFollowRedirectEnabled() {
    const followRedirect =
      Nuxeo && Nuxeo.UI && Nuxeo.UI.config && Nuxeo.UI.config.url && Nuxeo.UI.config.url.followRedirect;
    return followRedirect ? String(followRedirect).toLowerCase() === 'true' : false;
  },

  handleClick(e) {
    // A tap event carries no modifier keys, they belong to the click it was generated from.
    // Direct callers (keyboard handling, tests) pass the original event instead.
    const source = e.detail?.sourceEvent || e;
    if (!this.selectionMode && (source.ctrlKey || source.shiftKey || source.metaKey || source.button === 1)) {
      // These are the clicks the browser turns into a new tab or window on the title link, so
      // leave them alone. Elsewhere in the row there is no link to follow.
      return;
    }
    // The row handles the click itself, so the title link must not navigate on top of it. Polymer
    // forwards this preventDefault to the click event the tap was generated from.
    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (this.selectionMode) {
      this._toogleSelect(e);
    } else {
      this.fire('navigate', { item: this.doc, index: this.index });
    }
  },

  _onCheckBoxTap(e) {
    this._toogleSelect(e);
  },

  _toogleSelect(e) {
    this.selected = !this.selected;
    this.fire('selected', { index: this.index, shiftKey: e.detail.sourceEvent.shiftKey });
    // WEBUI-2056 / WEBUI-2175: clear focus from the check button on a pointer deselect so the
    // `:host(:focus-within)` rule stops keeping the selection tick on screen (see common-utils).
    blurSelectionCheckOnPointerDeselect(this, e);
  },

  _selectedItemsChanged() {
    this.selectionMode = this.selectedItems && this.selectedItems.length > 0;
  },

  _computeTitle(doc) {
    return `${doc && doc.title}${this.i18n && this.i18n('command.select')}`;
  },

  _handleKeydown(e) {
    if (e.key === 'Enter') {
      e.stopPropagation();
      if (e.currentTarget.tagName.toLowerCase() !== 'paper-icon-button') {
        e.currentTarget.click();
      }
    }
  },

  // Enter on the focused title link. Turn the key into a click, the way the row handler does, and
  // cancel its own action: otherwise the row handler and the browser following the link both
  // activate the item, which in selection mode toggles it twice and leaves it unchanged. Only
  // Enter is taken, so Space still reaches the results view and (de)selects the row.
  _onTitleKeydown(e) {
    if (e.key !== 'Enter') {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.click();
  },

  // ELEMENTS-1616: fall back to a transparent pixel when the (cross-origin) thumbnail
  // request fails, so the list row doesn't render a broken-image icon.
  _onError(event) {
    const thumbnail = event.target;
    applyThumbnailFallback(thumbnail);
  },
});

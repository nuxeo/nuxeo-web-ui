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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';

class Child {
  static get ATTRS() {
    return {
      COL: 'nuxeo-grid-col',
      COLSPAN: 'nuxeo-grid-colspan',
      ROW: 'nuxeo-grid-row',
      ROWSPAN: 'nuxeo-grid-rowspan',
      CHILDID: 'nuxeo-grid-child-id',
      ALIGN: 'nuxeo-grid-align',
      JUSTIFY: 'nuxeo-grid-justify',
    };
  }

  constructor(child) {
    this.child = child;
  }

  get id() {
    return this.child.getAttribute(Child.ATTRS.CHILDID);
  }

  set id(val) {
    this.child.setAttribute(Child.ATTRS.CHILDID, val);
  }

  get col() {
    return this.child.getAttribute(Child.ATTRS.COL) || '';
  }

  get colspan() {
    return this.child.getAttribute(Child.ATTRS.COLSPAN) || '';
  }

  get row() {
    return this.child.getAttribute(Child.ATTRS.ROW) || '';
  }

  get rowspan() {
    return this.child.getAttribute(Child.ATTRS.ROWSPAN) || '';
  }

  get align() {
    return this.child.getAttribute(Child.ATTRS.ALIGN) || '';
  }

  get justify() {
    return this.child.getAttribute(Child.ATTRS.JUSTIFY) || '';
  }
}

/**
 * `nuxeo-grid` allows layouts to be defined using a grid
 *
 * @memberof Nuxeo
 */
class Grid extends Nuxeo.Element {
  static get is() {
    return 'nuxeo-grid';
  }

  static get template() {
    return html`
      <slot></slot>
    `;
  }

  static get properties() {
    return {
      /**
       * Number of columns.
       */
      cols: {
        type: Number,
      },
      /**
       * Number of rows.
       */
      rows: {
        type: Number,
      },
      /**
       * Grid gap.
       */
      gap: {
        type: String,
      },
      /**
       * Grid row-gap.
       */
      rowGap: {
        type: String,
      },
      /**
       * Grid column-gap.
       */
      columnGap: {
        type: String,
      },
      /**
       * Grid align-items.
       */
      alignItems: {
        type: String,
      },
      /**
       * Grid align-items.
       */
      justifyItems: {
        type: String,
      },
    };
  }

  _updateGrid() {
    let style = `
  :host {
    display: grid;
    grid-template-columns: ${this.cols && this.cols > 1 ? '1fr '.repeat(this.cols) : 'auto'};
    grid-template-rows: ${this.rows && this.rows > 1 ? 'auto '.repeat(this.rows) : 'auto'};
    ${this.gap ? `grid-gap: ${this.gap}` : ''};
    ${this.columnGap ? `grid-column-gap: ${this.columnGap};` : ''}
    ${this.rowGap ? `grid-row-gap: ${this.rowGap};` : ''}
    ${this.alignItems ? `align-items: ${this.alignItems};` : ''}
    ${this.justifyItems ? `justify-items: ${this.justifyItems};` : ''}
  }

    `;
    Array.from(this.children)
      .map((child) => new Child(child))
      .forEach((child) => {
        if (child.id == null) {
          this.__count = this.__count || 0;
          child.id = ++this.__count;
        }
        style += `
  ::slotted([${Child.ATTRS.CHILDID}="${child.id}"]) {
    ${
      child.col || child.colspan
        ? `grid-column: ${child.col}${child.colspan ? `${child.col ? ' / ' : ''}span ${child.colspan}` : ''};`
        : ''
    }
    ${
      child.row || child.rowspan
        ? `grid-row: ${child.row}${child.rowspan ? `${child.row ? ' / ' : ''}span ${child.rowspan}` : ''};`
        : ''
    }
    ${child.align ? `align-self: ${child.align};` : ''}
    ${child.justify ? `justify-self: ${child.justify};` : ''}
  }`;
      });
    const styleEl = document.createElement('style');
    styleEl.textContent = style;
    const oldStyleEl = this.shadowRoot.querySelector('style');
    if (oldStyleEl) {
      this.shadowRoot.replaceChild(styleEl, oldStyleEl);
    } else {
      this.shadowRoot.insertBefore(styleEl, this.shadowRoot.firstChild);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateGrid();
    const targetNode = this;
    const config = { attributes: true, childList: true, subtree: true };
    this.__observer = new MutationObserver((mutationList) => {
      if (
        mutationList.some((mutation) => {
          if (
            mutation.target === this ||
            (mutation.target !== this &&
              mutation.type === 'attributes' &&
              Object.values(Child.ATTRS).includes(mutation.attributeName))
          ) {
            return true;
          }
          return false;
        })
      ) {
        this._updateGrid();
      }
    });
    this.__observer.observe(targetNode, config);
  }

  disconnectedCallback() {
    this.__observer.disconnect();
    super.disconnectedCallback();
  }
}

customElements.define(Grid.is, Grid);

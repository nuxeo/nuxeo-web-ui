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

/* @polymerMixin */
const GridFormattingMixin = function(superClass) {
  return class extends superClass {
    static get properties() {
      return {
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
          value: 'stretch',
        },
        /**
         * Grid align-items.
         */
        justifyItems: {
          type: String,
          value: 'stretch',
        },
        /**
         * The grid template columns.
         */
        templateColumns: {
          type: String,
          reflectToAttribute: true,
        },
        /**
         * The grid template rows.
         */
        templateRows: {
          type: String,
          reflectToAttribute: true,
        },
      };
    }
  };
};

class Child {
  static get ATTRS() {
    return {
      AREA: 'nuxeo-grid-area',
      COL: 'nuxeo-grid-col',
      COLSPAN: 'nuxeo-grid-colspan',
      ROW: 'nuxeo-grid-row',
      ROWSPAN: 'nuxeo-grid-rowspan',
      CHILDID: 'nuxeo-grid-child-id',
      ALIGN: 'nuxeo-grid-align',
      JUSTIFY: 'nuxeo-grid-justify',
    };
  }

  constructor(el) {
    this.el = el;
  }

  get area() {
    return this.el.getAttribute(Child.ATTRS.AREA) || '';
  }

  set area(val) {
    return this.el.setAttribute(Child.ATTRS.AREA.val);
  }

  get id() {
    return this.el.getAttribute(Child.ATTRS.CHILDID);
  }

  set id(val) {
    this.el.setAttribute(Child.ATTRS.CHILDID, val);
  }

  get col() {
    return this.el.getAttribute(Child.ATTRS.COL) || '';
  }

  set col(val) {
    return this.el.setAttribute(Child.ATTRS.COL, val);
  }

  get colspan() {
    return this.el.getAttribute(Child.ATTRS.COLSPAN) || '';
  }

  set colspan(val) {
    return this.el.setAttribute(Child.ATTRS.COLSPAN, val);
  }

  get row() {
    return this.el.getAttribute(Child.ATTRS.ROW) || '';
  }

  set row(val) {
    return this.el.setAttribute(Child.ATTRS.ROW, val);
  }

  get rowspan() {
    return this.el.getAttribute(Child.ATTRS.ROWSPAN) || '';
  }

  set rowspan(val) {
    return this.el.setAttribute(Child.ATTRS.ROWSPAN, val);
  }

  get align() {
    return this.el.getAttribute(Child.ATTRS.ALIGN) || '';
  }

  set align(val) {
    return this.el.setAttribute(Child.ATTRS.ALIGN, val);
  }

  get justify() {
    return this.el.getAttribute(Child.ATTRS.JUSTIFY) || '';
  }

  set justify(val) {
    return this.el.setAttribute(Child.ATTRS.JUSTIFY, val);
  }
}

class GridTemplate extends GridFormattingMixin(Nuxeo.Element) {
  static get is() {
    return 'nuxeo-grid-template';
  }

  static get template() {
    return html`
      <slot></slot>
    `;
  }

  static get properties() {
    return {
      /**
       * Minimum width in which this template will be used.
       */
      minWidth: {
        type: String,
      },
      /**
       * Maxium width in which this template will be used.
       */
      maxWidth: {
        type: String,
      },
    };
  }

  get mediaQuery() {
    // XXX needs to be optimized
    const mquery = {};
    if (this.minWidth) {
      mquery['min-width'] = this.minWidth;
    }
    if (this.maxWidth) {
      mquery['max-width'] = this.maxWidth;
    }
    return Object.keys(mquery)
      .map((p) => `(${p}: ${mquery[p]})`)
      .join(' and ');
  }

  wrapChild(child) {
    child = !(child instanceof Child) ? new Child(child) : child;
    const area = this.querySelector(`nuxeo-grid-area[name="${child.area}"]`);
    const proxyChild = new Proxy(child, {
      // eslint-disable-next-line object-shorthand
      get: function(target, prop) {
        if (prop === 'col') {
          return area.col;
        }
        if (prop === 'colspan') {
          return area.colspan;
        }
        if (prop === 'row') {
          return area.row;
        }
        if (prop === 'rowspan') {
          return area.rowspan;
        }
        if (prop === 'align') {
          return area.align;
        }
        if (prop === 'justify') {
          return area.justify;
        }
        // eslint-disable-next-line prefer-rest-params
        return Reflect.get(...arguments);
      },
      // eslint-disable-next-line object-shorthand
      set: function(target, prop, val) {
        if (prop === 'col') {
          area.col = val;
        } else if (prop === 'colspan') {
          area.colspan = val;
        } else if (prop === 'row') {
          area.row = val;
        } else if (prop === 'rowspan') {
          area.rowspan = val;
        } else if (prop === 'align') {
          area.align = val;
        } else if (prop === 'justify') {
          area.justify = val;
        } else {
          // eslint-disable-next-line prefer-rest-params
          Reflect.set(...arguments);
        }
      },
    });
    return proxyChild;
  }
}

customElements.define(GridTemplate.is, GridTemplate);

class GridArea extends Nuxeo.Element {
  static get is() {
    return 'nuxeo-grid-area';
  }

  static get template() {
    return html`
      <slot></slot>
    `;
  }

  static get properties() {
    return {
      /**
       * The name of this area template. An element that needs to be placed in this area must have this named assigned
       * to its `nuxeo-grid-area` attribute.
       */
      name: {
        type: String,
        reflectToAttribute: true,
      },
      /**
       * The column where this are will be placed.
       */
      col: {
        type: Number,
        reflectToAttribute: true,
      },
      /**
       * The row where this are will be placed.
       */
      row: {
        type: Number,
        reflectToAttribute: true,
      },
      /**
       * The number of columns that this area takes.
       */
      colspan: {
        type: Number,
        value: 1,
        reflectToAttribute: true,
      },
      /**
       * The number of rows that this area takes.
       */
      rowspan: {
        type: Number,
        value: 1,
        reflectToAttribute: true,
      },
      /**
       * Grid align-self.
       */
      align: {
        type: String,
        value: 'stretch',
        reflectToAttribute: true,
      },
      /**
       * Grid justify-self.
       */
      justify: {
        type: String,
        value: 'stretch',
        reflectToAttribute: true,
      },
    };
  }
}

customElements.define(GridArea.is, GridArea);

/**
 * `nuxeo-grid` allows layouts to be defined using a grid
 *
 * @memberof Nuxeo
 */
class Grid extends GridFormattingMixin(Nuxeo.Element) {
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
       * Number of columns. Will be ignored if templateColumns is defined.
       */
      cols: {
        type: Number,
        reflectToAttribute: true,
      },
      /**
       * Number of rows. Will be ignored if templateRows is defined.
       */
      rows: {
        type: Number,
        reflectToAttribute: true,
      },
    };
  }

  get mode() {
    return this.querySelector('nuxeo-grid-template') ? 'dynamic' : 'static';
  }

  get activeTemplate() {
    const mainTemplate = this.querySelector('nuxeo-grid-template:not([min-width]):not([max-width])');
    const responsiveTemplates = Array.from(
      this.querySelectorAll('nuxeo-grid-template[min-width], nuxeo-grid-template[max-width]'),
    );
    if (responsiveTemplates.length === 0) {
      return mainTemplate;
    }
    const rt = responsiveTemplates.find((template) => window.matchMedia(template.mediaQuery).matches);
    return rt || mainTemplate;
  }

  wrapChild(child) {
    const template = this.activeTemplate;
    if (template) {
      return this.activeTemplate.wrapChild(child);
    }
    return !(child instanceof Child) ? new Child(child) : child;
  }

  _wrapMediaQuery(css, mquery) {
    if (!mquery) {
      return css;
    }
    return `
  @media ${mquery} {
    ${css}
  }
    `;
  }

  _buildGridStyle(grid, mquery) {
    const css = `
  :host {
    display: grid;
    grid-template-columns: ${grid.templateColumns || (grid.cols && grid.cols > 1 ? '1fr '.repeat(grid.cols) : 'auto')};
    grid-template-rows: ${grid.templateRows || (grid.rows && grid.rows > 1 ? 'auto '.repeat(grid.rows) : 'auto')};
    ${grid.templateAreas ? `grid-template-areas: ${grid.templateAreas};` : ''}
    ${grid.gap ? `grid-gap: ${grid.gap}` : ''};
    ${grid.columnGap ? `grid-column-gap: ${grid.columnGap};` : ''}
    ${grid.rowGap ? `grid-row-gap: ${grid.rowGap};` : ''}
    ${grid.alignItems ? `align-items: ${grid.alignItems};` : ''}
    ${grid.justifyItems ? `justify-items: ${grid.justifyItems};` : ''}
  }

  ::slotted(nuxeo-grid-template) {
    display: none;
  }
    `;
    return this._wrapMediaQuery(css, mquery);
  }

  _buidChildStyle(child, mquery) {
    const css = `
  ::slotted([${Child.ATTRS.CHILDID}="${child.id}"]) {
      ${child.area ? `grid-area: ${child.area};` : ''}
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
  }
    `;
    return this._wrapMediaQuery(css, mquery);
  }

  _buildGridTemplateAreas(nxAreaTemplates) {
    let cols = 0;
    let rows = 0;
    // XXX needs to be optimized
    nxAreaTemplates.forEach((template) => {
      cols = Math.max(cols, template.col + template.colspan - 1);
      rows = Math.max(rows, template.row + template.rowspan - 1);
    });
    const area = Array(rows)
      .fill()
      .map(() => Array(cols).fill());
    nxAreaTemplates.forEach((template) => {
      for (let i = template.row - 1; i < template.row + template.rowspan - 1; i++) {
        for (let j = template.col - 1; j < template.col + template.colspan - 1; j++) {
          area[i][j] = template.name;
        }
      }
    });
    let templateAreas = '';
    area.forEach((line) => {
      templateAreas += `"${line.map((c) => c || '.').join(' ')}"\n`;
    });
    return { templateAreas, cols, rows };
  }

  _updateGrid() {
    let style = '';
    const children = Array.from(this.querySelectorAll(':scope > *:not(nuxeo-grid-template):not(nuxeo-grid-area)')).map(
      (child) => new Child(child),
    );
    children.forEach((child) => {
      if (child.id == null) {
        this.__count = this.__count || 0;
        child.id = ++this.__count;
      }
    });
    if (this.mode === 'dynamic') {
      Array.from(this.querySelectorAll('nuxeo-grid-template')).forEach((gridTemplate) => {
        const areaTemplates = gridTemplate.querySelectorAll('nuxeo-grid-area');
        const processedAreaTemplate = this._buildGridTemplateAreas(areaTemplates);
        const { templateAreas } = processedAreaTemplate;
        const grid = {
          cols: processedAreaTemplate.cols,
          rows: processedAreaTemplate.rows,
          templateColumns: gridTemplate.templateColumns,
          templateRows: gridTemplate.templateRows,
          templateAreas,
          gap: gridTemplate.gap || this.gap,
          columnGap: gridTemplate.columnGap || this.columnGap,
          rowGap: gridTemplate.rowGap || this.rowGap,
          alignItems: gridTemplate.alignItems || this.alignItems,
          justifyItems: gridTemplate.justifyItems || this.justifyItems,
        };
        style += this._buildGridStyle(grid, gridTemplate.mediaQuery);
        children.forEach((child) => {
          const proxyChild = gridTemplate.wrapChild(child);
          style += this._buidChildStyle(proxyChild, gridTemplate.mediaQuery);
        });
      });
    } else {
      const grid = {
        cols: this.cols,
        rows: this.rows,
        templateColumns: this.templateColumns,
        templateRows: this.templateRows,
        gap: this.gap,
        columnGap: this.columnGap,
        rowGap: this.rowGap,
        alignItems: this.alignItems,
        justifyItems: this.justifyItems,
      };
      style += this._buildGridStyle(grid);
      children.forEach((child) => {
        style += this._buidChildStyle(child);
      });
    }
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
            mutation.target.tagName === 'NUXEO-GRID-TEMPLATE' ||
            mutation.target.tagName === 'NUXEO-GRID-AREA' ||
            (mutation.type === 'attributes' && Object.values(Child.ATTRS).includes(mutation.attributeName))
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

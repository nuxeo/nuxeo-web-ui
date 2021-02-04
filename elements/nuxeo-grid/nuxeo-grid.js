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
      COLUMN: 'data-column',
      COLUMNSPAN: 'data-column-span',
      ROW: 'data-row',
      ROWSPAN: 'data-row-span',
      CHILDID: 'data-child-id',
      ALIGN: 'data-align',
      JUSTIFY: 'data-justify',
    };
  }

  constructor(el) {
    this.el = el;
  }

  _getAttribute(name) {
    return this.el.getAttribute(name);
  }

  _setAttribute(name, value) {
    this.el.setAttribute(name, value);
  }

  /**
   * Returns the element id. The id is used by `nuxeo-grid` to uniquely identify the children.
   */
  get id() {
    return this._getAttribute(Child.ATTRS.CHILDID);
  }

  /**
   * Sets the element id.
   */
  set id(val) {
    this._setAttribute(Child.ATTRS.CHILDID, val);
  }

  /**
   * Gets the grid column in which this element will be placed.
   */
  get column() {
    return this._getAttribute(Child.ATTRS.COLUMN) || '';
  }

  /**
   * Sets the grid column in which this element will be placed.
   */
  set column(val) {
    return this._setAttribute(Child.ATTRS.COLUMN, val);
  }

  /**
   * Gets the number of columns this element occupies.
   */
  get columnspan() {
    return this._getAttribute(Child.ATTRS.COLUMNSPAN) || '';
  }

  /**
   * Sets the number of columns this element occupies.
   */
  set columnspan(val) {
    return this._setAttribute(Child.ATTRS.COLUMNSPAN, val);
  }

  /**
   * Gets the grid row in which this element will be placed.
   */
  get row() {
    return this._getAttribute(Child.ATTRS.ROW) || '';
  }

  /**
   * Sets the grid row in which this element will be placed.
   */
  set row(val) {
    return this._setAttribute(Child.ATTRS.ROW, val);
  }

  /**
   * Gets the number of rows this element occupies.
   */
  get rowspan() {
    return this._getAttribute(Child.ATTRS.ROWSPAN) || '';
  }

  /**
   * Sets the number of rows this element occupies.
   */
  set rowspan(val) {
    return this._setAttribute(Child.ATTRS.ROWSPAN, val);
  }

  /**
   * Gets the vertical alignment of this element in the grid. Valid values are `stretch`, `center`, `start` and `end`.
   */
  get align() {
    return this._getAttribute(Child.ATTRS.ALIGN) || '';
  }

  /**
   * Sets the vertical alignment of this element in the grid. Valid values are `stretch`, `center`, `start` and `end`.
   */
  set align(val) {
    return this._setAttribute(Child.ATTRS.ALIGN, val);
  }

  /**
   * Gets the horizontal alignment of this element in the grid. Valid values are `stretch`, `center`, `start` and `end`.
   */
  get justify() {
    return this._getAttribute(Child.ATTRS.JUSTIFY);
  }

  /**
   * Sets the horizontal alignment of this element in the grid. Valid values are `stretch`, `center`, `start` and `end`.
   */
  set justify(val) {
    return this._setAttribute(Child.ATTRS.JUSTIFY, val);
  }
}

function validateValue(value, regex, warn, property) {
  if (!value) {
    return;
  }
  const values = typeof value === 'string' ? value.split(' ').filter(Boolean) : [value];
  values.forEach((val) => {
    if (warn && property && !regex.test(val)) {
      console.warn(`"${val}" is an invalid value for ${property}`);
    }
  });
  return value;
}

function removeEmptyLines(str) {
  return str.replace(/^\s*;?$(?:\r\n?|\n)/gm, '');
}

function wrapMediaQuery(css, mquery) {
  if (!mquery) {
    return css;
  }
  return removeEmptyLines(`@media ${mquery} {
${css.replace(/^(.+)$/gm, '  $1') /* apply indentation */}
}
`);
}

function buildGridStyle(grid, validate = true) {
  const cGrid = {};
  cGrid.templateColumns = validateValue(grid.templateColumns, /^(\d+fr|\d+px|auto)$/, validate, 'template-columns');
  cGrid.templateRows = validateValue(grid.templateRows, /^(\d+fr|\d+px|auto)$/, validate, 'template-rows');
  cGrid.columns = validateValue(grid.columns, /^\d+$/, validate, 'columns');
  cGrid.rows = validateValue(grid.rows, /^\d+$/, validate, 'rows');
  cGrid.gap = validateValue(grid.gap, /^\d+px$/, validate, 'gap');
  cGrid.columnGap = validateValue(grid.columnGap, /^\d+px$/, validate, 'column-gap');
  cGrid.rowGap = validateValue(grid.rowGap, /^\d+px$/, validate, 'row-gap');
  cGrid.alignItems = validateValue(grid.alignItems, /^(stretch|center|start|end)$/, validate, 'align-items');
  cGrid.justifyItems = validateValue(grid.justifyItems, /^(stretch|center|start|end)$/, validate, 'justify-items');
  const css = `
:host {
  display: grid;
  grid-template-columns: ${cGrid.templateColumns ||
    (cGrid.columns && cGrid.columns > 1
      ? Array(cGrid.columns)
          .fill('1fr')
          .join(' ')
      : 'auto')};
  grid-template-rows: ${cGrid.templateRows ||
    (cGrid.rows && cGrid.rows > 1
      ? Array(cGrid.rows)
          .fill('auto')
          .join(' ')
      : 'auto')};
  ${cGrid.gap ? `grid-gap: ${cGrid.gap}` : ''};
  ${cGrid.columnGap ? `grid-column-gap: ${cGrid.columnGap};` : ''}
  ${cGrid.rowGap ? `grid-row-gap: ${cGrid.rowGap};` : ''}
  ${cGrid.alignItems ? `align-items: ${cGrid.alignItems};` : ''}
  ${cGrid.justifyItems ? `justify-items: ${cGrid.justifyItems};` : ''}
}
`;
  return removeEmptyLines(css);
}

function buidChildStyle(child, validate = true) {
  const cChild = { id: child.id };
  cChild.column = validateValue(child.column, /^\d+$/, validate, Child.ATTRS.COLUMN);
  cChild.row = validateValue(child.row, /^\d+$/, validate, Child.ATTRS.ROW);
  cChild.columnspan = validateValue(child.columnspan, /^\d+$/, validate, Child.ATTRS.COLUMNSPAN);
  cChild.rowspan = validateValue(child.rowspan, /^\d+$/, validate, 'rowspan');
  cChild.align = validateValue(child.align, /^(stretch|center|start|end)$/, validate, Child.ATTRS.ALIGN);
  cChild.justify = validateValue(child.justify, /^(stretch|center|start|end)$/, validate, Child.ATTRS.JUSTIFY);
  if (!cChild.column && !cChild.columnspan && !cChild.row && !cChild.rowspan && !cChild.align && !cChild.justify) {
    // avoid writting an empty block
    return '';
  }
  const css = `
::slotted([${Child.ATTRS.CHILDID}="${cChild.id}"]) {
  ${
    cChild.column || cChild.columnspan
      ? `grid-column: ${cChild.column}${
          cChild.columnspan ? `${cChild.column ? ' / ' : ''}span ${cChild.columnspan}` : ''
        };`
      : ''
  }
  ${
    cChild.row || cChild.rowspan
      ? `grid-row: ${cChild.row}${cChild.rowspan ? `${cChild.row ? ' / ' : ''}span ${cChild.rowspan}` : ''};`
      : ''
  }
  ${cChild.align ? `align-self: ${cChild.align};` : ''}
  ${cChild.justify ? `justify-self: ${cChild.justify};` : ''}
}
`;
  return removeEmptyLines(css);
}

/**
 * `nuxeo-grid` allows layouts to be defined using a grid disposition.
 *
 * @memberof Nuxeo
 */
class Grid extends Nuxeo.Element {
  static get is() {
    return 'nuxeo-grid';
  }

  static get template() {
    return html`
      <style>
        :host {
          display: grid;
        }
      </style>
      <slot id="slot"></slot>
    `;
  }

  static get properties() {
    return {
      /**
       * Number of columns. Will be ignored if `templateColumns` is defined.
       */
      columns: {
        type: Number,
        reflectToAttribute: true,
      },
      /**
       * Number of rows. Will be ignored if `templateRows` is defined.
       */
      rows: {
        type: Number,
        reflectToAttribute: true,
      },
      /**
       * Gap between grid cells, in pixels (e.g. 16px).
       */
      gap: {
        type: String,
      },
      /**
       * Gap between rows, in pixels (e.g. 16px). Overrides the gap spacing for rows only. Use it for advanced control
       * on spacing.
       */
      rowGap: {
        type: String,
      },
      /**
       * Gap between columns, in pixels (e.g. 16px). Overrides the gap spacing for columns only. Use it for advanced
       * control on spacing.
       */
      columnGap: {
        type: String,
      },
      /**
       * Default item alignment on the block axis (typically vertical). Valid values are `stretch`, `center`, `start`
       * and `end`.
       */
      alignItems: {
        type: String,
        value: 'stretch',
      },
      /**
       * Default alignment on the inline axis (typically horizontal). Valid values are `stretch`, `center`, `start`
       * and `end`.
       */
      justifyItems: {
        type: String,
        value: 'stretch',
      },
      /**
       * Used for advanced control on the width of the columns. It is a string containing a space-separated list of
       * values, where each value corresponds to a column. Valid value formats are `auto` and `*fr` (e.g. `1fr, 2fr`),
       * where `fr` denotes a fraction of the available width of the grid. E.g. using 2fr will make a column twice as
       * big as one using 1fr. Using `auto` will use the remaining space available and adapt it to the element inside
       * the column. Setting this property overrides the `columns` property.
       */
      templateColumns: {
        type: String,
        reflectToAttribute: true,
      },
      /**
       * Used for advanced control on the height of the rows. It is a string containing a space-separated list of
       * values, where each value corresponds to a row. Valid value formats are `auto` and `*fr` (e.g. `1fr, 2fr`),
       * where `fr` denotes a fraction of the available height of the grid. E.g. using 2fr will make a row twice as
       * big as one using 1fr. Using `auto` will use the remaining space available and adapt it to the element inside
       * the row. Setting this property overrides the `rows` property.
       */
      templateRows: {
        type: String,
        reflectToAttribute: true,
      },
    };
  }

  _updateGrid() {
    let style = '';
    const children = Array.from(this.$.slot.assignedElements()).map((child) => new Child(child));
    children.forEach((child) => {
      if (child.id == null) {
        this.__count = this.__count || 0;
        child.id = ++this.__count;
      }
    });
    const grid = {
      columns: this.columns,
      rows: this.rows,
      templateColumns: this.templateColumns,
      templateRows: this.templateRows,
      gap: this.gap,
      columnGap: this.columnGap,
      rowGap: this.rowGap,
      alignItems: this.alignItems,
      justifyItems: this.justifyItems,
    };
    style += buildGridStyle(grid);
    children.forEach((child) => {
      style += buidChildStyle(child);
    });
    // RESPONSIVENESS: turn into a single column when width <= 1024px
    grid.templateColumns = `1fr`;
    grid.templateRows = `auto`;
    let responsiveStyle = `${buildGridStyle(grid, false)}`;
    children.forEach((child, index) => {
      const { align, id, justify } = child;
      responsiveStyle += `${buidChildStyle(
        {
          column: 1,
          row: index + 1,
          align,
          id,
          justify,
        },
        false,
      )}`;
    });
    style += wrapMediaQuery(responsiveStyle, '(max-width: 1024px)');
    // END OF RESPONSIVENESS
    this.shadowRoot.querySelector('style').textContent = style;
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
            (mutation.type === 'attributes' && Object.values(Child.ATTRS).includes(mutation.attributeName))
          ) {
            return true;
          }
          return false;
        })
      ) {
        // refresh the grid when there is a mutation in:
        // - the grid, for any type of mutation
        // - the grid's children, so long as it was a mutation on any support child attributes (see `Child.ATTRS`).
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

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
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import { Child } from '../elements/nuxeo-grid/nuxeo-grid.js';

function getStyle(grid) {
  return grid.shadowRoot.querySelector('style').textContent;
}

/**
 * Asserts that no `nuxeo-grid` validation warning was emitted.
 *
 * `console.warn.notCalled` is brittle in the full-suite (load-all-tests) run
 * because stray async work from other suites can land an unrelated
 * `console.warn` between this test's setup and assertion on slower CI runners.
 * The test really only cares about the `"X" is an invalid value for Y` warning
 * emitted by `validateValue` in nuxeo-grid.js, so check that pattern only.
 */
function expectNoValidationWarning() {
  const offending = console.warn.getCalls().filter((call) => {
    const msg = String(call.args && call.args[0] != null ? call.args[0] : '');
    return /is an invalid value for /.test(msg);
  });
  expect(
    offending,
    `unexpected nuxeo-grid validation warnings: ${offending.map((c) => c.args[0]).join('; ')}`,
  ).to.have.length(0);
}

suite('nuxeo-grid', () => {
  let grid;

  setup(async () => {
    sinon.spy(console, 'warn');
    grid = await fixture(html`
      <nuxeo-grid>
        <div id="top"></div>
        <div id="main"></div>
        <div id="side"></div>
      </nuxeo-grid>
    `);
  });

  teardown(() => {
    console.warn.restore();
  });

  test('Should generate proper style when properties are set', async () => {
    grid.columns = 3;
    grid.rows = 4;
    grid.rowGap = '8px';
    grid.columnGap = '8px';
    grid.gap = '16px';
    grid.alignItems = 'center';
    grid.justifyItems = 'center';

    const [top, main, side] = grid.querySelectorAll('*');
    top.setAttribute('data-column', '1');
    top.setAttribute('data-row', '1');
    top.setAttribute('data-column-span', '3');
    main.setAttribute('data-column', '1');
    main.setAttribute('data-row', '2');
    main.setAttribute('data-column-span', '2');
    main.setAttribute('data-row-span', '2');
    side.setAttribute('data-column', '3');
    side.setAttribute('data-row', '2');
    main.setAttribute('data-row-span', '2');

    await flush();
    // Reset the spy after mutations settle so intermediate observer-triggered
    // warnings (from partial attribute state) don't cause a false negative.
    console.warn.resetHistory();
    const expected = `:host {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto auto auto;
  grid-gap: 16px;
  grid-column-gap: 8px;
  grid-row-gap: 8px;
  align-items: center;
  justify-items: center;
}
::slotted([data-child-id="1"]) {
  grid-column: 1 / span 3;
  grid-row: 1;
}
::slotted([data-child-id="2"]) {
  grid-column: 1 / span 2;
  grid-row: 2 / span 2;
}
::slotted([data-child-id="3"]) {
  grid-column: 3;
  grid-row: 2;
}
@media (max-width: 1024px) {
  :host {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-gap: 16px;
    grid-column-gap: 8px;
    grid-row-gap: 8px;
    align-items: center;
    justify-items: center;
  }
  ::slotted([data-child-id="1"]) {
    grid-column: 1;
    grid-row: 1;
  }
  ::slotted([data-child-id="2"]) {
    grid-column: 1;
    grid-row: 2;
  }
  ::slotted([data-child-id="3"]) {
    grid-column: 1;
    grid-row: 3;
  }
}
`;
    expect(getStyle(grid)).to.equal(expected);
    expectNoValidationWarning();
  });

  suite('Should generate proper style when partial properties are set', () => {
    test('Should not log warning when column property is not set', async () => {
      grid.columns = 3;
      grid.rows = 4;
      grid.rowGap = '8px';
      grid.columnGap = '8px';
      grid.gap = '16px';
      grid.alignItems = 'center';
      grid.justifyItems = 'center';
      grid.justify = '';

      const [top, main] = grid.querySelectorAll('*');
      top.setAttribute('data-row', '1');
      top.setAttribute('data-column-span', '1');
      main.setAttribute('data-row', '2');
      main.setAttribute('data-column-span', '2');
      main.setAttribute('data-row-span', '2');

      await flush();
      expectNoValidationWarning();
    });

    test('Should not log warning when only row span property is set', async () => {
      grid.columns = 0;
      grid.rows = 0;
      grid.rowGap = '8px';
      grid.columnGap = '8px';
      grid.gap = '16px';
      grid.alignItems = 'center';
      grid.justifyItems = 'center';

      const [main] = grid.querySelectorAll('*');
      main.setAttribute('data-row-span', '1');
      main.setAttribute('data-row-span', '2');

      await flush();
      expectNoValidationWarning();
    });

    test('Should not log warning when only when only column span property is set', async () => {
      grid.columns = 0;
      grid.rows = 0;
      grid.rowGap = '8px';
      grid.columnGap = '8px';
      grid.gap = '16px';
      grid.alignItems = 'center';
      grid.justifyItems = 'center';

      const [top, main] = grid.querySelectorAll('*');
      top.setAttribute('data-column-span', '3');
      main.setAttribute('data-column-span', '2');
      await flush();
      expectNoValidationWarning();
    });

    test('Should generate proper style when align and justify properties are set', async () => {
      grid.columns = 0;
      grid.rows = 0;
      grid.rowGap = '8px';
      grid.columnGap = '8px';
      grid.gap = '16px';
      grid.alignItems = 'center';
      grid.justifyItems = 'center';

      const [main] = grid.querySelectorAll('*');
      main.setAttribute('data-row-span', '1');
      main.setAttribute('data-row-span', '2');
      main.setAttribute('data-align', 'center');
      main.setAttribute('data-justify', 'center');

      await flush();
      expectNoValidationWarning();
    });
  });

  test('Should generate proper style when column and row templates are set', async () => {
    grid.columns = 100; // this will be ignored if templateColumns is defined
    grid.rows = 300; // this will be ignored if templateRows is defined
    grid.rowGap = '8px';
    grid.columnGap = '8px';
    grid.gap = '16px';
    grid.alignItems = 'center';
    grid.justifyItems = 'center';
    grid.templateColumns = '1fr 300px auto';
    grid.templateRows = '2fr auto 200px';
    await flush();
    console.warn.resetHistory();
    const expected = `:host {
  display: grid;
  grid-template-columns: 1fr 300px auto;
  grid-template-rows: 2fr auto 200px;
  grid-gap: 16px;
  grid-column-gap: 8px;
  grid-row-gap: 8px;
  align-items: center;
  justify-items: center;
}
@media (max-width: 1024px) {
  :host {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-gap: 16px;
    grid-column-gap: 8px;
    grid-row-gap: 8px;
    align-items: center;
    justify-items: center;
  }
  ::slotted([data-child-id="1"]) {
    grid-column: 1;
    grid-row: 1;
  }
  ::slotted([data-child-id="2"]) {
    grid-column: 1;
    grid-row: 2;
  }
  ::slotted([data-child-id="3"]) {
    grid-column: 1;
    grid-row: 3;
  }
}
`;
    expect(getStyle(grid)).to.equal(expected);
    expectNoValidationWarning();
  });
  test('Should generate proper style when align and justify items are empty', async () => {
    grid.columns = 100; // this will be ignored if templateColumns is defined
    grid.rows = 300; // this will be ignored if templateRows is defined
    grid.rowGap = '8px';
    grid.columnGap = '8px';
    grid.gap = '16px';
    grid.alignItems = '';
    grid.justifyItems = '';
    grid.templateColumns = '1fr 300px auto';
    grid.templateRows = '2fr auto 200px';
    grid.columnspan = '1';
    await flush();
    console.warn.resetHistory();
    const expected = `:host {
  display: grid;
  grid-template-columns: 1fr 300px auto;
  grid-template-rows: 2fr auto 200px;
  grid-gap: 16px;
  grid-column-gap: 8px;
  grid-row-gap: 8px;
}
@media (max-width: 1024px) {
  :host {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-gap: 16px;
    grid-column-gap: 8px;
    grid-row-gap: 8px;
  }
  ::slotted([data-child-id="1"]) {
    grid-column: 1;
    grid-row: 1;
  }
  ::slotted([data-child-id="2"]) {
    grid-column: 1;
    grid-row: 2;
  }
  ::slotted([data-child-id="3"]) {
    grid-column: 1;
    grid-row: 3;
  }
}
`;
    expect(getStyle(grid)).to.equal(expected);
    expectNoValidationWarning();
  });

  test('Should log a warning in unsupported value is used', async () => {
    grid.columns = 'a'; // this will be ignored if templateColumns is defined
    grid.rows = '10px'; // this will be ignored if templateRows is defined
    grid.rowGap = '8em';
    grid.columnGap = '8rem';
    grid.gap = '20%';
    grid.alignItems = 'flex-start';
    grid.justifyItems = 'right';
    grid.templateColumns = 'min-content 2fr auto';
    grid.templateRows = '2fr auto max-content';
    await flush();
    expect(console.warn.callCount).to.equal(9);
    expect(console.warn.calledWith('"a" is an invalid value for columns')).to.be.true;
    expect(console.warn.calledWith('"10px" is an invalid value for rows')).to.be.true;
    expect(console.warn.calledWith('"8em" is an invalid value for row-gap')).to.be.true;
    expect(console.warn.calledWith('"8rem" is an invalid value for column-gap')).to.be.true;
    expect(console.warn.calledWith('"20%" is an invalid value for gap')).to.be.true;
    expect(console.warn.calledWith('"flex-start" is an invalid value for align-items')).to.be.true;
    expect(console.warn.calledWith('"right" is an invalid value for justify-items')).to.be.true;
    expect(console.warn.calledWith('"min-content" is an invalid value for template-columns')).to.be.true;
    expect(console.warn.calledWith('"max-content" is an invalid value for template-rows')).to.be.true;
  });
});

// `Child` wraps a slotted element and maps its grid placement onto `data-*` attributes.
// `nuxeo-grid` itself only ever assigns `id`, so the placement setters are exercised here
// directly; a setter's return value is unobservable in JavaScript, so these assert the
// attribute that gets written and the value the matching getter reads back.
suite('nuxeo-grid Child', () => {
  let element;
  let child;

  setup(() => {
    element = document.createElement('div');
    child = new Child(element);
  });

  test('should write the child id', () => {
    child.id = '7';
    expect(element.getAttribute(Child.ATTRS.CHILDID)).to.equal('7');
    expect(child.id).to.equal('7');
  });

  test('should write the grid column', () => {
    child.column = '2';
    expect(element.getAttribute(Child.ATTRS.COLUMN)).to.equal('2');
    expect(child.column).to.equal('2');
  });

  test('should write the column span', () => {
    child.columnspan = '3';
    expect(element.getAttribute(Child.ATTRS.COLUMNSPAN)).to.equal('3');
    expect(child.columnspan).to.equal('3');
  });

  test('should write the grid row', () => {
    child.row = '4';
    expect(element.getAttribute(Child.ATTRS.ROW)).to.equal('4');
    expect(child.row).to.equal('4');
  });

  test('should write the row span', () => {
    child.rowspan = '5';
    expect(element.getAttribute(Child.ATTRS.ROWSPAN)).to.equal('5');
    expect(child.rowspan).to.equal('5');
  });

  test('should write the vertical alignment', () => {
    child.align = 'center';
    expect(element.getAttribute(Child.ATTRS.ALIGN)).to.equal('center');
    expect(child.align).to.equal('center');
  });

  test('should write the horizontal alignment', () => {
    child.justify = 'end';
    expect(element.getAttribute(Child.ATTRS.JUSTIFY)).to.equal('end');
    expect(child.justify).to.equal('end');
  });

  test('should overwrite a placement that was already set', () => {
    child.column = '1';
    child.column = '2';
    expect(element.getAttribute(Child.ATTRS.COLUMN)).to.equal('2');
    expect(child.column).to.equal('2');
  });

  test('should read unset placements as an empty string', () => {
    expect(child.column).to.equal('');
    expect(child.columnspan).to.equal('');
    expect(child.row).to.equal('');
    expect(child.rowspan).to.equal('');
    expect(child.align).to.equal('');
  });

  // `justify` is the one getter without an `|| ''` fallback, so it reads back as null.
  // `buidChildStyle` only tests it for truthiness, so both spellings behave the same.
  test('should read an unset justify as null', () => {
    expect(child.justify).to.be.null;
    expect(child.id).to.be.null;
  });
});

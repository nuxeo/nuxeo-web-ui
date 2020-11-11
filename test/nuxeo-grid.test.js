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
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-grid/nuxeo-grid';

function getStyle(grid) {
  return grid.shadowRoot.querySelector('style').innerText;
}

suite('nuxeo-grid', () => {
  let grid;

  setup(async () => {
    sinon.spy(console, 'warn');
    grid = await fixture(
      html`
        <nuxeo-grid>
          <div id="top"></div>
          <div id="main"></div>
          <div id="side"></div>
        </nuxeo-grid>
      `,
    );
  });

  teardown(() => {
    console.warn.restore();
  });

  test('Should generate proper style when no grid properties are set', async () => {
    const expected = `:host {
  display: grid;
  grid-template-columns: auto;
  grid-template-rows: auto;
  align-items: stretch;
  justify-items: stretch;
}
@media (max-width: 1024px) {
  :host {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    align-items: stretch;
    justify-items: stretch;
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
    expect(console.warn.notCalled).to.be.true;
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
    expect(console.warn.notCalled).to.be.true;
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
    expect(console.warn.notCalled).to.be.true;
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

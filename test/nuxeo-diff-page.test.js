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
import { fixture, flush, html } from '@nuxeo/testing-helpers';

suite('nuxeo-diff-page header', () => {
  const LONG_TITLE = 'Quarterly Financial Reconciliation and Compliance Audit Report for the European Subsidiaries';
  let pageStyle;
  let style;
  let slotted;

  // nuxeo-diff-page is a dom-module loaded at runtime, so it cannot be imported as a module here.
  // Read its real stylesheet instead and lay the header out the way nuxeo-page does, so the
  // assertions below are about the shipped rules rather than a copy of them.
  suiteSetup(async () => {
    const url = '/elements/nuxeo-diff-page.html';
    const response = await fetch(url);
    expect(response.ok, `Failed to fetch ${url}: ${response.status} ${response.statusText}`).to.be.true;
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    // DOMParser leaves <template> contents inert, so re-parse them to reach the style element.
    const template = document.createElement('template');
    template.innerHTML = doc.querySelector('dom-module#nuxeo-diff-page template').innerHTML;
    pageStyle = template.content.querySelector('style').textContent;
  });

  setup(() => {
    slotted = document.createElement('style');
    slotted.textContent = slottedStyle;
    document.head.appendChild(slotted);
    style = document.createElement('style');
    style.textContent = pageStyle;
    document.head.appendChild(style);
  });

  teardown(() => {
    style.remove();
    slotted.remove();
  });

  // The Search button the app bar paints over the end of the toolbar (themes/base.js).
  const SEARCH_BUTTON_WIDTH = 60;

  // Flatten the cascade the page sits in. Source order stands in for the tree ordering, so
  // nuxeo-styles' .header beats nuxeo-page's reservation and the page's own style comes last.
  const slottedStyle = `
    /* nuxeo-page.js, #header::slotted(*) */
    .header { display: flex; align-items: center; width: 100%;
              padding-left: 16px; padding-right: 64px; overflow-x: hidden; }
    @media (max-width: 720px) { .header { padding-left: 48px; } }
    /* themes/base.js, nuxeo-styles .header - outranks the reservation above */
    .header { font-size: 1rem; height: 53px; padding: 0 16px; }
  `;

  // A flex row, so the header shrinks back to it instead of overflowing by its own padding, and
  // hides horizontal overflow, so anything the titles claim beyond it is cut off, not ellipsized.
  const header = (width, title) =>
    fixture(html`
      <div style="position: relative; display: flex; align-items: center; width: ${width}px; overflow-x: hidden;">
        <div class="header">
          <span class="title"> Compare <a href="#">${title}</a> Vs. <a href="#">${title}</a> </span>
        </div>
        <div
          class="search-button"
          style="position: absolute; top: 0; right: 0; width: ${SEARCH_BUTTON_WIDTH}px; height: 53px;"
        ></div>
      </div>
    `);

  [1280, 800, 560].forEach((width) => {
    test(`keeps both titles inside a ${width}px header (WEBUI-1491)`, async () => {
      const el = await header(width, LONG_TITLE);
      await flush();
      const slot = el.firstElementChild;
      expect(slot.scrollWidth - slot.clientWidth, 'header overflows and clips a title').to.equal(0);
    });

    test(`ellipsizes both titles in a ${width}px header (WEBUI-1491)`, async () => {
      const el = await header(width, LONG_TITLE);
      await flush();
      el.querySelectorAll('a').forEach((link) => {
        expect(link.scrollWidth, 'title is not ellipsized').to.be.above(link.clientWidth);
        expect(getComputedStyle(link).textOverflow).to.equal('ellipsis');
      });
    });
  });

  test('sizes a short title to its content rather than a fixed share (WEBUI-1491)', async () => {
    const el = await header(560, 'Report A');
    await flush();
    const [link] = el.querySelectorAll('a');
    expect(link.getBoundingClientRect().width).to.be.below(560 * 0.45);
  });

  // Staying inside the header is not enough: the Search button is opaque and painted over its end.
  // The ellipsis is drawn at the anchor's box end, so once that falls under the button the user
  // sees a hard mid-word cut. Assert the clearance, not the overflow.
  [1920, 1440, 1280, 1024, 800, 560].forEach((width) => {
    test(`keeps the second title clear of the Search button at ${width}px (WEBUI-1491)`, async () => {
      const el = await header(width, LONG_TITLE);
      await flush();
      const links = el.querySelectorAll('a');
      const second = links[links.length - 1].getBoundingClientRect();
      const button = el.querySelector('.search-button').getBoundingClientRect();
      expect(second.right - button.left, 'the second title runs underneath the Search button').to.be.at.most(0);
    });
  });

  // The drawer toggle only appears below a 720px viewport, which a fixture cannot narrow, so read
  // the shipped rule instead of measuring it.
  test('reserves the drawer toggle strip below 720px (WEBUI-1491)', () => {
    const query = [...style.sheet.cssRules].find(
      (rule) =>
        rule.media &&
        rule.conditionText.includes('720px') &&
        [...rule.cssRules].some((r) => r.selectorText === '.header'),
    );
    expect(query, 'no .header rule below 720px').to.exist;
    const { paddingInlineStart } = [...query.cssRules].find((r) => r.selectorText === '.header').style;
    expect(parseFloat(paddingInlineStart), 'the leading label sits under the drawer toggle').to.be.at.least(48);
  });

  test('mirrors the reserved strips in RTL (WEBUI-1491)', async () => {
    const el = await header(1280, LONG_TITLE);
    el.setAttribute('dir', 'rtl');
    await flush();
    const { paddingLeft, paddingRight } = getComputedStyle(el.firstElementChild);
    expect(parseFloat(paddingLeft), 'the Search button strip is reserved on the wrong side').to.be.at.least(
      SEARCH_BUTTON_WIDTH,
    );
    expect(parseFloat(paddingRight)).to.equal(16);
  });
});

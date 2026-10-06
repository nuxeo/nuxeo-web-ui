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
    style = document.createElement('style');
    style.textContent = pageStyle;
    document.head.appendChild(style);
  });

  teardown(() => {
    style.remove();
  });

  // nuxeo-page slots the header into a fixed-height toolbar that hides horizontal overflow, so
  // anything the titles claim beyond the available width is cut off rather than ellipsized.
  const header = (width, title) =>
    fixture(html`
      <div style="width: ${width}px; overflow-x: hidden;">
        <div class="header">
          <span class="title"> Compare <a href="#">${title}</a> Vs. <a href="#">${title}</a> </span>
        </div>
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
});

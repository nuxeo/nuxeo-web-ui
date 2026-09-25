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
import '../elements/nuxeo-app/nuxeo-page.js';

let browserStyle;

suiteSetup(async () => {
  const url = '/elements/nuxeo-browser.html';
  const response = await fetch(url);
  expect(response.ok, `Failed to fetch ${url}: ${response.status} ${response.statusText}`).to.be.true;
  const text = await response.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const template = document.createElement('template');
  template.innerHTML = doc.querySelector('dom-module#nuxeo-browser template').innerHTML;
  browserStyle = template.content.querySelector('style').textContent;
});

suite('nuxeo-page', () => {
  const contentStyle = (el) => getComputedStyle(el.shadowRoot.querySelector('#content'));

  test('reserves no bottom space when nothing floats over the content region', async () => {
    const el = await fixture(html`<nuxeo-page><div>content</div></nuxeo-page>`);
    await flush();
    const style = contentStyle(el);
    expect(style.paddingBottom).to.equal('0px');
    expect(style.scrollPaddingBottom).to.equal('0px');
  });

  test('reserves the create button safe area so the last row can be scrolled clear of it', async () => {
    const el = await fixture(
      html`<nuxeo-page style="--nuxeo-page-content-safe-area-bottom: 120px;"><div>content</div></nuxeo-page>`,
    );
    await flush();
    const style = contentStyle(el);
    expect(style.paddingBottom).to.equal('120px');
    expect(style.scrollPaddingBottom).to.equal('120px');
  });

  test('uses the browser-specific height and safe area', async () => {
    const style = document.createElement('style');
    style.textContent = browserStyle;
    document.head.appendChild(style);
    try {
      const browser = await fixture(
        html`<main style="display: flex; flex-direction: column; height: 480px;">
          <div style="display: block; height: 100%;">
            <div style="display: block; height: 100%;">
              <nuxeo-page><div>content</div></nuxeo-page>
            </div>
          </div>
        </main>`,
      );
      await flush();
      const page = browser.querySelector('nuxeo-page');
      const pageStyle = getComputedStyle(page.shadowRoot.querySelector('.page'));
      const contentStyle = getComputedStyle(page.shadowRoot.querySelector('#content'));
      expect(getComputedStyle(page).getPropertyValue('--nuxeo-page-height').trim()).to.equal('100%');
      expect(pageStyle.height).to.match(/px$/);
      expect(page.shadowRoot.querySelector('.page').getBoundingClientRect().height).to.be.greaterThan(0);
      expect(contentStyle.paddingBottom).to.equal('0px');
      expect(contentStyle.scrollPaddingBottom).to.equal('0px');
    } finally {
      style.remove();
    }
  });
});

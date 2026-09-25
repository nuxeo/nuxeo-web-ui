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
import '../elements/nuxeo-browser.html';

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

  test('uses the containing height and inherited safe area in the document browser', async () => {
    const browser = await fixture(html`<nuxeo-browser style="height: 480px;"></nuxeo-browser>`);
    await flush();
    const page = browser.shadowRoot.querySelector('nuxeo-page');
    const pageStyle = getComputedStyle(page.shadowRoot.querySelector('.page'));
    const contentStyle = getComputedStyle(page.shadowRoot.querySelector('#content'));
    expect(pageStyle.height).to.equal('480px');
    expect(contentStyle.paddingBottom).to.equal('0px');
    expect(contentStyle.scrollPaddingBottom).to.equal('0px');
  });
});

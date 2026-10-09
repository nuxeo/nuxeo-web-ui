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

suite('nuxeo-page', () => {
  // The reserve is settled on an animation frame after the resize observer reports, so give the
  // element a few frames rather than asserting straight off the fixture.
  const contentStyle = async (el) => {
    await flush();
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return getComputedStyle(el.shadowRoot.querySelector('#content'));
  };

  // Tall enough that the region scrolls further than the strip the button covers, which is where
  // reserving it is what makes the end of the content reachable.
  const page = (content) =>
    fixture(html`<nuxeo-page style="--nuxeo-page-content-safe-area-bottom: 120px;">${content}</nuxeo-page>`);

  test('reserves no bottom space when nothing floats over the content region', async () => {
    const el = await fixture(html`<nuxeo-page><div style="height: 400vh;">content</div></nuxeo-page>`);
    const style = await contentStyle(el);
    expect(style.paddingBottom).to.equal('0px');
    expect(style.scrollPaddingBottom).to.equal('0px');
  });

  test('reserves the create button safe area so the last row can be scrolled clear of it', async () => {
    const el = await page(html`<div style="height: 400vh;">content</div>`);
    const style = await contentStyle(el);
    expect(style.paddingBottom).to.equal('120px');
    expect(style.scrollPaddingBottom).to.equal('120px');
  });

  // WEBUI-2314
  test('hands the strip back to a region that already shows all of its content', async () => {
    const el = await page(html`<div>content</div>`);
    const style = await contentStyle(el);
    expect(style.paddingBottom).to.equal('0px');
    // focus still has to land clear of the button, and this costs no space either way
    expect(style.scrollPaddingBottom).to.equal('120px');
  });

  test('hands the strip back when the region scrolls less far than the strip itself', async () => {
    // Reserving here would make the button's own strip most of the scroll range, and all of it
    // empty - the blank space at the bottom of the tab this guards against.
    const el = await page(html`<div style="height: calc(100vh + 20px);">content</div>`);
    const style = await contentStyle(el);
    expect(style.paddingBottom).to.equal('0px');
  });

  test('stops observing the content region once detached', async () => {
    const el = await page(html`<div>content</div>`);
    await contentStyle(el);
    const spy = sinon.spy(el._contentObserver, 'disconnect');
    el.parentNode.removeChild(el);
    await flush();
    expect(spy.called).to.be.true;
  });
});

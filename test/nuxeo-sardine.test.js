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
import '../elements/nuxeo-sardine.js';

suite('nuxeo-sardine', () => {
  let el;

  setup(async () => {
    el = await fixture(html`<nuxeo-sardine hidden></nuxeo-sardine>`);
    await flush();
  });

  suite('_lerp', () => {
    test('interpolates between two values', () => {
      expect(el._lerp(0, 100, 0.5)).to.equal(50);
    });

    test('clamps amount below 0 to 0', () => {
      expect(el._lerp(10, 20, -1)).to.equal(10);
    });

    test('clamps amount above 1 to 1', () => {
      expect(el._lerp(10, 20, 2)).to.equal(20);
    });
  });

  test('_off hides sardine and clears animation frame', () => {
    el.hidden = false;
    el._req = 1;
    sinon.stub(window, 'cancelAnimationFrame');
    sinon.stub(window, 'removeEventListener');

    el._off();

    expect(el.hidden).to.be.true;
    expect(window.cancelAnimationFrame).to.have.been.calledWith(1);
    window.cancelAnimationFrame.restore();
    window.removeEventListener.restore();
  });
});

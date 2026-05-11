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
import '../elements/nuxeo-app/nuxeo-progress-indicator.js';

suite('nuxeo-progress-indicator', () => {
  let el;

  setup(async () => {
    el = await fixture(html`<nuxeo-progress-indicator></nuxeo-progress-indicator>`);
    await flush();
  });

  test('_visibleChanged plays fade-in animation when visible', () => {
    sinon.stub(el, 'playAnimation');
    el._visibleChanged(true);
    expect(el.playAnimation).to.have.been.calledWith('fadein');
    el.playAnimation.restore();
  });

  test('_visibleChanged does nothing when hidden', () => {
    sinon.stub(el, 'playAnimation');
    el._visibleChanged(false);
    expect(el.playAnimation).to.not.have.been.called;
    el.playAnimation.restore();
  });
});

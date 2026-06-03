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
import '../elements/nuxeo-document-create-actions/nuxeo-document-create-shortcut.js';

suite('nuxeo-document-create-shortcut', () => {
  let element;

  setup(async () => {
    element = await fixture(
      html`<nuxeo-document-create-shortcut
        type="File"
        icon="icons:description"
        label="label.file"
      ></nuxeo-document-create-shortcut>`,
    );
    sinon.stub(element, 'i18n').callsFake((key) => key);
    await flush();
  });

  test('_tap fires create-document with shortcut type', () => {
    const fireSpy = sinon.spy(element, 'fire');
    element._tap();
    expect(fireSpy).to.have.been.calledWith('create-document', { type: 'File' });
    fireSpy.restore();
  });

  test('_handleKeydown activates shortcut on Enter or Space', () => {
    const tapSpy = sinon.spy(element, '_tap');
    const preventDefault = sinon.spy();

    element._handleKeydown({ key: 'Enter', preventDefault });
    expect(preventDefault).to.have.been.calledOnce;
    expect(tapSpy).to.have.been.calledOnce;

    element._handleKeydown({ key: ' ', preventDefault });
    expect(tapSpy).to.have.been.calledTwice;

    element._handleKeydown({ key: 'Tab', preventDefault });
    expect(tapSpy).to.have.been.calledTwice;
    tapSpy.restore();
  });

  test('exposes a single accessible name via the visible label', () => {
    const control = element.shadowRoot.querySelector('.shortcut-container');
    const label = element.shadowRoot.querySelector('#shortcutLabel');
    expect(control.getAttribute('role')).to.equal('button');
    expect(control.getAttribute('aria-labelledby')).to.equal('shortcutLabel');
    expect(label.textContent.trim()).to.equal('label.file');
    expect(element.shadowRoot.querySelector('nuxeo-tooltip')).to.be.null;
    expect(element.shadowRoot.querySelector('#createBtn').getAttribute('aria-hidden')).to.equal('true');
  });
});

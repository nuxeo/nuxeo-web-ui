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
import { fixture, html, login } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-confirm-button/nuxeo-confirm-button.js';

suite('nuxeo-confirm-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-confirm-button></nuxeo-confirm-button>`);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default dialogTitle to Are you sure?', () => {
      expect(element.dialogTitle).to.equal('Are you sure?');
    });

    test('should default dialogConfirm to Yes', () => {
      expect(element.dialogConfirm).to.equal('Yes');
    });

    test('should default dialogDismiss to No', () => {
      expect(element.dialogDismiss).to.equal('No');
    });
  });

  suite('_confirm', () => {
    test('should fire confirm event with model', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element._model = { item: { uid: '1' } };
      element._confirm();
      expect(fireSpy).to.have.been.calledWith('confirm', { model: { item: { uid: '1' } } });
    });
  });

  suite('_dismiss', () => {
    test('should fire dismiss event with model', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element._model = { item: { uid: '1' } };
      element._dismiss();
      expect(fireSpy).to.have.been.calledWith('dismiss', { model: { item: { uid: '1' } } });
    });
  });

  suite('_toggleDialog', () => {
    test('should store event model', () => {
      const toggleStub = sinon.stub(element.$.dialog, 'toggle');
      const e = { model: { item: { uid: '1' } } };
      element._toggleDialog(e);
      expect(element._model).to.deep.equal({ item: { uid: '1' } });
      toggleStub.restore();
    });
  });
});

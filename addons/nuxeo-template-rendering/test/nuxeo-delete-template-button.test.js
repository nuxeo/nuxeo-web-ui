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
import '../elements/nuxeo-delete-template-button.js';

suite('nuxeo-delete-template-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-delete-template-button></nuxeo-delete-template-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_toggleDialog', () => {
    test('should toggle dialog', () => {
      const toggleStub = sinon.stub(element.$.dialog, 'toggle');
      element._toggleDialog();
      expect(toggleStub).to.have.been.calledOnce;
      toggleStub.restore();
    });
  });
});

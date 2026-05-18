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
import '../elements/nuxeo-tasks/nuxeo-tasks-drawer.js';

suite('nuxeo-tasks-drawer', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-tasks-drawer></nuxeo-tasks-drawer>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_observeVisible', () => {
    test('should call fetch on tasks when visible is true', () => {
      const fetchStub = sinon.stub(element.$.tasks, 'fetch');
      element._observeVisible(true);
      expect(fetchStub).to.have.been.called;
    });

    test('should not call fetch when visible is false', () => {
      const fetchStub = sinon.stub(element.$.tasks, 'fetch');
      element._observeVisible(false);
      expect(fetchStub).to.not.have.been.called;
    });
  });

  suite('_navigateToDashboard', () => {
    test('should call navigateTo with tasks', () => {
      const navStub = sinon.stub();
      Object.defineProperty(element, 'navigateTo', { value: navStub, configurable: true, writable: true });
      element._navigateToDashboard();
      expect(navStub).to.have.been.calledWith('tasks');
    });
  });
});

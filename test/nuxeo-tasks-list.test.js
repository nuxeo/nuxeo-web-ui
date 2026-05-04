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
import '../elements/nuxeo-tasks/nuxeo-tasks-list.js';

suite('nuxeo-tasks-list', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-tasks-list></nuxeo-tasks-list>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_computedClass', () => {
    test('should include selected when isSelected is true', () => {
      expect(element._computedClass(true)).to.include('selected');
    });

    test('should not include selected when isSelected is false', () => {
      expect(element._computedClass(false)).to.equal('list-item');
    });
  });

  suite('_ensureTaskParams / fetch (WEBUI-1686)', () => {
    test('fetch sets userId before calling list fetch when params were cleared', async () => {
      element.$.tasksProvider.params = {};
      sinon.stub(element.$.nx, 'connect').resolves({ id: 'expected-user' });
      sinon.stub(element.$.list, 'fetch').resolves();
      await element.fetch();
      expect(element.$.tasksProvider.params.userId).to.equal('expected-user');
      expect(element.$.list.fetch).to.have.been.calledOnce;
      element.$.nx.connect.restore();
      element.$.list.fetch.restore();
    });

    test('fetch waits for connect when userId is not set yet', async () => {
      element.$.tasksProvider.params = {};
      let resolveConnect;
      const connectPromise = new Promise((r) => {
        resolveConnect = r;
      });
      sinon.stub(element.$.nx, 'connect').returns(connectPromise);
      const listFetch = sinon.stub(element.$.list, 'fetch').resolves();
      const done = element.fetch();
      expect(listFetch).to.not.have.been.called;
      resolveConnect({ id: 'delayed-user' });
      await done;
      expect(element.$.tasksProvider.params.userId).to.equal('delayed-user');
      expect(listFetch).to.have.been.calledOnce;
      element.$.nx.connect.restore();
      element.$.list.fetch.restore();
    });
  });
});

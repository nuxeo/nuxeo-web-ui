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
import '../elements/nuxeo-collections/nuxeo-document-collections.js';

suite('nuxeo-document-collections', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-collections></nuxeo-document-collections>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('remove', () => {
    test('should execute operation with collection uid and fire event', async () => {
      element.document = { uid: 'doc1' };
      const execStub = sinon.stub(element.$.op, 'execute').resolves();
      const listener = sinon.spy();
      element.addEventListener('removed-from-collection', listener);
      const evt = {
        currentTarget: { dataset: { uid: 'col1' } },
        target: { dataset: { uid: 'col1' } },
      };
      element.remove(evt);
      expect(element.$.op.params.collection).to.equal('col1');
      await execStub.returnValues[0];
      expect(listener).to.have.been.calledOnce;
    });
  });
});

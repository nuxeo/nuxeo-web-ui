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
import '../elements/nuxeo-publication/nuxeo-unpublish-button.js';

suite('nuxeo-unpublish-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-unpublish-button></nuxeo-unpublish-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasPermission').returns(true);
  });

  teardown(() => {
    server.restore();
  });

  suite('_isAvailable', () => {
    test('should return falsy when no document', () => {
      element.document = null;
      expect(element._isAvailable()).to.not.be.ok;
    });

    test('should return false when document is not a proxy', () => {
      element.document = { uid: '1', isProxy: false };
      expect(element._isAvailable()).to.be.false;
    });

    test('should return true when document is proxy and has WriteVersion permission', () => {
      element.document = { uid: '1', isProxy: true };
      expect(element._isAvailable()).to.be.true;
      expect(element.hasPermission).to.have.been.calledWith(element.document, 'WriteVersion');
    });

    test('should return false when document is proxy but lacks permission', () => {
      element.hasPermission.returns(false);
      element.document = { uid: '1', isProxy: true };
      expect(element._isAvailable()).to.be.false;
    });
  });

  suite('_unpublish', () => {
    test('should execute operation and fire success event', async () => {
      const executeStub = sinon.stub(element.$.unpublishOp, 'execute').returns(Promise.resolve());
      const notifyStub = sinon.stub(element, 'notify');
      const fireSpy = sinon.spy(element, 'fire');

      element._unpublish();
      await executeStub.returnValues[0];

      expect(notifyStub).to.have.been.calledWith({ message: 'publication.unpublish.success' });
      expect(fireSpy).to.have.been.calledWith('nx-unpublish-success');
    });

    test('should notify error when operation fails', async () => {
      const executeStub = sinon.stub(element.$.unpublishOp, 'execute').returns(Promise.reject(new Error('fail')));
      const notifyStub = sinon.stub(element, 'notify');

      element._unpublish();
      try {
        await executeStub.returnValues[0];
      } catch (e) {
        // expected
      }
      // Allow microtask to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(notifyStub).to.have.been.calledWith({ message: 'publication.unpublish.error' });
    });
  });
});

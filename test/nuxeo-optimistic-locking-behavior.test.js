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
import { CONFLICT_STATUS } from '../elements/behaviors/nuxeo-optimistic-locking-behavior.js';
import '../elements/document/nuxeo-document-form-layout.js';

// WEBUI-1820: the behavior is exercised through `nuxeo-document-form-layout`, its primary host,
// so the test also proves the behavior is actually composed into a host that ships it.
suite('nuxeo-optimistic-locking-behavior', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-form-layout></nuxeo-document-form-layout>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('withChangeToken', () => {
    // `type` is required on every host document: nuxeo-document-form-layout stamps an edit layout
    // from it, and the inner nuxeo-document-layout throws without it.
    test('should add the change token of the host document', () => {
      element.document = { uid: 'doc-1', type: 'File', changeToken: '3-7' };
      expect(element.withChangeToken({ uid: 'doc-1' })).to.deep.equal({ uid: 'doc-1', changeToken: '3-7' });
    });

    test('should omit the change token when the document has none', () => {
      element.document = { uid: 'doc-1', type: 'File' };
      const data = element.withChangeToken({ uid: 'doc-1' });
      expect(data).to.deep.equal({ uid: 'doc-1' });
      expect('changeToken' in data).to.be.false;
    });

    test('should prefer an explicitly passed document over the host document', () => {
      element.document = { uid: 'doc-1', type: 'File', changeToken: 'host-token' };
      const data = element.withChangeToken({ uid: 'doc-2' }, { uid: 'doc-2', changeToken: 'arg-token' });
      expect(data.changeToken).to.equal('arg-token');
    });

    test('should leave the payload untouched when there is no document at all', () => {
      element.document = null;
      expect(element.withChangeToken({ uid: 'doc-1' })).to.deep.equal({ uid: 'doc-1' });
    });

    test('should return the same object it was given', () => {
      element.document = { uid: 'doc-1', type: 'File', changeToken: '1-0' };
      const data = { uid: 'doc-1' };
      expect(element.withChangeToken(data)).to.equal(data);
    });
  });

  suite('updateDocumentProperties', () => {
    test('updates through the shared token and success pipeline', async () => {
      const response = { uid: 'doc-1', type: 'File', changeToken: '4-0' };
      element.document = { uid: 'doc-1', type: 'File', repository: 'default', changeToken: '3-0' };
      const put = sinon.stub(element.$.doc, 'put').resolves(response);
      const fire = sinon.stub(element, 'fire');
      const onSuccess = sinon.spy();

      const result = await element.updateDocumentProperties({ 'dc:title': 'Updated' }, onSuccess);

      expect(element.$.doc.data).to.deep.equal({
        'entity-type': 'document',
        repository: 'default',
        uid: 'doc-1',
        properties: { 'dc:title': 'Updated' },
        changeToken: '3-0',
      });
      expect(result).to.equal(response);
      expect(element.document).to.equal(response);
      expect(onSuccess).to.have.been.calledOnceWith(response);
      expect(fire).to.have.been.calledOnceWith('document-updated');
      put.restore();
      fire.restore();
    });

    test('allows callers to omit the success callback', async () => {
      element.document = { uid: 'doc-1', type: 'File', repository: 'default' };
      const put = sinon.stub(element.$.doc, 'put').resolves({ uid: 'doc-1', type: 'File' });
      const fire = sinon.stub(element, 'fire');

      await element.updateDocumentProperties({});

      expect(fire).to.have.been.calledOnceWith('document-updated');
      put.restore();
      fire.restore();
    });
  });

  suite('isConflictError', () => {
    test('should recognise a 409', () => {
      expect(element.isConflictError({ status: CONFLICT_STATUS })).to.be.true;
    });

    test('should reject other statuses', () => {
      expect(element.isConflictError({ status: 500 })).to.be.false;
      expect(element.isConflictError({ status: 403 })).to.be.false;
    });

    test('should reject errors carrying no status', () => {
      expect(element.isConflictError(new Error('boom'))).to.be.false;
      expect(element.isConflictError(null)).to.be.false;
      expect(element.isConflictError(undefined)).to.be.false;
    });
  });

  suite('handleConflictError', () => {
    test('should notify and reload on a conflict', () => {
      const notify = sinon.stub(element, 'notify');
      const reload = sinon.spy();
      element.addEventListener('document-updated', reload);

      expect(element.handleConflictError({ status: CONFLICT_STATUS })).to.be.true;

      expect(notify).to.have.been.calledOnce;
      expect(notify.firstCall.args[0].message).to.equal('documentUpdate.conflict');
      expect(reload).to.have.been.calledOnce;
    });

    test('should not claim a non-conflict error', () => {
      const notify = sinon.stub(element, 'notify');
      const reload = sinon.spy();
      element.addEventListener('document-updated', reload);

      expect(element.handleConflictError({ status: 500 })).to.be.false;

      expect(notify).to.not.have.been.called;
      expect(reload).to.not.have.been.called;
    });
  });

  suite('rejectUnlessConflict', () => {
    test('should absorb a conflict, having reported and reloaded it', () => {
      const notify = sinon.stub(element, 'notify');
      const reload = sinon.spy();
      element.addEventListener('document-updated', reload);

      expect(() => element.rejectUnlessConflict({ status: CONFLICT_STATUS })).to.not.throw();

      expect(notify).to.have.been.calledOnce;
      expect(reload).to.have.been.calledOnce;
    });

    test('should rethrow anything that is not a conflict', () => {
      const notify = sinon.stub(element, 'notify');
      const error = { status: 500, message: 'server error' };

      expect(() => element.rejectUnlessConflict(error)).to.throw();
      expect(notify).to.not.have.been.called;
    });
  });
});

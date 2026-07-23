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
import '../elements/nuxeo-document-info-bar/nuxeo-document-info-bar.js';

suite('nuxeo-document-info-bar', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-info-bar></nuxeo-document-info-bar>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'hasPermission').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('_tasks', () => {
    test('should return pending tasks from document context', () => {
      const doc = { contextParameters: { pendingTasks: [{ id: 't1' }] } };
      expect(element._tasks(doc)).to.deep.equal([{ id: 't1' }]);
    });

    test('should return empty array when no pending tasks', () => {
      const doc = { contextParameters: {} };
      expect(element._tasks(doc)).to.deep.equal([]);
    });

    test('should return empty array for null doc', () => {
      expect(element._tasks(null)).to.deep.equal([]);
    });
  });

  suite('_workflows', () => {
    test('should return running workflows from document context', () => {
      const doc = { contextParameters: { runningWorkflows: [{ id: 'wf1' }] } };
      expect(element._workflows(doc)).to.deep.equal([{ id: 'wf1' }]);
    });

    test('should return empty array when no running workflows', () => {
      const doc = { contextParameters: {} };
      expect(element._workflows(doc)).to.deep.equal([]);
    });
  });

  suite('_computeActionContext', () => {
    test('should return object with document', () => {
      element.document = { uid: '1' };
      const ctx = element._computeActionContext();
      expect(ctx).to.have.property('document');
      expect(ctx.document.uid).to.equal('1');
    });
  });

  suite('_processTask', () => {
    test('should fire workflowTaskProcess event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      const task = { id: 't1' };
      element._processTask({ model: { task } });
      expect(fireSpy).to.have.been.calledWith('workflowTaskProcess', { task });
    });
  });

  suite('_isCurrentUser', () => {
    test('should return true when userId matches current user', () => {
      element.currentUser = { id: 'admin' };
      expect(element._isCurrentUser('admin')).to.be.true;
    });

    test('should return false when userId does not match', () => {
      element.currentUser = { id: 'admin' };
      expect(element._isCurrentUser('john')).to.be.false;
    });
  });

  suite('_hasPermissionToAbandon', () => {
    test('should return true when current user is initiator', () => {
      element.currentUser = { id: 'admin' };
      expect(element._hasPermissionToAbandon('admin')).to.be.true;
    });

    test('should return true when current user is administrator', () => {
      element.currentUser = { id: 'admin', isAdministrator: true };
      expect(element._hasPermissionToAbandon('john')).to.be.true;
    });

    test('should return false when current user is not initiator and not admin', () => {
      element.currentUser = { id: 'jane', isAdministrator: false };
      expect(element._hasPermissionToAbandon('john')).to.be.false;
    });
  });

  suite('_labelForInitiatedWf', () => {
    test('should return i18n key for workflow label', () => {
      element.currentUser = { id: 'admin' };
      const workflow = { initiator: 'admin', workflowModelName: 'SerialDocumentReview' };
      const result = element._labelForInitiatedWf(workflow);
      expect(result).to.be.a('string');
    });
  });

  suite('_resolvedInitiator', () => {
    test('should return entity when present in map', () => {
      const entity = { 'entity-type': 'user', id: 'jdoe', properties: { firstName: 'Jane', lastName: 'Doe' } };
      const result = element._resolvedInitiator('jdoe', { jdoe: entity });
      expect(result).to.equal(entity);
    });

    test('should fall back to raw username when not resolved', () => {
      expect(element._resolvedInitiator('jdoe', {})).to.equal('jdoe');
    });

    test('should fall back to raw username when entities is null', () => {
      expect(element._resolvedInitiator('jdoe', null)).to.equal('jdoe');
    });
  });

  suite('_fetchInitiators', () => {
    test('should skip fetching and reset state when workflows is empty', async () => {
      element._initiatorEntities = { stale: { id: 'stale' } };
      element._initiatorsLoading = true;
      const getSpy = sinon.spy(element.$.user, 'get');
      await element._fetchInitiators([]);
      expect(getSpy).to.not.have.been.called;
      expect(element._initiatorEntities).to.deep.equal({});
      expect(element._initiatorsLoading).to.be.false;
      getSpy.restore();
    });

    test('should fetch user entity for each unique initiator', async () => {
      const entity = { 'entity-type': 'user', id: 'jdoe', properties: { firstName: 'Jane', lastName: 'Doe' } };
      sinon.stub(element.$.user, 'get').resolves(entity);
      await element._fetchInitiators([
        { initiator: 'jdoe', id: 'wf1' },
        { initiator: 'jdoe', id: 'wf2' },
      ]);
      expect(element.$.user.get).to.have.been.calledOnce;
      expect(element._initiatorEntities).to.have.property('jdoe', entity);
      element.$.user.get.restore();
    });

    test('should keep raw username on fetch failure', async () => {
      sinon.stub(element.$.user, 'get').rejects(new Error('not found'));
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchInitiators([{ initiator: 'unknown', id: 'wf1' }]);
      expect(element._initiatorEntities).to.have.property('unknown', 'unknown');
      // A statusless (e.g. network/transport) error is unexpected and should be logged.
      expect(warnSpy).to.have.been.calledOnce;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should warn on unexpected non-404 errors', async () => {
      const error = new Error('internal error');
      error.status = 500;
      sinon.stub(element.$.user, 'get').rejects(error);
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchInitiators([{ initiator: 'baduser', id: 'wf2' }]);
      expect(element._initiatorEntities).to.have.property('baduser', 'baduser');
      expect(warnSpy).to.have.been.calledOnce;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should not warn on 404 errors', async () => {
      const error = new Error('not found');
      error.status = 404;
      sinon.stub(element.$.user, 'get').rejects(error);
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchInitiators([{ initiator: 'deleted', id: 'wf3' }]);
      expect(element._initiatorEntities).to.have.property('deleted', 'deleted');
      expect(warnSpy).to.not.have.been.called;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should URL-encode initiator ids in the request path', async () => {
      const entity = { 'entity-type': 'user', id: 'a b/c' };
      const getStub = sinon.stub(element.$.user, 'get').callsFake(() => {
        expect(element.$.user.path).to.equal('/user/a%20b%2Fc');
        return Promise.resolve(entity);
      });
      await element._fetchInitiators([{ initiator: 'a b/c', id: 'wf1' }]);
      expect(getStub).to.have.been.calledOnce;
      element.$.user.get.restore();
    });

    test('should discard stale responses via request-id guard', async () => {
      const first = { 'entity-type': 'user', id: 'first' };
      const second = { 'entity-type': 'user', id: 'second' };
      sinon.stub(element.$.user, 'get').resolves(first);
      // Start first fetch but do not await; bump the request id by starting a second.
      const p1 = element._fetchInitiators([{ initiator: 'first', id: 'wf1' }]);
      element.$.user.get.resolves(second);
      const p2 = element._fetchInitiators([{ initiator: 'second', id: 'wf2' }]);
      await Promise.all([p1, p2]);
      // Only the latest fetch's results should be applied.
      expect(element._initiatorEntities).to.have.property('second');
      expect(element._initiatorEntities).to.not.have.property('first');
      element.$.user.get.restore();
    });

    test('should serialize concurrent invocations on the shared resource', async () => {
      const paths = [];
      sinon.stub(element.$.user, 'get').callsFake(() => {
        // Record the path each lookup requests; interleaved runs would corrupt the order.
        paths.push(element.$.user.path);
        return Promise.resolve({ 'entity-type': 'user', id: element.$.user.path });
      });
      const p1 = element._fetchInitiators([
        { initiator: 'a', id: 'wf1' },
        { initiator: 'b', id: 'wf2' },
      ]);
      const p2 = element._fetchInitiators([{ initiator: 'c', id: 'wf3' }]);
      await Promise.all([p1, p2]);
      // Serialized: first invocation's lookups (a, b) complete before the second's (c).
      expect(paths).to.deep.equal(['/user/a', '/user/b', '/user/c']);
      element.$.user.get.restore();
    });
  });
});

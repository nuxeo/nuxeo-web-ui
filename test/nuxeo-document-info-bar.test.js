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
});

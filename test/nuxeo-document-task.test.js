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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
import '../elements/workflow/nuxeo-document-task.js';

suite('nuxeo-document-task', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-task></nuxeo-document-task>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default _selectedTab to resolution', () => {
      expect(element._selectedTab).to.equal('resolution');
    });

    test('should default processing to false', () => {
      expect(element.processing).to.be.false;
    });
  });

  suite('_isTaskInEndState', () => {
    test('should return true when task state is ended', () => {
      expect(element._isTaskInEndState({ state: 'ended' })).to.be.true;
    });

    test('should return false when task state is not ended', () => {
      expect(element._isTaskInEndState({ state: 'opened' })).to.be.false;
    });
  });

  suite('_computeLayoutVisibility', () => {
    test('should return read-only for ended task', () => {
      expect(element._computeLayoutVisibility({ state: 'ended' })).to.equal('read-only');
    });

    test('should return empty string for active task', () => {
      expect(element._computeLayoutVisibility({ state: 'opened' })).to.equal('');
    });
  });

  suite('_delegatedActorsExist', () => {
    test('should return true when delegated actors exist', () => {
      expect(element._delegatedActorsExist(['user:john'])).to.be.true;
    });

    test('should return false when delegated actors is empty', () => {
      expect(element._delegatedActorsExist([])).to.be.false;
    });

    test('should return false when delegated actors is null', () => {
      expect(element._delegatedActorsExist(null)).to.not.be.ok;
    });
  });

  suite('_isDelegationDisabled', () => {
    test('should return true when allowDelegate is explicitly false', () => {
      expect(element._isDelegationDisabled({ taskInfo: { allowDelegate: false } })).to.be.true;
    });

    test('should return false when allowDelegate is true', () => {
      expect(element._isDelegationDisabled({ taskInfo: { allowDelegate: true } })).to.be.false;
    });

    test('should return false when allowDelegate is undefined (legacy node)', () => {
      expect(element._isDelegationDisabled({ taskInfo: {} })).to.be.false;
    });

    test('should return false when taskInfo is missing', () => {
      expect(element._isDelegationDisabled({})).to.be.false;
    });

    test('should return false when task is falsy', () => {
      expect(element._isDelegationDisabled(null)).to.be.false;
    });
  });

  suite('delegate button visibility', () => {
    const buildTask = (taskInfo) => {
      return {
        id: 't1',
        state: 'opened',
        nodeName: 'Task1',
        workflowModelName: 'SerialDocumentReview',
        taskInfo,
      };
    };

    const getDelegateButton = async (taskInfo) => {
      element.task = buildTask(taskInfo);
      await flush();
      return element.shadowRoot.querySelector('#delegateBtn');
    };

    test('should show the delegate button when allowDelegate is true', async () => {
      const btn = await getDelegateButton({ allowDelegate: true });
      expect(btn).to.be.ok;
      expect(btn.hidden).to.be.false;
    });

    test('should show the delegate button for legacy nodes without allowDelegate', async () => {
      const btn = await getDelegateButton({});
      expect(btn).to.be.ok;
      expect(btn.hidden).to.be.false;
    });

    test('should hide the delegate button when allowDelegate is false', async () => {
      const btn = await getDelegateButton({ allowDelegate: false });
      expect(btn).to.be.ok;
      expect(btn.hidden).to.be.true;
    });
  });

  suite('_hasActorType', () => {
    test('should return true when actors contain matching type', () => {
      const actors = [{ 'entity-type': 'user', id: 'john' }];
      expect(element._hasActorType(actors, 'user')).to.be.true;
    });

    test('should return false when actors do not contain matching type', () => {
      const actors = [{ 'entity-type': 'group', id: 'admins' }];
      expect(element._hasActorType(actors, 'user')).to.be.false;
    });
  });

  suite('_getActorsByType', () => {
    test('should return filtered actors by type', () => {
      const actors = [
        { 'entity-type': 'user', id: 'john' },
        { 'entity-type': 'group', id: 'admins' },
        { 'entity-type': 'user', id: 'jane' },
      ];
      const result = element._getActorsByType(actors, 'user');
      expect(result).to.have.length(2);
      expect(result[0].id).to.equal('john');
    });

    test('should return empty array when no match', () => {
      const actors = [{ 'entity-type': 'group', id: 'admins' }];
      const result = element._getActorsByType(actors, 'user');
      expect(result).to.deep.equal([]);
    });

    test('should return false for null actors', () => {
      expect(element._getActorsByType(null, 'user')).to.not.be.ok;
    });
  });

  suite('_updateTaskLayout', () => {
    test('should set _href from task properties', () => {
      const task = { nodeName: 'Task1', workflowModelName: 'SerialDocumentReview' };
      element._updateTaskLayout(task);
      expect(element._href).to.include('serialdocumentreview/nuxeo-task1-layout.html');
    });

    test('should set _href to null before computing', () => {
      element._href = 'old-value';
      const task = { nodeName: 'Approve', workflowModelName: 'ParallelDocumentReview' };
      element._updateTaskLayout(task);
      expect(element._href).to.include('paralleldocumentreview/nuxeo-approve-layout.html');
    });

    test('should not set _href when task is falsy', () => {
      element._href = 'existing';
      element._updateTaskLayout(null);
      expect(element._href).to.equal('existing');
    });
  });

  suite('_elementChanged', () => {
    test('should set _model from task target document', () => {
      element.task = {
        id: 't1',
        nodeName: 'Task1',
        workflowModelName: 'serial',
        targetDocumentIds: [{ uid: 'doc1' }],
      };
      element._elementChanged();
      expect(element._model.document).to.deep.equal({ uid: 'doc1' });
      expect(element._model.task).to.equal(element.task);
    });
  });

  suite('_toggleGraphDialog', () => {
    test('should call show on the graph element', () => {
      sinon.stub(element.$.graph, 'show');
      const event = { preventDefault: sinon.spy() };
      element._toggleGraphDialog(event);
      expect(event.preventDefault).to.have.been.calledOnce;
      expect(element.$.graph.show).to.have.been.calledOnce;
    });
  });

  suite('_toggleAssignmentDialog', () => {
    test('should set action and open popup', () => {
      sinon.stub(element.$.assignmentDialog, 'openPopup');
      const event = { target: { dataset: { args: 'delegate' } } };
      element._toggleAssignmentDialog(event);
      expect(element.action).to.equal('delegate');
      expect(element.$.assignmentDialog.openPopup).to.have.been.calledOnce;
    });
  });

  suite('validate', () => {
    test('should delegate to layout validate', () => {
      element.$.layout.validate = sinon.stub().returns(true);
      const result = element.validate();
      expect(element.$.layout.validate).to.have.been.calledOnce;
      expect(result).to.be.true;
    });
  });

  suite('_processTask', () => {
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    let layoutElement;

    setup(() => {
      layoutElement = {
        task: { id: 't1', variables: { comment: 'ok' } },
        root: document.createElement('div'),
      };
      element.$.layout = {
        element: layoutElement,
        validate: sinon.stub(),
        _getValidatableElements: sinon.stub().returns([]),
      };
      element.$.taskRequest = { put: sinon.stub() };
      sinon.stub(element, 'fire');
      sinon.stub(element, 'notify');
    });

    test('should skip validation and process when validate flag is false', async () => {
      const event = { model: { item: { name: 'approve', validate: false } } };
      element.$.taskRequest.put.resolves({ id: 't1' });
      await element._processTask(event);
      await flush();
      expect(element.$.layout.validate).to.not.have.been.called;
      expect(element.action).to.equal('approve');
      expect(element.fire).to.have.been.calledWith('workflowTaskProcessed');
      expect(element.processing).to.be.false;
    });

    test('should validate and abort when validation fails', async () => {
      const event = { model: { item: { name: 'approve', validate: true } } };
      element.$.layout.validate.resolves(false);
      await element._processTask(event);
      expect(element.$.taskRequest.put).to.not.have.been.called;
      expect(element.processing).to.be.false;
    });

    test('should scroll to invalid field on validation failure', async () => {
      const invalidField = { invalid: true, scrollIntoView: sinon.spy(), focus: sinon.spy() };
      element.$.layout._getValidatableElements.returns([invalidField]);
      element.$.layout.validate.resolves(false);
      const event = { model: { item: { name: 'approve', validate: true } } };
      await element._processTask(event);
      expect(invalidField.scrollIntoView).to.have.been.calledOnce;
      expect(invalidField.focus).to.have.been.calledOnce;
    });

    test('should fire workflowTaskProcessed on success', async () => {
      const event = { model: { item: { name: 'approve', validate: false } } };
      const taskResult = { id: 't1', state: 'ended' };
      element.$.taskRequest.put.resolves(taskResult);
      await element._processTask(event);
      await flush();
      expect(element.fire).to.have.been.calledWith('workflowTaskProcessed', { task: taskResult });
    });

    test('should notify and fire event on 409 conflict error', async () => {
      const event = { model: { item: { name: 'approve', validate: false } } };
      element.$.taskRequest.put.returns(Promise.reject({ status: 409 }));
      await element._processTask(event);
      await flush();
      expect(element.notify).to.have.been.calledOnce;
      expect(element.notify.firstCall.args[0].message).to.equal('tasks.submit.error.alreadyFinished');
      expect(element.notify.firstCall.args[0].duration).to.equal(30000);
      expect(element.fire).to.have.been.calledWith('workflowTaskProcessed');
      expect(element.processing).to.be.false;
    });

    test('should notify and fire event on 403 forbidden error', async () => {
      const event = { model: { item: { name: 'approve', validate: false } } };
      element.$.taskRequest.put.returns(Promise.reject({ status: 403 }));
      await element._processTask(event);
      await flush();
      expect(element.notify).to.have.been.calledOnce;
      expect(element.notify.firstCall.args[0].message).to.equal('tasks.submit.error.noPermissions');
      expect(element.fire).to.have.been.calledWith('workflowTaskProcessed');
      expect(element.processing).to.be.false;
    });

    test('should notify with generic message on other errors', async () => {
      const event = { model: { item: { name: 'approve', validate: false } } };
      element.$.taskRequest.put.returns(Promise.reject({ status: 500 }));
      await element._processTask(event);
      await flush();
      expect(element.notify).to.have.been.calledOnce;
      expect(element.notify.firstCall.args[0].message).to.equal('tasks.submit.error');
      expect(element.processing).to.be.false;
    });

    test('should set taskData with entity-type, id, and variables', async () => {
      const event = { model: { item: { name: 'reject', validate: false } } };
      element.$.taskRequest.put.resolves({});
      await element._processTask(event);
      await flush();
      expect(element.taskData).to.deep.equal({
        'entity-type': 'task',
        id: 't1',
        variables: { comment: 'ok' },
      });
    });
  });
});

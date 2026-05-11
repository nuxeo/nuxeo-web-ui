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
import '../elements/workflow/nuxeo-document-task-assignment-popup.js';

suite('nuxeo-document-task-assignment-popup', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-task-assignment-popup></nuxeo-document-task-assignment-popup>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_getActionLabel', () => {
    test('should return i18n key for delegate', () => {
      expect(element._getActionLabel('delegate', element.i18n)).to.equal('tasks.delegate');
    });

    test('should return i18n key for reassign', () => {
      expect(element._getActionLabel('reassign', element.i18n)).to.equal('tasks.reassign');
    });
  });

  suite('_resetPopup', () => {
    test('should reset params to empty object', () => {
      element.params = { foo: 'bar' };
      element._resetPopup();
      expect(element.params).to.deep.equal({});
    });
  });

  suite('_processAssignment', () => {
    test('should set delegatedActors param when action is delegate', () => {
      element.action = 'delegate';
      element.actors = ['user:john'];
      element.comment = 'please handle';
      element.params = {};
      sinon.stub(element.$.assignmentForm, 'validate').returns(true);
      sinon.stub(element.$.taskAssignment, 'put').resolves({ id: 't1' });
      element._processAssignment();
      expect(element.params.delegatedActors).to.deep.equal(['user:john']);
      expect(element.params.comment).to.equal('please handle');
    });

    test('should set actors param when action is reassign', () => {
      element.action = 'reassign';
      element.actors = ['user:jane'];
      element.comment = 'take over';
      element.params = {};
      sinon.stub(element.$.assignmentForm, 'validate').returns(true);
      sinon.stub(element.$.taskAssignment, 'put').resolves({ id: 't1' });
      element._processAssignment();
      expect(element.params.actors).to.deep.equal(['user:jane']);
      expect(element.params.comment).to.equal('take over');
    });

    test('should not call put when form is invalid', () => {
      sinon.stub(element.$.assignmentForm, 'validate').returns(false);
      const putSpy = sinon.spy(element.$.taskAssignment, 'put');
      element._processAssignment();
      expect(putSpy).to.not.have.been.called;
    });
  });
});

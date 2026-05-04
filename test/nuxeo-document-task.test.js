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
  });
});

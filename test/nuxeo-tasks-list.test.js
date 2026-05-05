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

  suite('fetch', () => {
    test('delegates full reload to the data list fetch when no offset', async () => {
      sinon.stub(element.$.list, 'fetch').resolves();
      await element.fetch();
      expect(element.$.list.fetch).to.have.been.calledOnce;
      element.$.list.fetch.restore();
    });

    test('delegates range load to the data list _fetchRange when offset is set', async () => {
      sinon.stub(element.$.list, '_fetchRange').resolves();
      await element.fetch(20, 40);
      expect(element.$.list._fetchRange).to.have.been.calledOnceWith(20, 60, false);
      element.$.list._fetchRange.restore();
    });
  });

  suite('_selectionChanged', () => {
    test('should not navigate when noNavigation is true', () => {
      element.noNavigation = true;
      element._selection = { id: 't1' };
      const nav = sinon.stub(element, 'navigateTo');
      element._selectionChanged();
      expect(nav).to.not.have.been.called;
      nav.restore();
    });

    test('should not navigate when _selection is null', () => {
      element._selection = null;
      const nav = sinon.stub(element, 'navigateTo');
      element._selectionChanged();
      expect(nav).to.not.have.been.called;
      nav.restore();
    });
  });

  suite('_currentChanged', () => {
    test('should return early when same task id', () => {
      const task = { id: 't1' };
      element.$.list.items = [task];
      sinon.stub(element.$.list, 'selectItem');
      element._currentChanged(task, task);
      expect(element.$.list.selectItem).to.not.have.been.called;
      element.$.list.selectItem.restore();
    });

    test('should select matching task from list items', () => {
      const task = { id: 't1' };
      element.$.list.items = [task];
      sinon.stub(element.$.list, 'selectItem');
      element._currentChanged(task, null);
      expect(element.$.list.selectItem).to.have.been.calledWith(task);
      element.$.list.selectItem.restore();
    });

    test('should deselect old task when newVal is null', () => {
      const oldTask = { id: 't1' };
      element.$.list.items = [oldTask];
      sinon.stub(element.$.list, 'deselectItem');
      element._currentChanged(null, oldTask);
      expect(element.$.list.deselectItem).to.have.been.calledWith(oldTask);
      element.$.list.deselectItem.restore();
    });
  });

  // suite('_ensureTaskParams', () => {
  //   test('should resolve immediately when params already have userId', async () => {
  //     element.$.tasksProvider.params = { userId: 'admin' };
  //     await element._ensureTaskParams();
  //     expect(element.$.tasksProvider.params.userId).to.equal('admin');
  //   });
  // });
});

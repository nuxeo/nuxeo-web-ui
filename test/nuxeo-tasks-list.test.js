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
    test('sets tasksProvider userId before list fetch when params were not primed (WEBUI-1686)', async () => {
      element.$.tasksProvider.params = undefined;
      let resolveConnect;
      const connectDeferred = new Promise((resolve) => {
        resolveConnect = resolve;
      });
      sinon.stub(element.$.nx, 'connect').returns(connectDeferred);
      sinon.stub(element.$.list, 'fetch').callsFake(() => {
        expect(element.$.tasksProvider.params?.userId).to.equal('wf-user');
        return Promise.resolve();
      });
      const done = element.fetch();
      resolveConnect({ id: 'wf-user' });
      await done;
      expect(element.$.list.fetch).to.have.been.calledOnce;
      element.$.nx.connect.restore();
      element.$.list.fetch.restore();
    });

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

    test('uses tasksProvider pageSize when offset is passed without pageSize', async () => {
      sinon.stub(element.$.list, '_fetchRange').resolves();
      element.$.tasksProvider.pageSize = 30;
      await element.fetch(5);
      expect(element.$.list._fetchRange).to.have.been.calledOnceWith(5, 35, false);
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

    test('should navigate when selection exists and navigation is allowed', () => {
      element.noNavigation = false;
      const nav = sinon.stub(element, 'navigateTo');
      element._selection = { id: 't1' };
      expect(nav).to.have.been.calledOnceWith('tasks', 't1');
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

    test('should return early when new and old differ but share the same id', () => {
      sinon.stub(element.$.list, 'selectItem');
      element._currentChanged({ id: 't1' }, { id: 't1' });
      expect(element.$.list.selectItem).to.not.have.been.called;
      element.$.list.selectItem.restore();
    });

    test('should return early when selection already matches new current', () => {
      sinon.stub(element, 'navigateTo');
      element._selection = { id: 't2' };
      sinon.stub(element.$.list, 'selectItem');
      element._currentChanged({ id: 't2' }, { id: 't1' });
      expect(element.$.list.selectItem).to.not.have.been.called;
      element.$.list.selectItem.restore();
      element.navigateTo.restore();
    });

    test('should select matching task from list items', () => {
      const task = { id: 't1' };
      element.$.list.items = [task];
      sinon.stub(element.$.list, 'selectItem');
      element._currentChanged(task, null);
      expect(element.$.list.selectItem).to.have.been.calledWith(task);
      element.$.list.selectItem.restore();
    });

    test('should not select when new current is not among list items', () => {
      element.$.list.items = [{ id: 'other' }];
      sinon.stub(element.$.list, 'selectItem');
      element._currentChanged({ id: 'missing' }, null);
      expect(element.$.list.selectItem).to.not.have.been.called;
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

    test('should not deselect when old task is no longer in the list', () => {
      element.$.list.items = [];
      sinon.stub(element.$.list, 'deselectItem');
      element._currentChanged(null, { id: 'gone' });
      expect(element.$.list.deselectItem).to.not.have.been.called;
      element.$.list.deselectItem.restore();
    });

    test('should not select or deselect when new and old are both null', () => {
      sinon.stub(element.$.list, 'selectItem');
      sinon.stub(element.$.list, 'deselectItem');
      element._currentChanged(null, null);
      expect(element.$.list.selectItem).to.not.have.been.called;
      expect(element.$.list.deselectItem).to.not.have.been.called;
      element.$.list.selectItem.restore();
      element.$.list.deselectItem.restore();
    });
  });

  suite('_ensureTaskParams', () => {
    test('resolves without calling connect when userId is already set', async () => {
      const connect = sinon.stub(element.$.nx, 'connect').resolves({ id: 'u' });
      element.$.tasksProvider.params = { userId: 'preset' };
      await element._ensureTaskParams();
      expect(connect).to.not.have.been.called;
      connect.restore();
    });

    test('sets userId from connection and preserves existing params', async () => {
      element.$.tasksProvider.params = { other: 'x' };
      sinon.stub(element.$.nx, 'connect').resolves({ id: 'alice' });
      await element._ensureTaskParams();
      expect(element.$.tasksProvider.params).to.deep.equal({ other: 'x', userId: 'alice' });
      element.$.nx.connect.restore();
    });

    test('sets userId when params were unset', async () => {
      element.$.tasksProvider.params = undefined;
      sinon.stub(element.$.nx, 'connect').resolves({ id: 'bob' });
      await element._ensureTaskParams();
      expect(element.$.tasksProvider.params).to.deep.equal({ userId: 'bob' });
      element.$.nx.connect.restore();
    });

    test('shares one in-flight connect for concurrent calls until userId is set', async () => {
      element.$.tasksProvider.params = {};
      let resolveConnect;
      const deferred = new Promise((resolve) => {
        resolveConnect = resolve;
      });
      const connect = sinon.stub(element.$.nx, 'connect').returns(deferred);
      const p1 = element._ensureTaskParams();
      const p2 = element._ensureTaskParams();
      expect(connect).to.have.been.calledOnce;
      resolveConnect({ id: 'shared' });
      await Promise.all([p1, p2]);
      expect(element.$.tasksProvider.params.userId).to.equal('shared');
      connect.restore();
    });

    test('merges userId into params updated while connect is in flight', async () => {
      element.$.tasksProvider.params = { pageSize: 20 };
      let resolveConnect;
      const deferred = new Promise((resolve) => {
        resolveConnect = resolve;
      });
      sinon.stub(element.$.nx, 'connect').returns(deferred);
      const pending = element._ensureTaskParams();
      element.$.tasksProvider.params = { ...element.$.tasksProvider.params, filter: 'open' };
      resolveConnect({ id: 'alice' });
      await pending;
      expect(element.$.tasksProvider.params).to.deep.equal({
        filter: 'open',
        pageSize: 20,
        userId: 'alice',
      });
      element.$.nx.connect.restore();
    });
  });

  suite('selectTask', () => {
    test('scrolls to index when task is already in items', async () => {
      const task = { id: 'a' };
      element.$.list.items = [task];
      sinon.stub(element.$.list, 'scrollToIndex');
      sinon.stub(element.$.list, 'selectIndex');
      const fetchSpy = sinon.spy(element, 'fetch');
      element.selectTask(0, task, { offset: 0, pageSize: 10 });
      await Promise.resolve();
      expect(fetchSpy).to.not.have.been.called;
      expect(element.$.list.scrollToIndex).to.have.been.calledOnceWith(0);
      expect(element.$.list.selectIndex).to.have.been.calledOnceWith(0);
      fetchSpy.restore();
      element.$.list.scrollToIndex.restore();
      element.$.list.selectIndex.restore();
    });

    test('fetches then resolves index when item moved after load', async () => {
      const task = { id: 'target' };
      const items = [];
      element.$.list.items = items;
      sinon.stub(element.$.list, 'scrollToIndex');
      sinon.stub(element.$.list, 'selectIndex');
      const fetchStub = sinon.stub(element, 'fetch').callsFake(async () => {
        items.push({ id: 'a' }, task);
      });
      element.selectTask(0, task, { offset: 0, pageSize: 10 });
      expect(fetchStub).to.have.been.calledOnce;
      await fetchStub.returnValues[0];
      expect(element.$.list.scrollToIndex).to.have.been.calledOnceWith(1);
      expect(element.$.list.selectIndex).to.have.been.calledOnceWith(1);
      fetchStub.restore();
      element.$.list.scrollToIndex.restore();
      element.$.list.selectIndex.restore();
    });
  });

  suite('_handleKeyNav', () => {
    test('delegates to handleVerticalKeyNavigation', () => {
      element._handleKeyNav({ key: 'Escape' });
    });
  });

  suite('ready', () => {
    test('invokes _ensureTaskParams', async () => {
      await customElements.whenDefined('nuxeo-tasks-list');
      const Ctor = customElements.get('nuxeo-tasks-list');
      const spy = sinon.spy(Ctor.prototype, '_ensureTaskParams');
      const el = await fixture(html`<nuxeo-tasks-list></nuxeo-tasks-list>`);
      sinon.stub(el, 'i18n').callsFake((key) => key);
      expect(spy).to.have.been.calledOnce;
      spy.restore();
    });

    test('ready catches priming failure and logs a warning', async () => {
      await customElements.whenDefined('nuxeo-tasks-list');
      const Ctor = customElements.get('nuxeo-tasks-list');
      const warn = sinon.stub(console, 'warn');
      const stub = sinon.stub(Ctor.prototype, '_ensureTaskParams').callsFake(function readyPriming() {
        return Promise.reject(new Error('conn-down'));
      });
      const el = await fixture(html`<nuxeo-tasks-list></nuxeo-tasks-list>`);
      sinon.stub(el, 'i18n').callsFake((key) => key);
      await Promise.resolve();
      expect(stub).to.have.been.called;
      expect(warn).to.have.been.calledOnce;
      expect(warn.firstCall.args[0]).to.include('Failed to get tasks list user parameters');
      stub.restore();
      warn.restore();
    });
  });
});

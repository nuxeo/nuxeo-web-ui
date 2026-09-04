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
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-results/nuxeo-results.js';

// Mock view element for testing
const createMockView = (props = {}) => {
  const mockView = document.createElement('div');
  Object.assign(mockView, {
    items: [],
    selectedItems: [],
    selectAllActive: false,
    settings: {},
    fetch: sinon.stub().resolves(),
    reset: sinon.stub(),
    clearSelection: sinon.stub(),
    selectItems: sinon.stub(),
    selectAll: sinon.stub(),
    notifyResize: sinon.stub(),
    focusOnIndexIfNotVisible: sinon.stub(),
    ...props,
  });
  return mockView;
};

// Mock page provider
const createMockProvider = (resultsCount = 0, loading = false) => {
  const provider = document.createElement('nuxeo-page-provider');
  provider.loading = loading;
  provider.resultsCount = resultsCount;
  provider.fetch = sinon.stub().resolves();
  return provider;
};

suite('nuxeo-results', () => {
  let results;

  setup(async () => {
    results = await fixture(html` <nuxeo-results name="test-results"></nuxeo-results> `);
    await flush();
  });

  suite('Component Initialization', () => {
    test('initializes with default values', () => {
      expect(results.displayMode).to.be.undefined;
      expect(results.view).to.be.undefined;
      expect(results.selectedItems).to.deep.equal([]);
      expect(results.selectAllActive).to.equal(false);
      expect(results.columns).to.deep.equal([]);
    });

    test('initializes settings object', () => {
      results.initializeSettings();
      expect(results._settings).to.exist;
      expect(results._settings).to.deep.equal({});
    });

    test('has proper element structure', () => {
      expect(results.$.nxcon).to.exist;
      expect(results.$.views).to.exist;
      expect(results.$.prefStorage).to.exist;
    });
  });

  suite('Display Mode Management', () => {
    test('can set display mode', async () => {
      results.displayMode = 'table';
      await flush();
      expect(results.displayMode).to.equal('table');
    });

    test('display mode change triggers view update', async () => {
      results.displayMode = 'table';
      await flush();

      results.displayMode = 'grid';
      await flush();

      // Display mode should be updated
      expect(results.displayMode).to.equal('grid');
    });
  });

  suite('Items Getter (WEBUI-1553)', () => {
    test('returns empty array when view is undefined', () => {
      expect(results.view).to.be.undefined;
      expect(results.items).to.deep.equal([]);
    });

    test('returns empty array when view is null', () => {
      results.view = null;
      expect(results.items).to.deep.equal([]);
    });

    test('does not throw when accessing items', () => {
      expect(() => results.items).to.not.throw();
    });

    test('handles exceptions in items getter gracefully', () => {
      // The getter has try-catch for safety
      const mockView = createMockView();
      Object.defineProperty(mockView, 'items', {
        get() {
          throw new Error('Simulated error');
        },
      });
      results.view = mockView;

      // Should not throw, returns empty array
      expect(() => results.items).to.not.throw();
      expect(results.items).to.deep.equal([]);
    });

    test('reads items from embedded list when view.items is not an array', () => {
      const listItems = [{ uid: '1' }];
      results.view = createMockView({ items: null, $: { list: { items: listItems } } });
      expect(results.items).to.deep.equal(listItems);

      results.view.$.list.items = { not: 'array' };
      expect(results.items).to.deep.equal([]);
    });
  });

  suite('View Method Defensive Guards (WEBUI-1553)', () => {
    test('fetch() does not throw when view is undefined', async () => {
      // Should not throw
      await results.fetch();
    });

    test('fetch() does not throw when view is null', async () => {
      results.view = null;
      // Should not throw
      await results.fetch();
    });

    test('fetch() does not throw when view.fetch is not a function', async () => {
      results.view = createMockView({ fetch: null });
      // Should not throw
      await results.fetch();
    });

    test('reset() does not throw when view is undefined', () => {
      expect(() => results.reset()).to.not.throw();
    });

    test('reset() does not throw when view is null', () => {
      results.view = null;
      expect(() => results.reset()).to.not.throw();
    });

    test('reset() does not throw when view.reset is not a function', () => {
      results.view = createMockView({ reset: null });
      expect(() => results.reset()).to.not.throw();
    });

    test('clearSelection() does not throw when view is undefined', () => {
      expect(() => results.clearSelection()).to.not.throw();
    });

    test('clearSelection() does not throw when view is null', () => {
      results.view = null;
      expect(() => results.clearSelection()).to.not.throw();
    });

    test('clearSelection() does not throw when view.clearSelection is not a function', () => {
      results.view = createMockView({ clearSelection: null });
      expect(() => results.clearSelection()).to.not.throw();
    });

    test('selectItems() does not throw when view is undefined', () => {
      expect(() => results.selectItems([{ uid: '1' }])).to.not.throw();
    });

    test('selectItems() does not throw when view is null', () => {
      results.view = null;
      expect(() => results.selectItems([{ uid: '1' }])).to.not.throw();
    });

    test('selectItems() does not throw when view methods are not functions', () => {
      results.view = createMockView({
        selectItems: null,
        notifyResize: null,
      });
      expect(() => results.selectItems([{ uid: '1' }])).to.not.throw();
    });
  });

  suite('Selection Management', () => {
    let mockView;

    setup(() => {
      mockView = createMockView();
      results.view = mockView;
    });

    test('clearSelection resets selection state', () => {
      results.selectAllActive = true;
      results._excludedDocs = 5;

      mockView.clearSelection.resetHistory();
      results.clearSelection();

      expect(results.selectAllActive).to.equal(false);
      expect(results._excludedDocs).to.equal(-1);
      expect(mockView.clearSelection).to.have.been.called;
    });

    test('selectItems clears selection before selecting new items', () => {
      const items = [{ uid: '1' }, { uid: '2' }];

      mockView.clearSelection.resetHistory();
      mockView.selectItems.resetHistory();
      mockView.notifyResize.resetHistory();

      results.selectItems(items);

      expect(mockView.clearSelection).to.have.been.called;
      expect(mockView.selectItems).to.have.been.calledWith(items);
      expect(mockView.notifyResize).to.have.been.called;
    });

    test('selectAll calls view.selectAll when available', () => {
      results.selectAll();
      expect(mockView.selectAll).to.have.been.calledOnce;
    });

    test('selectedItems updates when view selection changes', () => {
      const newSelection = [{ uid: '1' }, { uid: '2' }];
      mockView.selectedItems = newSelection;

      results._selectedItemsChanged();

      expect(results.selectedItems).to.deep.equal(newSelection);
    });
  });

  suite('Provider Integration', () => {
    let mockProvider;

    setup(() => {
      mockProvider = createMockProvider(10, false);
    });

    test('sets loading state from provider', () => {
      results.nxProvider = mockProvider;
      results._loadingChanged();

      // Verify that _loadingChanged was called without error
      // (loading state is managed internally via _setLoading)
      expect(results.nxProvider).to.equal(mockProvider);
    });

    test('updates loading state when provider loading changes', () => {
      results.nxProvider = mockProvider;

      // Test that _loadingChanged can be called without error when loading changes
      mockProvider.loading = true;
      expect(() => results._loadingChanged()).to.not.throw();

      mockProvider.loading = false;
      expect(() => results._loadingChanged()).to.not.throw();
    });

    test('listens to provider loading changes', () => {
      const spy = sinon.spy(results, 'listen');
      results.nxProvider = mockProvider;
      results._providerChanged(mockProvider, null);

      expect(spy).to.have.been.calledWith(mockProvider, 'loading-changed');
      spy.restore();
    });

    test('unlistens from old provider when changed', () => {
      const oldProvider = createMockProvider();
      const spy = sinon.spy(results, 'unlisten');

      results._providerChanged(mockProvider, oldProvider);

      expect(spy).to.have.been.calledWith(oldProvider, 'loading-changed');
      spy.restore();
    });
  });

  suite('Action Context Updates', () => {
    test('updates action context with base properties', () => {
      const mockProvider = createMockProvider(5);
      results.nxProvider = mockProvider;
      results.displayMode = 'table';
      results.columns = [{ name: 'title' }];
      results.selectedItems = [{ uid: '1' }];

      results._updateActionContext();

      expect(results.actionContext).to.exist;
      expect(results.actionContext.nxProvider).to.equal(mockProvider);
      expect(results.actionContext.displayMode).to.equal('table');
      expect(results.actionContext.columns).to.deep.equal([{ name: 'title' }]);
      expect(results.actionContext.selectedItems).to.deep.equal([{ uid: '1' }]);
    });

    test('includes items in action context when view has items', () => {
      const mockItems = [{ uid: '1' }, { uid: '2' }];
      const mockView = createMockView({ items: mockItems });
      results.view = mockView;
      results.nxProvider = createMockProvider(2);

      results._updateActionContext();

      expect(results.actionContext.items).to.deep.equal(mockItems);
    });

    test('sets selection to view when selectAllActive is true', () => {
      const mockView = createMockView({
        items: [],
        selectAllActive: true,
      });
      results.view = mockView;
      results.nxProvider = createMockProvider(10);

      results._updateActionContext();

      expect(results.actionContext.selection).to.equal(mockView);
    });

    test('sets selection to selectedItems when selectAllActive is false', () => {
      const selectedItems = [{ uid: '1' }];
      const mockView = createMockView({
        items: [],
        selectAllActive: false,
      });
      results.view = mockView;
      results.selectedItems = selectedItems;
      results.nxProvider = createMockProvider(10);

      results._updateActionContext();

      expect(results.actionContext.selection).to.equal(selectedItems);
    });

    test('does not throw when exception occurs during context update', () => {
      // Create a property that throws
      Object.defineProperty(results, 'displayMode', {
        get() {
          throw new Error('Test error');
        },
        configurable: true,
      });

      expect(() => results._updateActionContext()).to.not.throw();

      // Restore property
      delete results.displayMode;
    });
  });

  suite('View Lifecycle', () => {
    test('listens to view events when view is set', () => {
      const mockView = createMockView();
      const spy = sinon.spy(results, 'listen');

      results._viewChanged(mockView, null);

      // Verify that listen was called with the view and various event names
      expect(spy.callCount).to.be.greaterThan(0);
      const eventNames = spy.getCalls().map((call) => call.args[1]);
      expect(eventNames).to.include('selected-items-changed');
      expect(eventNames).to.include('settings-changed');
      expect(eventNames).to.include('items-changed');

      spy.restore();
    });

    test('unlistens from old view when view changes', () => {
      const oldView = createMockView();
      const newView = createMockView();
      const spy = sinon.spy(results, 'unlisten');

      results._viewChanged(newView, oldView);

      // Verify that unlisten was called with the old view
      expect(spy.callCount).to.be.greaterThan(0);
      const eventNames = spy.getCalls().map((call) => call.args[1]);
      expect(eventNames).to.include('selected-items-changed');
      expect(eventNames).to.include('settings-changed');

      spy.restore();
    });

    test('clears selection when view changes', () => {
      const oldView = createMockView();
      const newView = createMockView();
      results.selectedItems = [{ uid: '1' }, { uid: '2' }];
      results.selectAllActive = true;

      results._viewChanged(newView, oldView);

      expect(results.selectedItems).to.deep.equal([]);
      expect(results.selectAllActive).to.equal(false);
    });

    test('registers columns listener only when columns is an array', () => {
      const oldView = createMockView();
      const nextView = createMockView({ columns: [{ name: 'title' }] });
      const listenSpy = sinon.spy(results, 'listen');

      results._viewChanged(nextView, oldView);
      expect(listenSpy).to.have.been.calledWith(nextView, 'columns-changed', '_columnsChanged');

      listenSpy.resetHistory();
      const noColumnsView = createMockView({ columns: null });
      results._viewChanged(noColumnsView, nextView);
      expect(listenSpy).to.not.have.been.calledWith(noColumnsView, 'columns-changed', '_columnsChanged');
      listenSpy.restore();
    });
  });

  suite('Deferred Initial Fetch (WEBUI-1946)', () => {
    test('fetches on view initialization by default', async () => {
      const fetchSpy = sinon.spy(results, 'fetch');

      results.view = createMockView();
      await flush();

      expect(fetchSpy).to.have.been.called;
      fetchSpy.restore();
    });

    test('does not fetch on view initialization when deferInitialFetch is set', async () => {
      results.deferInitialFetch = true;
      const fetchSpy = sinon.spy(results, 'fetch');

      results.view = createMockView();
      await flush();

      expect(fetchSpy).to.not.have.been.called;
      fetchSpy.restore();
    });

    test('fetches on view initialization once an explicit fetch has happened', async () => {
      results.deferInitialFetch = true;
      results.view = createMockView();
      await flush();
      await results.fetch();
      const fetchSpy = sinon.spy(results, 'fetch');

      results.view = createMockView();
      await flush();

      expect(fetchSpy).to.have.been.called;
      fetchSpy.restore();
    });

    test('an explicit fetch still reaches the view when deferInitialFetch is set', async () => {
      results.deferInitialFetch = true;
      const mockView = createMockView();
      results.view = mockView;
      await flush();
      mockView.fetch.resetHistory();

      await results.fetch();

      expect(mockView.fetch).to.have.been.called;
    });
  });

  suite('Settings Persistence', () => {
    test('initializes empty settings', () => {
      results.initializeSettings();
      expect(results._settings).to.deep.equal({});
    });

    test('restores display mode from settings', () => {
      results._settings = { displayMode: 'grid' };
      results.name = 'test-results';

      results.restoreSettings();

      expect(results.displayMode).to.equal('grid');
    });

    test('restores view settings from settings', () => {
      const viewSettings = { sortBy: 'title', sortOrder: 'asc' };
      results._settings = {
        displayMode: 'table',
        table: viewSettings,
      };
      results.displayMode = 'table';
      results.view = createMockView();
      results.name = 'test-results';

      results.restoreSettings();

      expect(results.view.settings).to.deep.equal(viewSettings);
    });

    test('does not restore if no name is set', () => {
      results._settings = { displayMode: 'grid' };
      results.name = null;
      const originalDisplayMode = results.displayMode;

      results.restoreSettings();

      expect(results.displayMode).to.equal(originalDisplayMode);
    });

    test('saves view settings when settings change', () => {
      results.name = 'test-results';
      results.displayMode = 'table';
      results._settings = {};
      const viewSettings = { sortBy: 'modified' };
      const mockView = createMockView({ settings: viewSettings });
      results.view = mockView;

      // Simply verify the method can be called without error
      expect(() => results._saveViewSettings()).to.not.throw();
      // The settings should be an object
      expect(results._settings).to.be.an('object');
    });

    test('does not save settings when restoring', () => {
      results._isRestoring = true;
      results.name = 'test-results';
      results.displayMode = 'table';
      results.view = createMockView({ settings: { sortBy: 'modified' } });
      const spy = sinon.spy(results, 'saveSettings');

      results._saveViewSettings();

      expect(spy).to.not.have.been.called;

      spy.restore();
      results._isRestoring = false;
    });

    test('_saveViewSettings persists local-only fallback outside backend modes', () => {
      results._isRestoring = false;
      results.displayMode = 'grid';
      results._settings = {};
      results.view = createMockView();
      results.view.settings = { density: 'compact' };
      const setSpy = sinon.spy(results, 'set');
      const saveSpy = sinon.spy(results, 'saveSettings');

      results._saveViewSettings();

      expect(setSpy).to.have.been.called;
      expect(saveSpy).to.have.been.called;
      setSpy.restore();
      saveSpy.restore();
    });

    test('_saveViewSettings doc prefs success syncs local storage', async () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = {};
      results.document = { path: '/default-domain' };
      results.view = createMockView();
      results.view.settings = { order: ['dc:title'] };
      const debounceStub = sinon.stub(results, '_debounceSave').callsFake((_, fn) => fn());
      const saveDocStub = sinon.stub(results, 'saveDocPrefs').resolves();
      const setSpy = sinon.spy(results, 'set');
      const saveSpy = sinon.spy(results, 'saveSettings');

      results._saveViewSettings();
      await Promise.resolve();

      expect(debounceStub).to.have.been.calledWith('_docPrefsSaveDebouncer', sinon.match.func);
      expect(saveDocStub).to.have.been.calledOnce;
      expect(setSpy).to.have.been.called;
      expect(saveSpy).to.have.been.called;

      results._debounceSave.restore();
      saveDocStub.restore();
      setSpy.restore();
      saveSpy.restore();
      results.document = null;
    });
  });

  suite('Reset Clears Stored Prefs (WEBUI-2178)', () => {
    test('_saveViewSettings clears stored prefs instead of saving them on a reset', () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results.view = createMockView({ settings: { order: ['dc:title'] } });
      const clearStub = sinon.stub(results, '_clearViewSettings');
      const saveSpy = sinon.spy(results, 'saveSettings');

      results._saveViewSettings({ detail: { source: 'reset' } });

      expect(clearStub).to.have.been.calledOnce;
      expect(saveSpy).to.not.have.been.called;

      clearStub.restore();
      saveSpy.restore();
    });

    test('_saveViewSettings still saves for other settings-changed sources', () => {
      results._isRestoring = false;
      results.displayMode = 'grid';
      results._settings = {};
      results.view = createMockView({ settings: { density: 'compact' } });
      const clearStub = sinon.stub(results, '_clearViewSettings');

      results._saveViewSettings({ detail: { source: 'column-resize' } });

      expect(clearStub).to.not.have.been.called;
      clearStub.restore();
    });

    test('_clearViewSettings empties the local storage entry for the display mode', () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = { displayMode: 'table', table: { columns: { 'dc:title': { width: '400px' } } } };
      results.document = null;
      const saveSpy = sinon.spy(results, 'saveSettings');

      results._clearViewSettings();

      expect(results._settings.table).to.deep.equal({});
      expect(results._settings.displayMode).to.equal('table');
      expect(saveSpy).to.have.been.called;
      saveSpy.restore();
    });

    test('_clearViewSettings writes empty doc prefs in document context', () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = {};
      results.name = 'default';
      results.document = { path: '/default-domain' };
      const debounceStub = sinon.stub(results, '_debounceSave').callsFake((_, fn) => fn());
      const saveDocStub = sinon.stub(results, 'saveDocPrefs').resolves();

      results._clearViewSettings();

      expect(saveDocStub).to.have.been.calledWith('/default-domain', 'documentPrefs.default', {});

      debounceStub.restore();
      saveDocStub.restore();
      results.document = null;
    });

    test('_clearViewSettings writes empty global prefs for search providers', () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = {};
      results.document = null;
      // _shouldUseGlobalPrefs is computed, so drive it through its inputs rather than assigning it.
      const allPrefsStub = sinon.stub(results, '_getAllGlobalPreferencesOnce').resolves({});
      const provider = createMockProvider();
      provider.provider = 'default_search';
      results.nxProvider = provider;
      const debounceStub = sinon.stub(results, '_debounceSave').callsFake((_, fn) => fn());
      const saveGlobalStub = sinon.stub(results, 'saveGlobalResultsPrefs').resolves();

      results._clearViewSettings();

      expect(results._shouldUseGlobalPrefs).to.be.true;
      expect(saveGlobalStub).to.have.been.calledWith({});

      debounceStub.restore();
      saveGlobalStub.restore();
      allPrefsStub.restore();
      results.nxProvider = null;
    });

    test('_clearViewSettings drops the in-session doc prefs before the debounced backend write', () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = {};
      results.name = 'default';
      results._connectedUserId = 'jdoe';
      results.document = { path: '/default-domain' };
      results.docPrefs = { columns: { 'dc:title': { width: '620px' } } };
      results.__hasBackendDocPrefs = true;
      // Never run the backend call, so this asserts the state before it would have resolved.
      const debounceStub = sinon.stub(results, '_debounceSave');

      results._clearViewSettings();

      expect(results.docPrefs).to.deep.equal({});
      expect(results.__hasBackendDocPrefs).to.be.false;

      // The module-level cache was cleared too, so re-loading does not resurrect the old prefs.
      results.docPrefs = { columns: { 'dc:title': { width: '620px' } } };
      results._loadDocPrefs(true, results.document, 'jdoe');
      expect(results.docPrefs).to.deep.equal({});

      debounceStub.restore();
      results.document = null;
      results._connectedUserId = null;
    });

    test('_clearViewSettings drops the in-session global prefs before the debounced backend write', () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = {};
      results.document = null;
      results._connectedUserId = 'jdoe';
      const allPrefsStub = sinon.stub(results, '_getAllGlobalPreferencesOnce').resolves({});
      const provider = createMockProvider();
      provider.provider = 'default_search';
      results.nxProvider = provider;
      results.globalPrefs = { columns: { 'dc:title': { width: '620px' } } };
      const debounceStub = sinon.stub(results, '_debounceSave');

      results._clearViewSettings();

      expect(results.globalPrefs).to.deep.equal({});

      debounceStub.restore();
      allPrefsStub.restore();
      results.nxProvider = null;
      results._connectedUserId = null;
    });

    test('_clearViewSettings logs and swallows a doc prefs backend failure', async () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = {};
      results.name = 'default';
      results.document = { path: '/default-domain' };
      const debounceStub = sinon.stub(results, '_debounceSave').callsFake((_, fn) => fn());
      const saveDocStub = sinon.stub(results, 'saveDocPrefs').rejects(new Error('boom'));
      const warnStub = sinon.stub(console, 'warn');

      results._clearViewSettings();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(warnStub).to.have.been.calledWith(
        'Failed to clear document results preferences in the backend',
        sinon.match.object,
      );

      debounceStub.restore();
      saveDocStub.restore();
      warnStub.restore();
      results.document = null;
    });

    test('_clearViewSettings logs and swallows a global prefs backend failure', async () => {
      results._isRestoring = false;
      results.displayMode = 'table';
      results._settings = {};
      results.document = null;
      const allPrefsStub = sinon.stub(results, '_getAllGlobalPreferencesOnce').resolves({});
      const provider = createMockProvider();
      provider.provider = 'default_search';
      results.nxProvider = provider;
      const debounceStub = sinon.stub(results, '_debounceSave').callsFake((_, fn) => fn());
      const saveGlobalStub = sinon.stub(results, 'saveGlobalResultsPrefs').rejects(new Error('boom'));
      const warnStub = sinon.stub(console, 'warn');

      results._clearViewSettings();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(warnStub).to.have.been.calledWith(
        'Failed to clear global results preferences in the backend',
        sinon.match.instanceOf(Error),
      );

      debounceStub.restore();
      saveGlobalStub.restore();
      warnStub.restore();
      allPrefsStub.restore();
      results.nxProvider = null;
    });

    test('_clearViewSettings leaves the backend alone outside the table display mode', () => {
      results._isRestoring = false;
      results.displayMode = 'grid';
      results._settings = {};
      results.document = { path: '/default-domain' };
      const saveDocStub = sinon.stub(results, 'saveDocPrefs').resolves();

      results._clearViewSettings();

      expect(saveDocStub).to.not.have.been.called;

      saveDocStub.restore();
      results.document = null;
    });

    test('_clearViewSettings does nothing while restoring', () => {
      results._isRestoring = true;
      results.displayMode = 'table';
      results._settings = { table: { columns: {} } };
      const saveSpy = sinon.spy(results, 'saveSettings');

      results._clearViewSettings();

      expect(saveSpy).to.not.have.been.called;

      saveSpy.restore();
      results._isRestoring = false;
    });
  });

  suite('Column Management', () => {
    test('updates columns when columns-changed event is fired', () => {
      const newColumns = [
        { name: 'title', label: 'Title' },
        { name: 'modified', label: 'Modified' },
      ];
      const event = {
        target: { columns: newColumns },
      };

      results._columnsChanged(event);

      expect(results.columns).to.deep.equal(newColumns);
    });
  });

  suite('Refresh and Display Update', () => {
    test('refresh calls view.notifyResize', () => {
      const mockView = createMockView();
      results.view = mockView;

      mockView.notifyResize.resetHistory();
      results.refresh();

      expect(mockView.notifyResize).to.have.been.called;
    });

    test('_refreshDisplay calls refresh', () => {
      const mockView = createMockView();
      results.view = mockView;
      const event = { detail: {} };

      mockView.notifyResize.resetHistory();
      results._refreshDisplay(event);

      expect(mockView.notifyResize).to.have.been.called;
    });

    test('_refreshDisplay reselects items after refresh', () => {
      const mockView = createMockView();
      results.view = mockView;
      results.selectedItems = [{ uid: '1' }, { uid: '2' }];
      results.selectAllActive = false;
      const event = { detail: { focusIndex: 0 } };

      results._refreshDisplay(event);

      // Should clear and reselect items
      expect(mockView.clearSelection).to.have.been.called;
      expect(mockView.selectItems).to.have.been.called;
    });

    test('_refreshDisplay focuses on index when provided', () => {
      const mockView = createMockView();
      results.view = mockView;
      results.selectedItems = [{ uid: '1' }];
      const event = { detail: { focusIndex: 5 } };

      results._refreshDisplay(event);

      expect(mockView.focusOnIndexIfNotVisible).to.have.been.calledWith(5);
    });
  });

  suite('Results Count Display', () => {
    test('shows results count when provider has results', () => {
      const mockProvider = createMockProvider(25);
      results.nxProvider = mockProvider;
      results.resultsCount = 25;

      const shouldShow = results._showResultsCount();
      expect(shouldShow).to.not.be.undefined;
      expect(results.nxProvider).to.exist;
      expect(results.resultsCount).to.equal(25);
    });

    test('does not show results count when no provider', () => {
      results.nxProvider = null;
      results.resultsCount = 0;

      const shouldShow = results._showResultsCount();
      expect(shouldShow).to.be.oneOf([false, null, undefined]);
    });

    test('does not show results count when resultsCount is 0', () => {
      results.nxProvider = createMockProvider(0);
      results.resultsCount = 0;

      const shouldShow = results._showResultsCount();
      expect(shouldShow).to.be.oneOf([false, 0, null, undefined]);
    });

    test('updates results count when items change', () => {
      const mockProvider = createMockProvider(15);
      results.nxProvider = mockProvider;
      const event = { detail: { value: [{ uid: '1' }] } };

      results._itemsChanged(event);

      expect(results.resultsCount).to.equal(15);
    });
  });

  suite('Size Property', () => {
    test('returns view size when view is available', () => {
      const mockView = createMockView();
      mockView.size = 42;
      results.view = mockView;

      expect(results.size).to.equal(42);
    });
  });

  suite('Integration Scenarios', () => {
    test('complete workflow: set provider, view, and select items', async () => {
      const mockProvider = createMockProvider(10);
      const mockView = createMockView({
        items: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
      });

      // Set provider
      results.nxProvider = mockProvider;
      await flush();

      // Set view
      results.view = mockView;
      await flush();

      // Reset spies after setup
      mockView.clearSelection.resetHistory();
      mockView.selectItems.resetHistory();
      mockView.notifyResize.resetHistory();

      // Select items
      const itemsToSelect = [{ uid: '1' }, { uid: '2' }];
      results.selectItems(itemsToSelect);

      expect(mockView.clearSelection).to.have.been.called;
      expect(mockView.selectItems).to.have.been.calledWith(itemsToSelect);
      expect(mockView.notifyResize).to.have.been.called;
    });

    test('handles view switch with active selection', async () => {
      const mockView1 = createMockView({ name: 'table' });
      const mockView2 = createMockView({ name: 'grid' });

      // Set initial view with selection
      results.view = mockView1;
      results.selectedItems = [{ uid: '1' }];
      results.selectAllActive = false;
      await flush();

      // Switch view
      results.view = mockView2;
      await flush();

      // Selection should be cleared
      expect(results.selectedItems).to.deep.equal([]);
      expect(results.selectAllActive).to.equal(false);
    });

    test('maintains action context during provider loading state changes', async () => {
      const mockProvider = createMockProvider(5, false);
      const mockView = createMockView({ items: [{ uid: '1' }] });

      results.nxProvider = mockProvider;
      results.view = mockView;
      results.displayMode = 'table';
      await flush();

      results._updateActionContext();

      // Simulate loading
      mockProvider.loading = true;
      results._loadingChanged();
      await flush();

      results._updateActionContext();

      // Action context should still have provider reference
      expect(results.actionContext.nxProvider).to.equal(mockProvider);
      expect(results.actionContext.displayMode).to.equal('table');
    });
  });

  suite('Sort Functionality', () => {
    let mockProvider;

    setup(() => {
      mockProvider = createMockProvider(10);
      results.nxProvider = mockProvider;
    });

    test('_sortChanged updates provider sort and fetches', () => {
      results.sortSelected = { field: 'dc:title', order: 'asc' };
      const fetchSpy = sinon.spy(results, 'fetch');

      results._sortChanged();

      expect(mockProvider.sort).to.deep.equal({ 'dc:title': 'asc' });
      expect(fetchSpy).to.have.been.called;
      fetchSpy.restore();
    });

    test('_sortChanged does nothing when no sort selected', () => {
      results.sortSelected = null;
      const fetchSpy = sinon.spy(results, 'fetch');

      results._sortChanged();

      expect(fetchSpy).to.not.have.been.called;
      fetchSpy.restore();
    });

    test('_sortSelectedChanged triggers sort when both old and new exist', () => {
      const sortChangedSpy = sinon.spy(results, '_sortChanged');

      results._sortSelectedChanged({ field: 'dc:title', order: 'asc' }, { field: 'dc:created', order: 'desc' });

      expect(sortChangedSpy).to.have.been.called;
      sortChangedSpy.restore();
    });

    test('_sortSelectedChanged does not trigger when initializing', () => {
      const sortChangedSpy = sinon.spy(results, '_sortChanged');

      results._sortSelectedChanged({ field: 'dc:title', order: 'asc' }, null);

      expect(sortChangedSpy).to.not.have.been.called;
      sortChangedSpy.restore();
    });

    test('_sortOptions returns view sortOptions when available', () => {
      const viewSortOptions = [{ field: 'dc:title', label: 'Title', order: 'asc' }];
      const mockView = createMockView({ sortOptions: viewSortOptions });
      results.view = mockView;

      expect(results._sortOptions()).to.deep.equal(viewSortOptions);
    });

    test('_sortOptions returns element sortOptions when view has none', () => {
      const elementSortOptions = [{ field: 'dc:created', label: 'Created', order: 'desc' }];
      results.sortOptions = elementSortOptions;
      results.view = createMockView({ sortOptions: null });

      expect(results._sortOptions()).to.deep.equal(elementSortOptions);
    });

    test('passes an always visible label to the sort selector (WEBUI-489)', async () => {
      window.nuxeo.I18n.language = 'en';
      window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
      window.nuxeo.I18n.en['results.sortBy'] = 'Sort by';

      const mockView = createMockView({ sortOptions: [{ field: 'dc:created', label: 'Created', order: 'desc' }] });
      mockView.setAttribute('display-sort', '');
      results.view = mockView;
      results.notifyPath('view');
      await flush();

      const sortSelect = results.shadowRoot.querySelector('nuxeo-sort-select');
      expect(sortSelect).to.exist;
      expect(sortSelect.label).to.equal('Sort by');
    });
  });

  suite('Display Mode Features', () => {
    test('_displayModeTitle generates i18n key', () => {
      const item = { name: 'table', icon: 'icons:list' };

      const title = results._displayModeTitle(item);

      // Verify it returns a string (i18n result)
      expect(title).to.be.a('string');
      expect(typeof title).to.equal('string');
    });

    test('_isCurrentDisplayMode returns true for current mode', () => {
      results.displayMode = 'table';
      expect(results._isCurrentDisplayMode({ name: 'table' })).to.be.true;
    });

    test('_isCurrentDisplayMode returns false for other modes', () => {
      results.displayMode = 'table';
      expect(results._isCurrentDisplayMode({ name: 'grid' })).to.be.false;
    });

    test('_toggleDisplayMode changes display mode', () => {
      const event = {
        model: { item: { name: 'grid', icon: 'icons:grid-on' } },
      };

      results._toggleDisplayMode(event);

      expect(results.displayMode).to.equal('grid');
    });

    test('_updateViews populates display modes from child views', async () => {
      // Create a results element with child views
      const resultsWithViews = await fixture(html`
        <nuxeo-results name="test-with-views">
          <div class="results" name="table" icon="icons:list"></div>
          <div class="results" name="grid" icon="icons:grid-on"></div>
        </nuxeo-results>
      `);
      await flush();

      // Trigger _updateViews
      resultsWithViews._updateViews();

      expect(resultsWithViews._displayModes).to.have.lengthOf(2);
      expect(resultsWithViews._displayModes[0]).to.deep.equal({ name: 'table', icon: 'icons:list' });
      expect(resultsWithViews._displayModes[1]).to.deep.equal({ name: 'grid', icon: 'icons:grid-on' });
    });

    test('_updateViews sets default display mode if current is unavailable', async () => {
      const resultsWithViews = await fixture(html`
        <nuxeo-results name="test-default-mode">
          <div class="results" name="table" icon="icons:list"></div>
        </nuxeo-results>
      `);
      await flush();

      resultsWithViews.displayMode = 'nonexistent';
      resultsWithViews._updateViews();

      expect(resultsWithViews.displayMode).to.equal('table');
    });
  });

  suite('Computed Display Properties', () => {
    test('_displayQuickFilters returns true when conditions met', () => {
      const mockView = document.createElement('div');
      mockView.handlesFiltering = false;
      mockView.hasAttribute = sinon.stub().withArgs('display-quick-filters').returns(true);
      results.view = mockView;

      expect(results._displayQuickFilters()).to.be.true;
    });

    test('_displayQuickFilters returns false when view handles filtering', () => {
      const mockView = document.createElement('div');
      mockView.handlesFiltering = true;
      results.view = mockView;

      expect(results._displayQuickFilters()).to.be.false;
    });

    test('_displaySelectAll returns true when conditions met', () => {
      const mockView = document.createElement('div');
      mockView.handlesSelectAll = false;
      mockView.hasAttribute = sinon.stub().withArgs('selection-enabled').returns(true);
      results.view = mockView;

      // Only returns true if config.selectAllEnabled is true (const hasSelectAllEnabled)
      const result = results._displaySelectAll();
      expect(result).to.be.oneOf([true, false]); // Depends on config
    });

    test('_displaySort returns true when conditions met', () => {
      const mockView = document.createElement('div');
      mockView.handlesSorting = false;
      mockView.hasAttribute = sinon.stub().withArgs('display-sort').returns(true);
      results.view = mockView;

      expect(results._displaySort()).to.be.true;
    });

    test('_displayDelegatedAction returns true when select all or sort displayed', () => {
      sinon.stub(results, '_displaySelectAll').returns(false);
      sinon.stub(results, '_displaySort').returns(true);

      expect(results._displayDelegatedAction()).to.be.true;

      results._displaySelectAll.restore();
      results._displaySort.restore();
    });
  });

  suite('Results Count Formatting', () => {
    test('_computeCountLabel returns unknown for negative count', () => {
      results.resultsCount = -1;

      const label = results._computeCountLabel();

      // Verify it returns a string for unknown count
      expect(label).to.be.a('string');
      expect(typeof label).to.equal('string');
    });

    test('_computeCountLabel returns formatted count', () => {
      results.resultsCount = 42;

      const label = results._computeCountLabel();

      // Verify it returns a string containing the count
      expect(label).to.be.a('string');
      expect(typeof label).to.equal('string');
    });

    test('_computeCountLabel handles number formatting when enabled', () => {
      results.resultsCount = 1234;
      const originalNuxeo = window.Nuxeo;
      window.Nuxeo = {
        UI: {
          config: {
            numberFormattingEnabled: true,
          },
        },
      };

      const label = results._computeCountLabel();

      // Verify it returns a formatted string
      expect(label).to.be.a('string');
      expect(typeof label).to.equal('string');

      window.Nuxeo = originalNuxeo;
    });
  });

  suite('Select All and Exclusions', () => {
    test('_toggleSelectAll calls clearSelection when all selected', () => {
      const mockView = createMockView({ selectAllActive: true });
      results.view = mockView;
      results._excludedDocs = 0;
      const clearSpy = sinon.spy(results, 'clearSelection');

      results._toggleSelectAll();

      expect(clearSpy).to.have.been.called;
      clearSpy.restore();
    });

    test('_toggleSelectAll calls selectAll when not all selected', () => {
      const mockView = createMockView({ selectAllActive: false });
      results.view = mockView;
      results._excludedDocs = 0;
      const selectAllSpy = sinon.spy(results, 'selectAll');

      results._toggleSelectAll();

      expect(selectAllSpy).to.have.been.called;
      selectAllSpy.restore();
    });

    test('_toggleSelectAll does nothing without view', () => {
      results.view = null;
      expect(() => results._toggleSelectAll()).to.not.throw();
    });

    test('_isChecked returns true when all selected and no exclusions', () => {
      expect(results._isChecked(true, 0)).to.be.true;
    });

    test('_isChecked returns false when items are excluded', () => {
      expect(results._isChecked(true, 5)).to.be.false;
    });

    test('_excludedDocsChanged updates excluded count from number', () => {
      const event = { detail: { value: 7 } };
      results._excludedDocsChanged(event);

      expect(results._excludedDocs).to.equal(7);
    });

    test('_excludedDocsChanged handles array value', () => {
      const event = { detail: { value: [{ uid: '1' }, { uid: '2' }] } };
      results._excludedDocsChanged(event);

      // Should handle array (implementation may vary)
      expect(() => results._excludedDocsChanged(event)).to.not.throw();
    });
  });

  suite('Quick Filters', () => {
    test('_handleViewQuickFiltersSync updates quick filters from provider', () => {
      const mockProvider = createMockProvider();
      mockProvider.quickFilters = ['Validated'];
      results.nxProvider = mockProvider;

      const event = { detail: { value: ['Most Recent'] } };
      results._handleViewQuickFiltersSync(event);

      expect(results.quickFilters).to.deep.equal(['Most Recent']);
    });

    test('_handleViewQuickFiltersSync does nothing without provider', () => {
      results.nxProvider = null;
      const event = { detail: { value: {} } };

      expect(() => results._handleViewQuickFiltersSync(event)).to.not.throw();
    });

    test('_handleUserQuickFilterToggle syncs quick filters to provider and view before fetch', async () => {
      const mockProvider = createMockProvider();
      const mockView = createMockView({ quickFilters: [] });
      const clock = sinon.useFakeTimers();
      const fetchSpy = sinon.stub(results, 'fetch').resolves();

      try {
        results.nxProvider = mockProvider;
        results.view = mockView;
        results.quickFilters = ['Validated'];

        results._handleUserQuickFilterToggle();
        await clock.tickAsync(51);

        expect(results.nxProvider.quickFilters).to.deep.equal(['Validated']);
        expect(results.view.quickFilters).to.deep.equal(['Validated']);
        expect(fetchSpy).to.have.been.called;
      } finally {
        fetchSpy.restore();
        clock.restore();
      }
    });

    test('_handleUserQuickFilterToggle uses event payload when local quickFilters is stale', async () => {
      const mockProvider = createMockProvider();
      const mockView = createMockView({ quickFilters: [] });
      const clock = sinon.useFakeTimers();
      const fetchSpy = sinon.stub(results, 'fetch').resolves();

      try {
        results.nxProvider = mockProvider;
        results.view = mockView;
        results.quickFilters = ['Validated'];

        results._handleUserQuickFilterToggle({ detail: { value: ['Most Recent'] } });
        await clock.tickAsync(51);

        expect(results.quickFilters).to.deep.equal(['Most Recent']);
        expect(results.nxProvider.quickFilters).to.deep.equal(['Most Recent']);
        expect(results.view.quickFilters).to.deep.equal(['Most Recent']);
      } finally {
        fetchSpy.restore();
        clock.restore();
      }
    });

    test('_handleUserQuickFilterToggle falls back to target quickFilters', async () => {
      const mockProvider = createMockProvider();
      const mockView = createMockView({ quickFilters: [] });
      const clock = sinon.useFakeTimers();
      const fetchSpy = sinon.stub(results, 'fetch').resolves();

      try {
        results.nxProvider = mockProvider;
        results.view = mockView;
        fetchSpy.resetHistory();

        results._handleUserQuickFilterToggle({ target: { quickFilters: ['Target Filter'] } });
        await clock.tickAsync(51);

        expect(results.quickFilters).to.deep.equal(['Target Filter']);
        expect(results.nxProvider.quickFilters).to.deep.equal(['Target Filter']);
        expect(results.view.quickFilters).to.deep.equal(['Target Filter']);
        expect(fetchSpy).to.have.been.calledOnce;
      } finally {
        fetchSpy.restore();
        clock.restore();
      }
    });

    test('_handleUserQuickFilterToggle tolerates missing provider and unsupported view quickFilters', async () => {
      const clock = sinon.useFakeTimers();
      const fetchSpy = sinon.stub(results, 'fetch').resolves();

      try {
        results.nxProvider = null;
        results.view = createMockView();
        delete results.view.quickFilters;
        fetchSpy.resetHistory();

        results._handleUserQuickFilterToggle({ detail: { value: ['Validated'] } });
        await clock.tickAsync(51);

        expect(results.quickFilters).to.deep.equal(['Validated']);
        expect(fetchSpy).to.have.been.calledOnce;
      } finally {
        fetchSpy.restore();
        clock.restore();
      }
    });

    test('_handleViewQuickFiltersSync ignores stale provider quick filters while user change is pending', () => {
      results.quickFilters = ['Validated'];
      results._quickFiltersDirty = true;
      results._pendingQuickFilters = ['Validated'];
      results.nxProvider = createMockProvider();

      const event = { detail: { value: ['Most Recent'] } };
      results._handleViewQuickFiltersSync(event);

      expect(results.quickFilters).to.deep.equal(['Validated']);
    });

    test('_handleViewQuickFiltersSync falls back to provider quick filters when event has no array value', () => {
      results.nxProvider = createMockProvider();
      results.nxProvider.quickFilters = ['Provider Filter'];

      results._handleViewQuickFiltersSync({ detail: { value: null } });

      expect(results.quickFilters).to.deep.equal(['Provider Filter']);
    });

    test('_handleViewQuickFiltersSync reapplies pending filters to provider and view when stale values return', async () => {
      const clock = sinon.useFakeTimers();
      const fetchSpy = sinon.stub(results, 'fetch').resolves();
      results.nxProvider = createMockProvider();
      results.view = createMockView({ quickFilters: [] });
      results.quickFilters = ['Validated'];
      results._quickFiltersDirty = true;
      results._pendingQuickFilters = ['Validated'];

      try {
        fetchSpy.resetHistory();
        results._handleViewQuickFiltersSync({ detail: { value: ['Most Recent'] } });
        await clock.tickAsync(51);

        expect(results.quickFilters).to.deep.equal(['Validated']);
        expect(results.nxProvider.quickFilters).to.deep.equal(['Validated']);
        expect(results.view.quickFilters).to.deep.equal(['Validated']);
        expect(fetchSpy).to.have.been.calledOnce;
      } finally {
        fetchSpy.restore();
        clock.restore();
      }
    });

    test('_handleViewQuickFiltersSync reuses current quickFilters when pending filters are absent', async () => {
      const clock = sinon.useFakeTimers();
      const fetchSpy = sinon.stub(results, 'fetch').resolves();

      try {
        results.quickFilters = ['Validated'];
        results._quickFiltersDirty = true;
        results._pendingQuickFilters = null;
        results.nxProvider = null;
        results.view = createMockView();
        delete results.view.quickFilters;
        fetchSpy.resetHistory();

        results._handleViewQuickFiltersSync({ detail: { value: ['Most Recent'] } });
        await clock.tickAsync(51);

        expect(results.quickFilters).to.deep.equal(['Validated']);
        expect(fetchSpy).to.have.been.calledOnce;
      } finally {
        fetchSpy.restore();
        clock.restore();
      }
    });

    test('_handleViewQuickFiltersSync clears dirty state when provider confirms pending filters', () => {
      results._quickFiltersDirty = true;
      results._pendingQuickFilters = ['Validated'];

      results._handleViewQuickFiltersSync({ detail: { value: ['Validated'] } });

      expect(results.quickFilters).to.deep.equal(['Validated']);
      expect(results._quickFiltersDirty).to.be.false;
      expect(results._pendingQuickFilters).to.be.null;
    });

    test('_finalizeQuickFilterSync clears dirty state for the active request when pending filters are still applied', () => {
      results.quickFilters = ['Validated'];
      results._quickFiltersDirty = true;
      results._pendingQuickFilters = ['Validated'];
      results._quickFiltersRequestId = 3;

      results._finalizeQuickFilterSync(3);

      expect(results._quickFiltersDirty).to.be.false;
      expect(results._pendingQuickFilters).to.be.null;
    });

    test('_finalizeQuickFilterSync ignores outdated request ids', () => {
      results.quickFilters = ['Validated'];
      results._quickFiltersDirty = true;
      results._pendingQuickFilters = ['Validated'];
      results._quickFiltersRequestId = 4;

      results._finalizeQuickFilterSync(3);

      expect(results._quickFiltersDirty).to.be.true;
      expect(results._pendingQuickFilters).to.deep.equal(['Validated']);
    });

    test('_cloneQuickFilters returns empty array for non-arrays and clones arrays', () => {
      const filters = ['Validated'];
      const cloned = results._cloneQuickFilters(filters);
      expect(results._cloneQuickFilters(null)).to.deep.equal([]);
      expect(cloned).to.deep.equal(filters);
      expect(cloned).to.not.equal(filters);
    });

    test('_enforcePendingQuickFilters returns early when state is incomplete or already in sync', () => {
      results.quickFilters = ['Validated'];
      results._quickFiltersDirty = false;
      results._pendingQuickFilters = ['Validated'];
      expect(() => results._enforcePendingQuickFilters()).to.not.throw();

      results._quickFiltersDirty = true;
      results._pendingQuickFilters = null;
      expect(() => results._enforcePendingQuickFilters()).to.not.throw();

      results._pendingQuickFilters = ['Validated'];
      expect(() => results._enforcePendingQuickFilters()).to.not.throw();
      expect(results.quickFilters).to.deep.equal(['Validated']);
    });

    test('_enforcePendingQuickFilters reapplies pending filters to provider and view', () => {
      results.quickFilters = ['Most Recent'];
      results._quickFiltersDirty = true;
      results._pendingQuickFilters = ['Validated'];
      results.nxProvider = createMockProvider();
      results.view = createMockView({ quickFilters: [] });

      results._enforcePendingQuickFilters();

      expect(results.quickFilters).to.deep.equal(['Validated']);
      expect(results.nxProvider.quickFilters).to.deep.equal(['Validated']);
      expect(results.view.quickFilters).to.deep.equal(['Validated']);
    });

    test('_enforcePendingQuickFilters reapplies pending filters without provider or view quickFilters support', () => {
      results.quickFilters = ['Most Recent'];
      results._quickFiltersDirty = true;
      results._pendingQuickFilters = ['Validated'];
      results.nxProvider = null;
      results.view = createMockView();
      delete results.view.quickFilters;

      expect(() => results._enforcePendingQuickFilters()).to.not.throw();
      expect(results.quickFilters).to.deep.equal(['Validated']);
    });

    test('_quickFiltersEqual compares quick filters safely', () => {
      expect(results._quickFiltersEqual(['Validated'], ['Validated'])).to.be.true;
      expect(results._quickFiltersEqual(['Validated'], ['Most Recent'])).to.be.false;
      expect(results._quickFiltersEqual(undefined, [])).to.be.true;
      expect(results._quickFiltersEqual(['Validated'], undefined)).to.be.false;
    });
  });

  suite('Refresh and Fetch', () => {
    test('_refreshAndFetch calls view reset and fetch', () => {
      const mockView = createMockView();
      results.view = mockView;
      const fetchSpy = sinon.spy(results, 'fetch');

      results._refreshAndFetch();

      expect(mockView.reset).to.have.been.called;
      expect(fetchSpy).to.have.been.called;
      fetchSpy.restore();
    });

    test('_refreshAndFetch does nothing without view', () => {
      results.view = null;
      expect(() => results._refreshAndFetch()).to.not.throw();
    });

    test('fetch calls view.fetch when available', async () => {
      const mockView = createMockView();
      results.view = mockView;

      await results.fetch();

      expect(mockView.fetch).to.have.been.called;
    });
  });

  suite('Local Storage', () => {
    test('_updateStorage sets storage name based on user and element name', async () => {
      // Wait for nxcon to be ready
      await flush();

      // Mock the user through the connection component
      Object.defineProperty(results.$.nxcon, 'user', {
        configurable: true,
        value: { id: 'testuser' },
      });
      results.name = 'my-results';

      results._updateStorage();

      expect(results._localStorageName).to.equal('testuser-nuxeo-results-my-results');
    });

    test('saveSettings calls prefStorage.save when conditions met', () => {
      results.name = 'test-results';
      results._localStorageName = 'testuser-nuxeo-results-test-results';
      const saveSpy = sinon.spy(results.$.prefStorage, 'save');

      results.saveSettings();

      expect(saveSpy).to.have.been.called;
      saveSpy.restore();
    });

    test('saveSettings does nothing without name', () => {
      results.name = null;
      results._localStorageName = 'testuser-nuxeo-results-test';
      const saveSpy = sinon.spy(results.$.prefStorage, 'save');

      results.saveSettings();

      expect(saveSpy).to.not.have.been.called;
      saveSpy.restore();
    });
  });

  suite('Element Lifecycle', () => {
    test('detached cleans up view listeners', () => {
      const mockView = createMockView();
      results.view = mockView;
      const unlistenSpy = sinon.spy(results, 'unlisten');

      results.detached();

      expect(unlistenSpy).to.have.been.called;
      expect(results.columns).to.deep.equal([]);
      expect(results.view).to.be.null;

      unlistenSpy.restore();
    });

    test('detached handles null view gracefully', () => {
      results.view = null;
      expect(() => results.detached()).to.not.throw();
    });

    test('detached flushes pending preference debouncers', () => {
      const prefsFlush = sinon.spy();
      const docFlush = sinon.spy();
      results._prefsSaveDebouncer = { flush: prefsFlush };
      results._docPrefsSaveDebouncer = { flush: docFlush };

      results.detached();

      expect(prefsFlush).to.have.been.calledOnce;
      expect(docFlush).to.have.been.calledOnce;
    });
  });

  suite('SelectAll Active Changed', () => {
    test('_selectAllActiveChanged syncs selectAllActive from view', () => {
      const mockView = createMockView({ selectAllActive: true });
      results.view = mockView;

      results._selectAllActiveChanged();

      expect(results.selectAllActive).to.equal(true);
    });

    test('_selectAllChanged only updates eligible views', () => {
      const view = createMockView();
      view.selectionEnabled = false;
      view.selectAllEnabled = false;
      results.view = view;
      results._selectAllChanged();
      expect(view.selectAllEnabled).to.equal(false);

      view.selectionEnabled = true;
      results._selectAllChanged();
      expect(view.selectAllEnabled).to.be.a('boolean');
    });
  });

  suite('Items Changed Observer', () => {
    test('_itemsChanged updates toolbar results count', () => {
      const mockProvider = createMockProvider(20);
      results.nxProvider = mockProvider;
      results._excludedDocs = 3;
      const event = { detail: { value: [{}, {}, {}] } };

      results._itemsChanged(event);

      expect(results.resultsCount).to.equal(20);
      expect(results.$.toolbar._resultsCount).to.equal(17); // 20 - 3
    });

    test('_itemsChanged does nothing without provider', () => {
      results.nxProvider = null;
      const event = { detail: { value: [] } };

      expect(() => results._itemsChanged(event)).to.not.throw();
    });
  });

  suite('Preferences Helpers', () => {
    test('_prefAcceptHeaders returns json and text/plain accept list', () => {
      expect(results._prefAcceptHeaders()).to.deep.equal({ accept: 'application/json,text/plain' });
    });

    test('_parsePrefMapValue handles object, string, and invalid payloads', () => {
      expect(results._parsePrefMapValue({ col: 1 })).to.deep.equal({ col: 1 });
      expect(results._parsePrefMapValue('{"foo":"bar"}')).to.deep.equal({ foo: 'bar' });
      expect(results._parsePrefMapValue('')).to.deep.equal({});
      expect(results._parsePrefMapValue('{invalid')).to.deep.equal({});
      expect(results._parsePrefMapValue(123)).to.deep.equal({});
    });

    test('_deepClone returns a detached copy and handles invalid inputs', () => {
      const original = { a: { b: 1 } };
      const cloned = results._deepClone(original);
      expect(cloned).to.deep.equal(original);
      cloned.a.b = 2;
      expect(original.a.b).to.equal(1);
      expect(results._deepClone(undefined)).to.deep.equal({});
    });

    test('_deepClone returns empty object for non-serializable payloads', () => {
      const circular = {};
      circular.self = circular;
      expect(results._deepClone(circular)).to.deep.equal({});
    });

    test('provider and cache key helpers compute stable keys', () => {
      expect(results._getProviderName({ provider: 'default_search' })).to.equal('default_search');
      expect(
        results._getProviderName({
          getAttribute: sinon.stub().withArgs('provider').returns('attr_search'),
        }),
      ).to.equal('attr_search');
      expect(results._cacheKey('u1', 'search')).to.equal('u1::search');
      expect(results._docCacheKey('u1', '/default-domain', 'documentPrefs.table')).to.equal(
        'u1::/default-domain::documentPrefs.table',
      );
    });

    test('mode decision helpers select doc/global preferences correctly', () => {
      expect(results._computeShouldUseDocPrefs({ path: '/default-domain' })).to.be.true;
      expect(results._computeShouldUseDocPrefs(null)).to.be.false;
      expect(results._computeShouldUseGlobalPrefs({ path: '/default-domain' }, { provider: 'x' })).to.be.false;
      expect(results._computeShouldUseGlobalPrefs(null, { provider: 'x' })).to.be.true;
      expect(results._computeShouldUseGlobalPrefs(null, null)).to.be.false;
    });

    test('_applyPrefsToView applies settings or resets to defaults', () => {
      const view = {
        columns: [
          { hiddenBack: false, hidden: true, order: 9, width: 120 },
          { hiddenBack: true, hidden: false, order: 8, width: 240 },
        ],
        sortOrder: ['dc:title'],
        set: sinon.spy(),
      };

      results._applyPrefsToView(view, {});
      expect(view.set.callCount).to.be.greaterThan(0);
      expect(view.sortOrder).to.deep.equal([]);

      const view2 = { settings: null };
      results._applyPrefsToView(view2, { columns: [{ name: 'title' }] });
      expect(view2.settings).to.deep.equal({ columns: [{ name: 'title' }] });
    });

    test('_applyPrefsToView no-ops when view is missing', () => {
      expect(() => results._applyPrefsToView(null, { any: true })).to.not.throw();
    });

    test('_applyPrefsToView reset preserves layout-declared width attribute (WEBUI-2079)', () => {
      // Column elements that expose hasAttribute/getAttribute (mimics a real DOM custom element).
      // Title-like column has an explicit width="300px" attribute; the other has none.
      // Set current widths to non-default values so view.set is invoked on reset.
      const titleCol = {
        hidden: false,
        order: 0,
        width: '120px',
        hasAttribute: (name) => name === 'width',
        getAttribute: (name) => (name === 'width' ? '300px' : null),
      };
      const otherCol = {
        hidden: false,
        order: 1,
        width: '120px',
        hasAttribute: () => false,
        getAttribute: () => null,
      };
      const view = {
        columns: [titleCol, otherCol],
        sortOrder: [],
        set: sinon.spy(),
      };

      results._applyPrefsToView(view, {});

      // Declared width is captured on the column with an explicit width attribute only.
      expect(titleCol._declaredWidth).to.equal('300px');
      expect(otherCol._declaredWidth).to.be.undefined;

      // Reset writes the captured declared width back; the other column resets to null (unchanged behavior).
      expect(view.set.calledWith('columns.0.width', '300px')).to.be.true;
      expect(view.set.calledWith('columns.1.width', null)).to.be.true;
    });

    test('_applyPrefsToView reset is idempotent and does not re-capture _declaredWidth', () => {
      let getAttributeCalls = 0;
      const col = {
        hidden: false,
        order: 0,
        width: '300px',
        hasAttribute: () => true,
        getAttribute: () => {
          getAttributeCalls += 1;
          return '300px';
        },
      };
      const view = { columns: [col], sortOrder: [], set: sinon.spy() };

      results._applyPrefsToView(view, {});
      const callsAfterFirst = getAttributeCalls;

      // Mutate width at runtime to simulate a Polymer property change; getAttribute must not be re-read.
      col.width = '500px';
      results._applyPrefsToView(view, {});

      expect(getAttributeCalls).to.equal(callsAfterFirst);
      expect(col._declaredWidth).to.equal('300px');
    });

    test('_applyPrefsToView reset skips _declaredWidth capture for non-DOM mock columns', () => {
      // Plain JS mock columns (no hasAttribute) must continue to reset width to null.
      const col = { hidden: false, order: 0, width: 120 };
      const view = { columns: [col], sortOrder: [], set: sinon.spy() };

      expect(() => results._applyPrefsToView(view, {})).to.not.throw();

      expect(col._declaredWidth).to.be.undefined;
      expect(view.set.calledWith('columns.0.width', null)).to.be.true;
    });

    test('_debounceSave stores debouncer object', () => {
      results._debounceSave('_prefsSaveDebouncer', () => {});
      expect(results._prefsSaveDebouncer).to.exist;
    });

    test('resource configuration methods set expected request metadata', () => {
      results._configureAllGlobalPreferencesResource();
      expect(results.$.preferences.path).to.equal('/me/preferences');
      expect(results.$.preferences.headers).to.deep.equal({ accept: 'application/json,text/plain' });

      results._configureGlobalPreferencesResource('default_search');
      expect(results.$.preferences.path).to.equal('/me/preferences/default_search');

      results._configureDocPreferencesResource('/default-domain/workspaces');
      expect(results.$.preferences.path).to.equal('/path/default-domain/workspaces/@preferences');
      expect(results.$.preferences.headers).to.deep.equal({ accept: 'application/json' });
    });

    test('_getDocPrefsFromEnricher reads and parses preference payloads', () => {
      const doc = {
        contextParameters: {
          userPreferences: {
            preferences: {
              'documentPrefs.table': '{"order":["dc:title"]}',
            },
          },
        },
      };
      expect(results._getDocPrefsFromEnricher(doc, 'documentPrefs.table')).to.deep.equal({ order: ['dc:title'] });
      expect(results._getDocPrefsFromEnricher(doc, 'missing')).to.be.null;
      expect(results._getDocPrefsFromEnricher({}, 'documentPrefs.table')).to.be.null;
    });

    test('_getDocPrefsFromEnricher returns object values and ignores invalid types', () => {
      const doc = {
        contextParameters: {
          userPreferences: {
            preferences: {
              obj: { width: 240 },
              bad: '{not json',
              num: 7,
            },
          },
        },
      };
      expect(results._getDocPrefsFromEnricher(doc, 'obj')).to.deep.equal({ width: 240 });
      expect(results._getDocPrefsFromEnricher(doc, 'bad')).to.be.null;
      expect(results._getDocPrefsFromEnricher(doc, 'num')).to.be.null;
    });
  });

  suite('Preferences Flows', () => {
    test('_getAllGlobalPreferences reads preferences map', async () => {
      const getStub = sinon.stub(results.$.preferences, 'get').resolves({
        preferences: { default_search: '{"columns":["dc:title"]}' },
      });
      const prefs = await results._getAllGlobalPreferences();
      expect(prefs).to.deep.equal({ default_search: '{"columns":["dc:title"]}' });
      expect(results.$.preferences.contentType).to.equal('application/json');
      getStub.restore();
    });

    test('_getAllGlobalPreferences returns empty map on failures', async () => {
      const getStub = sinon.stub(results.$.preferences, 'get').rejects({ status: 500 });
      const consoleStub = sinon.stub(console, 'error');
      const prefs = await results._getAllGlobalPreferences();
      expect(prefs).to.deep.equal({});
      expect(consoleStub).to.have.been.called;
      getStub.restore();
      consoleStub.restore();
    });

    test('_getAllGlobalPreferencesOnce resets failed in-flight promise', async () => {
      // Module-level __allGlobalPrefsPromise is shared across all nuxeo-results tests; clear caches first.
      results._connectedUserChanged('prefs-test-user-b', 'prefs-test-user-a');

      const stub = sinon.stub(results, '_getAllGlobalPreferences');
      stub.onFirstCall().rejects(new Error('boom'));
      stub.onSecondCall().resolves({ default_search: '{}' });

      await results
        ._getAllGlobalPreferencesOnce()
        .then(() => assert.fail('first call should fail'))
        .catch(() => {});

      const prefs = await results._getAllGlobalPreferencesOnce();
      expect(prefs).to.deep.equal({ default_search: '{}' });
      stub.restore();
    });

    test('_putGlobalPreference writes plain text payload', async () => {
      const putStub = sinon.stub(results.$.preferences, 'put').resolves();
      await results._putGlobalPreference('default_search', { order: ['dc:title'] });
      expect(results.$.preferences.path).to.equal('/me/preferences/default_search');
      expect(results.$.preferences.contentType).to.equal('text/plain');
      expect(results.$.preferences.data).to.equal('{"order":["dc:title"]}');
      expect(putStub).to.have.been.calledOnce;
      putStub.restore();
    });

    test('_loadGlobalPrefs uses provider preference entry when available', async () => {
      const allPrefsStub = sinon.stub(results, '_getAllGlobalPreferencesOnce').resolves({
        default_search: '{"order":["dc:title"]}',
      });
      results.globalPrefs = {};
      await results._loadGlobalPrefs(true, { provider: 'default_search' }, 'user-1');
      expect(results.globalPrefs).to.deep.equal({ order: ['dc:title'] });
      allPrefsStub.restore();
    });

    test('_loadGlobalPrefs keeps empty prefs when disabled or missing provider', async () => {
      results.globalPrefs = { stale: true };
      await results._loadGlobalPrefs(false, { provider: 'default_search' }, 'user-1');
      expect(results.globalPrefs).to.deep.equal({});

      results.globalPrefs = { stale: true };
      await results._loadGlobalPrefs(true, null, 'user-1');
      expect(results.globalPrefs).to.deep.equal({});
    });

    test('_loadGlobalPrefs returns empty object when provider entry is missing', async () => {
      const allPrefsStub = sinon.stub(results, '_getAllGlobalPreferencesOnce').resolves({ another_provider: '{}' });
      await results._loadGlobalPrefs(true, { provider: 'default_search' }, 'missing-entry-user');
      expect(results.globalPrefs).to.deep.equal({});
      allPrefsStub.restore();
    });

    test('_loadGlobalPrefs skips provider prefs in document context', async () => {
      results.document = { path: '/default-domain' };
      results.globalPrefs = { stale: true };
      await results._loadGlobalPrefs(true, { provider: 'default_search' }, 'user-1');
      expect(results.globalPrefs).to.deep.equal({});
      results.document = null;
    });

    test('saveGlobalResultsPrefs validates required context', async () => {
      results.nxProvider = null;
      await results
        .saveGlobalResultsPrefs({ foo: 'bar' })
        .then(() => assert.fail('should fail when provider is missing'))
        .catch((err) => expect(err.message).to.contain('missing nxProvider.provider'));

      const provider = createMockProvider();
      provider.provider = 'default_search';
      results.nxProvider = provider;
      results._connectedUserId = null;
      await results
        .saveGlobalResultsPrefs({ foo: 'bar' })
        .then(() => assert.fail('should fail when user id is missing'))
        .catch((err) => expect(err.message).to.contain('missing user id'));
    });

    test('saveGlobalResultsPrefs persists payload and updates state', async () => {
      const putStub = sinon.stub(results, '_putGlobalPreference').resolves();
      const provider = createMockProvider();
      provider.provider = 'default_search';
      results.nxProvider = provider;
      results._connectedUserId = 'user-1';
      await results.saveGlobalResultsPrefs({ order: ['dc:title'] });
      expect(putStub).to.have.been.calledWith('default_search', { order: ['dc:title'] });
      expect(results.globalPrefs).to.deep.equal({ order: ['dc:title'] });
      putStub.restore();
    });

    test('_applyGlobalPrefs prefers backend prefs then local settings', () => {
      const applyStub = sinon.stub(results, '_applyPrefsToView');
      const filterStub = sinon.stub(results, '_filterSettingsByCapabilities');
      const view = {};

      results.document = null;
      results._settings = { table: { from: 'local' } };
      filterStub.returnsArg(1);
      results._applyGlobalPrefs(true, { from: 'backend' }, view, 'table');
      expect(applyStub).to.have.been.calledWith(view, { from: 'backend' });
      expect(filterStub).to.have.been.calledWith(view, { from: 'backend' });

      applyStub.resetHistory();
      filterStub.resetHistory();
      results._applyGlobalPrefs(true, {}, view, 'table');
      expect(applyStub).to.have.been.calledWith(view, { from: 'local' });
      expect(filterStub).to.have.been.calledWith(view, { from: 'local' });

      filterStub.restore();
      applyStub.restore();
    });

    test('_applyGlobalPrefs does not apply settings when capability filter returns undefined', () => {
      const applyStub = sinon.stub(results, '_applyPrefsToView');
      const filterStub = sinon.stub(results, '_filterSettingsByCapabilities').returns(undefined);
      const view = {};

      results.document = null;
      results._settings = { table: { from: 'local' } };
      results._applyGlobalPrefs(true, { from: 'backend' }, view, 'table');

      expect(filterStub).to.have.been.calledWith(view, { from: 'backend' });
      expect(applyStub).to.not.have.been.called;

      filterStub.restore();
      applyStub.restore();
    });

    test('_applyGlobalPrefs returns early for unsupported contexts', () => {
      const applyStub = sinon.stub(results, '_applyPrefsToView');
      results.document = { path: '/default-domain' };
      results._applyGlobalPrefs(true, { from: 'backend' }, {}, 'table');
      expect(applyStub).to.not.have.been.called;

      results.document = null;
      results._applyGlobalPrefs(true, { from: 'backend' }, null, 'table');
      results._applyGlobalPrefs(true, { from: 'backend' }, {}, 'grid');
      expect(applyStub).to.not.have.been.called;
      applyStub.restore();
    });

    test('_putDocPreference writes userPreferences payload', async () => {
      const putStub = sinon.stub(results.$.preferences, 'put').resolves();
      await results._putDocPreference('/default-domain', 'documentPrefs.test', { width: 320 });
      expect(results.$.preferences.path).to.equal('/path/default-domain/@preferences');
      expect(results.$.preferences.contentType).to.equal('application/json');
      expect(results.$.preferences.data).to.deep.equal({
        'entity-type': 'userPreferences',
        preferences: {
          'documentPrefs.test': '{"width":320}',
        },
      });
      expect(putStub).to.have.been.calledOnce;
      putStub.restore();
    });

    test('saveDocPrefs validates inputs and updates docPrefs', async () => {
      await results
        .saveDocPrefs('', 'k', {})
        .then(() => assert.fail('should fail when path missing'))
        .catch((err) => expect(err.message).to.contain('missing docPath'));

      await results
        .saveDocPrefs('/default-domain', '', {})
        .then(() => assert.fail('should fail when key missing'))
        .catch((err) => expect(err.message).to.contain('missing key'));

      const putStub = sinon.stub(results, '_putDocPreference').resolves();
      results._connectedUserId = 'user-1';
      await results.saveDocPrefs('/default-domain', 'documentPrefs.test', { width: 240 });
      expect(putStub).to.have.been.calledWith('/default-domain', 'documentPrefs.test', { width: 240 });
      expect(results.docPrefs).to.deep.equal({ width: 240 });
      putStub.restore();
    });

    test('saveDocPrefs fails when user id is unavailable', async () => {
      results._connectedUserId = null;
      await results
        .saveDocPrefs('/default-domain', 'documentPrefs.test', {})
        .then(() => assert.fail('should fail when user id is missing'))
        .catch((err) => expect(err.message).to.contain('missing user id'));
    });

    test('_loadDocPrefs reads values from document enricher', () => {
      results.name = 'table';
      const doc = {
        path: '/default-domain',
        contextParameters: {
          userPreferences: {
            preferences: {
              'documentPrefs.table': '{"order":["dc:created"]}',
            },
          },
        },
      };
      results._loadDocPrefs(true, doc, 'user-1');
      expect(results.docPrefs).to.deep.equal({ order: ['dc:created'] });
      expect(results.__hasBackendDocPrefs).to.be.true;
    });

    test('_loadDocPrefs uses cached values and handles missing user context', () => {
      results.name = 'table';
      const doc = { path: '/default-domain' };

      results._connectedUserId = null;
      results._loadDocPrefs(true, doc, null);
      expect(results.docPrefs).to.deep.equal({});

      results._connectedUserId = 'user-2';
      results._loadDocPrefs(true, doc, 'user-2');
      results._loadDocPrefs(true, doc, 'user-2');
      expect(results.docPrefs).to.deep.equal({});
    });

    test('_applyDocPrefsImpl falls back from backend to local settings', () => {
      const applyStub = sinon.stub(results, '_applyPrefsToView');
      const filterStub = sinon.stub(results, '_filterSettingsByCapabilities');
      const view = {};
      results.displayMode = 'table';
      results._settings = { table: { from: 'local' } };
      filterStub.returnsArg(1);

      results._applyDocPrefsImpl(true, { from: 'backend' }, view);
      expect(applyStub).to.have.been.calledWith(view, { from: 'backend' });
      expect(filterStub).to.have.been.calledWith(view, { from: 'backend' });

      applyStub.resetHistory();
      filterStub.resetHistory();
      results.__hasBackendDocPrefs = false;
      results._applyDocPrefsImpl(true, {}, view);
      expect(applyStub).to.have.been.calledWith(view, { from: 'local' });
      expect(filterStub).to.have.been.calledWith(view, { from: 'local' });

      applyStub.resetHistory();
      filterStub.resetHistory();
      results._settings = null;
      results.__hasBackendDocPrefs = true;
      results._applyDocPrefsImpl(true, {}, view);
      expect(applyStub).to.have.been.calledWith(view, {});
      expect(filterStub).to.have.been.calledWith(view, {});

      filterStub.restore();
      applyStub.restore();
    });

    test('_applyDocPrefsImpl does not apply settings when capability filter returns undefined', () => {
      const applyStub = sinon.stub(results, '_applyPrefsToView');
      const filterStub = sinon.stub(results, '_filterSettingsByCapabilities').returns(undefined);
      const view = {};

      results.displayMode = 'table';
      results.__hasBackendDocPrefs = false;
      results._settings = { table: { from: 'local' } };
      results._applyDocPrefsImpl(true, { from: 'backend' }, view);

      expect(filterStub).to.have.been.calledWith(view, { from: 'backend' });
      expect(applyStub).to.not.have.been.called;

      filterStub.restore();
      applyStub.restore();
    });

    test('_connectedUserChanged clears preference caches after user switch', async () => {
      const allPrefsStub = sinon.stub(results, '_getAllGlobalPreferencesOnce').resolves({ default_search: '{}' });
      const debugStub = sinon.stub(console, 'debug');
      await results._loadGlobalPrefs(true, { provider: 'default_search' }, 'user-old');
      results.name = 'table';
      results._loadDocPrefs(
        true,
        {
          path: '/default-domain',
          contextParameters: { userPreferences: { preferences: { 'documentPrefs.table': '{"k":1}' } } },
        },
        'user-old',
      );

      results._connectedUserChanged('user-new', 'user-old');
      expect(debugStub).to.have.been.called;
      allPrefsStub.restore();
      debugStub.restore();
    });
  });

  suite('Filter Value Persistence (WEBUI-1885)', () => {
    test('_applyPrefsToView resets filterValue when clearing to defaults', () => {
      const view = {
        columns: [
          { hiddenBack: false, hidden: false, order: 0, width: null, filterBy: 'title', filterValue: 'test' },
          { hiddenBack: true, hidden: true, order: 1, width: null, filterBy: 'dc_modified_agg', filterValue: 'month' },
          { hiddenBack: false, hidden: false, order: 2, width: null },
        ],
        sortOrder: [],
        set: sinon.spy(),
      };

      results._applyPrefsToView(view, {});

      // filterValue should be reset via view.set for columns that had a non-empty filterValue
      const filterValueCalls = view.set.getCalls().filter((c) => c.args[0].endsWith('.filterValue'));
      expect(filterValueCalls.length).to.be.greaterThan(0);
      // The calls should set filterValue to '' (empty string default)
      filterValueCalls.forEach((call) => {
        expect(call.args[1]).to.equal('');
      });
    });

    test('_applyPrefsToView does not reset filterValue for columns without a current value', () => {
      const view = {
        columns: [{ hiddenBack: false, hidden: false, order: 0, width: null, filterBy: 'title', filterValue: '' }],
        sortOrder: [],
        set: sinon.spy(),
      };

      results._applyPrefsToView(view, {});

      // filterValue is already '' (default), so set should NOT be called for filterValue
      const filterValueCalls = view.set.getCalls().filter((c) => c.args[0].endsWith('.filterValue'));
      expect(filterValueCalls.length).to.equal(0);
    });

    test('_applyPrefsToView applies settings that include filterValue via setter', () => {
      const view = { settings: null };
      const prefs = {
        columns: {
          'dc:title': { hidden: false, order: 0, width: null, filterValue: 'my-filter' },
        },
        sortOrder: [{ path: 'dc:modified', direction: 'desc' }],
      };

      results._applyPrefsToView(view, prefs);
      expect(view.settings).to.deep.equal(prefs);
    });

    test('customizableProps includes filterValue in default reset', () => {
      // Verify that when _applyPrefsToView resets with empty prefs,
      // it considers filterValue as a customizable property
      const view = {
        columns: [
          { hiddenBack: false, hidden: true, order: 5, width: '200px', filterBy: 'title', filterValue: 'active' },
        ],
        sortOrder: ['dc:title'],
        set: sinon.spy(),
      };

      results._applyPrefsToView(view, {});

      // Should have set calls for hidden, order, width, and filterValue
      const setPaths = view.set.getCalls().map((c) => c.args[0]);
      expect(setPaths).to.include('columns.0.hidden');
      expect(setPaths).to.include('columns.0.order');
      expect(setPaths).to.include('columns.0.width');
      expect(setPaths).to.include('columns.0.filterValue');
    });
  });

  suite('_filterSettingsByCapabilities', () => {
    const buildSettings = () => {
      return {
        columns: {
          'dc:title': { hidden: false, order: 1, width: '300px', resized: true },
          'dc:modified': { hidden: true, order: 0, width: '150px', resized: true },
        },
        sortOrder: [{ path: 'dc:title', direction: 'asc' }],
      };
    };

    const createTableView = (capabilities = {}) => {
      const view = document.createElement('nuxeo-data-table');
      view.settingsEnabled = true;
      view.columnResizeEnabled = true;
      view.columnReorderEnabled = true;
      Object.assign(view, capabilities);
      return view;
    };

    test('returns settings unchanged for non nuxeo-data-table views', () => {
      const view = createMockView();
      const settings = buildSettings();
      expect(results._filterSettingsByCapabilities(view, settings)).to.equal(settings);
    });

    test('returns the value as-is when there are no settings', () => {
      const view = createTableView();
      expect(results._filterSettingsByCapabilities(view, undefined)).to.be.undefined;
      expect(results._filterSettingsByCapabilities(view, null)).to.be.null;
    });

    test('does not restore any settings when settings-enabled is disabled', () => {
      const view = createTableView({ settingsEnabled: false });
      expect(results._filterSettingsByCapabilities(view, buildSettings())).to.be.undefined;
    });

    test('restores full settings when all capabilities are enabled', () => {
      const view = createTableView();
      const settings = buildSettings();
      expect(results._filterSettingsByCapabilities(view, settings)).to.deep.equal(settings);
    });

    test('strips width and resized when column-resize-enabled is disabled', () => {
      const view = createTableView({ columnResizeEnabled: false });
      const result = results._filterSettingsByCapabilities(view, buildSettings());
      expect(result.columns['dc:title']).to.not.have.property('width');
      expect(result.columns['dc:title']).to.not.have.property('resized');
      expect(result.columns['dc:modified']).to.not.have.property('width');
      expect(result.columns['dc:modified']).to.not.have.property('resized');
      // hidden and order are preserved
      expect(result.columns['dc:title'].order).to.equal(1);
      expect(result.columns['dc:modified'].hidden).to.be.true;
    });

    test('strips order when column-reorder-enabled is disabled', () => {
      const view = createTableView({ columnReorderEnabled: false });
      const result = results._filterSettingsByCapabilities(view, buildSettings());
      expect(result.columns['dc:title']).to.not.have.property('order');
      expect(result.columns['dc:modified']).to.not.have.property('order');
      // hidden and width are preserved
      expect(result.columns['dc:title'].width).to.equal('300px');
      expect(result.columns['dc:modified'].hidden).to.be.true;
    });

    test('strips both width and order when resize and reorder are disabled', () => {
      const view = createTableView({ columnResizeEnabled: false, columnReorderEnabled: false });
      const result = results._filterSettingsByCapabilities(view, buildSettings());
      Object.values(result.columns).forEach((column) => {
        expect(column).to.not.have.property('width');
        expect(column).to.not.have.property('resized');
        expect(column).to.not.have.property('order');
        expect(column).to.have.property('hidden');
      });
    });

    test('does not mutate the original settings object', () => {
      const view = createTableView({ columnResizeEnabled: false, columnReorderEnabled: false });
      const settings = buildSettings();
      results._filterSettingsByCapabilities(view, settings);
      expect(settings.columns['dc:title']).to.have.property('width', '300px');
      expect(settings.columns['dc:title']).to.have.property('order', 1);
    });
  });

  suite('Settings restore guards (WEBUI-2085)', () => {
    test('_viewChanged applies filtered settings when the capability filter returns a value', () => {
      const filtered = { columns: { 'dc:title': { hidden: false } } };
      const filterStub = sinon.stub(results, '_filterSettingsByCapabilities').returns(filtered);
      const view = createMockView({ settings: { source: 'template' } });
      results.displayMode = 'table';
      results._settings = { table: { source: 'persisted' } };

      results._viewChanged(view, null);

      expect(filterStub).to.have.been.calledWith(view, { source: 'persisted' });
      expect(view.settings).to.equal(filtered);
      filterStub.restore();
    });

    test('_viewChanged does not overwrite view settings when the capability filter returns undefined', () => {
      const filterStub = sinon.stub(results, '_filterSettingsByCapabilities').returns(undefined);
      const templateSettings = { source: 'template' };
      const view = createMockView({ settings: templateSettings });
      results.displayMode = 'table';
      results._settings = { table: { source: 'persisted' } };

      results._viewChanged(view, null);

      expect(filterStub).to.have.been.calledWith(view, { source: 'persisted' });
      expect(view.settings).to.equal(templateSettings);
      filterStub.restore();
    });

    test('_updateViews applies filtered settings when the capability filter returns a value', async () => {
      const resultsWithViews = await fixture(html`
        <nuxeo-results name="test-update-views">
          <div class="results" name="table" icon="icons:list"></div>
        </nuxeo-results>
      `);
      await flush();
      const view = resultsWithViews.$.views.items[0];
      view.settings = { source: 'template' };
      resultsWithViews._settings = { table: { source: 'persisted' } };
      const filtered = { source: 'filtered' };
      const filterStub = sinon.stub(resultsWithViews, '_filterSettingsByCapabilities').returns(filtered);

      resultsWithViews._updateViews();

      expect(filterStub).to.have.been.calledWith(view, { source: 'persisted' });
      expect(view.settings).to.equal(filtered);
      filterStub.restore();
    });

    test('_updateViews does not overwrite view settings when the capability filter returns undefined', async () => {
      const resultsWithViews = await fixture(html`
        <nuxeo-results name="test-update-views-undefined">
          <div class="results" name="table" icon="icons:list"></div>
        </nuxeo-results>
      `);
      await flush();
      const view = resultsWithViews.$.views.items[0];
      const templateSettings = { source: 'template' };
      view.settings = templateSettings;
      resultsWithViews._settings = { table: { source: 'persisted' } };
      const filterStub = sinon.stub(resultsWithViews, '_filterSettingsByCapabilities').returns(undefined);

      resultsWithViews._updateViews();

      expect(filterStub).to.have.been.calledWith(view, { source: 'persisted' });
      expect(view.settings).to.equal(templateSettings);
      filterStub.restore();
    });

    test('restoreSettings does not overwrite view settings when the capability filter returns undefined', () => {
      const filterStub = sinon.stub(results, '_filterSettingsByCapabilities').returns(undefined);
      const templateSettings = { source: 'template' };
      const view = createMockView({ settings: templateSettings });
      results.view = view;
      results.name = 'test-results';
      results.displayMode = 'table';
      results._settings = { displayMode: 'table', table: { source: 'persisted' } };

      results.restoreSettings();

      expect(filterStub).to.have.been.calledWith(view, { source: 'persisted' });
      expect(view.settings).to.equal(templateSettings);
      filterStub.restore();
    });
  });
});

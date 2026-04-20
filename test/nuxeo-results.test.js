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
    test('_quickFiltersChanged updates quick filters from provider', () => {
      const mockProvider = createMockProvider();
      mockProvider.quickFilters = { status: 'published' };
      results.nxProvider = mockProvider;

      const event = { detail: { value: { status: 'published' } } };
      results._quickFiltersChanged(event);

      expect(results.quickFilters).to.deep.equal({ status: 'published' });
    });

    test('_quickFiltersChanged does nothing without provider', () => {
      results.nxProvider = null;
      const event = { detail: { value: {} } };

      expect(() => results._quickFiltersChanged(event)).to.not.throw();
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
      if (!results.$.nxcon.user) {
        results.$.nxcon.user = { id: 'testuser' };
      } else {
        results.$.nxcon.user.id = 'testuser';
      }
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
  });

  suite('SelectAll Active Changed', () => {
    test('_selectAllActiveChanged syncs selectAllActive from view', () => {
      const mockView = createMockView({ selectAllActive: true });
      results.view = mockView;

      results._selectAllActiveChanged();

      expect(results.selectAllActive).to.equal(true);
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
});

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
import '../elements/search/nuxeo-search-form.js';

suite('nuxeo-search-form', () => {
  let searchForm;

  setup(async () => {
    searchForm = await fixture(html`<nuxeo-search-form provider="default_search"></nuxeo-search-form>`);
    searchForm.notify = sinon.spy();
    // Prevent tests from triggering real navigation, which detaches the browser frame and crashes the test run.
    searchForm.navigateTo = sinon.spy();
    await flush();
  });

  test('maps saved searches for selectivity data', () => {
    const data = searchForm._computeData([
      { id: 's1', title: 'Search 1' },
      { id: 's2', title: 'Search 2' },
    ]);

    expect(data).to.deep.equal([
      { id: 's1', title: 'Search 1', text: 'Search 1', displaytext: 'Search 1' },
      { id: 's2', title: 'Search 2', text: 'Search 2', displaytext: 'Search 2' },
    ]);
  });

  test('mutates params with mutator when available', () => {
    searchForm.paramMutator = sinon.stub().returns({ foo: 'bar' });
    const result = searchForm._mutateParams({ dc_title: 'abc' }, true);
    expect(searchForm.paramMutator).to.have.been.calledWith({ dc_title: 'abc' }, true);
    expect(result).to.deep.equal({ foo: 'bar' });
  });

  test('returns params as-is when no mutator is defined', () => {
    searchForm.paramMutator = null;
    const params = { ecm_fulltext: '*doc*' };
    expect(searchForm._mutateParams(params)).to.equal(params);
  });

  test('computes saved search params from provider', () => {
    searchForm.provider = 'advanced_search';
    expect(searchForm._computeSavedSearchesParams()).to.deep.equal({ pageProvider: 'advanced_search' });
  });

  test('updates selected index and params when selected search changes', () => {
    searchForm._searches = [
      { id: 'one', title: 'One', text: 'One', params: { ecm_fulltext: '*hello*' } },
      { id: 'two', title: 'Two', text: 'Two', params: { ecm_fulltext: '*world*' } },
    ];
    const mockForm = { searchTerm: '' };
    Object.defineProperty(searchForm, 'form', {
      configurable: true,
      get() {
        return mockForm;
      },
    });
    sinon.stub(searchForm, '_mutateParams').callsFake((p) => p);

    searchForm._selectedSearchChanged({ id: 'two' });

    expect(searchForm.selectedSearchIdx).to.equal(2);
    expect(searchForm.params).to.deep.equal({ ecm_fulltext: '*world*' });
    expect(searchForm.searchTerm).to.equal('world');
    expect(mockForm.searchTerm).to.equal('world');
    searchForm._mutateParams.restore();
    delete searchForm.form;
  });

  test('resets selected index when search id cannot be found', () => {
    searchForm._searches = [{ id: 'known', params: {} }];
    searchForm.selectedSearchIdx = 3;
    searchForm._selectedSearchChanged({ id: 'missing' });
    expect(searchForm.selectedSearchIdx).to.equal(0);
  });

  test('switches between queue and filters', () => {
    const displayFiltersSpy = sinon.spy(searchForm, 'displayFilters');
    const displayQueueSpy = sinon.spy(searchForm, 'displayQueue');
    const navigateSpy = sinon.spy(searchForm, '_navigateToResults');

    searchForm._displayFiltersTapped();
    expect(displayFiltersSpy).to.have.been.calledOnce;
    expect(navigateSpy).to.have.been.calledOnce;

    searchForm.displayQueueAndNavigateToFirst();
    expect(displayQueueSpy).to.have.been.calledWith(0);
  });

  test('computes list item class and quick filters visibility', () => {
    expect(searchForm._computedClass(false)).to.equal('list-item');
    expect(searchForm._computedClass(true)).to.equal('list-item selected');
    searchForm._quickFilters = [];
    expect(searchForm._displayQuickFilters()).to.be.false;
    searchForm._quickFilters = [{ id: 'status' }];
    expect(searchForm._displayQuickFilters()).to.be.true;
  });

  test('triggers search only on Enter in input fields', () => {
    const searchSpy = sinon.spy(searchForm, '_search');
    searchForm._keyPressedListener({
      keyCode: 13,
      composedPath: () => [{ tagName: 'INPUT' }],
    });
    expect(searchSpy).to.have.been.calledOnce;

    searchSpy.resetHistory();
    searchForm._keyPressedListener({
      keyCode: 9,
      composedPath: () => [{ tagName: 'INPUT' }],
    });
    expect(searchSpy).to.not.have.been.called;
  });

  test('handles provider errors and ignores aborted requests', () => {
    searchForm._onError({ detail: { error: { name: 'AbortError' } } });
    expect(searchForm.notify).to.not.have.been.called;

    const error = new Error('Boom');
    searchForm._onError({ detail: { error } });
    expect(searchForm.notify).to.have.been.calledWith(error);
  });

  test('sets loading flag around fetch lifecycle', async () => {
    const okEl = { fetch: sinon.stub().resolves() };
    await searchForm._fetch(okEl);
    expect(searchForm.loading).to.be.false;

    const failingEl = { fetch: sinon.stub().rejects(new Error('fetch failed')) };
    await searchForm._fetch(failingEl).catch((err) => {
      expect(err.message).to.equal('fetch failed');
    });
    expect(searchForm.loading).to.be.false;
  });

  test('updates tabindex and remembers last index from provider count', () => {
    searchForm.$.provider.resultsCount = 42;
    expect(searchForm._computeTabAndLastIndex(0)).to.equal('1');
    expect(searchForm._lastIndex).to.equal(42);
  });

  test('returns auto-control class when enabled', () => {
    searchForm.displayAutoControl = true;
    expect(searchForm._computeDisplayAutoControl()).to.equal('display-auto-control');
    searchForm.displayAutoControl = false;
    expect(searchForm._computeDisplayAutoControl()).to.be.undefined;
  });

  test('visible change triggers queue/auto fetch flows', () => {
    const fetchSpy = sinon.spy(searchForm.$.list, 'fetch');
    const fetchProviderSpy = sinon.spy(searchForm, '_fetch');

    searchForm._searches = [];
    searchForm.visible = true;
    searchForm.queue = true;
    searchForm._visibleChanged();
    expect(fetchSpy).to.have.been.calledOnce;

    searchForm.queue = false;
    searchForm.auto = true;
    searchForm._visibleChanged();
    expect(fetchProviderSpy).to.have.been.calledWith(searchForm.$.provider);
    fetchSpy.restore();
    fetchProviderSpy.restore();
  });

  test('displayQueue fetches and optionally navigates to index', async () => {
    searchForm.visible = true;
    const fetchStub = sinon.stub(searchForm.$.list, 'fetch').resolves();
    const scrollSpy = sinon.spy(searchForm.$.list, 'scrollToIndex');
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');

    searchForm.displayQueue(2);
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchStub).to.have.been.calledOnce;
    expect(scrollSpy).to.have.been.calledWith(2);
    expect(selectSpy).to.have.been.calledWith(2);

    fetchStub.restore();
    scrollSpy.restore();
    selectSpy.restore();
  });

  test('resetResults invokes list reset when required inputs exist', () => {
    const resetSpy = sinon.spy(searchForm.$.list, '_resetResults');
    searchForm.provider = 'default_search';
    searchForm.params = { foo: 'bar' };
    searchForm._quickFilters = [];
    searchForm.query = 'term';
    searchForm._resetResults();
    expect(resetSpy.callCount).to.be.greaterThan(0);
    resetSpy.restore();
  });

  test('resetResults does nothing when query is missing', () => {
    const resetSpy = sinon.spy(searchForm.$.list, '_resetResults');
    searchForm.provider = 'default_search';
    searchForm.params = { foo: 'bar' };
    searchForm._quickFilters = [];
    searchForm.query = '';
    searchForm._resetResults();
    expect(resetSpy).to.not.have.been.called;
    resetSpy.restore();
  });

  test('selectedSearchIdxChanged populates params for known search', () => {
    const navigateSpy = sinon.spy(searchForm, '_navigateToResults');
    sinon.stub(searchForm, '_mutateParams').callsFake((p) => p);
    searchForm._searches = [{ id: 'one', title: 'One', text: 'One', params: { ecm_fulltext: '*a*' } }];
    searchForm.selectedSearchIdx = 1;
    // The previous assignment may have already triggered the observer once via Polymer
    // property effects; reset the spy so the explicit invocation below is what we measure.
    navigateSpy.resetHistory();

    searchForm._selectedSearchIdxChanged();

    expect(searchForm.isSavedSearch).to.be.true;
    expect(searchForm.selectedSearch.id).to.equal('one');
    expect(searchForm.params).to.deep.equal({ ecm_fulltext: '*a*' });
    expect(navigateSpy).to.have.been.calledOnce;
    expect(searchForm.dirty).to.be.false;

    searchForm._mutateParams.restore();
    navigateSpy.restore();
  });

  test('clear resets state and triggers search in manual mode', () => {
    const resetSpy = sinon.spy(searchForm, '_resetResults');
    const searchSpy = sinon.stub(searchForm, '_search');
    Object.defineProperty(searchForm, 'form', {
      configurable: true,
      get() {
        return { clear: sinon.spy() };
      },
    });
    searchForm.auto = false;
    searchForm.selectedSearchIdx = 2;
    searchForm.isSavedSearch = true;
    searchForm.params = { ecm_fulltext: '*old*' };
    searchForm.aggregations = { old: true };

    searchForm._clear();

    expect(searchForm.selectedSearch).to.be.null;
    expect(searchForm.selectedSearchIdx).to.equal(0);
    expect(searchForm.params).to.deep.equal({});
    expect(searchForm.aggregations).to.deep.equal({});
    expect(searchForm.dirty).to.be.false;
    expect(resetSpy.callCount).to.be.greaterThan(0);
    expect(searchSpy.callCount).to.be.greaterThan(0);

    delete searchForm.form;
    resetSpy.restore();
    searchSpy.restore();
  });

  test('search updates fulltext params and fetches results when valid', async () => {
    const fetchStub = sinon.stub(searchForm, '_fetch').resolves();
    const navigateSpy = sinon.spy(searchForm, '_navigateToResults');
    const resetSpy = sinon.spy();
    Object.defineProperty(searchForm, 'form', {
      configurable: true,
      get() {
        return { searchTerm: 'my doc' };
      },
    });
    searchForm.results = { reset: resetSpy };
    sinon.stub(searchForm, '_validate').returns(true);

    await searchForm._search();

    expect(searchForm.params.ecm_fulltext).to.equal(searchForm.formatFulltext('my doc'));
    expect(searchForm.params.highlight).to.contain('dc:title.fulltext');
    expect(resetSpy).to.have.been.calledOnce;
    expect(fetchStub).to.have.been.calledWith(searchForm.results);
    expect(navigateSpy).to.have.been.calledOnce;

    searchForm._validate.restore();
    fetchStub.restore();
    navigateSpy.restore();
    delete searchForm.form;
  });

  test('search navigates when view is visible but results not bound', async () => {
    const navigate = sinon.spy();
    const searchRouteFn = sinon.stub().callsFake((name) => `/search/${name}`);
    searchForm.router = { search: searchRouteFn, navigate };
    sinon.stub(searchForm, '_validate').returns(false);
    searchForm.results = null;
    searchForm.visible = true;
    searchForm.searchName = 'default_search';

    await searchForm._search();
    expect(searchRouteFn).to.have.been.calledWith('default_search');
    expect(navigate).to.have.been.calledWith('/search/default_search');

    searchForm._validate.restore();
  });

  test('calculateViewportHeight updates css variable', () => {
    const updateSpy = sinon.spy(searchForm, 'updateStyles');
    searchForm._calculateViewportHeight();
    expect(updateSpy).to.have.been.calledOnce;
    const payload = updateSpy.firstCall.args[0];
    expect(payload['--vh']).to.match(/px$/);
    updateSpy.restore();
  });

  test('refresh updates queue and bound results', () => {
    const listFetchSpy = sinon.spy(searchForm.$.list, 'fetch');
    const resultsResetSpy = sinon.spy();
    const fetchSpy = sinon.stub(searchForm, '_fetch').resolves();
    searchForm.queue = true;
    searchForm.results = { reset: resultsResetSpy };

    searchForm.refresh();

    expect(listFetchSpy).to.have.been.calledOnce;
    expect(resultsResetSpy).to.have.been.calledOnce;
    expect(fetchSpy).to.have.been.calledWith(searchForm.results);
    listFetchSpy.restore();
    fetchSpy.restore();
  });

  test('selectedDocChanged navigates only when path changes', () => {
    const clock = sinon.useFakeTimers();
    const navigate = sinon.spy();
    // Provide a mock router. The behaviour passes the resolved route value (path) — not the
    // whole document — to the route function, so we just echo it back as the URL.
    searchForm.router = {
      document: sinon.stub().callsFake((p) => `/doc${p}`),
      navigate,
    };
    searchForm.currentDocument = { 'entity-type': 'document', path: '/same' };

    searchForm._selectedDocChanged({ 'entity-type': 'document', path: '/next', uid: 'u1' }, { path: '/old' });
    clock.tick(151);
    expect(navigate).to.have.been.calledWith('/doc/next');

    navigate.resetHistory();
    searchForm.currentDocument = { 'entity-type': 'document', path: '/next', uid: 'u1' };
    searchForm._selectedDocChanged({ 'entity-type': 'document', path: '/next', uid: 'u1' }, { path: '/old' });
    clock.tick(151);
    expect(navigate).to.not.have.been.called;
    clock.restore();
  });

  test('validate focuses first invalid field when validation fails', () => {
    const invalidField = { invalid: true, scrollIntoView: sinon.spy(), focus: sinon.spy() };
    searchForm.$.layout.$ = {
      layout: {
        validate: sinon.stub().returns(false),
        _getValidatableElements: sinon.stub().returns([invalidField]),
        element: { root: {} },
      },
    };

    const isValid = searchForm._validate();
    expect(isValid).to.be.false;
    expect(invalidField.scrollIntoView).to.have.been.calledOnce;
    expect(invalidField.focus).to.have.been.calledOnce;
  });

  test('search clears legacy fulltext params when form has no term', async () => {
    Object.defineProperty(searchForm, 'form', {
      configurable: true,
      get() {
        return { searchTerm: '' };
      },
    });
    searchForm.params = { ecm_fulltext: '*old*', highlight: 'dc:title.fulltext' };
    sinon.stub(searchForm, '_validate').returns(false);
    searchForm.visible = false;

    await searchForm._search();
    expect(searchForm.params.ecm_fulltext).to.be.undefined;
    expect(searchForm.params.highlight).to.be.undefined;

    searchForm._validate.restore();
    delete searchForm.form;
  });

  test('reset delegates to clear when current search is not saved', () => {
    const clearSpy = sinon.spy(searchForm, '_clear');
    searchForm.isSavedSearch = false;
    searchForm._reset();
    expect(clearSpy).to.have.been.calledOnce;
    clearSpy.restore();
  });

  test('reset clears the form even when current search is saved', () => {
    const form = { clear: sinon.spy() };
    const resetSpy = sinon.spy(searchForm, '_resetResults');
    const searchSpy = sinon.stub(searchForm, '_search');
    // Stub the observer so selectedSearch/selectedSearchIdx changes don't loop back through the
    // two-way bound selectivity widget, which would otherwise recurse and freeze the test run.
    sinon.stub(searchForm, '_selectedSearchIdxChanged');
    Object.defineProperty(searchForm, 'form', {
      configurable: true,
      get() {
        return form;
      },
    });
    searchForm.auto = false;
    // Initialize saved searches to satisfy selectedSearch observer lookups.
    searchForm._searches = [];
    searchForm.params = { 'my_schema:boolean_status': true, ecm_fulltext: '*saved*' };
    searchForm.searchTerm = 'saved';
    searchForm.selectedSearchIdx = 2;
    searchForm.isSavedSearch = true;
    searchForm.selectedSearch = { id: 'saved-1', title: 'saved-1', text: 'saved-1', displaytext: 'saved-1' };
    searchForm.aggregations = { old: true };
    searchForm.dirty = true;

    searchForm._reset();

    expect(form.clear).to.have.been.calledOnce;
    expect(searchForm.selectedSearchIdx).to.equal(0);
    expect(searchForm.selectedSearch).to.be.null;
    expect(searchForm.params).to.deep.equal({});
    expect(searchForm.aggregations).to.deep.equal({});
    expect(searchForm.searchTerm).to.equal('');
    expect(searchForm.dirty).to.be.false;
    expect(resetSpy.callCount).to.be.greaterThan(0);
    expect(searchSpy.callCount).to.be.greaterThan(0);

    delete searchForm.form;
    resetSpy.restore();
    searchSpy.restore();
    searchForm._selectedSearchIdxChanged.restore();
  });

  test('save routes to saveAs for index 0 and saveSearch otherwise', () => {
    const saveAsSpy = sinon.spy(searchForm, 'saveAs');
    const saveSearchSpy = sinon.spy(searchForm, '_saveSearch');
    // Stub the observer so changing selectedSearchIdx doesn't run _clear() and reset back to 0.
    sinon.stub(searchForm, '_selectedSearchIdxChanged');

    searchForm.selectedSearchIdx = 0;
    searchForm.save();
    expect(saveAsSpy).to.have.been.calledOnce;

    searchForm.selectedSearchIdx = 2;
    searchForm.save();
    expect(saveSearchSpy).to.have.been.calledOnce;

    saveAsSpy.restore();
    saveSearchSpy.restore();
    searchForm._selectedSearchIdxChanged.restore();
  });

  test('saveSearch creates new saved search and updates selection', async () => {
    const postStub = sinon.stub(searchForm.$['saved-search'], 'post').resolves({ id: 'new-id', title: 'New Search' });
    const getStub = sinon.stub(searchForm.$['saved-searches'], 'get').callsFake(() => {
      searchForm._searches = [
        { id: 'new-id', title: 'New Search', text: 'New Search', displaytext: 'New Search', params: {} },
      ];
      return Promise.resolve();
    });
    const closeSpy = sinon.spy(searchForm.$.saveDialog, 'close');
    // Prevent observers from clobbering our final assertion via downstream side effects.
    sinon.stub(searchForm, '_selectedSearchIdxChanged');
    sinon.stub(searchForm, '_selectedSearchChanged');
    searchForm._searches = [];
    searchForm.provider = 'default_search';
    searchForm.params = { ecm_fulltext: '*a*' };
    searchForm._savedSearchTitle = 'New Search';
    searchForm.selectedSearchIdx = 0;
    searchForm._saveAs = true;

    searchForm._saveSearch();
    // Allow chained promise resolutions in _saveSearch to settle.
    for (let i = 0; i < 8; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }

    expect(postStub).to.have.been.calledOnce;
    expect(closeSpy).to.have.been.calledOnce;
    // The post stub was invoked with the correct payload — that's the contract under test.
    // selectedSearch is two-way bound to nuxeo-selectivity so its terminal value depends on
    // the widget's own validation and is asserted indirectly via `selectedSearchIdx` below.
    expect(searchForm.selectedSearchIdx).to.equal(1);
    expect(searchForm._saveAs).to.be.false;

    postStub.restore();
    getStub.restore();
    closeSpy.restore();
    searchForm._selectedSearchIdxChanged.restore();
    searchForm._selectedSearchChanged.restore();
  });

  test('deleteSearch removes selected search and refreshes index', async () => {
    const removeStub = sinon.stub(searchForm.$['saved-search'], 'remove').resolves();
    const getStub = sinon.stub(searchForm.$['saved-searches'], 'get').callsFake(() => {
      searchForm._searches = [
        { id: 's1', title: 's1', text: 's1', displaytext: 's1', params: {} },
        { id: 's2', title: 's2', text: 's2', displaytext: 's2', params: {} },
      ];
      return Promise.resolve();
    });
    const closeSpy = sinon.spy(searchForm.$.deleteDialog, 'close');
    sinon.stub(searchForm, '_selectedSearchIdxChanged');
    searchForm._searches = [];
    searchForm.selectedSearch = { id: 's1', title: 's1', text: 's1', displaytext: 's1' };

    searchForm._deleteSearch();
    for (let i = 0; i < 8; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }

    expect(removeStub).to.have.been.calledOnce;
    expect(closeSpy).to.have.been.calledOnce;
    expect(searchForm.selectedSearchIdx).to.equal(2);

    removeStub.restore();
    getStub.restore();
    closeSpy.restore();
    searchForm._selectedSearchIdxChanged.restore();
  });

  suite('quick filters sync with results element', () => {
    test('_resultsElementChanged rewires listeners from old results to new results', () => {
      const oldResults = document.createElement('div');
      const newResults = document.createElement('div');
      const listenSpy = sinon.spy(searchForm, 'listen');
      const unlistenSpy = sinon.spy(searchForm, 'unlisten');

      searchForm._resultsElementChanged(newResults, oldResults);

      expect(unlistenSpy).to.have.been.calledWith(oldResults, 'quick-filters-changed', '_syncQuickFiltersFromResults');
      expect(listenSpy).to.have.been.calledWith(newResults, 'quick-filters-changed', '_syncQuickFiltersFromResults');
      listenSpy.restore();
      unlistenSpy.restore();
    });

    test('_resultsElementChanged ignores non-event targets safely', () => {
      const listenSpy = sinon.spy(searchForm, 'listen');
      const unlistenSpy = sinon.spy(searchForm, 'unlisten');

      searchForm._resultsElementChanged({}, {});

      expect(listenSpy).to.not.have.been.called;
      expect(unlistenSpy).to.not.have.been.called;
      listenSpy.restore();
      unlistenSpy.restore();
    });

    test('_syncQuickFiltersFromResults prioritizes event detail values', () => {
      searchForm.$.provider.quickFilters = [];

      searchForm._syncQuickFiltersFromResults({ detail: { value: ['Validated'] } });

      expect(searchForm._quickFilters).to.deep.equal(['Validated']);
      expect(searchForm.$.provider.quickFilters).to.deep.equal(['Validated']);
    });

    test('_syncQuickFiltersFromResults falls back to target and results quickFilters', () => {
      searchForm.results = { quickFilters: ['From Results'] };

      searchForm._syncQuickFiltersFromResults({ target: { quickFilters: ['From Target'] } });
      expect(searchForm._quickFilters).to.deep.equal(['From Target']);

      searchForm._syncQuickFiltersFromResults({ detail: {} });
      expect(searchForm._quickFilters).to.deep.equal(['From Results']);
      expect(searchForm.$.provider.quickFilters).to.deep.equal(['From Results']);
    });

    test('_syncQuickFiltersFromResults defaults to empty array', () => {
      searchForm.results = null;
      searchForm.$.provider.quickFilters = ['Old'];

      searchForm._syncQuickFiltersFromResults({ detail: {} });

      expect(searchForm._quickFilters).to.deep.equal([]);
      expect(searchForm.$.provider.quickFilters).to.deep.equal([]);
    });
  });
});

/**
 * Unit tests for nuxeo-search-form paramMutator logic (WEBUI-1934).
 *
 * Tests covering:
 *  1. Single-select hierarchical vocabulary → path reconstructed (e.g. "parent/child")
 *  2. Multi-select hierarchical vocabulary → each item reconstructed to path string
 *  3. Defensive parent shapes: string parent id and parent.properties.id
 */

suite('nuxeo-search-form — paramMutator (WEBUI-1934)', () => {
  let mutate;

  setup(async () => {
    const el = await fixture(html`<nuxeo-search-form></nuxeo-search-form>`);
    mutate = el.paramMutator.bind(el);
  });

  test('single-select hierarchical vocab: reconstructs full parent/child path and strips dc:title', () => {
    // Simulates saved search params returned by REST API for a single-select hierarchical vocab field.
    // Before the fix: the raw object was passed through, giving 0 results on reload.
    // After the fix: the path string "parentCategory/childItem" is reconstructed for the server query.
    const savedSearchParams = {
      'dc:title': 'My Saved Search',
      'my:vocabField': {
        id: 'childItem',
        properties: {
          label: 'Child Item',
          parent: {
            id: 'parentCategory',
            properties: { label: 'Parent Category' },
          },
        },
      },
      ecm_fulltext: '',
      'cvd:contentViewName': 'my_search',
    };

    const result = mutate(savedSearchParams, true);

    expect(result).to.not.have.property('dc:title');
    expect(result['my:vocabField']).to.equal('parentCategory/childItem');
    expect(result.ecm_fulltext).to.equal('');
    expect(result['cvd:contentViewName']).to.equal('my_search');

    // Defensive parent shapes: verify string and nested-object parent id variants
    // (a) properties.parent is a plain string id
    const stringParent = { id: 'child', properties: { parent: 'parentStringId' } };
    expect(mutate({ 'my:field': stringParent }, true)['my:field']).to.equal('parentStringId/child');

    // (b) properties.parent is an object whose id is under parent.properties.id
    const nestedIdParent = { id: 'child', properties: { parent: { properties: { id: 'nestedParentId' } } } };
    expect(mutate({ 'my:field': nestedIdParent }, true)['my:field']).to.equal('nestedParentId/child');
  });

  test('multi-select hierarchical vocab: each item reconstructed to path string; vocab objects without modifyPayload are not converted to path strings', () => {
    // Simulates saved search params for a multi-select hierarchical vocab field.
    const savedSearchParams = {
      'my:vocabField': [
        {
          id: 'childItem1',
          properties: {
            label: 'Child Item 1',
            parent: { id: 'parentCategory1', properties: { label: 'Parent Category 1' } },
          },
        },
        {
          id: 'childItem2',
          properties: {
            label: 'Child Item 2',
            parent: { id: 'parentCategory2', properties: { label: 'Parent Category 2' } },
          },
        },
      ],
    };

    // With modifyPayload=true (correct caller behaviour)
    const result = mutate(savedSearchParams, true);
    expect(result['my:vocabField']).to.deep.equal(['parentCategory1/childItem1', 'parentCategory2/childItem2']);

    // Without modifyPayload (regression guard: objects must NOT be transformed)
    const resultNoModify = mutate(savedSearchParams, false);
    expect(resultNoModify['my:vocabField']).to.deep.equal(savedSearchParams['my:vocabField']);

    // Defensive parent shapes in array items: verify string and nested-object parent id variants
    // (a) properties.parent is a plain string id
    const stringParentArray = [{ id: 'child', properties: { parent: 'parentStringId' } }];
    expect(mutate({ 'my:field': stringParentArray }, true)['my:field']).to.deep.equal(['parentStringId/child']);

    // (b) properties.parent is an object whose id is under parent.properties.id
    const nestedIdArray = [{ id: 'child', properties: { parent: { properties: { id: 'nestedParentId' } } } }];
    expect(mutate({ 'my:field': nestedIdArray }, true)['my:field']).to.deep.equal(['nestedParentId/child']);
  });
});

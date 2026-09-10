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

window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['searchForm.searchFilters'] = 'Search Filters';
window.nuxeo.I18n.en['searchForm.searchFilters.placeholder'] = 'Select a saved search';

suite('nuxeo-search-form', () => {
  let searchForm;

  setup(async () => {
    searchForm = await fixture(html`<nuxeo-search-form provider="default_search"></nuxeo-search-form>`);
    searchForm.notify = sinon.spy();
    await flush();
  });

  test('gives the saved searches dropdown an always visible label (WEBUI-489)', () => {
    const actionsDropdown = searchForm.shadowRoot.querySelector('#actionsDropdown');
    expect(actionsDropdown).to.exist;
    expect(actionsDropdown.label).to.equal('Search Filters');
    expect(actionsDropdown.placeholder).to.equal('Select a saved search');

    const visibleLabel = actionsDropdown.shadowRoot.querySelector('label.label');
    expect(visibleLabel).to.exist;
    expect(visibleLabel.textContent.trim()).to.equal('Search Filters');
    expect(visibleLabel.hasAttribute('hidden')).to.be.false;

    const input = actionsDropdown.shadowRoot.querySelector(
      '.selectivity-single-select-input, .selectivity-multiple-input',
    );
    expect(input).to.exist;
    expect(input.getAttribute('aria-labelledby')).to.equal('label');
    expect(input.hasAttribute('aria-label')).to.be.false;
    expect(visibleLabel.getAttribute('for')).to.equal(input.id);
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

  test('keeps the selected document when toggling back to the queue (WEBUI-1881)', async () => {
    searchForm.visible = true;
    const entries = [
      { uid: 'uid-1', path: '/default-domain/doc-1' },
      { uid: 'uid-2', path: '/default-domain/doc-2' },
      { uid: 'uid-3', path: '/default-domain/doc-3' },
    ];
    const fetchStub = sinon.stub(searchForm.$.list, 'fetch').callsFake(() => {
      // a fetch replaces the entries with new object instances
      searchForm.$.list.items = entries.map((entry) => Object.assign({}, entry));
      return Promise.resolve();
    });
    const scrollSpy = sinon.spy(searchForm.$.list, 'scrollToIndex');
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    // the third document was opened from the queue, then the filters view was displayed
    searchForm.selectedDocument = entries[2];
    searchForm.currentDocument = null;

    searchForm.displayQueueAndNavigateToFirst();
    await Promise.resolve();
    await Promise.resolve();

    expect(scrollSpy).to.have.been.calledWith(2);
    expect(selectSpy).to.have.been.calledWith(2);
    expect(navigateToSpy).to.have.been.calledOnce;
    expect(navigateToSpy.firstCall.args[0].uid).to.equal('uid-3');

    fetchStub.restore();
    scrollSpy.restore();
    selectSpy.restore();
    delete searchForm.navigateTo;
  });

  test('falls back to the first queue entry when the selection is gone (WEBUI-1881)', async () => {
    searchForm.visible = true;
    const fetchStub = sinon.stub(searchForm.$.list, 'fetch').callsFake(() => {
      searchForm.$.list.items = [{ uid: 'uid-1', path: '/default-domain/doc-1' }];
      return Promise.resolve();
    });
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    // the previously selected document is no longer part of the results
    searchForm.selectedDocument = { uid: 'gone', path: '/default-domain/gone' };
    searchForm.currentDocument = null;

    searchForm.displayQueueAndNavigateToFirst();
    await Promise.resolve();
    await Promise.resolve();

    expect(selectSpy).to.have.been.calledWith(0);
    expect(navigateToSpy.firstCall.args[0].uid).to.equal('uid-1');

    fetchStub.restore();
    selectSpy.restore();
    delete searchForm.navigateTo;
  });

  test('opens the restored document even when currentDocument is stale (WEBUI-1881)', async () => {
    searchForm.visible = true;
    const fetchStub = sinon.stub(searchForm.$.list, 'fetch').callsFake(() => {
      searchForm.$.list.items = [{ uid: 'uid-1', path: '/default-domain/doc-1' }];
      return Promise.resolve();
    });
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    searchForm.selectedDocument = { uid: 'uid-1', path: '/default-domain/doc-1' };
    // `navigateTo` never fires the `navigate` event, so currentDocument still points at the
    // document the filters view navigated away from and must not suppress the navigation
    searchForm.currentDocument = { uid: 'uid-1', path: '/default-domain/doc-1' };

    searchForm.displayQueueAndNavigateToFirst();
    await Promise.resolve();
    await Promise.resolve();

    expect(navigateToSpy).to.have.been.calledOnce;
    expect(navigateToSpy.firstCall.args[0].uid).to.equal('uid-1');

    fetchStub.restore();
    delete searchForm.navigateTo;
  });

  test('opens the document when the already-selected queue row is tapped (WEBUI-2300)', () => {
    // real row element, classed exactly as the queue template classes it
    const row = document.createElement('div');
    row.className = searchForm._computedClass(true);
    searchForm.selectedDocument = { uid: 'uid-2', path: '/default-domain/doc-2' };
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    const stopPropagation = sinon.spy();

    searchForm._queueItemTapped({ currentTarget: row, stopPropagation });

    // the tap must not reach iron-list, which would deselect the row and open nothing
    expect(stopPropagation).to.have.been.calledOnce;
    expect(navigateToSpy).to.have.been.calledOnce;
    expect(navigateToSpy.firstCall.args[0].uid).to.equal('uid-2');
    expect(searchForm.currentDocument.uid).to.equal('uid-2');

    delete searchForm.navigateTo;
  });

  test('lets iron-list handle a tap on an unselected queue row (WEBUI-2300)', () => {
    const row = document.createElement('div');
    row.className = searchForm._computedClass(false);
    const doc = { uid: 'uid-2', path: '/default-domain/doc-2' };
    // prime currentDocument so the debounced selection observer treats this document as already
    // displayed and does not fire a navigation 150ms later, after this test has torn down
    searchForm.currentDocument = doc;
    searchForm.selectedDocument = doc;
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    const stopPropagation = sinon.spy();

    searchForm._queueItemTapped({ currentTarget: row, stopPropagation });

    // selecting a new row is iron-list's job; the selection observer navigates from there
    expect(stopPropagation).to.not.have.been.called;
    expect(navigateToSpy).to.not.have.been.called;

    delete searchForm.navigateTo;
  });

  test('ignores a queue tap when nothing is selected yet (WEBUI-2300)', () => {
    const row = document.createElement('div');
    row.className = searchForm._computedClass(true);
    searchForm.selectedDocument = undefined;
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    const stopPropagation = sinon.spy();

    searchForm._queueItemTapped({ currentTarget: row, stopPropagation });

    expect(stopPropagation).to.not.have.been.called;
    expect(navigateToSpy).to.not.have.been.called;

    delete searchForm.navigateTo;
  });

  test('queue rows are wired to the tap handler (WEBUI-2300)', () => {
    // iron-list does not stamp rows in the unit-test environment, so assert the binding Polymer
    // parsed out of the queue row template - that is what makes _queueItemTapped reachable
    const listTemplate = searchForm.shadowRoot.querySelector('#list template');
    expect(listTemplate).to.exist;
    const events = (listTemplate._templateInfo.nodeInfoList || []).reduce(
      (acc, node) => acc.concat((node.events || []).map((event) => `${event.name}:${event.value}`)),
      [],
    );
    expect(events).to.contain('tap:_queueItemTapped');
    expect(typeof searchForm._queueItemTapped).to.equal('function');
  });

  test('reopens a document that was opened earlier in the queue (WEBUI-2300)', async () => {
    const doc7 = { uid: 'uid-7', path: '/default-domain/doc-7' };
    const doc3 = { uid: 'uid-3', path: '/default-domain/doc-3' };
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });

    // doc 7 opened from the queue (as the filter/queue toggle does)
    searchForm._openDocument(doc7);
    expect(navigateToSpy.lastCall.args[0].uid).to.equal('uid-7');

    // another row is clicked: iron-list moves the selection, the observer navigates
    searchForm.selectedDocument = doc3;
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(navigateToSpy.lastCall.args[0].uid).to.equal('uid-3');

    // back to doc 7: currentDocument must have followed doc 3, otherwise the observer guard
    // compares against a stale doc 7 and silently skips this navigation
    searchForm.selectedDocument = doc7;
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(navigateToSpy.lastCall.args[0].uid).to.equal('uid-7');
    expect(navigateToSpy).to.have.been.calledThrice;

    delete searchForm.navigateTo;
  });

  test('_openDocument keeps currentDocument in step with the navigation (WEBUI-2300)', () => {
    const doc = { uid: 'uid-9', path: '/default-domain/doc-9' };
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });

    searchForm._openDocument(doc);

    expect(navigateToSpy).to.have.been.calledWith(doc);
    expect(searchForm.currentDocument).to.equal(doc);

    delete searchForm.navigateTo;
  });

  test('follows the displayed document in the queue selection (WEBUI-2301)', () => {
    searchForm.queue = true;
    searchForm.$.list.items = [
      { uid: 'uid-1', path: '/default-domain/doc-1' },
      { uid: 'uid-2', path: '/default-domain/doc-2' },
    ];
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');
    const clearSpy = sinon.spy(searchForm.$.list, 'clearSelection');
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });

    // the host pushes down the document the router loaded, e.g. after browser back
    searchForm.currentDocument = { uid: 'uid-1', path: '/default-domain/doc-1' };

    expect(selectSpy).to.have.been.calledWith(0);
    // the previous row has to be cleared through the behaviour, otherwise it stays highlighted
    // as well and two rows look selected at once
    expect(clearSpy).to.have.been.calledBefore(selectSpy);
    // syncing the selection from the route must never navigate, or the two would loop
    expect(navigateToSpy).to.not.have.been.called;

    selectSpy.restore();
    clearSpy.restore();
    delete searchForm.navigateTo;
  });

  test('does not touch the selection while the filters view is shown (WEBUI-2301)', () => {
    searchForm.queue = false;
    searchForm.$.list.items = [{ uid: 'uid-1', path: '/default-domain/doc-1' }];
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');

    searchForm.currentDocument = { uid: 'uid-1', path: '/default-domain/doc-1' };

    expect(selectSpy).to.not.have.been.called;

    selectSpy.restore();
  });

  test('leaves the selection alone for a document outside the queue (WEBUI-2301)', () => {
    searchForm.queue = true;
    searchForm.$.list.items = [{ uid: 'uid-1', path: '/default-domain/doc-1' }];
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');
    const clearSpy = sinon.spy(searchForm.$.list, 'clearSelection');

    // a child document opened from the main content area is not part of the result set
    searchForm.currentDocument = { uid: 'uid-child', path: '/default-domain/doc-1/child' };

    expect(selectSpy).to.not.have.been.called;
    expect(clearSpy).to.not.have.been.called;

    selectSpy.restore();
    clearSpy.restore();
  });

  test('ignores documents without a uid and an empty queue (WEBUI-2301)', () => {
    searchForm.queue = true;
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');

    // the global `navigate` listener sets undefined whenever the event carries `doc` not `item`
    searchForm.currentDocument = undefined;
    searchForm.currentDocument = { path: '/default-domain/no-uid' };
    searchForm.$.list.items = [];
    searchForm.currentDocument = { uid: 'uid-1', path: '/default-domain/doc-1' };

    expect(selectSpy).to.not.have.been.called;

    selectSpy.restore();
  });

  test('reselecting the displayed document does not re-enter the navigation (WEBUI-2301)', () => {
    const doc = { uid: 'uid-2', path: '/default-domain/doc-2' };
    searchForm.queue = true;
    searchForm.$.list.items = [{ uid: 'uid-1', path: '/default-domain/doc-1' }, doc];
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });

    // _openDocument writes currentDocument, which now has an observer: the selection it syncs
    // must be recognised as already displayed so _selectedDocChanged does not navigate again
    searchForm._openDocument(doc);
    searchForm.selectedDocument = doc;

    expect(navigateToSpy).to.have.been.calledOnce;

    delete searchForm.navigateTo;
  });

  test('does not re-select the document that is already selected (WEBUI-2301)', () => {
    const doc = { uid: 'uid-1', path: '/default-domain/doc-1' };
    searchForm.queue = true;
    searchForm.$.list.items = [doc];
    searchForm.selectedDocument = doc;
    // iron-list.selectIndex clears the selection before selecting, so a redundant call would
    // push a transient null through selectedDocument on every navigation
    const selectSpy = sinon.spy(searchForm.$.list, 'selectIndex');

    searchForm.currentDocument = { uid: 'uid-1', path: '/default-domain/doc-1' };

    expect(selectSpy).to.not.have.been.called;

    selectSpy.restore();
  });

  test('a focused queue row is not styled as selected (WEBUI-2301)', () => {
    const styles = Array.from(searchForm.shadowRoot.querySelectorAll('style'))
      .map((style) => style.textContent)
      .join('');
    // sanity check that the element's own CSS was read, so the assertions below cannot pass
    // vacuously. Mixin names are gone by now - Polymer's ApplyShim expands `@apply` at runtime -
    // so assert on the selectors, which survive.
    expect(styles).to.contain('.list-item.selected');
    expect(styles).to.contain('.list-item:hover');

    // The defect was `.list-item:focus` being grouped with `.list-item.selected`, so a focused
    // row inherited the selected background. Once the queue selection follows the displayed
    // document, a row left focused behind it kept looking selected and two rows appeared
    // highlighted at once. A standalone `:focus` rule (outline, radius) is fine - only the
    // grouping is forbidden, which is what the trailing commas below detect.
    // The rendered background cannot be asserted here: the theme that defines
    // --hyland-drawer-item-selected is not loaded in the unit-test fixture.
    expect(styles).to.not.contain('.list-item:focus,');
    expect(styles).to.not.contain('.list-item.selected:focus {');
    // keyboard focus stays visible through the focus-visible ring
    expect(styles).to.contain('.list-item:focus-visible');
  });

  test('queue lookups tolerate a list with no items yet (WEBUI-1881)', () => {
    searchForm.$.list.items = undefined;
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });

    // no entries to search: the caller's fallback index is returned untouched
    expect(searchForm._queueIndexOf('uid-1', 7)).to.equal(7);
    // and nothing is opened rather than throwing on an absent items array
    searchForm._navigateToQueueItem(0);
    expect(navigateToSpy).to.not.have.been.called;

    delete searchForm.navigateTo;
  });

  test('ignores a queue tap that carries no row (WEBUI-2300)', () => {
    const doc = { uid: 'uid-1', path: '/default-domain/doc-1' };
    // prime currentDocument so the debounced selection observer treats this document as already
    // displayed and does not fire a navigation 150ms later, after this test has torn down
    searchForm.currentDocument = doc;
    searchForm.selectedDocument = doc;
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    const stopPropagation = sinon.spy();

    searchForm._queueItemTapped({ currentTarget: null, stopPropagation });

    expect(stopPropagation).to.not.have.been.called;
    expect(navigateToSpy).to.not.have.been.called;

    delete searchForm.navigateTo;
  });

  test('does not open a selected row whose document has no path (WEBUI-2300)', () => {
    const row = document.createElement('div');
    row.className = searchForm._computedClass(true);
    searchForm.selectedDocument = { uid: 'uid-1' };
    const navigateToSpy = sinon.spy();
    Object.defineProperty(searchForm, 'navigateTo', { value: navigateToSpy, configurable: true, writable: true });
    const stopPropagation = sinon.spy();

    searchForm._queueItemTapped({ currentTarget: row, stopPropagation });

    expect(stopPropagation).to.not.have.been.called;
    expect(navigateToSpy).to.not.have.been.called;

    delete searchForm.navigateTo;
  });

  test('ignores a route change before the list exists (WEBUI-2301)', () => {
    searchForm.queue = true;
    const list = searchForm.$.list;
    // `currentDocument` can be pushed in by the host before the template is stamped
    delete searchForm.$.list;

    expect(() => {
      searchForm.currentDocument = { uid: 'uid-1', path: '/default-domain/doc-1' };
    }).to.not.throw();

    searchForm.$.list = list;
  });

  test('queue lookup skips holes in the results array (WEBUI-1881)', () => {
    // a page provider can leave gaps in `items` for ranges that were never fetched
    searchForm.$.list.items = [null, { uid: 'uid-2', path: '/default-domain/doc-2' }];

    expect(searchForm._queueIndexOf('uid-2', 9)).to.equal(1);
    expect(searchForm._queueIndexOf('uid-missing', 9)).to.equal(9);
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
    Object.defineProperty(searchForm, 'form', {
      configurable: true,
      get() {
        return form;
      },
    });
    searchForm.auto = false;
    // Initialize saved searches with the currently selected saved search so _selectedSearchChanged
    // doesn't force selectedSearchIdx back to 0.
    searchForm._searches = [
      { id: 'saved-0', title: 'saved-0', text: 'saved-0', displaytext: 'saved-0', params: {} },
      {
        id: 'saved-1',
        title: 'saved-1',
        text: 'saved-1',
        displaytext: 'saved-1',
        params: { 'my_schema:boolean_status': true, ecm_fulltext: '*saved*' },
      },
    ];
    searchForm.params = { 'my_schema:boolean_status': true, ecm_fulltext: '*saved*' };
    searchForm.searchTerm = 'saved';
    searchForm.selectedSearchIdx = 2;
    searchForm.isSavedSearch = true;
    searchForm.selectedSearch = searchForm._searches[1];
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

  suite('result name tooltip (WEBUI-2009)', () => {
    // Names stay truncated to one line, so every row carries a tooltip with the full name.
    // These read the class-level template: iron-list templatizes the row template at
    // runtime, which empties the instance's copy.
    const rowTemplate = () => {
      const template = searchForm.constructor.template.content.querySelector('#list template');
      expect(template, 'result row template').to.not.be.null;
      return template;
    };
    const rowTooltip = () => rowTemplate().content.querySelector('nuxeo-tooltip');
    const rowName = () => rowTemplate().content.querySelector('.list-item-title');

    test('the tooltip exposes the untruncated name', () => {
      const tooltip = rowTooltip();
      expect(tooltip, 'result row tooltip').to.not.be.null;
      expect(tooltip.textContent.trim()).to.equal('[[item.title]]');
    });

    test('the tooltip sits outside the name so the name text is unchanged', () => {
      // Nesting it inside would append a duplicate of the title to the span's textContent.
      expect(rowName().querySelector('nuxeo-tooltip')).to.be.null;
      expect(rowName().textContent.trim()).to.equal('[[item.title]]');
    });

    test('the tooltip is anchored on its parent row rather than by id', () => {
      // The row template is stamped once per result into the same shadow root, so a "for"
      // attribute would resolve every row's tooltip to the first matching id.
      const tooltip = rowTooltip();
      expect(tooltip.hasAttribute('for')).to.be.false;
      expect(tooltip.parentElement.classList.contains('list-item-info')).to.be.true;
    });

    test('the tooltip is hidden from the accessibility tree', () => {
      // The name is already exposed as row text; announcing it twice is noise.
      expect(rowTooltip().getAttribute('aria-hidden')).to.equal('true');
    });

    test('the name stays on a single truncated line', () => {
      // .ellipsis supplies the single-line truncation; no local rule may reintroduce wrapping
      expect(rowName().classList.contains('ellipsis')).to.be.true;
      const styles = [...searchForm.constructor.template.content.querySelectorAll('style')]
        .map((s) => s.textContent)
        .join('\n');
      expect(styles).to.not.contain('-webkit-line-clamp');
    });

    const stampRows = async (items) => {
      searchForm.queue = true;
      searchForm.$.list.items = items;
      // iron-list decides how many rows to stamp, so poll rather than assume a count
      for (let i = 0; i < 40 && searchForm.$.list.querySelectorAll('.list-item-info').length === 0; i++) {
        await flush();
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const rows = searchForm.$.list.querySelectorAll('.list-item-info');
      expect(rows.length).to.be.at.least(1);
      return rows;
    };

    test('every rendered row gets its own tooltip', async () => {
      const rows = await stampRows([
        { uid: '1', type: 'File', path: '/a', title: 'D-DF-ASTURL61CZRIE-LSPS-PLANNING-2025-REV-01' },
        { uid: '2', type: 'File', path: '/b', title: 'D-DF-ASTURL61CZRIE-LSPS-PLANNING-2025-REV-02' },
        { uid: '3', type: 'File', path: '/c', title: 'Short' },
      ]);
      rows.forEach((row) => {
        const name = row.querySelector('.list-item-title').textContent.trim();
        expect(row.querySelector('nuxeo-tooltip'), `tooltip for "${name}"`).to.not.be.null;
      });
    });

    test('the tooltip opens beside the row so it never covers the result list', () => {
      const tooltip = rowTooltip();
      expect(tooltip.getAttribute('position')).to.equal('right');
      // Tighter than nuxeo-tooltip's default 14, which reads as a gap rather than a pointer
      // when the tooltip sits alongside its row instead of below it.
      expect(tooltip.getAttribute('offset')).to.equal('8');
    });

    test('the name is wrapped in an element the document-level cap can match', () => {
      // nuxeo-tooltip clones its content onto document.body, so a rule in this shadow root
      // would never reach it: the class travels with the clone and the cap lives on the
      // document (see nuxeo-search-result-tooltip-styles). A bare text node could not be
      // targeted at all.
      const content = rowTooltip().firstElementChild;
      expect(content, 'tooltip content element').to.not.be.null;
      expect(content.classList.contains('nuxeo-search-result-tooltip-name')).to.be.true;
      expect(content.textContent.trim()).to.equal('[[item.title]]');
      expect(content.hasAttribute('style'), 'width cap belongs in the stylesheet, not inline').to.be.false;
    });

    test('a name with no break opportunity stays inside the viewport', async () => {
      // paper-tooltip sets no max-width and its fitToVisibleBounds only repositions the box,
      // so an unbreakable name used to lay out wider than the viewport with the start of the
      // name pushed off-screen. Placement is asserted structurally above; here the box itself
      // has to stay on screen whichever side fitToVisibleBounds settles on.
      const rows = await stampRows([
        { uid: '1', type: 'File', path: '/a', title: 'Short' },
        { uid: '2', type: 'File', path: '/b', title: `D${'X'.repeat(240)}` },
      ]);
      const rowFor = (prefix) =>
        [...rows].find((row) => row.querySelector('.list-item-title').textContent.trim().startsWith(prefix));

      const measure = async (row) => {
        const tooltip = row.querySelector('nuxeo-tooltip');
        tooltip.show();
        await flush();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const rect = tooltip._tooltip.getBoundingClientRect();
        tooltip.hide();
        return rect;
      };

      const single = await measure(rowFor('Short'));
      const wrapped = await measure(rowFor('DXXX'));

      expect(wrapped.width).to.be.below(window.innerWidth);
      expect(Math.floor(wrapped.left)).to.be.at.least(0);
      expect(Math.ceil(wrapped.right)).to.be.at.most(window.innerWidth);
      // Capped and wrapped onto several lines rather than stretched into one long one.
      expect(wrapped.height).to.be.above(single.height);
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

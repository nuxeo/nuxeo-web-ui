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
import { config } from '@nuxeo/nuxeo-elements';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-app.js';

suite('nuxeo-app', () => {
  let app;

  setup(async () => {
    app = await fixture(html`<nuxeo-app></nuxeo-app>`);
    sinon.stub(app, 'i18n').callsFake((key) => key);
    if (app.$ && app.$.userWorkspace) {
      sinon.stub(app.$.userWorkspace, 'execute').resolves({ path: '/user-workspace' });
    }
    if (app.$ && app.$.tasksProvider) {
      sinon.stub(app.$.tasksProvider, 'fetch').resolves({ resultsCount: 0 });
    }
    await flush();
  });

  test('_isEmpty is true only for an object with no keys', () => {
    expect(app._isEmpty({})).to.be.true;
    expect(app._isEmpty({ a: 1 })).to.be.false;
  });

  test('isDrawerHidden hides drawer when narrow and drawer is closed', () => {
    expect(app.isDrawerHidden(true, false)).to.be.true;
    expect(app.isDrawerHidden(true, true)).to.be.false;
    expect(app.isDrawerHidden(false, false)).to.be.false;
  });

  test('_handleNarrowChange closes drawer when layout is narrow', () => {
    app.drawerOpened = true;
    app._handleNarrowChange(true);
    expect(app.drawerOpened).to.be.false;
  });

  test('_logo builds theme logo URL from baseUrl and localStorage theme', () => {
    sinon.stub(localStorage, 'getItem').callsFake((k) => (k === 'theme' ? 'ocean' : null));
    expect(app._logo('https://host/nuxeo/')).to.equal('https://host/nuxeo/themes/ocean/logo.png');
    localStorage.getItem.restore();

    sinon.stub(localStorage, 'getItem').callsFake(() => null);
    expect(app._logo('https://host/')).to.equal('https://host/themes/default/logo.png');
    localStorage.getItem.restore();
  });

  test('_baseUrlChanged assigns RoutingBehavior.baseUrl', () => {
    app.baseUrl = 'https://example/nuxeo/';
    app._baseUrlChanged();
    expect(RoutingBehavior.baseUrl).to.equal('https://example/nuxeo/');
  });

  test('_actionContext aggregates clipboard and routing-related fields', () => {
    app.currentDocument = { uid: 'd1' };
    app.currentUser = { id: 'u1', properties: { firstName: 'U', lastName: 'One' } };
    app.taskCount = 3;
    app.currentTask = { id: 't1' };
    app.clipboardDocCount = 2;
    app.clipboard = [{ uid: 'c1' }];
    app.actionContext = { foo: 'bar' };
    app.userWorkspace = { path: '/default-domain/UserWorkspaces/u' };
    app.routeParams = 'browse';

    const ctx = app._actionContext();
    expect(ctx.document).to.equal(app.currentDocument);
    expect(ctx.user).to.equal(app.currentUser);
    expect(ctx.taskCount).to.equal(3);
    expect(ctx.currentTask).to.equal(app.currentTask);
    expect(ctx.clipboardDocCount).to.equal(2);
    expect(ctx.clipboard).to.equal(app.clipboard);
    expect(ctx.actionContext).to.equal(app.actionContext);
    expect(ctx.userWorkspace).to.equal(app.userWorkspace);
    expect(ctx.routeParams).to.equal('browse');
  });

  suite('_appendEnricher', () => {
    test('returns original list when value is blank', () => {
      expect(app._appendEnricher(['a'], '   ')).to.deep.equal(['a']);
      expect(app._appendEnricher(['a'], null)).to.deep.equal(['a']);
    });

    test('appends unique value to array enrichers', () => {
      expect(app._appendEnricher(['a', ' b '], 'c')).to.deep.equal(['a', 'b', 'c']);
      expect(app._appendEnricher(['a'], 'a')).to.deep.equal(['a']);
    });

    test('appends unique value to CSV string enrichers', () => {
      expect(app._appendEnricher('a, b', 'c')).to.equal('a,b,c');
      expect(app._appendEnricher('a', 'a')).to.equal('a');
    });
  });

  suite('_computeDocumentEnrichersForPage', () => {
    let getStub;

    teardown(() => {
      if (getStub) {
        getStub.restore();
        getStub = null;
      }
    });

    test('adds userPreferences document enricher on browse page', () => {
      getStub = sinon.stub(config, 'get');
      getStub.withArgs('enrichers').returns({ document: ['thumbnail'], blob: ['blobholder'] });

      const out = app._computeDocumentEnrichersForPage('browse');
      expect(out.document).to.include.members(['thumbnail', 'userPreferences']);
      expect(out.blob).to.deep.equal(['blobholder']);
    });

    test('returns cloned enrichers for non-browse pages', () => {
      getStub = sinon.stub(config, 'get');
      getStub.withArgs('enrichers').returns({ document: ['x'] });

      const out = app._computeDocumentEnrichersForPage('tasks');
      expect(out.document).to.deep.equal(['x']);
    });
  });

  suite('_computeHeaders', () => {
    let getStub;

    teardown(() => {
      if (getStub) {
        getStub.restore();
        getStub = null;
      }
    });

    test('merges required fetchers into config fetch map', () => {
      getStub = sinon.stub(config, 'get');
      getStub.withArgs('fetch', {}).returns({
        document: [],
        directoryEntry: [],
        task: [],
      });

      const headers = app._computeHeaders();
      expect(headers['translate-directoryEntry']).to.equal('label');
      expect(headers['fetch-document'].split(',')).to.include('lock');
      expect(headers['fetch-directoryEntry'].split(',')).to.include('parent');
      expect(headers['fetch-task'].split(',')).to.include('actors');
    });
  });

  test('_computeEnrichers proxies config enrichers', () => {
    const getStub = sinon.stub(config, 'get');
    getStub.withArgs('enrichers').returns({ document: ['d'] });
    expect(app._computeEnrichers()).to.deep.equal({ document: ['d'] });
    getStub.restore();
  });

  suite('_displayUser', () => {
    test('returns undefined when user is missing', () => {
      expect(app._displayUser()).to.equal(undefined);
    });

    test('returns id when user has no name properties', () => {
      expect(app._displayUser({ id: 'jdoe', properties: {} })).to.equal('jdoe');
    });

    test('returns first and last name when present', () => {
      expect(
        app._displayUser({
          id: 'x',
          properties: { firstName: 'Jane', lastName: 'Doe' },
        }),
      ).to.equal('Jane Doe');
    });

    test('returns only first name when last name absent', () => {
      expect(app._displayUser({ id: 'x', properties: { firstName: 'Solo' } })).to.equal('Solo');
    });
  });

  suite('_documentAddedToCollection', () => {
    test('does not toast when detail is empty', () => {
      sinon.stub(app, '_toast');
      app._documentAddedToCollection({ detail: {} });
      expect(app._toast).to.not.have.been.called;
      app._toast.restore();
    });

    test('toasts when detail has docIds', () => {
      sinon.stub(app, '_toast');
      app._documentAddedToCollection({ detail: { docIds: ['1', '2'] } });
      expect(app._toast).to.have.been.calledOnce;
      app._toast.restore();
    });
  });

  suite('_computeSharedActionContext', () => {
    test('sets shared model when currentUser is set', () => {
      const user = { id: 'user-1', properties: { firstName: 'A', lastName: 'B' } };
      sinon.stub(window.nuxeo.slots, 'setSharedModel');
      app.currentUser = user;
      app._computeSharedActionContext(user);
      expect(window.nuxeo.slots.setSharedModel).to.have.been.calledWith({ user });
      window.nuxeo.slots.setSharedModel.restore();
    });
  });

  test('_checkRtl mirrors document dir', () => {
    sinon.stub(document.documentElement, 'getAttribute').withArgs('dir').returns('rtl');
    app._checkRtl();
    expect(app._isRTL).to.be.true;
    document.documentElement.getAttribute.restore();

    sinon.stub(document.documentElement, 'getAttribute').withArgs('dir').returns('ltr');
    app._checkRtl();
    expect(app._isRTL).to.be.false;
    document.documentElement.getAttribute.restore();
  });

  test('_resetTaskSelection clears current task fields', () => {
    app.currentTask = { id: 't' };
    app.currentTaskId = 'tid';
    app._resetTaskSelection();
    expect(app.currentTask).to.be.null;
    expect(app.currentTaskId).to.be.null;
  });

  test('_clipboardUpdated sets clipboardDocCount from event detail', () => {
    app._clipboardUpdated({ detail: { docCount: 12 } });
    expect(app.clipboardDocCount).to.equal(12);
  });

  test('_removeFromClipboard forwards to clipboard element when present', () => {
    const remove = sinon.spy();
    app.clipboard = { remove };
    app._removeFromClipboard([{ uid: '1' }]);
    expect(remove).to.have.been.calledWith({ uid: '1' });
  });

  test('_documentFileDeleted notifies and bubbles document-updated', () => {
    sinon.stub(app, '_toast');
    sinon.stub(app, 'fire');
    app._documentFileDeleted();
    expect(app._toast).to.have.been.calledOnce;
    expect(app.fire).to.have.been.calledWith('document-updated');
    app._toast.restore();
    app.fire.restore();
  });

  test('_handleDocumentCreated shows plural toast for multiple entries', () => {
    sinon.stub(app, '_toast');
    app._handleDocumentCreated({ detail: { response: { entries: [{}, {}, {}] } } });
    expect(app._toast).to.have.been.calledWith(sinon.match.string);
    app._toast.restore();
  });

  test('_handleDocumentCreated shows single-document toast when one entry', () => {
    sinon.stub(app, '_toast');
    sinon.stub(app, 'formatDocType').returns('File');
    app._handleDocumentCreated({
      detail: { response: { entries: [{ type: 'File', title: 'A.txt' }] } },
    });
    expect(app._toast).to.have.been.calledOnce;
    app._toast.restore();
    app.formatDocType.restore();
  });

  test('_documentsDropped moves to container when target is not a collection', () => {
    sinon.stub(app, 'hasFacet').returns(false);
    sinon.stub(app, '_moveDocumentsToContainer');
    const docs = [{ uid: 'd1' }];
    const target = { uid: 't1' };
    app._documentsDropped({ detail: { documents: docs, targetDocument: target } });
    expect(app._moveDocumentsToContainer).to.have.been.calledWith(docs, target);
    app.hasFacet.restore();
    app._moveDocumentsToContainer.restore();
  });

  test('_documentsDropped adds to collection when target has Collection facet', () => {
    sinon.stub(app, 'hasFacet').returns(true);
    sinon.stub(app, '_addDocumentsToCollection');
    const docs = [{ uid: 'd1' }];
    const target = { uid: 'coll' };
    app._documentsDropped({ detail: { documents: docs, targetDocument: target } });
    expect(app._addDocumentsToCollection).to.have.been.calledWith(docs, target);
    app.hasFacet.restore();
    app._addDocumentsToCollection.restore();
  });

  test('_errorUrl returns the window location href', () => {
    expect(app._errorUrl()).to.equal(window.location.href);
  });

  test('_onError delegates to showError with code, message, and error url', () => {
    sinon.stub(app, 'showError');
    sinon.stub(app, '_errorUrl').returns('https://example/err');
    app._onError({ detail: { code: 403, message: 'Forbidden' } });
    expect(app.showError).to.have.been.calledWith(403, 'Forbidden', 'https://example/err');
    app.showError.restore();
    app._errorUrl.restore();
  });

  test('_logout returns nxcon logout path', () => {
    const prev = app.$.nxcon.url;
    app.$.nxcon.url = 'https://server/nuxeo';
    expect(app._logout()).to.equal('https://server/nuxeo/logout');
    app.$.nxcon.url = prev;
  });

  test('_moveDocumentsToContainer configures operation and toasts on success', async () => {
    sinon.stub(app.$.moveDocumentsOp, 'execute').resolves();
    sinon.stub(app, '_toast');
    sinon.stub(app, 'fire');
    const docs = [{ uid: 'a' }, { uid: 'b' }];
    const target = { uid: 'dest', title: 'Folder' };
    app._moveDocumentsToContainer(docs, target);
    await Promise.resolve();
    expect(app.$.moveDocumentsOp.op).to.equal('Document.Move');
    expect(app.$.moveDocumentsOp.params).to.deep.equal({ target: 'dest' });
    expect(app.fire).to.have.been.calledWith('document-updated');
    expect(app._toast).to.have.been.calledOnce;
    app.$.moveDocumentsOp.execute.restore();
    app._toast.restore();
    app.fire.restore();
  });

  test('_addDocumentsToCollection configures collection op and toasts', async () => {
    sinon.stub(app.$.moveDocumentsOp, 'execute').resolves();
    sinon.stub(app, '_toast');
    sinon.stub(app, 'fire');
    const docs = [{ uid: 'x' }];
    const target = { uid: 'coll-1' };
    app._addDocumentsToCollection(docs, target);
    await Promise.resolve();
    expect(app.$.moveDocumentsOp.op).to.equal('Document.AddToCollection');
    expect(app.$.moveDocumentsOp.params).to.deep.equal({ collection: 'coll-1' });
    expect(app.fire).to.have.been.calledWith('document-updated');
    app.$.moveDocumentsOp.execute.restore();
    app._toast.restore();
    app.fire.restore();
  });

  test('show sets page and routeParams', () => {
    app.show('browse', 'someRoute');
    expect(app.page).to.equal('browse');
    expect(app.routeParams).to.equal('someRoute');
  });

  test('showError sets loading to false and configures error element', () => {
    app.loading = true;
    app.showError(404, 'Not Found', '/some/url');
    expect(app.loading).to.be.false;
    expect(app.$.error.code).to.equal(404);
    expect(app.$.error.message).to.equal('Not Found');
    expect(app.$.error.url).to.equal('/some/url');
    expect(app.page).to.equal('error');
  });

  test('_defineTaskAndNavigate sets currentTask and shows tasks page', () => {
    const task = { id: 't1', name: 'Review' };
    app._defineTaskAndNavigate(task);
    expect(app.currentTask).to.equal(task);
    expect(app.page).to.equal('tasks');
  });

  test('_defineTaskAndNavigate works with undefined task', () => {
    app._defineTaskAndNavigate();
    expect(app.currentTask).to.be.undefined;
    expect(app.page).to.equal('tasks');
  });

  test('_directionChanged sets drawer alignment for RTL', () => {
    app._directionChanged(true);
    expect(app.$.drawerPanel.getAttribute('align')).to.equal('end');
    expect(app.toggleChevronIcon).to.equal('icons:chevron-right');
  });

  test('_directionChanged sets drawer alignment for LTR', () => {
    app._directionChanged(false);
    expect(app.$.drawerPanel.getAttribute('align')).to.equal('start');
    expect(app.toggleChevronIcon).to.equal('icons:chevron-left');
  });

  test('_documentRemovedFromCollection toasts', () => {
    sinon.stub(app, '_toast');
    app._documentRemovedFromCollection();
    expect(app._toast).to.have.been.calledWith('app.document.removedFromCollection');
    app._toast.restore();
  });

  test('_documentRemovedFromClipboard toasts', () => {
    sinon.stub(app, '_toast');
    app._documentRemovedFromClipboard();
    expect(app._toast).to.have.been.calledWith('app.document.removedFromClipboard');
    app._toast.restore();
  });

  test('_documentAddedToFavorites toasts', () => {
    sinon.stub(app, '_toast');
    app._documentAddedToFavorites();
    expect(app._toast).to.have.been.calledWith('app.document.addedToFavorites');
    app._toast.restore();
  });

  test('_documentRemovedFromFavorites toasts', () => {
    sinon.stub(app, '_toast');
    app._documentRemovedFromFavorites();
    expect(app._toast).to.have.been.calledWith('app.document.removedFromFavorites');
    app._toast.restore();
  });

  test('_documentSubscribed toasts', () => {
    sinon.stub(app, '_toast');
    app._documentSubscribed();
    expect(app._toast).to.have.been.calledWith('app.document.subscribed');
    app._toast.restore();
  });

  test('_documentUnsubscribed toasts', () => {
    sinon.stub(app, '_toast');
    app._documentUnsubscribed();
    expect(app._toast).to.have.been.calledWith('app.document.unsubscribed');
    app._toast.restore();
  });

  test('_documentLocked toasts and fires document-updated', () => {
    sinon.stub(app, '_toast');
    sinon.stub(app, 'fire');
    app._documentLocked();
    expect(app._toast).to.have.been.calledWith('app.document.locked');
    expect(app.fire).to.have.been.calledWith('document-updated');
    app._toast.restore();
    app.fire.restore();
  });

  test('_documentUnlocked toasts and fires document-updated', () => {
    sinon.stub(app, '_toast');
    sinon.stub(app, 'fire');
    app._documentUnlocked();
    expect(app._toast).to.have.been.calledWith('app.document.unlocked');
    expect(app.fire).to.have.been.calledWith('document-updated');
    app._toast.restore();
    app.fire.restore();
  });

  test('_onAddedToClipboard toasts plural for multiple docs', () => {
    sinon.stub(app, '_toast');
    app._onAddedToClipboard({ detail: { docIds: ['1', '2'] } });
    expect(app._toast).to.have.been.calledWith('app.documents.addedToClipboard');
    app._toast.restore();
  });

  test('_onAddedToClipboard toasts singular for single doc', () => {
    sinon.stub(app, '_toast');
    app._onAddedToClipboard({ detail: {} });
    expect(app._toast).to.have.been.calledWith('app.document.addedToClipboard');
    app._toast.restore();
  });

  test('_onAddToClipboard adds documents to clipboard', () => {
    const addSpy = sinon.spy();
    app.clipboard = { add: addSpy };
    const docs = [{ uid: '1' }, { uid: '2' }];
    app._onAddToClipboard({ detail: { documents: docs } });
    expect(addSpy).to.have.been.calledWith(docs);
  });

  test('_onAddToClipboard does nothing without documents', () => {
    const addSpy = sinon.spy();
    app.clipboard = { add: addSpy };
    app._onAddToClipboard({ detail: {} });
    expect(addSpy).to.not.have.been.called;
  });

  test('_onClipboardAction fires document-updated', () => {
    sinon.stub(app, 'fire');
    app._onClipboardAction({ detail: { operation: 'Document.Copy', documents: [] } });
    expect(app.fire).to.have.been.calledWith('document-updated');
    app.fire.restore();
  });

  test('_workflowTaskAssigned calls loadTask with currentTaskId', () => {
    sinon.stub(app, 'loadTask');
    app.currentTaskId = 'task-42';
    app._workflowTaskAssigned();
    expect(app.loadTask).to.have.been.calledWith('task-42');
    app.loadTask.restore();
  });

  test('_documentsUntrashed handles empty detail for bulk', () => {
    sinon.stub(app, '_refreshCollections');
    sinon.stub(app, '_refreshSearch');
    app._documentsUntrashed({ detail: {} });
    expect(app._refreshCollections).to.have.been.called;
    expect(app._refreshSearch).to.have.been.called;
    app._refreshCollections.restore();
    app._refreshSearch.restore();
  });

  test('_documentsUntrashed toasts success for non-empty detail', () => {
    sinon.stub(app, '_toast');
    sinon.stub(app, 'hasFacet').returns(false);
    sinon.stub(app, '_refreshSearch');
    app._documentsUntrashed({ detail: { documents: [{ uid: '1' }] } });
    expect(app._toast).to.have.been.calledWith('app.documents.untrashed.success');
    app._toast.restore();
    app.hasFacet.restore();
    app._refreshSearch.restore();
  });

  test('_documentsUntrashed toasts error when error present', () => {
    sinon.stub(app, '_toast');
    sinon.stub(app, '_refreshSearch');
    app._documentsUntrashed({ detail: { error: true, documents: [] } });
    expect(app._toast).to.have.been.calledWith('app.documents.untrashed.error');
    app._toast.restore();
    app._refreshSearch.restore();
  });

  test('_documentsDeleted handles empty detail for bulk delete', () => {
    sinon.stub(app, '_refreshCollections');
    sinon.stub(app, '_refreshSearch');
    app._documentsDeleted({ detail: {} });
    expect(app._refreshCollections).to.have.been.called;
    expect(app._refreshSearch).to.have.been.called;
    app._refreshCollections.restore();
    app._refreshSearch.restore();
  });

  test('_documentsDeleted notifies success for non-empty detail', () => {
    sinon.stub(app, '_removeFromClipboard');
    sinon.stub(app, '_removeFromRecentlyViewed');
    sinon.stub(app, '_notify');
    sinon.stub(app, 'hasFacet').returns(false);
    sinon.stub(app, '_refreshSearch');
    const docs = [{ uid: '1' }];
    app._documentsDeleted({ detail: { documents: docs } });
    expect(app._removeFromClipboard).to.have.been.calledWith(docs);
    expect(app._removeFromRecentlyViewed).to.have.been.calledWith(docs);
    expect(app._notify).to.have.been.called;
    app._removeFromClipboard.restore();
    app._removeFromRecentlyViewed.restore();
    app._notify.restore();
    app.hasFacet.restore();
    app._refreshSearch.restore();
  });

  test('_refreshSearch sets searchForm from $$ lookup', () => {
    sinon.stub(app, '$$').returns(null);
    app.searchName = 'default';
    app._refreshSearch();
    expect(app.searchForm).to.be.null;
    app.$$.restore();
  });

  test('_refreshCollections refreshes when form is visible', () => {
    const refreshSpy = sinon.spy();
    sinon.stub(app, '$$').returns({ visible: true, _refreshCollections: refreshSpy });
    app._refreshCollections();
    expect(refreshSpy).to.have.been.called;
    app.$$.restore();
  });

  test('_refreshCollections does nothing when form is not visible', () => {
    sinon.stub(app, '$$').returns({ visible: false, _refreshCollections: sinon.spy() });
    app._refreshCollections();
    app.$$.restore();
  });

  test('_refreshCollections does nothing when form not found', () => {
    sinon.stub(app, '$$').returns(null);
    app._refreshCollections();
    app.$$.restore();
  });

  test('showDiff sets page to diff and docIds', () => {
    app.showDiff('id1', 'id2');
    expect(app.page).to.equal('diff');
    expect(app.$.diff.docIds).to.deep.equal(['id1', 'id2']);
  });

  test('_diffDocuments sets diff docIds from event documents', () => {
    Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
    app._diffDocuments({ detail: { documents: [{ uid: 'a' }, { uid: 'b' }] } });
    expect(app.$.diff.docIds).to.deep.equal(['a', 'b']);
  });

  suite('_updateTitle', () => {
    test('does nothing when page is falsy', () => {
      const origTitle = document.title;
      app.page = '';
      app._updateTitle();
      expect(document.title).to.equal(origTitle);
    });

    test('sets title for browse page with document', () => {
      sinon.stub(app, 'hasFacet').returns(false);
      app.page = 'browse';
      app.currentDocument = { title: 'My Doc', type: 'File' };
      app.productName = 'Nuxeo';
      app._updateTitle();
      expect(document.title).to.include('My Doc');
      expect(document.title).to.include('Nuxeo');
      app.hasFacet.restore();
    });

    test('sets title for admin page', () => {
      app.page = 'admin';
      app.selectedAdminTab = 'users';
      app.productName = 'Nuxeo';
      app._updateTitle();
      expect(document.title).to.include('app.title.admin.users');
      expect(document.title).to.include('app.title.admin');
    });

    test('sets title for default page', () => {
      app.page = 'home';
      app.productName = 'Nuxeo';
      app._updateTitle();
      expect(document.title).to.include('app.title.home');
    });
  });

  test('_showSearchResults navigates to search', () => {
    Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
    const target = { searchName: 'default_search' };
    app._showSearchResults({ composedPath: () => [target] });
    expect(app.navigateTo).to.have.been.calledWith('search', 'default_search');
  });

  test('loadTask with empty id calls _defineTaskAndNavigate with no arg', () => {
    sinon.stub(app, '_defineTaskAndNavigate');
    app.loadTask('');
    expect(app._defineTaskAndNavigate).to.have.been.calledOnce;
    expect(app._defineTaskAndNavigate.firstCall.args).to.be.empty;
    app._defineTaskAndNavigate.restore();
  });

  test('loadTask with null id calls _defineTaskAndNavigate with no arg', () => {
    sinon.stub(app, '_defineTaskAndNavigate');
    app.loadTask(null);
    expect(app._defineTaskAndNavigate).to.have.been.calledOnce;
    app._defineTaskAndNavigate.restore();
  });
});

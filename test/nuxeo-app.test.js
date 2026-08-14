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
    // nuxeo-app.ready() wires the inactivity timer, which fires an immediate keep-alive via
    // <nuxeo-resource id="keepAlive">.execute() DURING fixture creation — before any instance stub below
    // could be installed. Neutralize the keep-alive on the prototype BEFORE the fixture so the initial
    // arm never attempts a real request (WEBUI-1987: no real session keep-alive in tests). Auto-restored
    // by the global sinon teardown.
    sinon.stub(customElements.get('nuxeo-app').prototype, '_maybeKeepServerSessionAlive');
    app = await fixture(html`<nuxeo-app></nuxeo-app>`);
    sinon.stub(app, 'i18n').callsFake((key) => key);
    if (app.$ && app.$.userWorkspace) {
      sinon.stub(app.$.userWorkspace, 'execute').resolves({ path: '/user-workspace' });
    }
    if (app.$ && app.$.tasksProvider) {
      sinon.stub(app.$.tasksProvider, 'fetch').resolves({ resultsCount: 0 });
    }
    if (app.$ && app.$.keepAlive) {
      sinon.stub(app.$.keepAlive, 'execute').resolves({}); // WEBUI-1987: no real session keep-alive in tests
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

  test('_handleNarrowChange re-syncs drawerOpened on narrow → wide when drawer is visually wide', () => {
    app.sidebarWidth = '52px';
    app.drawerWidth = '350px';
    app.drawerOpened = false;
    app._handleNarrowChange(false);
    expect(app.drawerOpened).to.be.true;
  });

  test('_handleNarrowChange is a no-op on initial wide load (drawerWidth == sidebarWidth)', () => {
    app.sidebarWidth = '52px';
    app.drawerWidth = '52px';
    app.drawerOpened = false;
    app._handleNarrowChange(false);
    expect(app.drawerOpened).to.be.false;
  });

  test('_handleNarrowChange does not touch drawerOpened when already true on narrow → wide', () => {
    app.sidebarWidth = '52px';
    app.drawerWidth = '350px';
    app.drawerOpened = true;
    app._handleNarrowChange(false);
    expect(app.drawerOpened).to.be.true;
  });

  test('_updateDrawerResizeAria sets min max and now for screen readers', () => {
    app.sidebarWidth = '52px';
    app.drawerOpened = true;
    app.isNarrow = false;
    app._drawerOpenWidth = 400;
    sinon.stub(app, '_maxDrawerWidth').returns(700);
    app._updateDrawerResizeAria();
    expect(app._drawerResizeAriaMin).to.equal(app._minDrawerWidth());
    expect(app._drawerResizeAriaMax).to.equal(700);
    expect(app._drawerResizeAriaNow).to.equal(400);
    app._maxDrawerWidth.restore();
  });

  suite('drawer resize handle (RTL)', () => {
    test('ArrowLeft on handle increases drawer width when dir is rtl', async () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._isRTL = true;
      app.setAttribute('dir', 'rtl');
      app._drawerOpenWidth = 400;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      await flush();
      const handle = app.$.drawerResizeHandle;
      expect(handle.getAttribute('dir')).to.equal('rtl');
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
      expect(app._drawerOpenWidth).to.equal(416);
      app._maxDrawerWidth.restore();
    });

    test('ArrowRight on handle decreases drawer width when dir is rtl', async () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._isRTL = true;
      app.setAttribute('dir', 'rtl');
      app._drawerOpenWidth = 400;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      await flush();
      app.$.drawerResizeHandle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
      );
      expect(app._drawerOpenWidth).to.equal(384);
      app._maxDrawerWidth.restore();
    });
  });

  test('_computeDrawerResizeHidden hides the handle when the drawer is closed or layout is narrow', () => {
    expect(app._computeDrawerResizeHidden(false, false)).to.be.true;
    expect(app._computeDrawerResizeHidden(true, true)).to.be.true;
    expect(app._computeDrawerResizeHidden(false, true)).to.be.true;
    expect(app._computeDrawerResizeHidden(true, false)).to.be.false;
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

  suite('refresh', () => {
    test('refresh reloads search when page is search', () => {
      sinon.stub(app, '_refreshSearch');
      app.page = 'search';
      app.refresh();
      expect(app._refreshSearch).to.have.been.calledOnce;
      app._refreshSearch.restore();
    });

    test('refresh loads task when page is tasks', () => {
      sinon.stub(app, 'loadTask');
      app.page = 'tasks';
      app.currentTaskId = 'task-1';
      app.refresh();
      expect(app.loadTask).to.have.been.calledWith('task-1');
      app.loadTask.restore();
    });

    test('refresh reloads browse document when docId is set', () => {
      sinon.stub(app, 'load');
      app.page = 'browse';
      app.docId = 'doc-uid';
      app.docPath = '';
      app.docAction = 'view';
      app.refresh();
      expect(app.load).to.have.been.calledWith('browse', 'doc-uid', '', 'view');
      app.load.restore();
    });

    test('refresh navigates home when no document context', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      app.page = 'home';
      app.docId = '';
      app.docPath = '';
      app.refresh();
      expect(app.navigateTo).to.have.been.calledWith('home');
    });
  });

  suite('loadTask with id', () => {
    let navigateTo;

    setup(() => {
      navigateTo = sinon.stub(app, 'navigateTo');
    });

    teardown(() => {
      navigateTo.restore();
    });

    test('loadTask fetches task and navigates on success', async () => {
      const task = { id: 't1', name: 'Review' };
      sinon.stub(app.$.task, 'get').resolves(task);
      app.loadTask('t1');
      await flush();
      expect(app.currentTask).to.equal(task);
      expect(app.page).to.equal('tasks');
      app.$.task.get.restore();
    });

    test('loadTask navigates to tasks on 403', async () => {
      sinon.stub(app.$.task, 'get').rejects({ status: 403 });
      sinon.stub(app, '_fetchTaskCount');
      app.loadTask('t1');
      await flush();
      expect(navigateTo).to.have.been.calledWith('tasks');
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app._fetchTaskCount.restore();
    });

    test('loadTask shows error and resets loading on task fetch failure', async () => {
      sinon.stub(app.$.task, 'get').rejects({ status: 500, message: 'server error' });
      sinon.stub(app, 'showError');
      app.loading = true;
      app.loadTask('t1');
      await flush();
      expect(app.showError).to.have.been.calledWith(500, 'browse.error', 'server error');
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app.showError.restore();
    });

    test('_handleTaskLoadError resets loading on a null error without throwing', () => {
      sinon.stub(app, 'showError');
      app.loading = true;
      app._handleTaskLoadError(null);
      expect(app.loading).to.be.false;
      expect(app.showError).to.have.been.calledWith(undefined, 'browse.error', undefined);
      app.showError.restore();
    });

    test('loadTask redirects to next pending task when task is ended', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      const doc = {
        uid: 'doc-1',
        path: '/ws/file',
        contextParameters: { pendingTasks: [{ id: 'task-next' }] },
      };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').resolves(doc);
      app.loadTask('t1');
      await flush();
      expect(app._loadDocument).to.have.been.calledWith(
        { uid: 'doc-1', path: '/ws/file', page: 'browse' },
        { applyState: false },
      );
      expect(navigateTo).to.have.been.calledWith('tasks', 'task-next');
      app.$.task.get.restore();
      app._loadDocument.restore();
    });

    test('loadTask redirects to document when ended task has no pending follow-up', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      const doc = { uid: 'doc-1', path: '/ws/file', contextParameters: { pendingTasks: [] } };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      app.loadTask('t1');
      await flush();
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.have.been.calledWith(doc);
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app._loadDocument.restore();
      app.show.restore();
    });

    test('loadTask ended task without target document uses standard task navigation', async () => {
      const task = { id: 't1', state: 'ended', targetDocumentIds: [] };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument');
      sinon.stub(app, '_defineTaskAndNavigate');
      app.loadTask('t1');
      await flush();
      expect(app._loadDocument).to.not.have.been.called;
      expect(app._defineTaskAndNavigate).to.have.been.calledWith(task);
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app._loadDocument.restore();
      app._defineTaskAndNavigate.restore();
    });

    test('loadTask ended task does not call _defineTaskAndNavigate when redirecting', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      const doc = {
        uid: 'doc-1',
        path: '/ws/file',
        contextParameters: { pendingTasks: [{ id: 'task-next' }] },
      };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, '_defineTaskAndNavigate');
      app.loadTask('t1');
      await flush();
      expect(app._defineTaskAndNavigate).to.not.have.been.called;
      app.$.task.get.restore();
      app._loadDocument.restore();
      app._defineTaskAndNavigate.restore();
    });

    test('loadTask ended task navigates to tasks on document load 403', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').rejects({ status: 403 });
      sinon.stub(app, '_fetchTaskCount');
      app.loadTask('t1');
      await flush();
      expect(navigateTo).to.have.been.calledWith('tasks');
      expect(app._fetchTaskCount).to.have.been.called;
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app._loadDocument.restore();
      app._fetchTaskCount.restore();
    });

    test('loadTask ended task shows error on document load failure', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').rejects({ status: 500, message: 'server error' });
      sinon.stub(app, 'showError');
      app.loadTask('t1');
      await flush();
      expect(app.showError).to.have.been.calledWith(500, 'browse.error', 'server error');
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app._loadDocument.restore();
      app.showError.restore();
    });

    test('loadTask ended task with pending task missing id falls back to document browse', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      const doc = { uid: 'doc-1', path: '/ws/file', contextParameters: { pendingTasks: [{}] } };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      app.loadTask('t1');
      await flush();
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.have.been.calledWith(doc);
      expect(navigateTo).to.not.have.been.calledWith('tasks', sinon.match.any);
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app._loadDocument.restore();
      app.show.restore();
    });

    test('loadTask ended task skips pending tasks without id and navigates to next valid task', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      const doc = {
        uid: 'doc-1',
        path: '/ws/file',
        contextParameters: { pendingTasks: [{ name: 'orphan' }, { id: 'task-next' }] },
      };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').resolves(doc);
      app.loadTask('t1');
      await flush();
      expect(navigateTo).to.have.been.calledWith('tasks', 'task-next');
      app.$.task.get.restore();
      app._loadDocument.restore();
    });

    test('loadTask ended task with missing contextParameters falls back to document browse', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      const doc = { uid: 'doc-1', path: '/ws/file' };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      app.loadTask('t1');
      await flush();
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.have.been.calledWith(doc);
      app.$.task.get.restore();
      app._loadDocument.restore();
      app.show.restore();
    });

    test('loadTask ended task does not navigate when document reload returns no document', async () => {
      const targetDoc = { uid: 'doc-1', path: '/ws/file' };
      const task = { id: 't1', state: 'ended', targetDocumentIds: [targetDoc] };
      sinon.stub(app.$.task, 'get').resolves(task);
      sinon.stub(app, '_loadDocument').resolves(null);
      sinon.stub(app, 'show');
      app.loadTask('t1');
      await flush();
      expect(app.show).to.not.have.been.called;
      expect(navigateTo).to.not.have.been.called;
      expect(app.loading).to.be.false;
      app.$.task.get.restore();
      app._loadDocument.restore();
      app.show.restore();
    });
  });

  suite('drawer toggle', () => {
    test('_toggleDrawer opens drawer when a new tab is selected', () => {
      sinon.stub(app, '_openDrawer');
      app.drawerOpened = false;
      app._selected = '';
      app._toggleDrawer({ detail: { selected: 'tasks' } });
      expect(app._openDrawer).to.have.been.calledOnce;
      expect(app.selectedTab).to.equal('tasks');
      app._openDrawer.restore();
    });

    test('_toggleDrawer closes drawer when the same tab is selected again', (done) => {
      sinon.stub(app, '_closeDrawer');
      app._selected = 'tasks';
      app.drawerOpened = true;
      app._toggleDrawer({ detail: { selected: 'tasks' } });
      requestAnimationFrame(() => {
        expect(app._closeDrawer).to.have.been.calledOnce;
        app._closeDrawer.restore();
        done();
      });
    });

    test('_closeDrawer resets width and clears menu state', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.selectedTab = 'tasks';
      if (app.$.drawerMenu) {
        app.$.drawerMenu.setAttribute('opened', '');
      }
      app._closeDrawer();
      expect(app.drawerWidth).to.equal('52px');
      expect(app.drawerOpened).to.be.false;
      expect(app.selectedTab).to.equal('');
    });
  });

  suite('showDiff', () => {
    test('showDiff merges with existing docIds when context overlaps', () => {
      app.$.diff.docIds = ['a', 'b', 'c'];
      app.showDiff('a', 'b');
      expect(app.$.diff.docIds).to.deep.equal(['a', 'b', 'c']);
    });
  });

  suite('_updateTitle extended', () => {
    test('sets collections title for Collections document type', () => {
      app.page = 'browse';
      app.productName = 'Nuxeo';
      app.currentDocument = { title: 'My Coll', type: 'Collections' };
      sinon.stub(app, 'hasFacet').returns(false);
      app._updateTitle();
      expect(document.title).to.include('app.title.collections');
      app.hasFacet.restore();
    });

    test('sets favorites title for Favorites collection', () => {
      app.page = 'browse';
      app.productName = 'Nuxeo';
      app.currentDocument = { title: 'Fav', type: 'Favorites' };
      sinon.stub(app, 'hasFacet').withArgs(app.currentDocument, 'Collection').returns(true);
      app._updateTitle();
      expect(document.title).to.include('app.title.favorites');
      app.hasFacet.restore();
    });

    test('sets collection title for Collection facet documents', () => {
      app.page = 'browse';
      app.productName = 'Nuxeo';
      app.currentDocument = { title: 'Col', type: 'Collection' };
      sinon.stub(app, 'hasFacet').withArgs(app.currentDocument, 'Collection').returns(true);
      app._updateTitle();
      expect(document.title).to.include('app.title.collection');
      app.hasFacet.restore();
    });

    test('sets task title from currentTask workflow', () => {
      app.page = 'tasks';
      app.productName = 'Nuxeo';
      app.currentTask = { workflowModelName: 'wf', name: 'step' };
      app._updateTitle();
      expect(document.title).to.include('wf');
      expect(document.title).to.include('step');
    });
  });

  suite('keyboard shortcuts and wizards', () => {
    test('showHome prevents default and shows home page', () => {
      const preventDefault = sinon.spy();
      app.showHome({ detail: { keyboardEvent: { preventDefault } } });
      expect(preventDefault).to.have.been.called;
      expect(app.page).to.equal('home');
    });

    test('_focusMenu focuses the menu', () => {
      const preventDefault = sinon.spy();
      const focusSpy = sinon.spy(app.$.menu, 'focus');
      app._focusMenu({ detail: { keyboardEvent: { preventDefault } } });
      expect(preventDefault).to.have.been.called;
      expect(focusSpy).to.have.been.called;
      focusSpy.restore();
    });

    test('_showSuggester toggles suggester', () => {
      const preventDefault = sinon.spy();
      const toggleSpy = sinon.spy(app.$.suggester, 'toggle');
      app._showSuggester({ detail: { keyboardEvent: { preventDefault } } });
      expect(toggleSpy).to.have.been.called;
      toggleSpy.restore();
    });

    test('_showDocumentCreationWizard opens import with files', () => {
      const preventDefault = sinon.spy();
      const toggleSpy = sinon.spy(app.$.importPopup, 'toggleDialogImport');
      app._showDocumentCreationWizard({
        detail: { keyboardEvent: { preventDefault }, files: [{ name: 'a.pdf' }] },
      });
      expect(toggleSpy).to.have.been.calledWith([{ name: 'a.pdf' }]);
      toggleSpy.restore();
    });

    test('_showDocumentCreationWizard opens create dialog for a type', () => {
      const toggleSpy = sinon.spy(app.$.importPopup, 'toggleDialogCreate');
      app._showDocumentCreationWizard({ detail: { type: 'File' } });
      expect(toggleSpy).to.have.been.calledWith('File');
      toggleSpy.restore();
    });

    test('_showDocumentCreationWizard opens default import dialog', () => {
      const toggleSpy = sinon.spy(app.$.importPopup, 'toggleDialog');
      app._showDocumentCreationWizard({ detail: {} });
      expect(toggleSpy).to.have.been.called;
      toggleSpy.restore();
    });
  });

  suite('_navigate', () => {
    test('_navigate routes to document browse', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      const doc = { uid: 'd1' };
      app._navigate({ detail: { doc, docAction: 'view' } });
      expect(app.navigateTo).to.have.been.calledWith(doc, 'view');
    });

    test('_navigate opens tasks drawer when visible', () => {
      const selectTask = sinon.spy();
      sinon
        .stub(app, '$$')
        .withArgs('nuxeo-tasks-drawer')
        .returns({
          visible: true,
          $: { tasks: { selectTask } },
        });
      app._navigate({ detail: { task: { id: 't1' }, index: 0, params: {} } });
      expect(selectTask).to.have.been.called;
      app.$$.restore();
    });
  });

  suite('_loadDocument and load', () => {
    test('_loadDocument resolves document without updating UI when saved search', async () => {
      const doc = { uid: '1', facets: ['SavedSearch'], path: '/search' };
      sinon.stub(app.$.doc, 'get').resolves(doc);
      sinon.stub(app, '_redirectSavedSearch');
      const result = await app._loadDocument({ uid: '1', path: '/search' });
      expect(result).to.be.undefined;
      expect(app._routedSearch).to.equal(doc);
      app.$.doc.get.restore();
      app._redirectSavedSearch.restore();
    });

    test('load shows browse page after document loads', async () => {
      const doc = { uid: '1', path: '/p', facets: [], isVersion: true };
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      app.load('browse', '1', '/p', 'view');
      await Promise.resolve();
      expect(app.show).to.have.been.calledWith('browse');
      app._loadDocument.restore();
      app.show.restore();
    });

    test('load shows error when document fetch fails', async () => {
      sinon.stub(app, '_loadDocument').returns(Promise.reject({ status: 404, message: 'missing' }));
      sinon.stub(app, 'showError');
      app.load('browse', '1', '/p');
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(app.showError).to.have.been.calledOnce;
      expect(app.showError.firstCall.args[0]).to.equal(404);
      expect(app.showError.firstCall.args[2]).to.equal('missing');
      app._loadDocument.restore();
      app.showError.restore();
    });
  });

  suite('_refreshAndFetchTasks', () => {
    const workflowTaskProcessed = { type: 'workflowTaskProcessed' };
    const workflowStarted = { type: 'workflowStarted' };
    let navigateTo;

    setup(() => {
      navigateTo = sinon.stub(app, 'navigateTo');
    });

    teardown(() => {
      navigateTo.restore();
    });

    test('navigates to next pending task when document has pending tasks', async () => {
      const doc = {
        uid: '1',
        path: '/p',
        contextParameters: { pendingTasks: [{ id: 'task-next' }] },
      };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks(workflowTaskProcessed);
      await flush();
      expect(app._loadDocument).to.have.been.calledWith(doc, { applyState: false });
      expect(navigateTo).to.have.been.calledWith('tasks', 'task-next');
      expect(app._fetchTaskCount).to.have.been.called;
      app._loadDocument.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('navigates to document when no pending tasks remain', async () => {
      const doc = { uid: '1', path: '/p', contextParameters: { pendingTasks: [] } };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks(workflowTaskProcessed);
      await flush();
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.have.been.calledWith(doc);
      app._loadDocument.restore();
      app.show.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('shows browse without navigating on workflowStarted', async () => {
      const doc = {
        uid: '1',
        path: '/p',
        contextParameters: { pendingTasks: [{ id: 'task-next' }] },
      };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks(workflowStarted);
      await flush();
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.not.have.been.called;
      app._loadDocument.restore();
      app.show.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('shows browse without navigating on workflowAbandoned', async () => {
      const doc = {
        uid: '1',
        path: '/p',
        contextParameters: { pendingTasks: [{ id: 'task-next' }] },
      };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks({ type: 'workflowAbandoned' });
      await flush();
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.not.have.been.called;
      app._loadDocument.restore();
      app.show.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('refreshes document and shows browse when called without event', async () => {
      const doc = { uid: '1', path: '/p' };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks();
      await flush();
      expect(app._loadDocument).to.have.been.calledWith(doc);
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.not.have.been.called;
      expect(app._fetchTaskCount).to.have.been.called;
      app._loadDocument.restore();
      app.show.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('does not load document when currentDocument is missing', async () => {
      app.currentDocument = null;
      sinon.stub(app, '_loadDocument');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks();
      expect(app._loadDocument).to.not.have.been.called;
      expect(app._fetchTaskCount).to.have.been.called;
      expect(app._resetTaskSelection).to.have.been.called;
      app._loadDocument.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('shows browse when pending task has no id', async () => {
      const doc = { uid: '1', path: '/p', contextParameters: { pendingTasks: [{ name: 'orphan' }] } };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks(workflowTaskProcessed);
      await flush();
      expect(app.show).to.have.been.calledWith('browse');
      expect(navigateTo).to.have.been.calledWith(doc);
      expect(navigateTo).to.not.have.been.calledWith('tasks', sinon.match.any);
      app._loadDocument.restore();
      app.show.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('navigates to first pending task with id when earlier entries lack id', async () => {
      const doc = {
        uid: '1',
        path: '/p',
        contextParameters: { pendingTasks: [{ name: 'orphan' }, { id: 'task-next' }] },
      };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks(workflowTaskProcessed);
      await flush();
      expect(navigateTo).to.have.been.calledWith('tasks', 'task-next');
      app._loadDocument.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('does not call show when navigating to pending task', async () => {
      const doc = {
        uid: '1',
        path: '/p',
        contextParameters: { pendingTasks: [{ id: 'task-next' }] },
      };
      app.currentDocument = doc;
      sinon.stub(app, '_loadDocument').resolves(doc);
      sinon.stub(app, 'show');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks(workflowTaskProcessed);
      await flush();
      expect(app.show).to.not.have.been.called;
      expect(navigateTo).to.have.been.calledWith('tasks', 'task-next');
      app._loadDocument.restore();
      app.show.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('does not show browse when document reload returns no document', async () => {
      app.currentDocument = { uid: '1', path: '/p' };
      sinon.stub(app, '_loadDocument').resolves(null);
      sinon.stub(app, 'show');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app._refreshAndFetchTasks(workflowTaskProcessed);
      await flush();
      expect(app.show).to.not.have.been.called;
      expect(navigateTo).to.not.have.been.called;
      app._loadDocument.restore();
      app.show.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });
  });

  suite('_observeCurrentUser and clipboard', () => {
    test('_observeCurrentUser loads user workspace and task count', async () => {
      app.currentUser = { id: 'user-1', properties: {} };
      app._observeCurrentUser();
      await Promise.resolve();
      expect(app.userWorkspace).to.equal('/user-workspace');
      expect(app.$.tasksProvider.params).to.deep.equal({ userId: 'user-1' });
    });

    test('_onClipboardAction updates recents on Document.Move', () => {
      const update = sinon.spy();
      sinon.stub(app, '$$').withArgs('#recent').returns({ update });
      sinon.stub(app, 'fire');
      app._onClipboardAction({
        detail: { operation: 'Document.Move', documents: [{ uid: '1' }] },
      });
      expect(update).to.have.been.calledWith({ uid: '1' });
      app.$$.restore();
      app.fire.restore();
    });

    test('_workflowTaskProcess navigates to task', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      app._workflowTaskProcess({ detail: { task: { id: 'wf-1' } } });
      expect(app.navigateTo).to.have.been.calledWith('tasks', 'wf-1');
    });
  });

  suite('document lifecycle navigation', () => {
    test('_documentDeleted navigates to firstAccessibleAncestor on success', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      sinon.stub(app, '_toast');
      sinon.stub(app, '_removeFromClipboard');
      sinon.stub(app, '_removeFromRecentlyViewed');
      sinon.stub(app, 'hasFacet').returns(false);
      sinon.stub(app, '_refreshSearch');
      const doc = {
        uid: '1',
        contextParameters: { firstAccessibleAncestor: { uid: 'parent' } },
      };
      app._documentDeleted({ detail: { doc, error: false } });
      expect(app.navigateTo).to.have.been.called;
      app._toast.restore();
      app._removeFromClipboard.restore();
      app._removeFromRecentlyViewed.restore();
      app.hasFacet.restore();
      app._refreshSearch.restore();
    });

    test('_documentUntrashed navigates to restored document', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      sinon.stub(app, '_toast');
      sinon.stub(app, 'hasFacet').returns(false);
      sinon.stub(app, '_refreshSearch');
      const doc = { uid: '1' };
      app._documentUntrashed({ detail: { doc, error: false } });
      expect(app.navigateTo).to.have.been.called;
      app._toast.restore();
      app.hasFacet.restore();
      app._refreshSearch.restore();
    });
  });

  suite('ready accessibility hooks', () => {
    test('Tab keydown adds user-is-tabbing on main content', () => {
      const main = app.$.mainContent;
      if (!main) {
        return;
      }
      main.classList.remove('user-is-tabbing');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(main.classList.contains('user-is-tabbing')).to.be.true;
    });

    test('mousedown removes user-is-tabbing from main content', () => {
      const main = app.$.mainContent;
      if (!main) {
        return;
      }
      main.classList.add('user-is-tabbing');
      window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      expect(main.classList.contains('user-is-tabbing')).to.be.false;
    });

    test('_resizeDuringAnimation dispatches resize until transitionend', async () => {
      const drawer = app.$.drawer;
      if (!drawer) {
        return;
      }
      const onResize = sinon.spy();
      globalThis.addEventListener('resize', onResize);
      try {
        app._resizeDuringAnimation();
        drawer.dispatchEvent(new Event('transitionend'));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        expect(onResize).to.have.been.called;
      } finally {
        globalThis.removeEventListener('resize', onResize);
      }
    });
  });

  suite('logo menu keyboard navigation', () => {
    test('ArrowDown on logo focuses first menu item', () => {
      const logo = app.$.logo;
      const menu = app.$.menu;
      if (!logo || !menu) {
        return;
      }
      const item = document.createElement('div');
      item.setAttribute('name', 'browse');
      const focusSpy = sinon.spy(item, 'focus');
      sinon.stub(menu, 'querySelector').returns(item);
      logo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(focusSpy).to.have.been.called;
      menu.querySelector.restore();
      focusSpy.restore();
    });
  });

  suite('ready listeners and snackbar', () => {
    test('drawer transitionrun triggers resize during animation', () => {
      const drawer = app.$.drawer;
      if (!drawer) {
        return;
      }
      sinon.stub(app, '_resizeDuringAnimation');
      drawer.dispatchEvent(new Event('transitionrun'));
      drawer.dispatchEvent(new Event('transitionstart'));
      expect(app._resizeDuringAnimation).to.have.been.calledTwice;
      app._resizeDuringAnimation.restore();
    });

    test('default toast opening listener applies snackbar layout hacks and mutes the label', () => {
      const { toast } = app.$;
      if (!toast) {
        return;
      }
      const label = { style: {}, setAttribute: sinon.spy() };
      Object.defineProperty(toast, 'mdcRoot', {
        configurable: true,
        value: {
          style: {},
          querySelector: sinon.stub().callsFake((sel) => (sel === '.mdc-snackbar__label' ? label : { style: {} })),
        },
      });
      toast.dispatchEvent(new Event('MDCSnackbar:opening'));
      expect(toast.mdcRoot.style.position).to.equal('relative');
      expect(label.setAttribute).to.have.been.calledWith('aria-hidden', 'true');
    });

    test('_muteSnackbarLabel does nothing while the label is not rendered', () => {
      expect(() => app._muteSnackbarLabel({})).to.not.throw();
      expect(() => app._muteSnackbarLabel({ mdcRoot: { querySelector: () => null } })).to.not.throw();
    });
  });

  suite('saved search routing', () => {
    test('_getSavedSearchForm returns null without routed search', () => {
      app._routedSearch = null;
      expect(app._getSavedSearchForm()).to.be.null;
    });

    test('_redirectSavedSearch navigates and loads saved search', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      app._routedSearch = { uid: 'saved-1', properties: { 'saved:providerName': 'default' } };
      const loadSaved = sinon.spy();
      const form = {
        getAttribute: sinon.stub().callsFake((attr) => (attr === 'search-name' ? 'default_search' : null)),
        _loadSavedSearch: loadSaved,
      };
      sinon.stub(app, '_getSavedSearchForm').returns(form);
      sinon.stub(app, '_updateSearch');
      app.searchName = 'default_search';
      app._searchOnLoad = false;
      app._redirectSavedSearch();
      expect(app.navigateTo).to.have.been.calledWith('search', 'default_search');
      expect(loadSaved).to.have.been.calledWith('saved-1');
      app._getSavedSearchForm.restore();
      app._updateSearch.restore();
    });

    test('_loadSavedSearch loads when form matches search name', () => {
      app._routedSearch = { uid: 'saved-2' };
      const loadSaved = sinon.spy();
      const form = {
        getAttribute: sinon.stub().callsFake((attr) => (attr === 'search-name' ? 'my-search' : null)),
        _loadSavedSearch: loadSaved,
      };
      sinon.stub(app, '_getSavedSearchForm').returns(form);
      sinon.stub(app, '_updateSearch');
      app.searchName = 'my-search';
      app._loadSavedSearch();
      expect(loadSaved).to.have.been.calledWith('saved-2');
      expect(app._routedSearch).to.be.null;
      app._getSavedSearchForm.restore();
      app._updateSearch.restore();
    });
  });

  suite('_loadDocument browse path', () => {
    test('loads document and assigns currentDocument via set', async () => {
      const doc = {
        uid: 'doc-1',
        path: '/default-domain/workspaces/folder/doc',
        facets: [],
        isVersion: false,
        contextParameters: { breadcrumb: { entries: [{}, { uid: 'parent' }] } },
      };
      sinon.stub(app, 'set');
      sinon.stub(app, 'hasFacet').withArgs(doc, 'Folderish').returns(false);
      sinon.stub(app.$.doc, 'get').resolves(doc);
      const result = await app._loadDocument({ uid: 'doc-1', path: '/p' });
      expect(result).to.equal(doc);
      expect(app.set).to.have.been.calledWith('currentDocument', doc);
      expect(app.docPath).to.equal(doc.path);
      app.set.restore();
      app.hasFacet.restore();
      app.$.doc.get.restore();
    });

    test('load ignores AbortError', async () => {
      sinon.stub(app, '_loadDocument').returns(Promise.reject({ name: 'AbortError' }));
      sinon.stub(app, 'showError');
      app.load('browse', '1', '/p');
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(app.showError).to.not.have.been.called;
      app._loadDocument.restore();
      app.showError.restore();
    });
  });

  suite('_navigate and search refresh', () => {
    test('_navigate displays collection members when from collection', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      const displayMembers = sinon.spy();
      sinon.stub(app, '$$').withArgs('#collectionsForm').returns({ displayMembers });
      const doc = { uid: 'd1' };
      app._navigate({ detail: { doc, docAction: 'view', isFromCollection: true, srcDoc: {}, index: 0 } });
      expect(displayMembers).to.have.been.called;
      app.$$.restore();
    });

    test('_updateSearch redirects when not loading search on startup', () => {
      sinon.stub(app, '_redirectSavedSearch');
      sinon.stub(app, '$$').returns(null);
      app._searchOnLoad = false;
      app._updateSearch();
      expect(app._redirectSavedSearch).to.have.been.called;
      app._redirectSavedSearch.restore();
      app.$$.restore();
    });

    test('_updateCollectionMenu loads collection on menu event', () => {
      const loadCollection = sinon.spy();
      sinon.stub(app, '$$').withArgs('#collectionsForm').returns({ loadCollection });
      app._updateCollectionMenu({ detail: { collection: { uid: 'c1' } } });
      expect(loadCollection).to.have.been.calledWith({ uid: 'c1' });
      app.$$.restore();
    });
  });

  suite('_openDrawer overlay mode', () => {
    test('_openDrawer calls openDrawer on narrow drawer panel', () => {
      app.sidebarWidth = '52px';
      const drawerPanel = app.$.drawerPanel;
      if (!drawerPanel || typeof drawerPanel.openDrawer !== 'function') {
        return;
      }
      drawerPanel.narrow = true;
      const openDrawer = sinon.spy(drawerPanel, 'openDrawer');
      const pages = app.$['drawer-pages'];
      if (pages) {
        sinon.stub(pages, 'select');
        Object.defineProperty(pages, 'selected', { get: () => 'activity', configurable: true });
      }
      app.selectedTab = 'activity';
      app._openDrawer();
      expect(openDrawer).to.have.been.called;
      openDrawer.restore();
      if (pages && pages.select.restore) {
        pages.select.restore();
      }
    });
  });

  suite('_refreshAndFetchTasks errors', () => {
    let navigateTo;

    setup(() => {
      navigateTo = sinon.stub(app, 'navigateTo');
    });

    teardown(() => {
      navigateTo.restore();
    });

    test('navigates to tasks on 403 when refreshing document', async () => {
      app.currentDocument = { uid: '1' };
      sinon
        .stub(app, '_loadDocument')
        .returns(Promise.reject({ 'entity-type': 'exception', status: 403, message: 'denied' }));
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: true, $: { tasks: { fetch: sinon.spy() } } });
      app._refreshAndFetchTasks();
      await flush();
      expect(navigateTo).to.have.been.calledWith('tasks');
      expect(app.loading).to.be.false;
      app._loadDocument.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('shows error on non-403 failure when refreshing document', async () => {
      app.currentDocument = { uid: '1' };
      sinon.stub(app, '_loadDocument').rejects({ status: 500, message: 'server error' });
      sinon.stub(app, 'showError');
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: false });
      app.loading = true;
      app._refreshAndFetchTasks();
      await flush();
      expect(app.showError).to.have.been.calledWith(500, 'browse.error', 'server error');
      expect(app.loading).to.be.false;
      app._loadDocument.restore();
      app.showError.restore();
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });
  });

  suite('document delete and notify', () => {
    test('_documentDeleted navigates via breadcrumb when ancestor missing', () => {
      sinon.stub(app, '_navigate');
      sinon.stub(app, '_toast');
      sinon.stub(app, '_removeFromClipboard');
      sinon.stub(app, '_removeFromRecentlyViewed');
      sinon.stub(app, 'hasFacet').returns(false);
      sinon.stub(app, '_refreshSearch');
      const doc = {
        uid: '1',
        contextParameters: {
          breadcrumb: { entries: [{ uid: 'a' }, { uid: 'parent' }] },
        },
      };
      app._documentDeleted({ detail: { doc, error: false } });
      expect(app._navigate).to.have.been.called;
      app._navigate.restore();
      app._toast.restore();
      app._removeFromClipboard.restore();
      app._removeFromRecentlyViewed.restore();
      app.hasFacet.restore();
      app._refreshSearch.restore();
    });

    test('_documentsDeleted shows 403 message in notify', () => {
      sinon.stub(app, '_notify');
      app._documentsDeleted({
        detail: {
          error: { response: { status: 403 } },
          documents: [{ uid: '1' }],
        },
      });
      expect(app._notify).to.have.been.calledOnce;
      expect(app._notify.firstCall.args[0].detail.message).to.include('error.403');
      app._notify.restore();
    });

    test('_documentsUntrashed refreshes collections for Collection facet', () => {
      sinon.stub(app, '_toast');
      sinon.stub(app, 'hasFacet').returns(true);
      sinon.stub(app, '_refreshCollections');
      sinon.stub(app, '_refreshSearch');
      app._documentsUntrashed({ detail: { documents: [{ uid: '1' }], error: false } });
      expect(app._refreshCollections).to.have.been.called;
      app._toast.restore();
      app.hasFacet.restore();
      app._refreshCollections.restore();
      app._refreshSearch.restore();
    });
  });

  suite('_notify and snackbars', () => {
    test('_getToastFor creates a command snackbar when missing', function () {
      if (!app.$.snackbarPanel) {
        this.skip();
      }
      sinon.stub(app.$.snackbarPanel, 'querySelector').returns(null);
      const append = sinon.stub(app.$.snackbarPanel, 'appendChild');
      const toast = app._getToastFor('bulk-edit', { abort: sinon.spy() });
      expect(append).to.have.been.called;
      expect(toast.getAttribute('id')).to.equal('snack_bulkedit');
      app.$.snackbarPanel.querySelector.restore();
      append.restore();
    });

    test('_notify shows message on command toast', () => {
      const show = sinon.spy();
      const toast = {
        __state: {},
        open: false,
        close: sinon.spy(),
        show,
        querySelector: sinon.stub().returns({ hidden: false }),
      };
      sinon.stub(app, '_getToastFor').returns(toast);
      app._notify({
        detail: {
          commandId: 'cmd-1',
          message: 'Processing',
          abort: true,
          dismissible: true,
          duration: 4000,
        },
      });
      expect(show).to.have.been.called;
      expect(toast.labelText).to.equal('Processing');
      app._getToastFor.restore();
    });

    test('_notify closes toast when close flag is set', () => {
      const close = sinon.spy();
      const toast = { __state: {}, close, show: sinon.spy(), querySelector: sinon.stub().returns({}) };
      sinon.stub(app, '_getToastFor').returns(toast);
      app._notify({ detail: { commandId: 'cmd-2', close: true } });
      expect(close).to.have.been.called;
      app._getToastFor.restore();
    });
  });

  // WEBUI-1880: the snackbar's own live region is built inside a hidden subtree, so the app owns a
  // permanently visible live region and writes every toast message into it.
  suite('toast screen reader announcements', () => {
    function stubToast() {
      return {
        __state: {},
        open: false,
        close: sinon.spy(),
        show: sinon.spy(),
        querySelector: sinon.stub().returns({ hidden: false }),
      };
    }

    test('the live region lives in the document body, not in shadow DOM', () => {
      const announcer = app._getAnnouncer();
      expect(announcer.parentNode).to.equal(document.body);
      expect(announcer.getAttribute('role')).to.equal('status');
      expect(announcer.getAttribute('aria-live')).to.equal('polite');
      expect(announcer.getAttribute('aria-atomic')).to.equal('true');
    });

    test('_getAnnouncer reuses the single shared live region', () => {
      expect(app._getAnnouncer()).to.equal(app._getAnnouncer());
      expect(document.querySelectorAll('#nuxeo-toast-announcer')).to.have.lengthOf(1);
    });

    test('_announce fills the live region after the aria delay', async () => {
      const clock = sinon.useFakeTimers();
      try {
        app._announce('CSV export is ready');
        expect(app._getAnnouncer().textContent).to.equal('');
        await clock.tickAsync(150);
        expect(app._getAnnouncer().textContent).to.equal('CSV export is ready');
      } finally {
        clock.restore();
      }
    });

    test('_announce clears the region first so an identical message is announced again', async () => {
      const clock = sinon.useFakeTimers();
      try {
        app._announce('CSV export is ready');
        await clock.tickAsync(650);
        app._announce('CSV export is ready');
        expect(app._getAnnouncer().textContent).to.equal('');
        await clock.tickAsync(150);
        expect(app._getAnnouncer().textContent).to.equal('CSV export is ready');
      } finally {
        clock.restore();
      }
    });

    // WEBUI-1880: finishing a CSV export notifies twice in the same tick, once from
    // nuxeo-csv-export-button and once from nuxeo-operation-button. Neither may silence the other.
    test('_announce speaks both messages when two arrive in the same tick', async () => {
      const clock = sinon.useFakeTimers();
      try {
        app._announce('CSV export is ready');
        app._announce('Export CSV: completed successfully');
        await clock.tickAsync(150);
        expect(app._getAnnouncer().textContent).to.equal('CSV export is ready');
        await clock.tickAsync(500);
        expect(app._getAnnouncer().textContent).to.equal('');
        await clock.tickAsync(150);
        expect(app._getAnnouncer().textContent).to.equal('Export CSV: completed successfully');
      } finally {
        clock.restore();
      }
    });

    test('_announce skips a duplicate of the message being announced', () => {
      const clock = sinon.useFakeTimers();
      try {
        app._announce('CSV export is running');
        app._announce('CSV export is running');
        expect(app._announceQueue).to.have.lengthOf(0);
      } finally {
        clock.restore();
      }
    });

    // The dedupe window must not outlive the clear phase. Once the text has landed in the region the
    // message has been spoken, so an identical toast arriving later is a new event, not a replay.
    test('_announce speaks a repeat that arrives after the message was spoken', async () => {
      const clock = sinon.useFakeTimers();
      try {
        app._announce('CSV export is ready');
        await clock.tickAsync(200); // past the aria delay, still inside the spacing window
        expect(app._getAnnouncer().textContent).to.equal('CSV export is ready');
        app._announce('CSV export is ready');
        expect(app._announceQueue).to.deep.equal(['CSV export is ready']);
        await clock.tickAsync(450); // spacing ends, the repeat is pumped and the region cleared
        expect(app._getAnnouncer().textContent).to.equal('');
        await clock.tickAsync(150);
        expect(app._getAnnouncer().textContent).to.equal('CSV export is ready');
      } finally {
        clock.restore();
      }
    });

    test('_announce caps the backlog and keeps the newest messages', () => {
      const clock = sinon.useFakeTimers();
      try {
        ['a', 'b', 'c', 'd', 'e'].forEach((m) => app._announce(m));
        // 'a' is being announced already; 'b' is dropped so the three newest survive
        expect(app._announceQueue).to.deep.equal(['c', 'd', 'e']);
      } finally {
        clock.restore();
      }
    });

    test('_announce ignores an empty message', async () => {
      const clock = sinon.useFakeTimers();
      try {
        app._getAnnouncer().textContent = 'previous';
        app._announce('');
        app._announce(undefined);
        await clock.tickAsync(150);
        expect(app._getAnnouncer().textContent).to.equal('previous');
      } finally {
        clock.restore();
      }
    });

    test('_notify announces the toast message', () => {
      sinon.stub(app, '_getToastFor').returns(stubToast());
      sinon.stub(app, '_announce');
      app._notify({ detail: { commandId: 'cmd-3', message: 'CSV export is ready' } });
      expect(app._announce).to.have.been.calledWith('CSV export is ready');
      app._announce.restore();
      app._getToastFor.restore();
    });

    test('_notify does not announce when the event carries no message', () => {
      sinon.stub(app, '_getToastFor').returns(stubToast());
      sinon.stub(app, '_announce');
      app._notify({ detail: { commandId: 'cmd-4', close: true } });
      expect(app._announce).to.not.have.been.called;
      app._announce.restore();
      app._getToastFor.restore();
    });

    test('detached cancels a pending announcement', async () => {
      const clock = sinon.useFakeTimers();
      try {
        app._announce('CSV export is ready');
        app.detached();
        await clock.tickAsync(150);
        expect(app._getAnnouncer().textContent).to.equal('');
      } finally {
        clock.restore();
      }
    });
  });

  suite('accessibility and menu keyboard', () => {
    test('skipLinkEvent focuses main content on Enter', () => {
      const { skipLink, mainContent } = app.$;
      if (!skipLink || !mainContent) {
        return;
      }
      const focusSpy = sinon.spy(mainContent, 'focus');
      const scrollSpy = sinon.spy(mainContent, 'scrollIntoView');
      skipLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(focusSpy).to.have.been.called;
      expect(scrollSpy).to.have.been.called;
      focusSpy.restore();
      scrollSpy.restore();
    });

    // Capture the first-Tab keydown handler that skipLinkEvent registers on document,
    // so it can be exercised in isolation without dispatching real events on the shared
    // document (where stale listeners from other fixtures would interfere).
    const captureFirstTabHandler = () => {
      let handler;
      const addEventListener = sinon.stub(document, 'addEventListener').callsFake((type, fn, opts) => {
        if (type === 'keydown' && !handler) {
          handler = fn;
        }
        return addEventListener.wrappedMethod.call(document, type, fn, opts);
      });
      app.skipLinkEvent();
      addEventListener.restore();
      return handler;
    };

    test('skipLinkEvent focuses the skip link on the first Tab after load', () => {
      const { skipLink } = app.$;
      if (!skipLink) {
        return;
      }
      const handleFirstTab = captureFirstTabHandler();
      const focusSpy = sinon.spy(skipLink, 'focus');
      const event = { key: 'Tab', defaultPrevented: false, preventDefault: sinon.spy() };
      handleFirstTab(event);
      expect(event.preventDefault).to.have.been.called;
      expect(focusSpy).to.have.been.calledWith({ preventScroll: true });
      // The handler deactivates after the first Tab: a second Tab is a no-op.
      const second = { key: 'Tab', defaultPrevented: false, preventDefault: sinon.spy() };
      handleFirstTab(second);
      expect(second.preventDefault).to.not.have.been.called;
      expect(focusSpy).to.have.been.calledOnce;
      focusSpy.restore();
    });

    test('skipLinkEvent keeps focus in the modal when the Tab was already handled', () => {
      const { skipLink } = app.$;
      if (!skipLink) {
        return;
      }
      const handleFirstTab = captureFirstTabHandler();
      const focusSpy = sinon.spy(skipLink, 'focus');
      // A capture-phase focus trap (e.g. nuxeo-dialog) already called preventDefault.
      const event = { key: 'Tab', defaultPrevented: true, preventDefault: sinon.spy() };
      handleFirstTab(event);
      expect(event.preventDefault).to.not.have.been.called;
      expect(focusSpy).to.not.have.been.called;
      // The first-tab state is consumed, so a later un-prevented Tab does not jump either.
      const next = { key: 'Tab', defaultPrevented: false, preventDefault: sinon.spy() };
      handleFirstTab(next);
      expect(next.preventDefault).to.not.have.been.called;
      expect(focusSpy).to.not.have.been.called;
      focusSpy.restore();
    });

    test('skipLinkEvent ignores keys other than Tab', () => {
      const { skipLink } = app.$;
      if (!skipLink) {
        return;
      }
      const handleFirstTab = captureFirstTabHandler();
      const focusSpy = sinon.spy(skipLink, 'focus');
      const event = { key: 'Enter', defaultPrevented: false, preventDefault: sinon.spy() };
      handleFirstTab(event);
      expect(event.preventDefault).to.not.have.been.called;
      expect(focusSpy).to.not.have.been.called;
      focusSpy.restore();
    });

    test('logoToMenuNavigation moves focus from last item to logo on ArrowDown', () => {
      const logo = app.$.logo;
      const menu = app.$.menu;
      if (!logo || !menu) {
        return;
      }
      app.logoToMenuNavigation();
      const first = document.createElement('div');
      const last = document.createElement('div');
      sinon.stub(menu, 'querySelectorAll').returns([first, last]);
      const focusSpy = sinon.spy(logo, 'focus');
      const evt = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      Object.defineProperty(evt, 'target', { value: last, configurable: true });
      menu.dispatchEvent(evt);
      expect(focusSpy).to.have.been.called;
      menu.querySelectorAll.restore();
      focusSpy.restore();
    });
  });

  suite('misc coverage', () => {
    test('_getSavedSearchForm finds provider form when routed search is set', () => {
      app._routedSearch = { properties: { 'saved:providerName': 'default' } };
      const form = document.createElement('div');
      sinon.stub(app, '$$').withArgs('nuxeo-search-form[provider="default"]').returns(form);
      expect(app._getSavedSearchForm()).to.equal(form);
      app.$$.restore();
    });

    test('_updateTitle uses selectedSearch title on search page', () => {
      app.page = 'search';
      app.productName = 'Nuxeo';
      Object.defineProperty(app, 'searchForm', {
        get: () => {
          return { selectedSearch: { title: 'My saved search' } };
        },
        configurable: true,
      });
      app._updateTitle();
      expect(document.title).to.include('My saved search');
    });

    test('_navigate goes to tasks route when tasks drawer is hidden', () => {
      Object.defineProperty(app, 'navigateTo', { value: sinon.stub(), configurable: true, writable: true });
      sinon.stub(app, '$$').withArgs('nuxeo-tasks-drawer').returns({ visible: false });
      app._navigate({ detail: { task: { id: 'task-99' } } });
      expect(app.navigateTo).to.have.been.calledWith('tasks', 'task-99');
      app.$$.restore();
    });

    test('_refreshCollections refreshes visible collections form', () => {
      const refresh = sinon.spy();
      sinon.stub(app, '$$').withArgs('#collectionsForm').returns({ visible: true, _refreshCollections: refresh });
      app._refreshCollections();
      expect(refresh).to.have.been.called;
      app.$$.restore();
    });

    test('_refreshAndFetchTasks fetches tasks when drawer is visible', async () => {
      const fetch = sinon.spy();
      app.currentDocument = null;
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_resetTaskSelection');
      sinon.stub(app, '$$').returns({ visible: true, $: { tasks: { fetch } } });
      app._refreshAndFetchTasks();
      expect(fetch).to.have.been.called;
      app._fetchTaskCount.restore();
      app._resetTaskSelection.restore();
      app.$$.restore();
    });

    test('_documentUntrashed navigates to restored document', () => {
      sinon.stub(app, '_navigate');
      sinon.stub(app, '_toast');
      sinon.stub(app, 'hasFacet').returns(false);
      sinon.stub(app, '_refreshSearch');
      const doc = { uid: '1' };
      app._documentUntrashed({ detail: { doc, error: false } });
      expect(app._navigate).to.have.been.calledWith({ detail: { doc } });
      app._navigate.restore();
      app._toast.restore();
      app.hasFacet.restore();
      app._refreshSearch.restore();
    });

    test('_documentsDeleted bulk path refreshes search and collections', () => {
      sinon.stub(app, '_fetchTaskCount');
      sinon.stub(app, '_refreshCollections');
      sinon.stub(app, '_refreshSearch');
      app._documentsDeleted({ detail: {} });
      expect(app._refreshCollections).to.have.been.called;
      app._fetchTaskCount.restore();
      app._refreshCollections.restore();
      app._refreshSearch.restore();
    });
  });

  suite('branch coverage gaps', () => {
    test('drawer transitionrun from a descendant does not start the resize loop', () => {
      const drawer = app.$.drawer;
      if (!drawer) {
        return;
      }
      const child = document.createElement('div');
      drawer.appendChild(child);
      sinon.stub(app, '_resizeDuringAnimation');
      try {
        child.dispatchEvent(new Event('transitionrun', { bubbles: true }));
        child.dispatchEvent(new Event('transitionstart', { bubbles: true }));
        expect(app._resizeDuringAnimation).to.not.have.been.called;
      } finally {
        app._resizeDuringAnimation.restore();
        child.remove();
      }
    });

    test('detached does not throw when _boundUpdateIsNarrow is not set', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const fresh = document.createElement('nuxeo-app');
      host.appendChild(fresh);
      try {
        fresh._boundUpdateIsNarrow = null;
        expect(() => host.removeChild(fresh)).to.not.throw();
      } finally {
        host.remove();
      }
    });

    test('_runLayoutNotify skips synthetic window.resize when includeWindowResize is false', () => {
      const onResize = sinon.spy();
      globalThis.addEventListener('resize', onResize);
      try {
        app._runLayoutNotify({ includeWindowResize: false });
        expect(onResize).to.not.have.been.called;
      } finally {
        globalThis.removeEventListener('resize', onResize);
      }
    });

    test('_handleNarrowChange on wide treats a non-parseable drawerWidth as 0', () => {
      app.sidebarWidth = '52px';
      app.drawerWidth = 'auto';
      app.drawerOpened = false;
      sinon.stub(app, '_notifyLayoutChanged');
      try {
        app._handleNarrowChange(false);
        expect(app.drawerOpened).to.be.false;
      } finally {
        app._notifyLayoutChanged.restore();
      }
    });

    // WEBUI-1987: attached() must only re-arm the inactivity timer after a real detach
    // (ready() already did the initial wiring), so the first attach is a no-op.
    test('attached re-arms the inactivity timer only after a real detach', () => {
      const setupTimer = sinon.stub(app, '_setupInactivityTimer');
      const setup401 = sinon.stub(app, '_setupUnauthorizedRedirect');
      try {
        app._inactivityNeedsRearm = false; // as after ready()'s initial wiring
        app.attached();
        expect(setupTimer).to.not.have.been.called; // first attach does not re-arm

        app.detached(); // a real detach arms the re-wire guard
        expect(app._inactivityNeedsRearm).to.be.true;

        app.attached(); // re-attach now re-arms exactly once
        expect(setupTimer).to.have.been.calledOnce;
        expect(setup401).to.have.been.called;
        expect(app._inactivityNeedsRearm).to.be.false;
      } finally {
        setupTimer.restore();
        setup401.restore();
      }
    });
  });
});

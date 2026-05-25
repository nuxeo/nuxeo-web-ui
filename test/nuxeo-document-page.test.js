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
import '../elements/document/nuxeo-document-page.js';

suite('nuxeo-document-page', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-page></nuxeo-document-page>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasCollections').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default to comments tab', () => {
      expect(element.selectedTab).to.equal('comments');
    });

    test('should default opened to false', () => {
      expect(element.opened).to.be.false;
    });
  });

  suite('_toggleOpened', () => {
    test('should toggle opened state from false to true', () => {
      element.opened = false;
      element._toggleOpened();
      expect(element.opened).to.be.true;
    });

    test('should toggle opened state from true to false', () => {
      element.opened = true;
      element._toggleOpened();
      expect(element.opened).to.be.false;
    });
  });

  suite('_isMutable', () => {
    test('should return true for a normal mutable document', () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.returns(false);
      element.isTrashed.returns(false);
      expect(element._isMutable(doc)).to.be.true;
    });

    test('should return false for an Immutable document', () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.withArgs(doc, 'Immutable').returns(true);
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should return false for a Root document', () => {
      const doc = { uid: '1', type: 'Root' };
      element.hasFacet.returns(false);
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should return false for a trashed document', () => {
      const doc = { uid: '1', type: 'File' };
      element.isTrashed.returns(true);
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should throw for null document', () => {
      expect(() => element._isMutable(null)).to.throw();
    });
  });

  suite('_hasCollections', () => {
    test('should delegate to hasCollections', () => {
      const doc = { uid: '1' };
      element.hasCollections.returns(true);
      expect(element._hasCollections(doc)).to.be.true;
    });
  });

  suite('_documentChanged', () => {
    test('should switch to activity tab when document has NuxeoEventListener facet', () => {
      const doc = { uid: '1' };
      element.hasFacet.withArgs(doc, 'NuxeoEventListener').returns(true);
      element._documentChanged(doc);
      expect(element.selectedTab).to.equal('activity');
    });

    test('should switch to activity tab for non-Commentable documents', () => {
      const doc = { uid: '1' };
      element.hasFacet.returns(false);
      element._documentChanged(doc);
      expect(element.selectedTab).to.equal('activity');
    });
  });

  suite('side pane resize', () => {
    teardown(() => {
      try {
        window.localStorage.removeItem('nuxeo.documentPage.sidePaneWidth');
      } catch (_e) {
        // ignore
      }
    });

    test('_clampSideWidth keeps value within min/max bounds', () => {
      expect(element._clampSideWidth(50)).to.equal(element._minSideWidth());
      expect(element._clampSideWidth(99999)).to.equal(element._maxSideWidth());
      const mid = element._minSideWidth() + 20;
      expect(element._clampSideWidth(mid)).to.equal(mid);
    });

    test('_minSideWidth has a sensible default', () => {
      expect(element._minSideWidth()).to.be.at.least(200);
    });

    test('setting sideWidth reflects to attribute and css variable', () => {
      element.sideWidth = 420;
      expect(element.getAttribute('side-width')).to.equal('420');
      expect(element.style.getPropertyValue('--nuxeo-side-pane-width')).to.equal('420px');
    });

    test('sideWidth null clears side-width via reflectToAttribute only', () => {
      element.sideWidth = 420;
      element.sideWidth = null;
      expect(element.hasAttribute('side-width')).to.be.false;
      expect(element.style.getPropertyValue('--nuxeo-side-pane-width')).to.equal('');
    });

    test('_updateSideResizeAria sets min max and now for screen readers', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.sideWidth = 400;
      sinon.stub(element, '_maxSideWidth').returns(800);
      element._updateSideResizeAria();
      expect(element._sideResizeAriaMin).to.equal(element._minSideWidth());
      expect(element._sideResizeAriaMax).to.equal(800);
      expect(element._sideResizeAriaNow).to.equal(400);
      element._isNarrowViewport.restore();
      element._maxSideWidth.restore();
    });

    test('clearing sideWidth removes css variable', () => {
      element.sideWidth = 420;
      element.sideWidth = null;
      expect(element.style.getPropertyValue('--nuxeo-side-pane-width')).to.equal('');
    });

    test('_persistSideWidth writes to localStorage', () => {
      element._persistSideWidth(420);
      expect(window.localStorage.getItem('nuxeo.documentPage.sidePaneWidth')).to.equal('420');
    });

    test('_persistSideWidth(null) removes the localStorage entry', () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '500');
      element._persistSideWidth(null);
      expect(window.localStorage.getItem('nuxeo.documentPage.sidePaneWidth')).to.be.null;
    });

    test('_loadStoredSideWidth reads stored integer', () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '420');
      expect(element._loadStoredSideWidth()).to.equal(420);
    });

    test('_loadStoredSideWidth returns null when value is missing or invalid', () => {
      window.localStorage.removeItem('nuxeo.documentPage.sidePaneWidth');
      expect(element._loadStoredSideWidth()).to.be.null;
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', 'not-a-number');
      expect(element._loadStoredSideWidth()).to.be.null;
    });

    test('_resetSideWidth clears persisted value and updates property', () => {
      element.sideWidth = 500;
      element._persistSideWidth(500);
      element._resetSideWidth();
      expect(element.sideWidth).to.be.null;
      expect(window.localStorage.getItem('nuxeo.documentPage.sidePaneWidth')).to.be.null;
    });

    test('_onSideResizeKey ArrowLeft increases side width by 16px (LTR)', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_maxSideWidth').returns(800);
      element.sideWidth = 400;
      const evt = { key: 'ArrowLeft', shiftKey: false, preventDefault: sinon.spy() };
      element._onSideResizeKey(evt);
      expect(evt.preventDefault).to.have.been.called;
      expect(element.sideWidth).to.equal(416);
    });

    test('_onSideResizeKey ArrowRight decreases side width by 16px (LTR)', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_maxSideWidth').returns(800);
      element.sideWidth = 400;
      const evt = { key: 'ArrowRight', shiftKey: false, preventDefault: sinon.spy() };
      element._onSideResizeKey(evt);
      expect(element.sideWidth).to.equal(384);
    });

    test('_onSideResizeKey Shift+Arrow uses a larger 64px step', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_maxSideWidth').returns(800);
      element.sideWidth = 400;
      const evt = { key: 'ArrowLeft', shiftKey: true, preventDefault: sinon.spy() };
      element._onSideResizeKey(evt);
      expect(element.sideWidth).to.equal(464);
    });

    test('_onSideResizeKey Home/End jump to min/max', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.sideWidth = 400;
      element._onSideResizeKey({ key: 'Home', preventDefault: sinon.spy() });
      expect(element.sideWidth).to.equal(element._minSideWidth());
      element._onSideResizeKey({ key: 'End', preventDefault: sinon.spy() });
      expect(element.sideWidth).to.equal(element._maxSideWidth());
    });

    test('_onSideResizeKey Enter triggers _resetSideWidth', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_resetSideWidth');
      const evt = { key: 'Enter', preventDefault: sinon.spy() };
      element._onSideResizeKey(evt);
      expect(element._resetSideWidth).to.have.been.calledOnce;
    });

    test('_onSideResizeKey does nothing when not opened', () => {
      element.opened = false;
      element.sideWidth = 400;
      element._onSideResizeKey({ key: 'ArrowLeft', preventDefault: sinon.spy() });
      expect(element.sideWidth).to.equal(400);
    });

    test('_onSideResizeKey does nothing on narrow viewports', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(true);
      element.sideWidth = 400;
      element._onSideResizeKey({ key: 'ArrowLeft', preventDefault: sinon.spy() });
      expect(element.sideWidth).to.equal(400);
    });

    test('_onSideResizeKey ignores unrelated keys', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.sideWidth = 400;
      const evt = { key: 'a', preventDefault: sinon.spy() };
      element._onSideResizeKey(evt);
      expect(evt.preventDefault).to.not.have.been.called;
      expect(element.sideWidth).to.equal(400);
    });

    test('ready() applies a stored width when present', async () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '450');
      const fresh = await fixture(html`<nuxeo-document-page></nuxeo-document-page>`);
      expect(fresh.sideWidth).to.equal(450);
    });

    test('attached clamps stored side width on wide viewport', async () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '900');
      const matchMediaStub = sinon.stub(window, 'matchMedia').returns({ matches: false });
      const fresh = await fixture(html`<nuxeo-document-page></nuxeo-document-page>`);
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      expect(fresh.sideWidth).to.equal(fresh._clampSideWidth(900));
      matchMediaStub.restore();
    });

    test('attached keeps unclamped stored width on narrow viewport', async () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '900');
      const matchMediaStub = sinon.stub(window, 'matchMedia').returns({ matches: true });
      const fresh = await fixture(html`<nuxeo-document-page></nuxeo-document-page>`);
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      expect(fresh.sideWidth).to.equal(900);
      matchMediaStub.restore();
    });

    test('detached removes window resize listener', () => {
      const handler = element._onWindowResize;
      expect(handler).to.be.a('function');
      const removeSpy = sinon.spy(window, 'removeEventListener');
      element.detached();
      expect(removeSpy).to.have.been.calledWith('resize', handler);
      removeSpy.restore();
    });

    test('_reclampSideWidth updates sideWidth when clamp changes', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.sideWidth = 99999;
      const max = element._maxSideWidth();
      element._reclampSideWidth();
      expect(element.sideWidth).to.equal(max);
    });

    test('_reclampSideWidth is a no-op when sideWidth is null', () => {
      element.sideWidth = null;
      element._reclampSideWidth();
      expect(element.sideWidth).to.be.null;
    });

    test('_reclampSideWidth restores persisted width after in-memory shrink on zoom', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '500');
      element.sideWidth = 280;
      sinon.stub(element, '_maxSideWidth').returns(600);
      element._reclampSideWidth();
      expect(element.sideWidth).to.equal(500);
      element._maxSideWidth.restore();
      element._isNarrowViewport.restore();
    });

    test('_scheduleViewportReclamp reclamps and fires nuxeo-layout-updated on the next frame', async () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.sideWidth = 600;
      const reclampSpy = sinon.spy(element, '_reclampSideWidth');
      const onLayoutUpdated = sinon.spy();
      element.addEventListener('nuxeo-layout-updated', onLayoutUpdated);
      try {
        element._scheduleViewportReclamp();
        expect(reclampSpy).to.not.have.been.called;
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
        expect(reclampSpy).to.have.been.calledOnce;
        expect(onLayoutUpdated).to.have.been.calledOnce;
      } finally {
        reclampSpy.restore();
        element._isNarrowViewport.restore();
      }
    });

    test('_onSideResizeStart drag updates width and persists', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.setAttribute('dir', 'ltr');
      element.sideWidth = 400;
      sinon.stub(element, '_maxSideWidth').returns(800);
      const evt = { clientX: 200, preventDefault: sinon.spy(), stopPropagation: sinon.spy() };
      element._onSideResizeStart(evt);
      expect(element.hasAttribute('side-resizing')).to.be.true;
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 180 }));
      window.dispatchEvent(new MouseEvent('mouseup'));
      expect(element.sideWidth).to.equal(420);
      expect(window.localStorage.getItem('nuxeo.documentPage.sidePaneWidth')).to.equal('420');
      element._maxSideWidth.restore();
    });

    test('_onSideResizeStart dispatches nuxeo-shrink-drawer when growing past max', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.setAttribute('dir', 'ltr');
      const max = element._maxSideWidth();
      element.sideWidth = max;
      const shrinkSpy = sinon.spy();
      element.addEventListener('nuxeo-shrink-drawer', shrinkSpy);
      const evt = { clientX: 500, preventDefault: sinon.spy(), stopPropagation: sinon.spy() };
      element._onSideResizeStart(evt);
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));
      window.dispatchEvent(new MouseEvent('mouseup'));
      expect(shrinkSpy).to.have.been.called;
      expect(shrinkSpy.firstCall.args[0].detail.amount).to.be.at.least(1);
    });

    test('_onSideResizeKey dispatches nuxeo-shrink-drawer when growth exceeds max', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.setAttribute('dir', 'ltr');
      const max = 400;
      sinon.stub(element, '_maxSideWidth').returns(max);
      element.sideWidth = max - 10;
      const shrinkSpy = sinon.spy();
      element.addEventListener('nuxeo-shrink-drawer', shrinkSpy);
      element._onSideResizeKey({ key: 'ArrowLeft', shiftKey: false, preventDefault: sinon.spy() });
      expect(shrinkSpy).to.have.been.called;
      element._maxSideWidth.restore();
    });

    test('_onSideResizeKey Space triggers _resetSideWidth', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_resetSideWidth');
      element._onSideResizeKey({ key: ' ', preventDefault: sinon.spy() });
      expect(element._resetSideWidth).to.have.been.calledOnce;
      element._resetSideWidth.restore();
    });

    test('_loadStoredSideWidth returns null when localStorage throws', () => {
      const getItem = sinon.stub(window.localStorage, 'getItem').throws(new Error('denied'));
      expect(element._loadStoredSideWidth()).to.be.null;
      getItem.restore();
    });
  });

  test('_documentChanged selects comments tab when document is Commentable', () => {
    const doc = { uid: '1' };
    element.hasFacet.withArgs(doc, 'Commentable').returns(true);
    element._documentChanged(doc);
    expect(element.selectedTab).to.equal('comments');
  });

  test('_openedChanged dispatches a bubbling resize event', (done) => {
    element.addEventListener('resize', (e) => {
      expect(e.bubbles).to.be.true;
      done();
    });
    element._openedChanged();
  });
});

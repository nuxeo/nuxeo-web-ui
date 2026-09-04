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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
import {
  RESIZE_HANDLE_KEY_STEP_PX,
  resizeDeltaForKey,
  resizeDeltaFromPointer,
} from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-resize-handle.js';
import '../elements/document/nuxeo-document-page.js';

/** Stub `window.matchMedia` for iron-media-query / breakpoint listeners in fixtures. */
function createMatchMediaStub(matches) {
  return sinon.stub(window, 'matchMedia').callsFake((query) => {
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  });
}

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

    test('_onSideResizeStep ArrowLeft increases side width by 16px (LTR)', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_maxSideWidth').returns(800);
      element.sideWidth = 400;
      element._onSideResizeStep({ detail: { delta: 16 } });
      expect(element.sideWidth).to.equal(416);
    });

    test('_onSideResizeStep ArrowRight decreases side width by 16px (LTR)', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_maxSideWidth').returns(800);
      element.sideWidth = 400;
      element._onSideResizeStep({ detail: { delta: -16 } });
      expect(element.sideWidth).to.equal(384);
    });

    test('_onSideResizeStep Shift+Arrow uses a larger 64px step', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_maxSideWidth').returns(800);
      element.sideWidth = 400;
      element._onSideResizeStep({ detail: { delta: 64 } });
      expect(element.sideWidth).to.equal(464);
    });

    test('_onSideResizeBound Home/End jump to min/max', () => {
      element.opened = true;
      element.setAttribute('dir', 'ltr');
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.sideWidth = 400;
      element._onSideResizeBound({ detail: { bound: 'min' } });
      expect(element.sideWidth).to.equal(element._minSideWidth());
      element._onSideResizeBound({ detail: { bound: 'max' } });
      expect(element.sideWidth).to.equal(element._maxSideWidth());
    });

    test('_onSideResizeReset triggers _resetSideWidth', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_resetSideWidth');
      element._onSideResizeReset();
      expect(element._resetSideWidth).to.have.been.calledOnce;
    });

    test('_onSideResizeStep does nothing when not opened', () => {
      element.opened = false;
      element.sideWidth = 400;
      element._onSideResizeStep({ detail: { delta: 16 } });
      expect(element.sideWidth).to.equal(400);
    });

    test('_onSideResizeStep does nothing on narrow viewports', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(true);
      element.sideWidth = 400;
      element._onSideResizeStep({ detail: { delta: 16 } });
      expect(element.sideWidth).to.equal(400);
    });

    test('ready() applies a stored width when present', async () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '450');
      const fresh = await fixture(html`<nuxeo-document-page></nuxeo-document-page>`);
      expect(fresh.sideWidth).to.equal(450);
    });

    test('attached clamps stored side width on wide viewport', async () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '900');
      const matchMediaStub = createMatchMediaStub(false);
      const fresh = await fixture(html`<nuxeo-document-page></nuxeo-document-page>`);
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      expect(fresh.sideWidth).to.equal(fresh._clampSideWidth(900));
      matchMediaStub.restore();
    });

    test('attached keeps unclamped stored width on narrow viewport', async () => {
      window.localStorage.setItem('nuxeo.documentPage.sidePaneWidth', '900');
      const matchMediaStub = createMatchMediaStub(true);
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

    test('_scheduleViewportReclamp reclamps and fires nuxeo-layout-updated on the next frame', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.sideWidth = 600;
      const reclampSpy = sinon.spy(element, '_reclampSideWidth');
      const onLayoutUpdated = sinon.spy();
      element.addEventListener('nuxeo-layout-updated', onLayoutUpdated);
      let rafCallback;
      const rafStub = sinon.stub(window, 'requestAnimationFrame').callsFake((cb) => {
        rafCallback = cb;
        return 1;
      });
      try {
        element._scheduleViewportReclamp();
        expect(reclampSpy).to.not.have.been.called;
        expect(rafCallback).to.be.a('function');
        rafCallback();
        expect(reclampSpy).to.have.been.calledOnce;
        expect(onLayoutUpdated).to.have.been.calledOnce;
      } finally {
        rafStub.restore();
        reclampSpy.restore();
        element._isNarrowViewport.restore();
      }
    });

    test('_onSideResizeDrag updates width and persists', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.setAttribute('dir', 'ltr');
      element.sideWidth = 400;
      sinon.stub(element, '_maxSideWidth').returns(800);
      element._onSideResizeDragStart();
      expect(element.hasAttribute('side-resizing')).to.be.true;
      element._onSideResizeDrag({ detail: { deltaFromStart: 20 } });
      element._onSideResizeDragEnd();
      expect(element.sideWidth).to.equal(420);
      expect(window.localStorage.getItem('nuxeo.documentPage.sidePaneWidth')).to.equal('420');
      element._maxSideWidth.restore();
    });

    test('_onSideResizeDrag dispatches nuxeo-shrink-drawer when growing past max', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.setAttribute('dir', 'ltr');
      const max = 400;
      sinon.stub(element, '_maxSideWidth').returns(max);
      element.sideWidth = max;
      const parent = element.parentNode;
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.appendChild(element);
      const hostSpy = sinon.spy();
      host.addEventListener('nuxeo-shrink-drawer', hostSpy);
      try {
        element._onSideResizeDragStart();
        element._onSideResizeDrag({ detail: { deltaFromStart: 50 } });
        element._onSideResizeDragEnd();
        expect(hostSpy).to.have.been.called;
        const shrinkEvent = hostSpy.firstCall.args[0];
        expect(shrinkEvent.bubbles).to.be.true;
        expect(shrinkEvent.composed).to.be.true;
        expect(shrinkEvent.detail.amount).to.be.at.least(1);
      } finally {
        host.removeEventListener('nuxeo-shrink-drawer', hostSpy);
        if (parent) {
          parent.appendChild(element);
        }
        host.remove();
        element._maxSideWidth.restore();
      }
    });

    test('nuxeo-shrink-drawer from drag reaches a shadow host when composed', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.setAttribute('dir', 'ltr');
      const max = 400;
      sinon.stub(element, '_maxSideWidth').returns(max);
      element.sideWidth = max;
      const parent = element.parentNode;
      const shadowHost = document.createElement('div');
      document.body.appendChild(shadowHost);
      shadowHost.attachShadow({ mode: 'open' }).appendChild(element);
      const hostSpy = sinon.spy();
      shadowHost.addEventListener('nuxeo-shrink-drawer', hostSpy);
      try {
        element._onSideResizeDragStart();
        element._onSideResizeDrag({ detail: { deltaFromStart: 50 } });
        element._onSideResizeDragEnd();
        expect(hostSpy).to.have.been.called;
        expect(hostSpy.firstCall.args[0].composed).to.be.true;
      } finally {
        shadowHost.removeEventListener('nuxeo-shrink-drawer', hostSpy);
        if (parent) {
          parent.appendChild(element);
        }
        shadowHost.remove();
        element._maxSideWidth.restore();
      }
    });

    test('_onSideResizeStep dispatches nuxeo-shrink-drawer when growth exceeds max', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      element.setAttribute('dir', 'ltr');
      const max = 400;
      sinon.stub(element, '_maxSideWidth').returns(max);
      element.sideWidth = max - 10;
      const parent = element.parentNode;
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.appendChild(element);
      const hostSpy = sinon.spy();
      host.addEventListener('nuxeo-shrink-drawer', hostSpy);
      try {
        element._onSideResizeStep({ detail: { delta: 16 } });
        expect(hostSpy).to.have.been.called;
        const shrinkEvent = hostSpy.firstCall.args[0];
        expect(shrinkEvent.bubbles).to.be.true;
        expect(shrinkEvent.composed).to.be.true;
        expect(shrinkEvent.detail.amount).to.be.at.least(1);
      } finally {
        host.removeEventListener('nuxeo-shrink-drawer', hostSpy);
        if (parent) {
          parent.appendChild(element);
        }
        host.remove();
        element._maxSideWidth.restore();
      }
    });

    test('_onSideResizeReset triggers _resetSideWidth', () => {
      element.opened = true;
      sinon.stub(element, '_isNarrowViewport').returns(false);
      sinon.stub(element, '_resetSideWidth');
      element._onSideResizeReset();
      expect(element._resetSideWidth).to.have.been.calledOnce;
      element._resetSideWidth.restore();
    });

    test('_loadStoredSideWidth returns null when localStorage throws', () => {
      const getItem = sinon.stub(globalThis.localStorage, 'getItem').throws(new Error('denied'));
      expect(element._loadStoredSideWidth()).to.be.null;
      getItem.restore();
    });

    test('_persistSideWidth does not throw when setItem throws', () => {
      const setItem = sinon.stub(globalThis.localStorage, 'setItem').throws(new Error('quota'));
      expect(() => element._persistSideWidth(420)).to.not.throw();
      setItem.restore();
    });

    test('_persistSideWidth(null) does not throw when removeItem throws', () => {
      const removeItem = sinon.stub(globalThis.localStorage, 'removeItem').throws(new Error('denied'));
      expect(() => element._persistSideWidth(null)).to.not.throw();
      removeItem.restore();
    });

    suite('RTL', () => {
      const prepareRtl = () => {
        element.opened = true;
        element.dir = 'rtl';
        element.setAttribute('dir', 'rtl');
        sinon.stub(element, '_isNarrowViewport').returns(false);
        sinon.stub(element, '_maxSideWidth').returns(800);
        element.sideWidth = 400;
      };

      const sideHandle = () => element.shadowRoot.querySelector('nuxeo-resize-handle');

      teardown(() => {
        if (element._isNarrowViewport?.restore) {
          element._isNarrowViewport.restore();
        }
        if (element._maxSideWidth?.restore) {
          element._maxSideWidth.restore();
        }
      });

      test('resizeDeltaForKey mirrors ArrowLeft/ArrowRight for start edge in rtl', () => {
        expect(resizeDeltaForKey('ArrowLeft', { edge: 'start', rtl: true })).to.equal(-RESIZE_HANDLE_KEY_STEP_PX);
        expect(resizeDeltaForKey('ArrowRight', { edge: 'start', rtl: true })).to.equal(RESIZE_HANDLE_KEY_STEP_PX);
      });

      test('ArrowRight on resize handle increases side width in rtl', async () => {
        prepareRtl();
        const handle = sideHandle();
        await flush();
        expect(handle.getAttribute('dir')).to.equal('rtl');
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
        expect(element.sideWidth).to.equal(416);
      });

      test('ArrowLeft on resize handle decreases side width in rtl', async () => {
        prepareRtl();
        const handle = sideHandle();
        await flush();
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
        expect(element.sideWidth).to.equal(384);
      });

      test('_onSideResizeDrag grows when pointer delta matches rtl start edge', () => {
        prepareRtl();
        // Mirrored from LTR grow (start 100, client 80): same physical move yields +20 in rtl.
        const delta = resizeDeltaFromPointer(80, 100, { edge: 'start', rtl: true });
        expect(delta).to.equal(20);
        element._onSideResizeDragStart();
        element._onSideResizeDrag({ detail: { deltaFromStart: delta } });
        element._onSideResizeDragEnd();
        expect(element.sideWidth).to.equal(420);
      });

      test('_onSideResizeDrag shrinks when pointer moves the opposite way in rtl', () => {
        prepareRtl();
        // Mirrored from LTR shrink (start 100, client 120).
        const delta = resizeDeltaFromPointer(120, 100, { edge: 'start', rtl: true });
        expect(delta).to.equal(-20);
        element._onSideResizeDragStart();
        element._onSideResizeDrag({ detail: { deltaFromStart: delta } });
        element._onSideResizeDragEnd();
        expect(element.sideWidth).to.equal(380);
      });

      test('_onSideResizeDrag dispatches nuxeo-shrink-drawer when growing past max in rtl', () => {
        prepareRtl();
        const max = 400;
        element._maxSideWidth.restore();
        sinon.stub(element, '_maxSideWidth').returns(max);
        element.sideWidth = max;
        const parent = element.parentNode;
        const host = document.createElement('div');
        document.body.appendChild(host);
        host.appendChild(element);
        const hostSpy = sinon.spy();
        host.addEventListener('nuxeo-shrink-drawer', hostSpy);
        try {
          const delta = resizeDeltaFromPointer(80, 100, { edge: 'start', rtl: true });
          expect(delta).to.equal(20);
          element._onSideResizeDragStart();
          element._onSideResizeDrag({ detail: { deltaFromStart: delta } });
          element._onSideResizeDragEnd();
          expect(hostSpy).to.have.been.called;
          expect(hostSpy.firstCall.args[0].detail.amount).to.be.at.least(1);
        } finally {
          host.removeEventListener('nuxeo-shrink-drawer', hostSpy);
          if (parent) {
            parent.appendChild(element);
          }
          host.remove();
          element._maxSideWidth.restore();
        }
      });

      test('_onSideResizeStep dispatches nuxeo-shrink-drawer when growth exceeds max in rtl', () => {
        prepareRtl();
        const max = 400;
        element._maxSideWidth.restore();
        sinon.stub(element, '_maxSideWidth').returns(max);
        element.sideWidth = max - 10;
        const parent = element.parentNode;
        const host = document.createElement('div');
        document.body.appendChild(host);
        host.appendChild(element);
        const hostSpy = sinon.spy();
        host.addEventListener('nuxeo-shrink-drawer', hostSpy);
        try {
          const delta = resizeDeltaForKey('ArrowRight', { edge: 'start', rtl: true });
          element._onSideResizeStep({ detail: { delta } });
          expect(hostSpy).to.have.been.called;
        } finally {
          host.removeEventListener('nuxeo-shrink-drawer', hostSpy);
          if (parent) {
            parent.appendChild(element);
          }
          host.remove();
          element._maxSideWidth.restore();
        }
      });
    });

    suite('branch coverage gaps', () => {
      test('_containerWidth falls back to host offsetWidth when .page has no width', () => {
        sinon.stub(element.shadowRoot, 'querySelector').withArgs('.page').returns({ offsetWidth: 0 });
        Object.defineProperty(element, 'offsetWidth', { configurable: true, get: () => 777 });
        try {
          expect(element._containerWidth()).to.equal(777);
        } finally {
          element.shadowRoot.querySelector.restore();
          delete element.offsetWidth;
        }
      });

      test('_containerWidth falls back to CONTAINER_WIDTH_FALLBACK_PX when nothing has width', () => {
        sinon.stub(element.shadowRoot, 'querySelector').withArgs('.page').returns(null);
        Object.defineProperty(element, 'offsetWidth', { configurable: true, get: () => 0 });
        try {
          expect(element._containerWidth()).to.equal(1024);
        } finally {
          element.shadowRoot.querySelector.restore();
          delete element.offsetWidth;
        }
      });

      test('_updateSideResizeAria uses .side offsetWidth when sideWidth is null', () => {
        element.opened = true;
        sinon.stub(element, '_isNarrowViewport').returns(false);
        sinon.stub(element.shadowRoot, 'querySelector').withArgs('.side').returns({ offsetWidth: 444 });
        element.sideWidth = null;
        try {
          element._updateSideResizeAria();
          expect(element._sideResizeAriaNow).to.equal(444);
        } finally {
          element._isNarrowViewport.restore();
          element.shadowRoot.querySelector.restore();
        }
      });

      test('_updateSideResizeAria uses SIDE_PANE_FALLBACK_PX when sideWidth and .side are missing', () => {
        element.opened = true;
        sinon.stub(element, '_isNarrowViewport').returns(false);
        sinon.stub(element.shadowRoot, 'querySelector').withArgs('.side').returns(null);
        element.sideWidth = null;
        try {
          element._updateSideResizeAria();
          expect(element._sideResizeAriaNow).to.equal(360);
        } finally {
          element._isNarrowViewport.restore();
          element.shadowRoot.querySelector.restore();
        }
      });

      test('_sideResizeCurrentWidth uses .side offsetWidth when sideWidth is null', () => {
        sinon.stub(element.shadowRoot, 'querySelector').withArgs('.side').returns({ offsetWidth: 333 });
        element.sideWidth = null;
        try {
          expect(element._sideResizeCurrentWidth()).to.equal(333);
        } finally {
          element.shadowRoot.querySelector.restore();
        }
      });

      test('_sideResizeCurrentWidth falls back to SIDE_PANE_FALLBACK_PX when nothing is set', () => {
        sinon.stub(element.shadowRoot, 'querySelector').withArgs('.side').returns(null);
        element.sideWidth = null;
        try {
          expect(element._sideResizeCurrentWidth()).to.equal(360);
        } finally {
          element.shadowRoot.querySelector.restore();
        }
      });

      test('_computeTargetSideWidth returns null when preference is NaN', () => {
        sinon.stub(element, '_loadStoredSideWidth').returns(NaN);
        element.sideWidth = null;
        try {
          expect(element._computeTargetSideWidth()).to.be.null;
        } finally {
          element._loadStoredSideWidth.restore();
        }
      });

      test('_reclampSideWidth in side-resizing mode returns early when sideWidth is null', () => {
        element.opened = true;
        sinon.stub(element, '_isNarrowViewport').returns(false);
        element.setAttribute('side-resizing', '');
        element.sideWidth = null;
        try {
          element._reclampSideWidth();
          expect(element.sideWidth).to.be.null;
        } finally {
          element._isNarrowViewport.restore();
          element.removeAttribute('side-resizing');
        }
      });

      test('_reclampSideWidth in side-resizing mode clamps an out-of-range sideWidth', () => {
        element.opened = true;
        sinon.stub(element, '_isNarrowViewport').returns(false);
        sinon.stub(element, '_maxSideWidth').returns(500);
        element.setAttribute('side-resizing', '');
        element.sideWidth = 99999;
        try {
          element._reclampSideWidth();
          expect(element.sideWidth).to.equal(500);
        } finally {
          element._isNarrowViewport.restore();
          element._maxSideWidth.restore();
          element.removeAttribute('side-resizing');
        }
      });

      test('_reclampSideWidth in side-resizing mode keeps an in-range sideWidth untouched', () => {
        element.opened = true;
        sinon.stub(element, '_isNarrowViewport').returns(false);
        sinon.stub(element, '_clampSideWidth').callsFake((px) => px);
        element.setAttribute('side-resizing', '');
        element.sideWidth = 400;
        try {
          element._reclampSideWidth();
          expect(element.sideWidth).to.equal(400);
        } finally {
          element._isNarrowViewport.restore();
          element._clampSideWidth.restore();
          element.removeAttribute('side-resizing');
        }
      });

      test('_reclampSideWidth is a no-op when _computeTargetSideWidth returns null', () => {
        element.opened = true;
        sinon.stub(element, '_isNarrowViewport').returns(false);
        sinon.stub(element, '_computeTargetSideWidth').returns(null);
        element.sideWidth = 400;
        try {
          element._reclampSideWidth();
          expect(element.sideWidth).to.equal(400);
        } finally {
          element._isNarrowViewport.restore();
          element._computeTargetSideWidth.restore();
        }
      });

      test('_persistSideWidth is a no-op when localStorage is unavailable', () => {
        const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => undefined });
        try {
          expect(() => element._persistSideWidth(420)).to.not.throw();
          expect(() => element._persistSideWidth(null)).to.not.throw();
        } finally {
          if (originalDescriptor) {
            Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
          }
        }
      });

      test('_onSideResizeBound is a no-op when not opened', () => {
        element.opened = false;
        element.sideWidth = 400;
        element._onSideResizeBound({ detail: { bound: 'min' } });
        expect(element.sideWidth).to.equal(400);
      });

      test('_onSideResizeReset is a no-op when not opened', () => {
        element.opened = false;
        const resetSpy = sinon.spy(element, '_resetSideWidth');
        try {
          element._onSideResizeReset();
          expect(resetSpy).to.not.have.been.called;
        } finally {
          resetSpy.restore();
        }
      });

      test('_onSideResizeDragStart is a no-op when not opened', () => {
        element.opened = false;
        element._onSideResizeDragStart();
        expect(element.hasAttribute('side-resizing')).to.be.false;
        expect(element._sideDragStartWidth).to.not.exist;
      });

      test('_onSideResizeDrag is a no-op when _sideDragStartWidth is null', () => {
        element.opened = true;
        sinon.stub(element, '_isNarrowViewport').returns(false);
        element.sideWidth = 400;
        element._sideDragStartWidth = null;
        try {
          element._onSideResizeDrag({ detail: { deltaFromStart: 50 } });
          expect(element.sideWidth).to.equal(400);
        } finally {
          element._isNarrowViewport.restore();
        }
      });

      test('_onSideResizeDragEnd does not persist when sideWidth is null', () => {
        element.sideWidth = null;
        const persistSpy = sinon.spy(element, '_persistSideWidth');
        try {
          element._onSideResizeDragEnd();
          expect(persistSpy).to.not.have.been.called;
          expect(element.hasAttribute('side-resizing')).to.be.false;
        } finally {
          persistSpy.restore();
        }
      });
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

  suite('tags section', () => {
    test('renders the tags widget with a visible label instead of a detached heading', async () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.withArgs(doc, 'NXTag').returns(true);
      element.document = doc;
      await flush();

      const tags = element.shadowRoot.querySelector('nuxeo-tag-suggestion');
      expect(tags).to.exist;
      expect(tags.label).to.equal(element.i18n('documentPage.tags'));
      expect(tags.label).to.not.be.empty;
      // the caption is now the widget's own label, not a heading detached from the field
      expect(tags.parentElement.querySelector('h5')).to.not.exist;
    });
  });
});

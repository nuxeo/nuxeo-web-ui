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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import {
  RESIZE_HANDLE_KEY_STEP_PX,
  resizeDeltaForKey,
  resizeDeltaFromPointer,
} from '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-resize-handle.js';
import '../elements/nuxeo-app.js';

suite('nuxeo-app-drawer-resize-behavior', () => {
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

  suite('drawer pane resize', () => {
    teardown(() => {
      try {
        globalThis.localStorage.removeItem('nuxeo.drawerWidth');
      } catch (_e) {
        // ignore
      }
    });

    test('_sidebarPx parses the css sidebar width', () => {
      app.sidebarWidth = '52px';
      expect(app._sidebarPx()).to.equal(52);
    });

    test('_sidebarPx defaults to 52 when sidebar width is invalid', () => {
      app.sidebarWidth = 'abc';
      expect(app._sidebarPx()).to.equal(52);
    });

    test('_minDrawerWidth is the natural open width on wide viewports', () => {
      app.sidebarWidth = '52px';
      expect(app._minDrawerWidth()).to.equal(350);
    });

    test('_minDrawerWidth can drop below natural open when the viewport is narrow', () => {
      app.sidebarWidth = '52px';
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        get: () => 560,
      });
      try {
        expect(app._minDrawerWidth()).to.equal(280);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, 'innerWidth', originalDescriptor);
        } else {
          delete window.innerWidth;
        }
      }
    });

    test('_maxDrawerWidth increases when the viewport grows (zoom out)', () => {
      app.sidebarWidth = '52px';
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      let innerWidth = 1200;
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        get: () => innerWidth,
      });
      try {
        const maxNarrow = app._maxDrawerWidth();
        innerWidth = 2000;
        const maxWide = app._maxDrawerWidth();
        expect(maxWide).to.be.above(maxNarrow);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, 'innerWidth', originalDescriptor);
        } else {
          delete window.innerWidth;
        }
      }
    });

    test('_maxDrawerWidth reserves main column space like the info pane', () => {
      app.sidebarWidth = '52px';
      const layoutWidth = app._drawerLayoutWidth();
      const expectedCap = Math.min(
        Math.floor(layoutWidth - app._minMainWidthForDrawer()),
        Math.floor(window.innerWidth * 0.5),
      );
      expect(app._maxDrawerWidth()).to.equal(Math.max(app._minDrawerWidth(), expectedCap));
    });

    test('_computeOpenDrawerWidth restores a wide preference after a simulated zoom-in clamp', () => {
      app.sidebarWidth = '52px';
      app._drawerOpenWidth = 700;
      const maxStub = sinon.stub(app, '_maxDrawerWidth');
      maxStub.onCall(0).returns(400);
      maxStub.onCall(1).returns(700);
      expect(app._computeOpenDrawerWidth()).to.equal(400);
      expect(app._computeOpenDrawerWidth()).to.equal(700);
      maxStub.restore();
    });

    test('_clampDrawerWidth keeps value within min/max', () => {
      app.sidebarWidth = '52px';
      expect(app._clampDrawerWidth(0)).to.equal(app._minDrawerWidth());
      expect(app._clampDrawerWidth(99999)).to.equal(app._maxDrawerWidth());
    });

    test('_loadStoredDrawerWidth reads stored value', () => {
      globalThis.localStorage.setItem('nuxeo.drawerWidth', '420');
      expect(app._loadStoredDrawerWidth()).to.equal(420);
    });

    test('_loadStoredDrawerWidth returns null when missing', () => {
      globalThis.localStorage.removeItem('nuxeo.drawerWidth');
      expect(app._loadStoredDrawerWidth()).to.be.null;
    });

    test('_loadStoredDrawerWidth returns null for non-numeric value', () => {
      globalThis.localStorage.setItem('nuxeo.drawerWidth', 'NaN');
      expect(app._loadStoredDrawerWidth()).to.be.null;
    });

    test('_persistDrawerWidth saves value to localStorage', () => {
      app._persistDrawerWidth(420);
      expect(globalThis.localStorage.getItem('nuxeo.drawerWidth')).to.equal('420');
    });

    test('_computeOpenDrawerWidth falls back to default when nothing persisted', () => {
      app._drawerOpenWidth = null;
      globalThis.localStorage.removeItem('nuxeo.drawerWidth');
      app.sidebarWidth = '52px';
      expect(app._computeOpenDrawerWidth()).to.equal(350);
    });

    test('_computeOpenDrawerWidth honors persisted preference within bounds', () => {
      app._drawerOpenWidth = null;
      app.sidebarWidth = '52px';
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      globalThis.localStorage.setItem('nuxeo.drawerWidth', '480');
      expect(app._computeOpenDrawerWidth()).to.equal(480);
      app._maxDrawerWidth.restore();
    });

    test('_computeOpenDrawerWidth clamps persisted preference that is too small', () => {
      app._drawerOpenWidth = null;
      globalThis.localStorage.setItem('nuxeo.drawerWidth', '50');
      app.sidebarWidth = '52px';
      expect(app._computeOpenDrawerWidth()).to.equal(app._minDrawerWidth());
    });

    test('_resetDrawerWidth clears persisted preference and restores default width', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app._drawerOpenWidth = 480;
      app._persistDrawerWidth(480);
      app._resetDrawerWidth();
      expect(app._drawerOpenWidth).to.be.null;
      expect(globalThis.localStorage.getItem('nuxeo.drawerWidth')).to.be.null;
      expect(app.drawerWidth).to.equal('350px');
    });

    test('_onDrawerResizeStep ArrowRight increases width by 16px (LTR)', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 350;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      app._onDrawerResizeStep({ detail: { delta: 16 } });
      expect(app._drawerOpenWidth).to.equal(366);
      expect(app.drawerWidth).to.equal('366px');
      app._maxDrawerWidth.restore();
    });

    test('_onDrawerResizeStep ArrowLeft decreases width by 16px (LTR)', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 400;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      app._onDrawerResizeStep({ detail: { delta: -16 } });
      expect(app._drawerOpenWidth).to.equal(384);
      app._maxDrawerWidth.restore();
    });

    test('_onDrawerResizeBound Home/End jump to min/max', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 400;
      app._onDrawerResizeBound({ detail: { bound: 'min' } });
      expect(app._drawerOpenWidth).to.equal(app._minDrawerWidth());
      app._onDrawerResizeBound({ detail: { bound: 'max' } });
      expect(app._drawerOpenWidth).to.equal(app._maxDrawerWidth());
    });

    test('_onDrawerResizeReset triggers _resetDrawerWidth', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      sinon.stub(app, '_resetDrawerWidth');
      app._onDrawerResizeReset();
      expect(app._resetDrawerWidth).to.have.been.calledOnce;
      app._resetDrawerWidth.restore();
    });

    test('_onDrawerResizeStep does nothing on narrow layouts', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = true;
      app._drawerOpenWidth = 400;
      app._onDrawerResizeStep({ detail: { delta: 16 } });
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onDrawerResizeStep does nothing when drawer is closed', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = false;
      app._drawerOpenWidth = 400;
      app._onDrawerResizeStep({ detail: { delta: 16 } });
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onDrawerResizeStep RTL ArrowRight decreases width (mirrored)', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 400;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      app._onDrawerResizeStep({ detail: { delta: -16 } });
      expect(app._drawerOpenWidth).to.equal(384);
      app._maxDrawerWidth.restore();
    });

    suite('RTL', () => {
      const prepareRtl = async () => {
        app.sidebarWidth = '52px';
        app.drawerOpened = true;
        app.isNarrow = false;
        app._isRTL = true;
        app.setAttribute('dir', 'rtl');
        app._drawerOpenWidth = 400;
        sinon.stub(app, '_maxDrawerWidth').returns(700);
        await flush();
      };

      teardown(() => {
        if (app._maxDrawerWidth?.restore) {
          app._maxDrawerWidth.restore();
        }
      });

      test('resizeDeltaForKey mirrors ArrowLeft/ArrowRight for end edge in rtl', () => {
        expect(resizeDeltaForKey('ArrowLeft', { edge: 'end', rtl: true })).to.equal(RESIZE_HANDLE_KEY_STEP_PX);
        expect(resizeDeltaForKey('ArrowRight', { edge: 'end', rtl: true })).to.equal(-RESIZE_HANDLE_KEY_STEP_PX);
      });

      test('ArrowLeft on drawer resize handle increases width in rtl', async () => {
        await prepareRtl();
        const handle = app.$.drawerResizeHandle;
        expect(handle.getAttribute('dir')).to.equal('rtl');
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
        expect(app._drawerOpenWidth).to.equal(416);
      });

      test('_onDrawerResizeDrag grows when pointer delta matches rtl end edge', async () => {
        await prepareRtl();
        const delta = resizeDeltaFromPointer(120, 100, { edge: 'end', rtl: true });
        expect(delta).to.equal(20);
        sinon.stub(app, '_notifyLayoutChanged');
        app._onDrawerResizeDragStart();
        app._onDrawerResizeDrag({ detail: { deltaFromStart: delta } });
        app._onDrawerResizeDragEnd();
        expect(app._drawerOpenWidth).to.equal(420);
        app._notifyLayoutChanged.restore();
      });

      test('_onDrawerResizeDrag shrinks when pointer moves the opposite way in rtl', async () => {
        await prepareRtl();
        const delta = resizeDeltaFromPointer(100, 120, { edge: 'end', rtl: true });
        expect(delta).to.equal(-20);
        sinon.stub(app, '_notifyLayoutChanged');
        app._onDrawerResizeDragStart();
        app._onDrawerResizeDrag({ detail: { deltaFromStart: delta } });
        app._onDrawerResizeDragEnd();
        expect(app._drawerOpenWidth).to.equal(380);
        app._notifyLayoutChanged.restore();
      });
    });

    test('_reclampDrawerWidth resyncs drawerWidth after a narrow-to-wide zoom cycle', () => {
      // Simulates: user opened the drawer while the viewport was narrow (overlay
      // mode). `_openDrawer` wrote a clamped narrow-mode value into the inline
      // `drawerWidth` style but `_drawerOpenWidth` kept the user's wide-mode
      // preference. When the user zooms back out, the inline style must catch
      // back up to the preferred width — even though `_drawerOpenWidth` already
      // equals the computed target.
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      app.drawerWidth = '200px';
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      app._reclampDrawerWidth();
      expect(app.drawerWidth).to.equal('500px');
      app._maxDrawerWidth.restore();
    });

    test('_updateIsNarrow dispatches resize even when drawer width is already correct', async () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      app.drawerWidth = '500px';
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      sinon.stub(app, '_computeOpenDrawerWidth').returns(500);
      const onResize = sinon.spy();
      globalThis.addEventListener('resize', onResize);
      try {
        app._updateIsNarrow();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        expect(onResize).to.have.been.called;
      } finally {
        globalThis.removeEventListener('resize', onResize);
        app._maxDrawerWidth.restore();
        app._computeOpenDrawerWidth.restore();
      }
    });

    test('_scheduleDrawerDragLayoutNotify coalesces multiple calls into one frame', async () => {
      app._cancelDrawerDragLayoutNotify();
      let runCount = 0;
      const originalRun = app._runLayoutNotify;
      app._runLayoutNotify = () => {
        runCount += 1;
      };
      try {
        app._scheduleDrawerDragLayoutNotify();
        app._scheduleDrawerDragLayoutNotify();
        expect(app._drawerDragLayoutRaf).to.exist;
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
        expect(runCount).to.equal(1);
      } finally {
        app._runLayoutNotify = originalRun;
        app._cancelDrawerDragLayoutNotify();
      }
    });

    test('_scheduleDrawerDragLayoutNotify runs iron-resize and synthetic window.resize', async () => {
      app._cancelDrawerDragLayoutNotify();
      const onWindowResize = sinon.spy();
      const originalNotify = app.$.drawerPanel.notifyResize;
      const notifySpy = sinon.spy();
      app.$.drawerPanel.notifyResize = notifySpy;
      globalThis.addEventListener('resize', onWindowResize);
      try {
        app._scheduleDrawerDragLayoutNotify();
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
        expect(notifySpy).to.have.been.calledOnce;
        expect(onWindowResize).to.have.been.calledOnce;
      } finally {
        app.$.drawerPanel.notifyResize = originalNotify;
        globalThis.removeEventListener('resize', onWindowResize);
        app._cancelDrawerDragLayoutNotify();
      }
    });

    test('_notifyLayoutChanged still dispatches synthetic window.resize on settle', async () => {
      const onWindowResize = sinon.spy();
      globalThis.addEventListener('resize', onWindowResize);
      try {
        app._notifyLayoutChanged();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        expect(onWindowResize).to.have.been.called;
      } finally {
        globalThis.removeEventListener('resize', onWindowResize);
      }
    });

    test('_notifyLayoutChanged calls notifyResize on the drawer-layout', async () => {
      // Polymer components that use `IronResizableBehavior` (picture viewer,
      // iron-pages, etc.) are decoupled from `window.resize` and only
      // re-evaluate when an ancestor explicitly walks the iron-resize chain.
      // `_notifyLayoutChanged` must propagate to that chain via the
      // drawer-layout's `notifyResize()` so the fix is global, not just
      // useful for plain `window.resize` listeners.
      const originalNotify = app.$.drawerPanel.notifyResize;
      const notifySpy = sinon.spy();
      app.$.drawerPanel.notifyResize = notifySpy;
      try {
        app._notifyLayoutChanged();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        expect(notifySpy).to.have.been.called;
      } finally {
        app.$.drawerPanel.notifyResize = originalNotify;
      }
    });

    test('_reclampDrawerWidth bails when drawer is closed or layout is narrow', () => {
      app.sidebarWidth = '52px';
      app._drawerOpenWidth = 500;
      app.drawerWidth = '200px';
      app.drawerOpened = false;
      app.isNarrow = false;
      app._reclampDrawerWidth();
      expect(app.drawerWidth).to.equal('200px');

      app.drawerOpened = true;
      app.isNarrow = true;
      app._reclampDrawerWidth();
      expect(app.drawerWidth).to.equal('200px');
    });

    test('_drawerLayoutWidth subtracts sidebar from viewport', () => {
      app.sidebarWidth = '52px';
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => 1000 });
      try {
        expect(app._drawerLayoutWidth()).to.equal(948);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, 'innerWidth', originalDescriptor);
        } else {
          delete window.innerWidth;
        }
      }
    });

    test('_minMainWidthForDrawer respects floor and ratio cap', () => {
      app.sidebarWidth = '52px';
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => 400 });
      try {
        expect(app._minMainWidthForDrawer()).to.equal(240);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, 'innerWidth', originalDescriptor);
        } else {
          delete window.innerWidth;
        }
      }
    });

    test('_openDrawer sets width from stored preference and opens the drawer', () => {
      app.sidebarWidth = '52px';
      app._drawerOpenWidth = 420;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      const drawerPanel = app.$.drawerPanel;
      if (drawerPanel) {
        drawerPanel.narrow = false;
      }
      const pages = app.$['drawer-pages'];
      if (pages) {
        sinon.stub(pages, 'selectIndex');
        sinon.stub(pages, 'select');
        Object.defineProperty(pages, 'selected', { get: () => 'tasks', configurable: true });
      }
      app._openDrawer();
      expect(app.drawerOpened).to.be.true;
      expect(app.drawerWidth).to.equal('420px');
      app._maxDrawerWidth.restore();
    });

    test('_onDrawerResizeDrag updates width and persists on drag end', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 350;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      sinon.stub(app, '_notifyLayoutChanged');
      app._onDrawerResizeDragStart();
      expect(app.hasAttribute('drawer-resizing')).to.be.true;
      app._onDrawerResizeDrag({ detail: { deltaFromStart: 20 } });
      app._onDrawerResizeDragEnd();
      expect(app._drawerOpenWidth).to.equal(370);
      expect(app.drawerWidth).to.equal('370px');
      expect(globalThis.localStorage.getItem('nuxeo.drawerWidth')).to.equal('370');
      expect(app.hasAttribute('drawer-resizing')).to.be.false;
      expect(app._notifyLayoutChanged).to.have.been.called;
      app._maxDrawerWidth.restore();
      app._notifyLayoutChanged.restore();
    });

    test('_onDrawerResizeDragStart does nothing when drawer is closed or layout is narrow', () => {
      app.sidebarWidth = '52px';
      app._drawerOpenWidth = 400;
      app.drawerOpened = false;
      app._onDrawerResizeDragStart();
      expect(app.hasAttribute('drawer-resizing')).to.be.false;

      app.drawerOpened = true;
      app.isNarrow = true;
      app._onDrawerResizeDragStart();
      expect(app.hasAttribute('drawer-resizing')).to.be.false;
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onDrawerResizeStep Shift+Arrow uses a 64px step', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 350;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      app._onDrawerResizeStep({ detail: { delta: 64 } });
      expect(app._drawerOpenWidth).to.equal(414);
      app._maxDrawerWidth.restore();
    });

    test('_onDrawerResizeReset triggers _resetDrawerWidth (Space)', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      sinon.stub(app, '_resetDrawerWidth');
      app._onDrawerResizeReset();
      expect(app._resetDrawerWidth).to.have.been.calledOnce;
      app._resetDrawerWidth.restore();
    });

    test('_onShrinkDrawerRequest reduces width and clears drawer-resizing after delay', () => {
      const clock = sinon.useFakeTimers();
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      try {
        app._onShrinkDrawerRequest({ detail: { amount: 80 } });
        expect(app._drawerOpenWidth).to.equal(420);
        expect(app.drawerWidth).to.equal('420px');
        expect(globalThis.localStorage.getItem('nuxeo.drawerWidth')).to.equal('420');
        expect(app.hasAttribute('drawer-resizing')).to.be.true;
        clock.tick(100);
        expect(app.hasAttribute('drawer-resizing')).to.be.false;
      } finally {
        clock.restore();
        app._maxDrawerWidth.restore();
      }
    });

    test('_onShrinkDrawerRequest ignores invalid or zero amount', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      app._onShrinkDrawerRequest({ detail: { amount: 0 } });
      app._onShrinkDrawerRequest({ detail: {} });
      app._onShrinkDrawerRequest(null);
      expect(app._drawerOpenWidth).to.equal(500);
    });

    test('_onShrinkDrawerRequest does nothing when drawer is already at minimum width', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      const min = app._minDrawerWidth();
      app._drawerOpenWidth = min;
      app._onShrinkDrawerRequest({ detail: { amount: 50 } });
      expect(app._drawerOpenWidth).to.equal(min);
    });

    test('_onShrinkDrawerRequest does nothing when drawer is closed or narrow', () => {
      app.sidebarWidth = '52px';
      app._drawerOpenWidth = 500;
      app.drawerOpened = false;
      app._onShrinkDrawerRequest({ detail: { amount: 50 } });
      expect(app._drawerOpenWidth).to.equal(500);

      app.drawerOpened = true;
      app.isNarrow = true;
      app._onShrinkDrawerRequest({ detail: { amount: 50 } });
      expect(app._drawerOpenWidth).to.equal(500);
    });

    test('nuxeo-shrink-drawer from a bubbling composed child is handled by nuxeo-app', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      const child = document.createElement('div');
      app.appendChild(child);
      try {
        child.dispatchEvent(
          new CustomEvent('nuxeo-shrink-drawer', {
            bubbles: true,
            composed: true,
            detail: { amount: 50 },
          }),
        );
        expect(app._drawerOpenWidth).to.equal(450);
      } finally {
        child.remove();
        app._maxDrawerWidth.restore();
      }
    });

    test('_cancelDrawerDragLayoutNotify clears a scheduled animation frame', () => {
      app._drawerDragLayoutRaf = 42;
      const cancelSpy = sinon.spy(window, 'cancelAnimationFrame');
      app._cancelDrawerDragLayoutNotify();
      expect(cancelSpy).to.have.been.calledWith(42);
      expect(app._drawerDragLayoutRaf).to.be.null;
      cancelSpy.restore();
    });

    test('_handleNarrowChange notifies layout when switching to narrow overlay', () => {
      sinon.stub(app, '_notifyLayoutChanged');
      app.drawerOpened = true;
      app._handleNarrowChange(true);
      expect(app.drawerOpened).to.be.false;
      expect(app._notifyLayoutChanged).to.have.been.called;
      app._notifyLayoutChanged.restore();
    });

    test('_updateIsNarrow reclamps drawer width when the drawer is open on wide layout', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      app.drawerWidth = '200px';
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => 1200 });
      try {
        app._updateIsNarrow();
        expect(app.isNarrow).to.be.false;
        expect(app.drawerWidth).to.equal('500px');
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, 'innerWidth', originalDescriptor);
        } else {
          delete window.innerWidth;
        }
        app._maxDrawerWidth.restore();
      }
    });

    test('_loadStoredDrawerWidth returns null when localStorage throws', () => {
      const getItem = sinon.stub(globalThis.localStorage, 'getItem').throws(new Error('denied'));
      expect(app._loadStoredDrawerWidth()).to.be.null;
      getItem.restore();
    });

    test('_persistDrawerWidth does not throw when setItem throws', () => {
      const setItem = sinon.stub(globalThis.localStorage, 'setItem').throws(new Error('quota'));
      expect(() => app._persistDrawerWidth(420)).to.not.throw();
      setItem.restore();
    });

    test('_resetDrawerWidth does not throw when removeItem throws', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app._drawerOpenWidth = 480;
      sinon.stub(app, '_loadStoredDrawerWidth').returns(null);
      sinon.stub(app, '_notifyLayoutChanged');
      const removeItem = sinon.stub(globalThis.localStorage, 'removeItem').throws(new Error('denied'));
      expect(() => app._resetDrawerWidth()).to.not.throw();
      expect(app._drawerOpenWidth).to.be.null;
      removeItem.restore();
      app._loadStoredDrawerWidth.restore();
      app._notifyLayoutChanged.restore();
    });

    test('_resetDrawerWidth does not change drawerWidth when the drawer is closed', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = false;
      app.drawerWidth = '52px';
      app._drawerOpenWidth = 480;
      globalThis.localStorage.setItem('nuxeo.drawerWidth', '480');
      sinon.stub(app, '_notifyLayoutChanged');
      app._resetDrawerWidth();
      expect(app._drawerOpenWidth).to.be.null;
      expect(app.drawerWidth).to.equal('52px');
      expect(globalThis.localStorage.getItem('nuxeo.drawerWidth')).to.be.null;
      app._notifyLayoutChanged.restore();
    });
  });

  suite('drawer resize edge cases', () => {
    test('_onDrawerResizeStep is a no-op when resize is inactive', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = false;
      app._drawerOpenWidth = 400;
      app._onDrawerResizeStep({ detail: { delta: 16 } });
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onShrinkDrawerRequest keeps drawer-resizing when attribute was already set', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      app.setAttribute('drawer-resizing', '');
      app._onShrinkDrawerRequest({ detail: { amount: 40 } });
      expect(app.hasAttribute('drawer-resizing')).to.be.true;
      app._maxDrawerWidth.restore();
    });
  });

  suite('branch coverage gaps', () => {
    test('_onDrawerResizeBound is a no-op when drawer is closed', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = false;
      app._drawerOpenWidth = 400;
      app._onDrawerResizeBound({ detail: { bound: 'min' } });
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onDrawerResizeBound is a no-op when layout is narrow', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = true;
      app._drawerOpenWidth = 400;
      app._onDrawerResizeBound({ detail: { bound: 'max' } });
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onDrawerResizeReset is a no-op when drawer is closed', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = false;
      const resetSpy = sinon.spy(app, '_resetDrawerWidth');
      try {
        app._onDrawerResizeReset();
        expect(resetSpy).to.not.have.been.called;
      } finally {
        resetSpy.restore();
      }
    });

    test('_onDrawerResizeDrag is a no-op when drawer is closed', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = false;
      app._drawerOpenWidth = 400;
      app._drawerDragStartWidth = 400;
      app._onDrawerResizeDrag({ detail: { deltaFromStart: 20 } });
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onDrawerResizeDrag is a no-op when _drawerDragStartWidth is null', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 400;
      app._drawerDragStartWidth = null;
      app._onDrawerResizeDrag({ detail: { deltaFromStart: 20 } });
      expect(app._drawerOpenWidth).to.equal(400);
    });

    test('_onDrawerResizeDragEnd does not persist when _drawerOpenWidth is null', () => {
      app.sidebarWidth = '52px';
      app._drawerOpenWidth = null;
      const persistSpy = sinon.spy(app, '_persistDrawerWidth');
      try {
        app._onDrawerResizeDragEnd();
        expect(persistSpy).to.not.have.been.called;
      } finally {
        persistSpy.restore();
      }
    });

    test('_onShrinkDrawerRequest clears a pending drawer-resizing timer on a second call', () => {
      const clock = sinon.useFakeTimers();
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      try {
        app._onShrinkDrawerRequest({ detail: { amount: 30 } });
        const firstTimer = app._clearDrawerResizingTimer;
        expect(firstTimer).to.exist;
        app._drawerOpenWidth = 500;
        app.removeAttribute('drawer-resizing');
        const clearSpy = sinon.spy(globalThis, 'clearTimeout');
        try {
          app._onShrinkDrawerRequest({ detail: { amount: 30 } });
          expect(clearSpy).to.have.been.calledWith(firstTimer);
        } finally {
          clearSpy.restore();
        }
      } finally {
        clock.restore();
        app._maxDrawerWidth.restore();
      }
    });

    test('_loadStoredDrawerWidth returns null when localStorage is unavailable', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => undefined });
      try {
        expect(app._loadStoredDrawerWidth()).to.be.null;
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
        }
      }
    });

    test('_persistDrawerWidth is a no-op when localStorage is unavailable', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => undefined });
      try {
        expect(() => app._persistDrawerWidth(420)).to.not.throw();
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
        }
      }
    });

    test('_resetDrawerWidth is a no-op for storage when localStorage is unavailable', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app._drawerOpenWidth = 480;
      sinon.stub(app, '_notifyLayoutChanged');
      const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => undefined });
      try {
        expect(() => app._resetDrawerWidth()).to.not.throw();
        expect(app._drawerOpenWidth).to.be.null;
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
        }
        app._notifyLayoutChanged.restore();
      }
    });

    test('_reclampDrawerWidth treats a non-parseable drawerWidth as 0 and rewrites it', () => {
      app.sidebarWidth = '52px';
      app.drawerOpened = true;
      app.isNarrow = false;
      app._drawerOpenWidth = 500;
      app.drawerWidth = 'auto';
      sinon.stub(app, '_maxDrawerWidth').returns(700);
      sinon.stub(app, '_computeOpenDrawerWidth').returns(500);
      try {
        app._reclampDrawerWidth();
        expect(app.drawerWidth).to.equal('500px');
      } finally {
        app._maxDrawerWidth.restore();
        app._computeOpenDrawerWidth.restore();
      }
    });
  });
});

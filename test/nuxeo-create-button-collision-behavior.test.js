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
  CONTROL_CLEARANCE_PX,
  MAX_TRAY_SHIFT_PX,
} from '../elements/behaviors/nuxeo-create-button-collision-behavior.js';
import '../elements/nuxeo-document-create-button/nuxeo-document-create-button.js';

/** Long enough for the tray's transform transition (0.25s) to finish. */
const TRANSFORM_SETTLE_MS = 400;

suite('nuxeo-create-button-collision-behavior', () => {
  let server;
  let container;
  let element;

  const settle = () => new Promise((resolve) => setTimeout(resolve, TRANSFORM_SETTLE_MS));

  /** Innermost element rendered at a viewport point, piercing shadow roots. */
  const deepElementAt = (x, y) => {
    let node = document.elementFromPoint(x, y);
    while (node && node.shadowRoot) {
      const inner = node.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === node) {
        break;
      }
      node = inner;
    }
    return node;
  };

  /** True when the create button is what a click at this point would reach. */
  const isCoveredByCreateButton = (x, y) => {
    let node = deepElementAt(x, y);
    while (node) {
      if (node === element) {
        return true;
      }
      const root = node.getRootNode();
      node = root instanceof ShadowRoot ? root.host : node.parentElement;
    }
    return false;
  };

  /** Put a control under the create button, offset from the top of its tray. */
  const placeUnderTray = (tag, { top = 10, height = 40, width = 40 } = {}) => {
    const tray = element.$.tray.getBoundingClientRect();
    const obstruction = document.createElement(tag);
    obstruction.style.position = 'fixed';
    obstruction.style.display = 'block';
    obstruction.style.left = `${tray.left}px`;
    obstruction.style.top = `${tray.top + top}px`;
    obstruction.style.width = `${width}px`;
    obstruction.style.height = `${height}px`;
    container.appendChild(obstruction);
    return obstruction;
  };

  setup(async () => {
    server = await login();
    // A fixed, stacked box so the tray sits at a known spot inside the viewport, above whatever
    // else the shared test page is holding, and the button positions itself against it.
    container = await fixture(
      html`<div class="collision-box"><nuxeo-document-create-button></nuxeo-document-create-button></div>`,
    );
    container.setAttribute('style', 'position: fixed; top: 0; left: 0; width: 320px; height: 240px; z-index: 1000;');
    element = container.querySelector('nuxeo-document-create-button');
    sinon.stub(element, 'i18n').callsFake((key) => key);
    await flush();
  });

  teardown(() => {
    server.restore();
  });

  suite('_trayShiftFor', () => {
    test('asks for no lift when nothing is covered', () => {
      expect(element._trayShiftFor(600, [])).to.equal(0);
      expect(element._trayShiftFor(600, null)).to.equal(0);
    });

    test('lifts the button clear of the covered control', () => {
      expect(element._trayShiftFor(600, [{ top: 560 }])).to.equal(40 + CONTROL_CLEARANCE_PX);
    });

    test('lifts above the highest of several covered controls', () => {
      expect(element._trayShiftFor(600, [{ top: 580 }, { top: 540 }, { top: 560 }])).to.equal(
        60 + CONTROL_CLEARANCE_PX,
      );
    });
  });

  suite('_avoidControlCollisions', () => {
    test('lifts the button so a covered control becomes clickable again', async () => {
      const control = placeUnderTray('paper-icon-button');
      const target = control.getBoundingClientRect();
      const x = (target.left + target.right) / 2;
      const y = (target.top + target.bottom) / 2;
      expect(isCoveredByCreateButton(x, y)).to.be.true;

      element._avoidControlCollisions();
      await settle();

      expect(element._trayShift).to.be.above(0);
      expect(element.$.tray.style.transform).to.equal(`translateY(-${element._trayShift}px)`);
      expect(element.$.tray.getBoundingClientRect().bottom).to.be.below(target.top);
      expect(isCoveredByCreateButton(x, y)).to.be.false;
    });

    test('returns the button to its corner once the control moves away', async () => {
      const control = placeUnderTray('paper-icon-button');
      element._avoidControlCollisions();
      await settle();
      expect(element._trayShift).to.be.above(0);

      control.remove();
      element._avoidControlCollisions();
      await settle();

      expect(element._trayShift).to.equal(0);
      expect(element.$.tray.style.transform).to.equal('');
    });

    test('still knows its resting position while lifted', async () => {
      const resting = element._trayRestingRect();
      placeUnderTray('paper-icon-button');

      element._avoidControlCollisions();
      await settle();

      const measured = element._trayRestingRect();
      expect(Math.round(measured.bottom)).to.equal(Math.round(resting.bottom));
      expect(Math.round(measured.top)).to.equal(Math.round(resting.top));
    });

    test('lifts for a control whose own content is what sits under the button', async () => {
      // The label covers the whole control, so every hit-test lands on the label and the control
      // can only be found by looking at what the label sits in.
      const control = placeUnderTray('button');
      control.style.padding = '0';
      control.style.border = '0';
      const label = document.createElement('span');
      label.textContent = 'Download';
      label.setAttribute('style', 'display: block; width: 100%; height: 100%;');
      control.appendChild(label);
      await flush();
      const target = control.getBoundingClientRect();
      element.style.pointerEvents = 'none';
      const hit = deepElementAt((target.left + target.right) / 2, (target.top + target.bottom) / 2);
      element.style.pointerEvents = '';
      expect(hit).to.equal(label);

      element._avoidControlCollisions();
      await settle();

      expect(element._trayShift).to.be.above(0);
      expect(element.$.tray.getBoundingClientRect().bottom).to.be.below(target.top);
    });

    test('stays in its corner over content that is not a control', () => {
      placeUnderTray('div');

      element._avoidControlCollisions();

      expect(element._trayShift).to.equal(0);
    });

    test('stays in its corner when no lift within the allowed range would clear the control', () => {
      placeUnderTray('paper-icon-button', { top: -3 * MAX_TRAY_SHIFT_PX, height: 4 * MAX_TRAY_SHIFT_PX });

      element._avoidControlCollisions();

      expect(element._trayShift).to.equal(0);
    });

    test('does not step aside for its own create button', () => {
      element._avoidControlCollisions();

      expect(element._trayShift).to.equal(0);
      expect(element._isOwnNode(element.$.createBtn)).to.be.true;
    });

    test('leaves the button clickable after measuring', () => {
      placeUnderTray('paper-icon-button');

      element._avoidControlCollisions();

      expect(element.style.pointerEvents).to.equal('');
    });
  });

  suite('triggers', () => {
    test('listens for layout changes while attached', () => {
      expect(element._onCollisionTrigger).to.be.a('function');
      expect(element._onNavigationTrigger).to.be.a('function');
    });

    test('a layout change schedules a new measurement', () => {
      const check = sinon.stub(element, '_scheduleCollisionCheck');

      element._onCollisionTrigger();

      expect(check).to.have.been.called;
    });

    test('stops listening once detached', () => {
      const removeListener = sinon.spy(window, 'removeEventListener');

      element._disarmCollisionAvoidance();

      expect(removeListener).to.have.been.calledWith('resize');
      expect(removeListener).to.have.been.calledWith('hashchange');
      expect(element._onCollisionTrigger).to.be.null;
      removeListener.restore();
    });

    test('re-measures as a freshly navigated page settles', async () => {
      const avoid = sinon.stub(element, '_avoidControlCollisions');

      element._scheduleSettleRechecks();
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(avoid).to.have.been.called;
    });
  });
});

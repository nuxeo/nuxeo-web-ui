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
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

/** Gap (px) left between the create button and the control it steps aside for. */
export const CONTROL_CLEARANCE_PX = 8;
/** Largest lift (px) allowed: past it the button would read as detached from its corner. */
export const MAX_TRAY_SHIFT_PX = 120;
/** Clearing one control can uncover another right above it, so re-measure a few times. */
const MAX_COLLISION_PASSES = 3;
/** Resolution of the grid used to hit-test the area the button covers. */
const SAMPLE_GRID_STEPS = 5;
/** Coalesce resize bursts before measuring again. */
const COLLISION_CHECK_DEBOUNCE_MS = 100;
const COLLISION_DEBOUNCER = 'nuxeo-create-button-collision';
/** Page content renders asynchronously after navigation; re-measure as it settles. */
const SETTLE_RECHECK_DELAYS_MS = [150, 600, 1500];

/** Controls that must stay clickable; the create button steps aside instead of covering them. */
const CONTROL_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'paper-button',
  'paper-icon-button',
  'paper-fab',
  'paper-menu-button',
  'paper-checkbox',
  'paper-radio-button',
  'paper-toggle-button',
  'paper-tab',
  'paper-item',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
].join(',');

/**
 * Keeps the floating create button from covering page controls (WEBUI-1805).
 *
 * The button is pinned to the bottom-right corner of the app, above the page content, so a
 * narrow or short window can leave an action — for instance the blob actions overflow menu on
 * the document view — underneath it and impossible to click. This behavior hit-tests the area
 * the button covers and lifts it just above whatever control is there, dropping it back to its
 * corner as soon as the control moves away. When no lift within `MAX_TRAY_SHIFT_PX` clears the
 * obstruction the button keeps its resting position, so it never wanders far from the corner
 * and is never taken away from the user.
 *
 * Expects the host to expose the positioned element as `this.$.tray`.
 *
 * @polymerBehavior Nuxeo.CreateButtonCollisionBehavior
 */
export const NuxeoCreateButtonCollisionBehavior = {
  properties: {
    /** Upward offset (px) currently applied to keep the button clear of page controls. */
    _trayShift: {
      type: Number,
      value: 0,
    },
  },

  attached() {
    this._armCollisionAvoidance();
  },

  detached() {
    this._disarmCollisionAvoidance();
  },

  /**
   * `nuxeo-app` re-fires `resize` on the window whenever its own layout changes (drawer, info
   * pane, details toggle), so a single listener covers viewport resize, zoom and pane changes.
   */
  _armCollisionAvoidance() {
    if (this._onCollisionTrigger) {
      return;
    }
    this._onCollisionTrigger = () => this._scheduleCollisionCheck();
    this._onNavigationTrigger = () => this._scheduleSettleRechecks();
    window.addEventListener('resize', this._onCollisionTrigger);
    window.addEventListener('hashchange', this._onNavigationTrigger);
    afterNextRender(this, () => this._scheduleSettleRechecks());
  },

  _disarmCollisionAvoidance() {
    if (!this._onCollisionTrigger) {
      return;
    }
    window.removeEventListener('resize', this._onCollisionTrigger);
    window.removeEventListener('hashchange', this._onNavigationTrigger);
    this._onCollisionTrigger = null;
    this._onNavigationTrigger = null;
    this.cancelDebouncer(COLLISION_DEBOUNCER);
    this._clearSettleRechecks();
  },

  _scheduleCollisionCheck() {
    this.debounce(COLLISION_DEBOUNCER, () => this._avoidControlCollisions(), COLLISION_CHECK_DEBOUNCE_MS);
  },

  /** Measure again while a freshly rendered page settles into its final layout. */
  _scheduleSettleRechecks() {
    this._clearSettleRechecks();
    this._settleRecheckTimers = SETTLE_RECHECK_DELAYS_MS.map((delay) =>
      setTimeout(() => this._avoidControlCollisions(), delay),
    );
  },

  _clearSettleRechecks() {
    (this._settleRecheckTimers || []).forEach((timer) => clearTimeout(timer));
    this._settleRecheckTimers = [];
  },

  /** Lift the button just clear of any control underneath it, or leave it in its corner. */
  _avoidControlCollisions() {
    const resting = this._trayRestingRect();
    if (!resting) {
      return;
    }
    // The button swallows pointer events, so take it out of hit-testing to see what is underneath.
    const pointerEvents = this.style.pointerEvents;
    this.style.pointerEvents = 'none';
    let shift = 0;
    try {
      for (let pass = 0; pass < MAX_COLLISION_PASSES; pass += 1) {
        const covered = this._controlRectsUnderTray(resting, shift);
        const step = this._trayShiftFor(resting.bottom - shift, covered);
        if (step <= 0) {
          break;
        }
        shift += step;
        if (shift > MAX_TRAY_SHIFT_PX) {
          shift = 0;
          break;
        }
      }
    } finally {
      this.style.pointerEvents = pointerEvents;
    }
    this._applyTrayShift(shift);
  },

  /** The tray box as it would sit with no shift applied, or null while it is not rendered. */
  _trayRestingRect() {
    const tray = this.$?.tray;
    if (!tray) {
      return null;
    }
    const rect = tray.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    // Measure from the shift that is actually rendered: halfway through the transition it is
    // not yet the one we asked for.
    const rendered = this._renderedTrayShift(tray);
    return {
      top: rect.top + rendered,
      bottom: rect.bottom + rendered,
      left: rect.left,
      right: rect.right,
    };
  },

  /** Upward offset (px) currently rendered on the tray, read back from its transform. */
  _renderedTrayShift(tray) {
    const { transform } = getComputedStyle(tray);
    if (!transform || transform === 'none') {
      return 0;
    }
    const { m42 } = new DOMMatrixReadOnly(transform);
    return Number.isFinite(m42) ? -m42 : 0;
  },

  /** Bounding rects of the controls the tray would cover once lifted by `shift` px. */
  _controlRectsUnderTray(resting, shift) {
    const found = new Set();
    this._traySamplePoints(resting, shift).forEach(([x, y]) => {
      const control = this._controlFromPoint(x, y);
      if (control && !this._isOwnNode(control)) {
        found.add(control);
      }
    });
    return [...found].map((control) => control.getBoundingClientRect());
  },

  /** Grid of viewport points covered by the tray once lifted by `shift` px. */
  _traySamplePoints(resting, shift) {
    const points = [];
    const steps = SAMPLE_GRID_STEPS - 1;
    const width = resting.right - resting.left - 2;
    const height = resting.bottom - resting.top - 2;
    for (let column = 0; column <= steps; column += 1) {
      const x = resting.left + 1 + (width * column) / steps;
      for (let row = 0; row <= steps; row += 1) {
        const y = resting.top + 1 + (height * row) / steps - shift;
        // `elementFromPoint` needs coordinates strictly inside the viewport.
        if (x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight) {
          points.push([x, y]);
        }
      }
    }
    return points;
  },

  /** The outermost control rendered at a viewport point, piercing shadow roots. */
  _controlFromPoint(x, y) {
    let node = document.elementFromPoint(x, y);
    while (node) {
      // `closest` covers the case where the point lands on a plain child of a control
      // (an icon or a label inside a button); it stops at the current root.
      const control = node.closest(CONTROL_SELECTOR);
      if (control) {
        return control;
      }
      if (!node.shadowRoot) {
        return null;
      }
      const inner = node.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === node) {
        return null;
      }
      node = inner;
    }
    return null;
  },

  /** True for the button's own controls (the FAB itself and its creation shortcuts). */
  _isOwnNode(node) {
    let current = node;
    while (current) {
      if (current === this) {
        return true;
      }
      const root = current.getRootNode();
      current = root instanceof ShadowRoot ? root.host : current.parentElement;
    }
    return false;
  },

  /** Lift (px) needed to clear every covered control, above the highest of them. */
  _trayShiftFor(trayBottom, controlRects) {
    if (!controlRects || controlRects.length === 0) {
      return 0;
    }
    const highestTop = Math.min(...controlRects.map((rect) => rect.top));
    return Math.max(0, Math.ceil(trayBottom - highestTop + CONTROL_CLEARANCE_PX));
  },

  _applyTrayShift(shift) {
    const tray = this.$?.tray;
    if (!tray || shift === this._trayShift) {
      return;
    }
    this._trayShift = shift;
    tray.style.transform = shift > 0 ? `translateY(-${shift}px)` : '';
  },
};

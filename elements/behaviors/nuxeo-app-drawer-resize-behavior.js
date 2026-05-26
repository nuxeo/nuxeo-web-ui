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

/** Natural width (px) of the drawer's content (icons + labels), excluding the sidebar column. */
export const DRAWER_NATURAL_CONTENT_PX = 298;
/** Absolute floor (px) for the drawer body under heavy zoom: `sidebarPx + this value`. */
const DRAWER_MIN_FLOOR_OFFSET_PX = 120;
/** Hard floor (px) for the main content column beside the drawer (matches document-page). */
const DRAWER_MAIN_COLUMN_MIN_PX = 240;
/** Max main-column reservation (px) when computing drawer max width; mirrors document-page. */
const DRAWER_MAIN_COLUMN_TARGET_MAX_PX = 640;
/** Share of layout width (sidebar excluded) reserved for main before the drawer can grow further. */
const DRAWER_MAIN_COLUMN_RATIO = 0.5;
/** The drawer can never occupy more than this fraction of the viewport. */
const DRAWER_VIEWPORT_HALF_RATIO = 0.5;
/** Fallback for `_sidebarPx()` when the `--nuxeo-sidebar-width` CSS variable can't be parsed. */
const DRAWER_SIDEBAR_FALLBACK_PX = 52;
/** Debounce before re-enabling drawer width transition after info-pane push-back. */
const DRAWER_RESIZING_CLEAR_DELAY_MS = 100;
/** localStorage key under which the user's preferred drawer width is persisted. */
const DRAWER_STORAGE_KEY = 'nuxeo.drawerWidth';

/**
 * Resizable browse/search drawer: width math, persistence, pointer/keyboard resize,
 * and push-back when the document info pane grows.
 *
 * Expects the host to provide `drawerWidth`, `drawerOpened`, `sidebarWidth`, `isNarrow`,
 * `_isRTL`, and layout helpers `_notifyLayoutChanged` / `_scheduleDrawerDragLayoutNotify`.
 *
 * @polymerBehavior Nuxeo.AppDrawerResizeBehavior
 */
export const NuxeoAppDrawerResizeBehavior = {
  properties: {
    /** Persisted drawer width (px); null uses the default open width. */
    _drawerOpenWidth: {
      type: Number,
      value: null,
    },

    /** Hidden when the drawer is closed or in narrow (overlay) layout. */
    _drawerResizeHidden: {
      type: Boolean,
      computed: '_computeDrawerResizeHidden(drawerOpened, isNarrow)',
      value: true,
    },

    /** ARIA bounds for the drawer resize separator (updated with width changes). */
    _drawerResizeAriaMin: {
      type: Number,
      value: 0,
    },

    _drawerResizeAriaMax: {
      type: Number,
      value: 0,
    },

    _drawerResizeAriaNow: {
      type: Number,
      value: 0,
    },
  },

  /** Viewport width minus the icon sidebar (px). */
  _drawerLayoutWidth() {
    return Math.max(0, window.innerWidth - this._sidebarPx());
  },

  /** Min width (px) left for main content when the drawer grows (proportional, like info pane). */
  _minMainWidthForDrawer() {
    const layoutWidth = this._drawerLayoutWidth();
    return Math.max(
      DRAWER_MAIN_COLUMN_MIN_PX,
      Math.min(DRAWER_MAIN_COLUMN_TARGET_MAX_PX, Math.floor(layoutWidth * DRAWER_MAIN_COLUMN_RATIO)),
    );
  },

  /** Min drawer width: natural open size, capped by viewport on zoom. */
  _minDrawerWidth() {
    const defaultOpen = DRAWER_NATURAL_CONTENT_PX + this._sidebarPx();
    const viewportCap = Math.floor(window.innerWidth * DRAWER_VIEWPORT_HALF_RATIO);
    return Math.min(defaultOpen, Math.max(this._sidebarPx() + DRAWER_MIN_FLOOR_OFFSET_PX, viewportCap));
  },

  /** Max drawer width: half the viewport and enough room for `_minMainWidthForDrawer`. */
  _maxDrawerWidth() {
    const min = this._minDrawerWidth();
    const layoutWidth = this._drawerLayoutWidth();
    const capFromMain = Math.floor(layoutWidth - this._minMainWidthForDrawer());
    const capFromViewport = Math.floor(window.innerWidth * DRAWER_VIEWPORT_HALF_RATIO);
    const cap = Math.min(capFromMain, capFromViewport);
    return Math.max(min, cap);
  },

  /** Parsed icon sidebar width (px); uses fallback when the CSS value is missing. */
  _sidebarPx() {
    return Number.parseInt(this.sidebarWidth, 10) || DRAWER_SIDEBAR_FALLBACK_PX;
  },

  /** Open drawer width (px): stored preference or natural default, clamped. */
  _computeOpenDrawerWidth() {
    const fallback = DRAWER_NATURAL_CONTENT_PX + this._sidebarPx();
    const stored = this._drawerOpenWidth ?? this._loadStoredDrawerWidth();
    if (stored == null) {
      return fallback;
    }
    this._drawerOpenWidth = stored;
    return this._clampDrawerWidth(stored);
  },

  /** Clamp drawer width between `_minDrawerWidth` and `_maxDrawerWidth`. */
  _clampDrawerWidth(px) {
    return Math.min(this._maxDrawerWidth(), Math.max(this._minDrawerWidth(), px));
  },

  /** Read persisted drawer width from localStorage, or null if missing/invalid. */
  _loadStoredDrawerWidth() {
    try {
      const raw = globalThis.localStorage?.getItem(DRAWER_STORAGE_KEY);
      const n = Number.parseInt(raw ?? '', 10);
      if (!Number.isFinite(n)) {
        return null;
      }
      return n;
    } catch {
      return null;
    }
  },

  /** Persist drawer width under `nuxeo.drawerWidth` (no-op when storage is unavailable). */
  _persistDrawerWidth(px) {
    try {
      if (globalThis.localStorage) {
        globalThis.localStorage.setItem(DRAWER_STORAGE_KEY, String(px));
      }
    } catch {
      // Storage may be unavailable (private mode, quota); width is not persisted.
    }
  },

  _drawerResizeActive() {
    return this.drawerOpened && !this.isNarrow;
  },

  /** Applies a keyboard step from `nuxeo-resize-handle`. */
  _onDrawerResizeStep(e) {
    if (!this._drawerResizeActive()) {
      return;
    }
    const current = this._computeOpenDrawerWidth();
    const next = this._clampDrawerWidth(current + e.detail.delta);
    this._drawerOpenWidth = next;
    this.drawerWidth = `${next}px`;
    this._persistDrawerWidth(next);
    this._updateDrawerResizeAria();
    this._scheduleDrawerDragLayoutNotify();
  },

  /** Jumps to min or max width from `nuxeo-resize-handle` (Home/End). */
  _onDrawerResizeBound(e) {
    if (!this._drawerResizeActive()) {
      return;
    }
    const next = e.detail.bound === 'min' ? this._minDrawerWidth() : this._maxDrawerWidth();
    this._drawerOpenWidth = next;
    this.drawerWidth = `${next}px`;
    this._persistDrawerWidth(next);
    this._updateDrawerResizeAria();
    this._notifyLayoutChanged();
  },

  /** Reset width from `nuxeo-resize-handle` (Enter/Space/dblclick). */
  _onDrawerResizeReset() {
    if (!this._drawerResizeActive()) {
      return;
    }
    this._resetDrawerWidth();
  },

  /** Pointer drag start from `nuxeo-resize-handle`. */
  _onDrawerResizeDragStart() {
    if (!this._drawerResizeActive()) {
      return;
    }
    this._drawerDragStartWidth = this._computeOpenDrawerWidth();
    this.setAttribute('drawer-resizing', '');
  },

  /** Pointer drag move from `nuxeo-resize-handle`. */
  _onDrawerResizeDrag(e) {
    if (!this._drawerResizeActive() || this._drawerDragStartWidth == null) {
      return;
    }
    const next = this._clampDrawerWidth(this._drawerDragStartWidth + e.detail.deltaFromStart);
    this._drawerOpenWidth = next;
    this.drawerWidth = `${next}px`;
    this._updateDrawerResizeAria();
    this._scheduleDrawerDragLayoutNotify();
  },

  /** Pointer drag end from `nuxeo-resize-handle`. */
  _onDrawerResizeDragEnd() {
    this._cancelDrawerDragLayoutNotify();
    this.removeAttribute('drawer-resizing');
    this._drawerDragStartWidth = null;
    if (this._drawerOpenWidth != null) {
      this._persistDrawerWidth(this._drawerOpenWidth);
    }
    this._notifyLayoutChanged();
  },

  /** Shrinks the open drawer when the info pane needs more width (`nuxeo-shrink-drawer`). */
  _onShrinkDrawerRequest(e) {
    if (!this.drawerOpened || this.isNarrow) {
      return;
    }
    const rawAmount = e?.detail?.amount;
    const amount = Number.isFinite(rawAmount) ? Math.max(0, rawAmount) : 0;
    if (amount <= 0) {
      return;
    }
    const current = this._computeOpenDrawerWidth();
    const min = this._minDrawerWidth();
    if (current <= min) {
      return;
    }
    const next = Math.max(min, current - amount);
    if (next === current) {
      return;
    }
    // Keep drawer-resizing set during push-back so width changes are instant.
    const hadAttr = this.hasAttribute('drawer-resizing');
    if (!hadAttr) {
      this.setAttribute('drawer-resizing', '');
    }
    this._drawerOpenWidth = next;
    this.drawerWidth = `${next}px`;
    this._persistDrawerWidth(next);
    this._updateDrawerResizeAria();
    if (!hadAttr) {
      if (this._clearDrawerResizingTimer) {
        clearTimeout(this._clearDrawerResizingTimer);
      }
      this._clearDrawerResizingTimer = setTimeout(() => {
        this.removeAttribute('drawer-resizing');
        this._clearDrawerResizingTimer = null;
      }, DRAWER_RESIZING_CLEAR_DELAY_MS);
    }
    this._scheduleDrawerDragLayoutNotify();
  },

  /** Reset drawer to default width and clear localStorage. */
  _resetDrawerWidth() {
    this._drawerOpenWidth = null;
    try {
      if (globalThis.localStorage) {
        globalThis.localStorage.removeItem(DRAWER_STORAGE_KEY);
      }
    } catch {
      // Storage may be unavailable (private mode, quota); width is not persisted.
    }
    if (this.drawerOpened) {
      this.drawerWidth = `${DRAWER_NATURAL_CONTENT_PX + this._sidebarPx()}px`;
      this._updateDrawerResizeAria();
      this._notifyLayoutChanged();
    } else {
      this._updateDrawerResizeAria();
    }
  },

  /** Hide the drawer resize handle when the drawer is closed or layout is narrow. */
  _computeDrawerResizeHidden(drawerOpened, isNarrow) {
    return !drawerOpened || Boolean(isNarrow);
  },

  /** Sync aria-valuemin / aria-valuemax / aria-valuenow on the drawer resize handle. */
  _updateDrawerResizeAria() {
    if (!this.drawerOpened || this.isNarrow) {
      this._drawerResizeAriaMin = 0;
      this._drawerResizeAriaMax = 0;
      this._drawerResizeAriaNow = 0;
      return;
    }
    this._drawerResizeAriaMin = this._minDrawerWidth();
    this._drawerResizeAriaMax = this._maxDrawerWidth();
    this._drawerResizeAriaNow = this._computeOpenDrawerWidth();
  },

  /**
   * Re-clamp drawer width on resize/zoom. Syncs inline `drawerWidth`, not only
   * `_drawerOpenWidth`, so a wide preference is restored after narrow-mode open.
   */
  _reclampDrawerWidth() {
    if (!this.drawerOpened || this.isNarrow) {
      return;
    }
    const target = this._computeOpenDrawerWidth();
    const currentInlinePx = Number.parseInt(this.drawerWidth, 10) || 0;
    if (currentInlinePx !== target) {
      this.drawerWidth = `${target}px`;
      this._updateDrawerResizeAria();
    }
  },

  /** At most one iron-resize notify per frame while dragging (no synthetic `window.resize`). */
  _scheduleDrawerDragLayoutNotify() {
    if (this._drawerDragLayoutRaf != null) {
      return;
    }
    this._drawerDragLayoutRaf = requestAnimationFrame(() => {
      this._drawerDragLayoutRaf = null;
      this._runLayoutNotify({ includeWindowResize: false });
    });
  },

  /** Cancel a pending drawer-drag layout notify animation frame. */
  _cancelDrawerDragLayoutNotify() {
    if (this._drawerDragLayoutRaf != null) {
      cancelAnimationFrame(this._drawerDragLayoutRaf);
      this._drawerDragLayoutRaf = null;
    }
  },
};

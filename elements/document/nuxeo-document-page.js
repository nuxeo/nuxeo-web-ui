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
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-document-comments/nuxeo-document-comment-thread.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tag-suggestion.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-tooltip.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-resize-handle.js';
import '../nuxeo-app/nuxeo-page-item.js';
import '../nuxeo-document-info-bar/nuxeo-document-info-bar.js';
import '../nuxeo-document-info/nuxeo-document-info.js';
import '../nuxeo-collections/nuxeo-document-collections.js';
import '../nuxeo-document-activity/nuxeo-document-activity.js';
import './nuxeo-document-view.js';
import './nuxeo-document-metadata.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { animationFrame } from '@polymer/polymer/lib/utils/async.js';

/** Bare-minimum width (px) at which the cards inside the info pane render cleanly. */
const SIDE_PANE_MIN_ABSOLUTE_PX = 280;
/** Hard floor (px) for the main document column — below this the doc view truly breaks. */
const MAIN_COLUMN_MIN_PX = 240;
/** Max main-column reservation (px) on wide screens; mirrors drawer math in nuxeo-app. */
const MAIN_COLUMN_TARGET_MAX_PX = 640;
/** Min share of container width reserved for main before the side pane can grow further. */
const MAIN_COLUMN_CONTAINER_RATIO = 0.5;
/** Fallback width (px) used when `.side` element's `offsetWidth` is 0 (not yet laid out). */
const SIDE_PANE_FALLBACK_PX = 360;
/** Must match `@media (max-width: 1024px)` / `(min-width: 1025px)` in this template. */
const NARROW_VIEWPORT_BREAKPOINT_PX = 1024;
/** Fallback (px) used by `_containerWidth()` when nothing else is measurable. */
const CONTAINER_WIDTH_FALLBACK_PX = 1024;
/** localStorage key under which the user's preferred info-pane width is persisted. */
const SIDE_PANE_STORAGE_KEY = 'nuxeo.documentPage.sidePaneWidth';

/**
`nuxeo-document-page`
@group Nuxeo UI
@element nuxeo-document-page
@event nuxeo-layout-updated
  Fired when the information-pane width has been reclamped or settled and descendants under
  `nuxeo-app` should run an `iron-resize` pass. The app shell listens and calls
  `notifyResize()` on the drawer panel (and may synthesise `window.resize` once).
  @param {Object} detail - Reserved; currently empty. Do not rely on any properties.
  @param {boolean} bubbles - `true`
  @param {boolean} composed - `true`
  Dispatched from `_scheduleViewportReclamp` (after zoom/window resize reclamp),
  `_notifySideLayoutUpdated` (keyboard step, Home/End, drag end), and `_resetSideWidth`.
  Not fired on each drag move — use the bubbling `resize` event on this element during drag.
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles">
      #details {
        width: 28px;
        height: 28px;
        padding: 5px;
        opacity: 0.3;
        margin: 6px 0;
      }

      :host([opened]) #details {
        opacity: 1;
        margin-left: 6px;
      }

      #documentViewsItems {
        @apply --layout-horizontal;
        --paper-listbox-background-color: transparent;
      }

      #documentViewsItems > nuxeo-page-item:first-of-type {
        margin: 0;
      }

      .scrollerHeader {
        @apply --layout-horizontal;
      }

      :host([opened]) .scrollerHeader {
        box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04) !important;
        border-radius: 0;
        background-color: var(--nuxeo-box) !important;
      }

      .page {
        @apply --layout-horizontal;
        position: relative;
      }

      :host([side-resizing]) .page {
        cursor: ew-resize;
        user-select: none;
      }

      .main {
        @apply --layout-vertical;
        @apply --layout-flex-2;
        padding-right: 8px;
        overflow: hidden;
      }

      :host([opened]) .main {
        padding-right: 16px;
      }

      :host([dir='rtl'][opened]) .main {
        padding-right: 0;
        padding-left: 16px;
      }

      .side {
        @apply --layout-vertical;
        position: relative;
        margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
        min-height: 60vh;
      }

      :host([opened]) .side {
        @apply --layout-flex;
      }

      /* When user has chosen a custom width, switch from flex grow to a fixed
         width. This only applies on wide viewports (> 1024px). At narrow
         viewports the responsive media query below takes over and the original
         vertical layout is used regardless of the persisted preference. */
      @media (min-width: 1025px) {
        :host([opened][side-width]) .main {
          @apply --layout-flex;
        }

        :host([opened][side-width]) .side {
          flex: 0 0 auto;
          width: var(--nuxeo-side-pane-width, 360px);
        }
      }

      .scroller {
        @apply --nuxeo-card;
        margin-bottom: 0;
        overflow: auto;
        display: none;
        left: 0;
        top: 36px;
        right: 0;
        bottom: 0;
        position: absolute;
      }

      :host([opened]) .scroller {
        display: block;
      }

      .section {
        margin-bottom: 32px;
      }

      .section:last-of-type {
        margin-bottom: 64px;
      }

      /* The tags field renders its own label, which replaces the h5 that used to sit above it.
         Scoped to this layout so other tag suggestions keep the default label styling; the
         !important declarations are needed to win over the theme's --nuxeo-label mixin. */
      nuxeo-tag-suggestion {
        --nuxeo-label: {
          display: block;
          font-family: var(--nuxeo-app-font);
          font-weight: 700 !important;
          font-size: 1.08rem;
          letter-spacing: 0.24px !important;
          line-height: 1.54rem;
          margin: 0 0 0.8rem;
        };
      }

      nuxeo-document-view {
        --nuxeo-document-content-margin-bottom: var(--nuxeo-card-margin-bottom);
      }

      @media (max-width: 1024px) {
        #details {
          opacity: 1;
          margin-left: 6px;
          cursor: default;
        }

        .scrollerHeader {
          box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04) !important;
          font-family: var(--nuxeo-app-font);
          border-radius: 0;
          background-color: var(--nuxeo-box) !important;
        }

        .page {
          @apply --layout-vertical;
        }

        .main,
        :host([opened]) .main {
          padding: 0;
          max-width: initial;
          margin-right: 0;
        }

        .side {
          padding: 0;
          max-width: initial;
          min-height: initial;
          display: block;
          margin-bottom: 16px;
        }

        :host([opened]) nuxeo-resize-handle {
          display: none !important;
        }

        .scroller {
          top: 0;
          position: relative;
          display: block;
        }
      }

      paper-tabs {
        height: auto;
        display: flex;
        padding: 8px 0;
        border-bottom: none transparent 0px;
        font-size: inherit;
        font-weight: 400;
        --paper-tabs-selection-bar-color: transparent;
      }
    </style>

    <nuxeo-document-info-bar document="[[document]]"></nuxeo-document-info-bar>

    <div class="page">
      <div class="main">
        <nuxeo-document-view document="[[document]]"></nuxeo-document-view>
      </div>

      <div class="side">
        <nuxeo-resize-handle
          id="sideResizeHandle"
          edge="start"
          dir$="[[_resizeHandleDir]]"
          label-key="documentPage.resize.side"
          tooltip-position$="[[_sideResizeTooltipPosition]]"
          hidden$="[[!opened]]"
          aria-value-min="[[_sideResizeAriaMin]]"
          aria-value-max="[[_sideResizeAriaMax]]"
          aria-value-now="[[_sideResizeAriaNow]]"
          on-resize-step="_onSideResizeStep"
          on-resize-bound="_onSideResizeBound"
          on-resize-reset="_onSideResizeReset"
          on-resize-drag-start="_onSideResizeDragStart"
          on-resize-drag="_onSideResizeDrag"
          on-resize-drag-end="_onSideResizeDragEnd"
        ></nuxeo-resize-handle>
        <div class="scrollerHeader">
          <paper-icon-button
            id="details"
            noink
            icon="nuxeo:details"
            on-tap="_toggleOpened"
            aria-expanded="[[opened]]"
            aria-labelledby="detailsTooltip"
          ></paper-icon-button>
          <nuxeo-tooltip for="details" id="detailsTooltip">[[i18n('documentPage.details.opened')]]</nuxeo-tooltip>
        </div>
        <div class="scroller">
          <!-- info -->
          <div class="section">
            <nuxeo-document-info document="[[document]]"></nuxeo-document-info>
          </div>

          <!-- metadata -->
          <div class="section">
            <nuxeo-document-metadata document="[[document]]"></nuxeo-document-metadata>
          </div>

          <!-- collections -->
          <div class="section" hidden$="[[!_hasCollections(document)]]">
            <h5>[[i18n('documentPage.collections')]]</h5>
            <nuxeo-document-collections document="[[document]]"></nuxeo-document-collections>
          </div>

          <!-- tags -->
          <template is="dom-if" if="[[hasFacet(document, 'NXTag')]]">
            <div class="section">
              <nuxeo-tag-suggestion
                document="[[document]]"
                allow-new-tags
                label="[[i18n('documentPage.tags')]]"
                placeholder="[[i18n('documentPage.tags.placeholder')]]"
                readonly="[[!isTaggable(document)]]"
              >
              </nuxeo-tag-suggestion>
            </div>
          </template>

          <!-- activity -->
          <div class="section" role="list">
            <paper-tabs
              autoselect
              attr-for-selected="name"
              id="documentViewsItems"
              noink
              no-slide
              selected="{{selectedTab}}"
              selectable="nuxeo-page-item"
            >
              <template is="dom-if" if="[[hasFacet(document, 'Commentable')]]">
                <nuxeo-page-item name="comments" label="[[i18n('documentPage.comments')]]"></nuxeo-page-item>
              </template>
              <nuxeo-page-item name="activity" label="[[i18n('documentPage.activity')]]"></nuxeo-page-item>
            </paper-tabs>
            <iron-pages selected="[[selectedTab]]" attr-for-selected="name" selected-item="{{page}}">
              <template is="dom-if" if="[[hasFacet(document, 'Commentable')]]">
                <nuxeo-document-comment-thread name="comments" uid="[[document.uid]]"></nuxeo-document-comment-thread>
              </template>
              <nuxeo-document-activity name="activity" document="[[document]]"></nuxeo-document-activity>
            </iron-pages>
          </div>
        </div>
      </div>
    </div>
  `,

  is: 'nuxeo-document-page',
  behaviors: [LayoutBehavior],

  properties: {
    document: {
      type: Object,
      observer: '_documentChanged',
    },
    selectedTab: {
      type: String,
      value: 'comments',
      notify: true,
    },
    opened: {
      type: Boolean,
      value: false,
      notify: true,
      reflectToAttribute: true,
      observer: '_openedChanged',
    },

    dir: {
      type: String,
      reflectToAttribute: true,
      value: 'ltr',
    },
    /** Info pane width (px); null uses default flex layout. */
    sideWidth: {
      type: Number,
      value: null,
      notify: true,
      reflectToAttribute: true,
      observer: '_sideWidthChanged',
    },

    /** ARIA bounds for the info-pane resize separator (updated with width changes). */
    _sideResizeAriaMin: {
      type: Number,
      value: 0,
    },

    _sideResizeAriaMax: {
      type: Number,
      value: 0,
    },

    _sideResizeAriaNow: {
      type: Number,
      value: 0,
    },

    _resizeHandleDir: {
      type: String,
      computed: '_computeResizeHandleDir(dir)',
    },

    _sideResizeTooltipPosition: {
      type: String,
      computed: '_computeSideResizeTooltipPosition(dir)',
    },
  },

  ready() {
    this.dir = document.documentElement.getAttribute('dir') || 'ltr';
    this._pendingStoredSideWidth = this._loadStoredSideWidth();
  },

  attached() {
    this._onWindowResize = () => {
      this._scheduleViewportReclamp();
    };
    window.addEventListener('resize', this._onWindowResize);

    animationFrame.run(() => {
      if (this._pendingStoredSideWidth != null) {
        if (this._isNarrowViewport()) {
          // Keep stored width unclamped; narrow CSS ignores [side-width].
          this.sideWidth = this._pendingStoredSideWidth;
        } else {
          this.sideWidth = this._clampSideWidth(this._pendingStoredSideWidth);
        }
        this._pendingStoredSideWidth = null;
      }
      this._updateSideResizeAria();
    });
  },

  detached() {
    if (this._viewportReclampRaf != null) {
      cancelAnimationFrame(this._viewportReclampRaf);
      this._viewportReclampRaf = null;
    }
    if (this._onWindowResize) {
      window.removeEventListener('resize', this._onWindowResize);
      this._onWindowResize = null;
    }
  },

  _computeResizeHandleDir(dir) {
    return dir === 'rtl' ? 'rtl' : 'ltr';
  },

  _computeSideResizeTooltipPosition(dir) {
    return dir === 'rtl' ? 'right' : 'left';
  },

  _documentChanged(doc) {
    this.selectedTab = this.hasFacet(doc, 'Commentable') ? 'comments' : 'activity';
  },

  _openedChanged() {
    this._updateSideResizeAria();
    animationFrame.run(() => {
      // notify that there was a resize
      this.dispatchEvent(
        new CustomEvent('resize', {
          bubbles: true,
          composed: true,
        }),
      );
    });
  },

  _toggleOpened() {
    this.opened = !this.opened;
  },

  _isMutable(doc) {
    return !this.hasFacet(doc, 'Immutable') && doc.type !== 'Root' && !this.isTrashed(doc);
  },

  _hasCollections(doc) {
    return this.hasCollections(doc);
  },

  /** Mirror `sideWidth` to `--nuxeo-side-pane-width` and refresh resize-handle ARIA. */
  _sideWidthChanged(value) {
    if (value == null || Number.isNaN(Number(value))) {
      this.style.removeProperty('--nuxeo-side-pane-width');
    } else {
      this.style.setProperty('--nuxeo-side-pane-width', `${value}px`);
    }
    this._updateSideResizeAria();
  },

  /** Sync aria-valuemin / aria-valuemax / aria-valuenow on the info-pane resize handle. */
  _updateSideResizeAria() {
    if (!this.opened || this._isNarrowViewport()) {
      this._sideResizeAriaMin = 0;
      this._sideResizeAriaMax = 0;
      this._sideResizeAriaNow = 0;
      return;
    }
    const sideEl = this.shadowRoot?.querySelector('.side');
    this._sideResizeAriaMin = this._minSideWidth();
    this._sideResizeAriaMax = this._maxSideWidth();
    this._sideResizeAriaNow = this.sideWidth ?? sideEl?.offsetWidth ?? SIDE_PANE_FALLBACK_PX;
  },

  /** Width of `.page` (main + side row); drives all clamp math. */
  _containerWidth() {
    const pageEl = this.shadowRoot?.querySelector('.page');
    const pageWidth = pageEl?.offsetWidth ?? 0;
    if (pageWidth > 0) {
      return pageWidth;
    }
    const hostWidth = this.offsetWidth ?? 0;
    if (hostWidth > 0) {
      return hostWidth;
    }
    return CONTAINER_WIDTH_FALLBACK_PX;
  },

  /** Min info-pane width (px); absolute floor only, not natural flex width. */
  _absoluteMinSideWidth() {
    return SIDE_PANE_MIN_ABSOLUTE_PX;
  },

  /** Minimum info-pane width (px); same as the absolute floor. */
  _minSideWidth() {
    return this._absoluteMinSideWidth();
  },

  /** Min width (px) reserved for the main document column. */
  _minMainWidth() {
    const containerWidth = this._containerWidth();
    return Math.max(
      MAIN_COLUMN_MIN_PX,
      Math.min(MAIN_COLUMN_TARGET_MAX_PX, Math.floor(containerWidth * MAIN_COLUMN_CONTAINER_RATIO)),
    );
  },

  /** Max side-pane width: container minus `_minMainWidth`, at least `_minSideWidth`. */
  _maxSideWidth() {
    const cap = Math.floor(this._containerWidth() - this._minMainWidth());
    return Math.max(this._minSideWidth(), cap);
  },

  /** Clamp info-pane width between `_minSideWidth` and `_maxSideWidth`. */
  _clampSideWidth(px) {
    return Math.min(this._maxSideWidth(), Math.max(this._minSideWidth(), px));
  },

  /**
   * Target info-pane width (px): persisted preference when set, else current `sideWidth`.
   * Mirrors `_computeOpenDrawerWidth` — reclamp always starts from preference, not a
   * value that may have been shrunk in memory during zoom.
   */
  _computeTargetSideWidth() {
    const stored = this._loadStoredSideWidth();
    const preference = stored ?? this.sideWidth;
    if (preference == null || Number.isNaN(Number(preference))) {
      return null;
    }
    return this._clampSideWidth(preference);
  },

  /** Re-clamp `sideWidth` from preference; skip at narrow viewport (CSS uses vertical layout). */
  _reclampSideWidth() {
    if (this._isNarrowViewport()) {
      return;
    }
    if (this.hasAttribute('side-resizing')) {
      if (this.sideWidth == null) {
        return;
      }
      const next = this._clampSideWidth(this.sideWidth);
      if (next !== this.sideWidth) {
        this.sideWidth = next;
      }
      return;
    }
    const next = this._computeTargetSideWidth();
    if (next == null) {
      return;
    }
    if (next !== this.sideWidth) {
      this.sideWidth = next;
    }
  },

  /**
   * Re-clamp on the next frame after zoom/resize (container metrics are stale in the
   * sync handler), then ask nuxeo-app to run iron-resize via `nuxeo-layout-updated`.
   *
   * The `nuxeo-layout-updated` event is fired **only when `_reclampSideWidth` actually
   * changed `sideWidth`**. This is essential to break the feedback loop:
   * `window.resize` → `_scheduleViewportReclamp` → `nuxeo-layout-updated` →
   * `nuxeo-app._notifyLayoutChanged` → synthetic `window.resize` → repeats forever.
   * Once the side width has settled at its clamped value, no further descendant reflow
   * is required (iron-resize already cascaded from the original window.resize via
   * `nuxeo-app._notifyLayoutChanged` → `drawerPanel.notifyResize()`).
   * @fires nuxeo-layout-updated
   */
  _scheduleViewportReclamp() {
    if (this._viewportReclampRaf != null) {
      cancelAnimationFrame(this._viewportReclampRaf);
    }
    this._viewportReclampRaf = requestAnimationFrame(() => {
      this._viewportReclampRaf = null;
      const prevSideWidth = this.sideWidth;
      this._reclampSideWidth();
      this._updateSideResizeAria();
      if (this.sideWidth !== prevSideWidth) {
        this.dispatchEvent(
          new CustomEvent('nuxeo-layout-updated', {
            bubbles: true,
            composed: true,
          }),
        );
      }
    });
  },

  /** Read persisted info-pane width from localStorage, or null if missing/invalid. */
  _loadStoredSideWidth() {
    try {
      const raw = globalThis.localStorage?.getItem(SIDE_PANE_STORAGE_KEY);
      const n = Number.parseInt(raw ?? '', 10);
      if (!Number.isFinite(n)) {
        return null;
      }
      return n;
    } catch {
      // Storage may be unavailable (private mode, quota); width is not persisted.
      return null;
    }
  },

  /** Save or clear info-pane width under `nuxeo.documentPage.sidePaneWidth`. */
  _persistSideWidth(px) {
    try {
      if (globalThis.localStorage) {
        if (px == null) {
          globalThis.localStorage.removeItem(SIDE_PANE_STORAGE_KEY);
        } else {
          globalThis.localStorage.setItem(SIDE_PANE_STORAGE_KEY, String(px));
        }
      }
    } catch {
      // Storage may be unavailable (private mode, quota); width is not persisted.
    }
  },

  /** True on narrow breakpoint or when min side + min main cannot fit in the row. */
  _isNarrowViewport() {
    if (globalThis?.matchMedia(`(max-width: ${NARROW_VIEWPORT_BREAKPOINT_PX}px)`).matches) {
      return true;
    }
    // Too narrow when min side + min main cannot fit side by side.
    const containerWidth = this._containerWidth();
    return containerWidth < this._absoluteMinSideWidth() + MAIN_COLUMN_MIN_PX;
  },

  _sideResizeCurrentWidth() {
    const sideEl = this.shadowRoot?.querySelector('.side');
    return this.sideWidth ?? sideEl?.offsetWidth ?? SIDE_PANE_FALLBACK_PX;
  },

  _sideResizeActive() {
    return this.opened && !this._isNarrowViewport();
  },

  _applySideWidth(requested) {
    const currentMax = this._maxSideWidth();
    if (requested > currentMax) {
      this.dispatchEvent(
        new CustomEvent('nuxeo-shrink-drawer', {
          bubbles: true,
          composed: true,
          detail: { amount: Math.ceil(requested - currentMax) },
        }),
      );
    }
    this.sideWidth = this._clampSideWidth(requested);
    this._updateSideResizeAria();
    this.dispatchEvent(
      new CustomEvent('resize', {
        bubbles: true,
        composed: true,
      }),
    );
  },

  /** @fires nuxeo-layout-updated - After info-pane resize settles (keyboard or drag end). */
  _notifySideLayoutUpdated() {
    this.dispatchEvent(
      new CustomEvent('nuxeo-layout-updated', {
        bubbles: true,
        composed: true,
      }),
    );
  },

  /** Keyboard step from `nuxeo-resize-handle`. */
  _onSideResizeStep(e) {
    if (!this._sideResizeActive()) {
      return;
    }
    const next = this._sideResizeCurrentWidth() + e.detail.delta;
    this._applySideWidth(next);
    this._persistSideWidth(this.sideWidth);
    this._notifySideLayoutUpdated();
  },

  /** Home/End from `nuxeo-resize-handle`. */
  _onSideResizeBound(e) {
    if (!this._sideResizeActive()) {
      return;
    }
    const next = e.detail.bound === 'min' ? this._minSideWidth() : this._maxSideWidth();
    this._applySideWidth(next);
    this._persistSideWidth(this.sideWidth);
    this._notifySideLayoutUpdated();
  },

  /** Reset from `nuxeo-resize-handle`. */
  _onSideResizeReset() {
    if (!this._sideResizeActive()) {
      return;
    }
    this._resetSideWidth();
  },

  /** Pointer drag start from `nuxeo-resize-handle`. */
  _onSideResizeDragStart() {
    if (!this._sideResizeActive()) {
      return;
    }
    this._sideDragStartWidth = this._sideResizeCurrentWidth();
    this.setAttribute('side-resizing', '');
  },

  /** Pointer drag move from `nuxeo-resize-handle`. */
  _onSideResizeDrag(e) {
    if (!this._sideResizeActive() || this._sideDragStartWidth == null) {
      return;
    }
    this._applySideWidth(this._sideDragStartWidth + e.detail.deltaFromStart);
  },

  /** Pointer drag end from `nuxeo-resize-handle`. */
  _onSideResizeDragEnd() {
    this.removeAttribute('side-resizing');
    this._sideDragStartWidth = null;
    if (this.sideWidth != null) {
      this._persistSideWidth(this.sideWidth);
    }
    this._notifySideLayoutUpdated();
  },

  /** Clear stored side width and restore default flex layout. @fires nuxeo-layout-updated */
  _resetSideWidth() {
    this.sideWidth = null;
    this._persistSideWidth(null);
    this.dispatchEvent(
      new CustomEvent('nuxeo-layout-updated', {
        bubbles: true,
        composed: true,
      }),
    );
  },
});

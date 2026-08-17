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
import { timeOut } from '@polymer/polymer/lib/utils/async.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';

/**
 * Session-scoped scroll anchors, keyed by a results list `name`.
 * Each entry is `{ uid, index }` where `uid` is the record id of the row at the
 * top of the viewport (source of truth, survives reordering) and `index` is its
 * position at capture time (a fast hint for virtualized lists).
 *
 * The cache lives for the lifetime of the loaded app (a browsing session). It is
 * intentionally not persisted to storage so that opening a folder via a fresh
 * URL/reload starts at the top rather than jumping unexpectedly.
 */
const _anchors = new Map();
/** Upper bound on tracked lists so a very long session cannot grow unbounded. */
const MAX_ANCHORS = 100;
/** Debounce (ms) for persisting the anchor while the user scrolls. */
const SCROLL_SAVE_DELAY_MS = 150;
/** Delays (ms) at which we re-check the record id after jumping to the hint index. */
const RESTORE_VERIFY_DELAYS_MS = [250, 600];

function _setAnchor(name, anchor) {
  // simple LRU: refresh insertion order and cap the map size
  if (_anchors.has(name)) {
    _anchors.delete(name);
  } else if (_anchors.size >= MAX_ANCHORS) {
    _anchors.delete(_anchors.keys().next().value);
  }
  _anchors.set(name, anchor);
}

/**
 * Restores the scroll position of a `nuxeo-results` list after the user opens a
 * document and navigates back (the results subtree is destroyed and recreated,
 * so the position must be remembered outside the element).
 *
 * The host is expected to expose `name` (the results key) and `view` (the active
 * display view, which provides `$.list`, an `items` array and `scrollToIndex`).
 *
 * @polymerBehavior Nuxeo.ScrollRestoreBehavior
 */
export const NuxeoScrollRestoreBehavior = {
  /**
   * The rows for a view, mirroring the `nuxeo-results` `items` getter: some views
   * expose their data as `view.items`, others only via the underlying
   * `view.$.list.items`. `firstVisibleIndex` / `scrollToIndex` are indexed against
   * the iron-list, so prefer `$.list.items` (falling back to `view.items`) to keep
   * the captured record id and the index aligned.
   * @param {Object=} view the view to read from; defaults to `this.view`.
   * @return {!Array} the rows array (possibly empty).
   */
  _srItems(view) {
    const v = view || this.view;
    if (!v) {
      return [];
    }
    const listItems = v.$?.list?.items;
    if (Array.isArray(listItems) && listItems.length) {
      return listItems;
    }
    if (Array.isArray(v.items) && v.items.length) {
      return v.items;
    }
    if (Array.isArray(listItems)) {
      return listItems;
    }
    if (Array.isArray(v.items)) {
      return v.items;
    }
    return [];
  },

  /**
   * Records the current top-of-viewport anchor for `this.name`.
   * @param {Object=} view the view to read from; defaults to `this.view`.
   */
  _srSaveAnchor(view) {
    const v = view || this.view;
    const name = this.name;
    if (!name || !v?.$?.list) {
      return;
    }
    const items = this._srItems(v);
    // An empty view has no meaningful scroll position. Skipping it is essential
    // on remount: returning via Back briefly shows the default (table) view with
    // no rows before the persisted mode (e.g. grid) is re-applied, and that view
    // swap would otherwise save `{index: 0}` over the still-pending anchor and
    // defeat the restore (WEBUI-2186 — grid position lost on Back).
    if (items.length === 0) {
      return;
    }
    const index = v.$.list.firstVisibleIndex;
    if (typeof index !== 'number' || index < 0) {
      return;
    }
    _setAnchor(name, { uid: items[index]?.uid || null, index });
  },

  /**
   * Re-arms the one-shot restore (e.g. when the display mode is switched on the
   * same element). A fresh element starts un-loaded, so no explicit arm is needed
   * on first mount.
   */
  _srRearmRestore() {
    this._srDidInitialLoad = false;
  },

  /**
   * Restores the remembered position the first time the list has rows again after
   * a (re)mount. Prefers the saved record id over the raw index so the position
   * survives reordering. Safe to call repeatedly — it is a no-op until rows are
   * present and only runs once per (re)arm. Gating on the first non-empty load
   * (rather than a pre-armed flag) avoids depending on `name` being bound when
   * `view` is first assigned.
   */
  _srMaybeRestore() {
    if (this._srDidInitialLoad || !this.name) {
      return; // already restored once, or `name` not bound yet — retry on next update
    }
    const view = this.view;
    if (!view || typeof view.scrollToIndex !== 'function') {
      return;
    }
    const items = this._srItems(view);
    if (items.length === 0) {
      return; // rows not loaded yet; wait for the next items update
    }
    this._srDidInitialLoad = true; // one restore attempt per (re)arm
    const anchor = _anchors.get(this.name);
    if (!anchor) {
      return;
    }
    const { uid, index } = anchor;
    // The user was at (or near) the top — a fresh list already renders from the
    // top, so never jump, even if the anchored record has since moved down.
    if (typeof index !== 'number' || index <= 0) {
      return;
    }
    // If the record is already loaded, jump straight to its real position
    // (record id wins over the possibly-stale index when the list reordered).
    const currentIndex = uid ? items.findIndex((it) => it && it.uid === uid) : -1;
    if (currentIndex === 0) {
      return; // record is at the top — already there, nothing to restore
    }
    if (currentIndex > 0) {
      view.scrollToIndex(currentIndex);
      return;
    }
    // Record not currently loaded: jump to the remembered index to bring that
    // (virtualized) region into view, then correct by record id once it loads.
    view.scrollToIndex(index);
    if (uid) {
      this._srScheduleVerify(uid, index, 0);
    }
  },

  /** Re-checks the record id after the hinted region loads and corrects if needed. */
  _srScheduleVerify(uid, index, attempt) {
    if (attempt >= RESTORE_VERIFY_DELAYS_MS.length) {
      return;
    }
    this._srVerifyDebouncer = Debouncer.debounce(
      this._srVerifyDebouncer,
      timeOut.after(RESTORE_VERIFY_DELAYS_MS[attempt]),
      () => {
        const view = this.view;
        const items = this._srItems(view);
        if (!view || items.length === 0) {
          return;
        }
        if (items[index] && items[index].uid === uid) {
          return; // order unchanged — already at the right place
        }
        const found = items.findIndex((it) => it && it.uid === uid);
        if (found > -1) {
          view.scrollToIndex(found);
        } else {
          // not loaded yet — try again on the next tick
          this._srScheduleVerify(uid, index, attempt + 1);
        }
      },
    );
  },

  /** Attaches a debounced scroll listener that keeps the anchor fresh. */
  _srArmScrollTracking(view) {
    this._srDisarmScrollTracking();
    // Guard against out-of-order deferred calls: only track the view that is still
    // the active one, so a fast display-mode/view swap can't attach to a stale view.
    if (view !== this.view || !view?.$?.list || typeof view.$.list.addEventListener !== 'function') {
      return;
    }
    const list = view.$.list;
    this._srScrollHandler = () => {
      this._srScrollDebouncer = Debouncer.debounce(this._srScrollDebouncer, timeOut.after(SCROLL_SAVE_DELAY_MS), () => {
        // Ignore the initial/programmatic scrolls that happen before the one-shot
        // restore runs, so they cannot clobber the anchor we are about to apply.
        if (!this._srDidInitialLoad) {
          return;
        }
        this._srSaveAnchor(view);
      });
    };
    list.addEventListener('scroll', this._srScrollHandler);
    this._srScrollList = list;
  },

  /**
   * Detaches the scroll listener set up by `_srArmScrollTracking` and cancels any
   * pending debounced work. Called on both `detached()` and view tear-down, so a
   * late save or verify callback can't run against a torn-down/stale view.
   */
  _srDisarmScrollTracking() {
    if (this._srScrollList && this._srScrollHandler && typeof this._srScrollList.removeEventListener === 'function') {
      this._srScrollList.removeEventListener('scroll', this._srScrollHandler);
    }
    // Cancel any queued save so a late debounced callback can't overwrite the
    // anchor with a stale index after the view was swapped or torn down.
    if (this._srScrollDebouncer?.isActive?.()) {
      this._srScrollDebouncer.cancel();
    }
    // Cancel any pending restore verification so it can't call scrollToIndex on a
    // view that has since been detached or replaced.
    if (this._srVerifyDebouncer?.isActive?.()) {
      this._srVerifyDebouncer.cancel();
    }
    this._srScrollList = null;
    this._srScrollHandler = null;
  },
};

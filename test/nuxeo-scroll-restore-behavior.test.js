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
import { NuxeoScrollRestoreBehavior } from '../elements/behaviors/nuxeo-scroll-restore-behavior.js';

// Build documents [{uid:'doc-0'}, ...] of a given size.
const makeDocs = (size) =>
  Array.from({ length: size }, (_, i) => {
    return { uid: `doc-${i}` };
  });

// Rows for a virtualized region that has not loaded yet: present, but without uids.
const placeholderRows = (size) =>
  Array.from({ length: size }, () => {
    return {};
  });

// Minimal host that mixes in the behavior, mimicking how `nuxeo-results` uses it.
const makeHost = (name, view) => Object.assign(Object.create(NuxeoScrollRestoreBehavior), { name, view });

// Wait a real (short) delay for a debounced callback to fire. Real timers are used
// deliberately: sinon's global fake timers interfere with the shared web-test-runner
// / Mocha scheduling across the aggregated suite.
const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// A view stub exposing the surface the behavior relies on.
const makeView = (items, firstVisibleIndex) => {
  return {
    items,
    $: { list: { firstVisibleIndex } },
    scrollToIndex: sinon.spy(),
  };
};

// A view whose iron-list also exposes `focusItem` (as the real table/grid/list do),
// so the accessibility focus-restore path can be exercised.
const makeFocusableView = (items, firstVisibleIndex) => {
  return {
    items,
    $: { list: { firstVisibleIndex, focusItem: sinon.spy() } },
    scrollToIndex: sinon.spy(),
  };
};

suite('NuxeoScrollRestoreBehavior', () => {
  let name;
  let counter = 0;

  setup(() => {
    // unique key per test — the anchor cache is module-scoped and shared
    name = `list-${Date.now()}-${counter++}`;
  });

  test('reports no rows when there is no view', () => {
    expect(makeHost(name, undefined)._srItems()).to.deep.equal([]);
  });

  test('reports no rows when the view exposes neither list nor items', () => {
    expect(makeHost(name, {})._srItems()).to.deep.equal([]);
  });

  test('prefers the iron-list rows over the view rows', () => {
    const listItems = makeDocs(3);
    const view = { items: makeDocs(60), $: { list: { firstVisibleIndex: 0, items: listItems } } };
    // `firstVisibleIndex` / `scrollToIndex` are indexed against the iron-list, so
    // its rows must win over `view.items` to keep the captured id and index aligned.
    expect(makeHost(name, view)._srItems()).to.equal(listItems);
  });

  test('saves the top-of-viewport record id and index', () => {
    const view = makeView(makeDocs(60), 40);
    const host = makeHost(name, view);
    host._srSaveAnchor();
    // restore into a fresh host (simulating teardown + remount) at same order
    const view2 = makeView(makeDocs(60), 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
  });

  test('does not save an anchor from an empty view (no meaningful position)', () => {
    makeHost(name, makeView([], 0))._srSaveAnchor();
    // nothing was saved, so a later populated view is left at the top
    const view2 = makeView(makeDocs(60), 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.called).to.equal(false);
  });

  test('a torn-down empty view does not clobber a pending anchor (WEBUI-2186 grid remount)', () => {
    // user scrolled the grid to index 35; saved on teardown when opening a document
    makeHost(name, makeView(makeDocs(60), 35))._srSaveAnchor();
    // on Back, the remounted results briefly shows the default (still-empty) table
    // view, which is torn down as the persisted grid mode is applied. That teardown
    // must NOT overwrite the good anchor with {index: 0}.
    makeHost(name, makeView([], 0))._srSaveAnchor();
    // grid re-populates and restores — it must still jump to the saved record (35)
    const grid2 = makeView(makeDocs(60), 0);
    makeHost(name, grid2)._srMaybeRestore();
    expect(grid2.scrollToIndex.calledOnce).to.equal(true);
    expect(grid2.scrollToIndex.firstCall.args[0]).to.equal(35);
  });

  test('restores keyboard focus to the anchored row when nothing else is focused', () => {
    makeHost(name, makeFocusableView(makeDocs(60), 40))._srSaveAnchor();
    const view2 = makeFocusableView(makeDocs(60), 0);
    const host2 = makeHost(name, view2);
    host2._srActiveElement = () => document.body; // Back-remount: nothing focused yet
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
    // focus is returned to the same row for keyboard / screen-reader users
    expect(view2.$.list.focusItem.calledOnce).to.equal(true);
    expect(view2.$.list.focusItem.firstCall.args[0]).to.equal(40);
  });

  test('does not steal focus when a control is already focused', () => {
    makeHost(name, makeFocusableView(makeDocs(60), 40))._srSaveAnchor();
    const view2 = makeFocusableView(makeDocs(60), 0);
    const host2 = makeHost(name, view2);
    // the user focused a real control (e.g. started typing) after navigating back
    const input = document.createElement('input');
    host2._srActiveElement = () => input;
    host2._srMaybeRestore();
    // scroll is still restored, but focus is left where the user put it
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
    expect(view2.$.list.focusItem.called).to.equal(false);
  });

  test('restores scroll without error when the view has no focusItem (scroll-only mode)', () => {
    makeHost(name, makeView(makeDocs(60), 40))._srSaveAnchor();
    const view2 = makeView(makeDocs(60), 0); // iron-list stub without focusItem
    const host2 = makeHost(name, view2);
    host2._srActiveElement = () => document.body;
    host2._srMaybeRestore(); // must not throw
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
  });

  test('_srActiveElement pierces shadow roots to find the truly-focused element', () => {
    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const root = hostEl.attachShadow({ mode: 'open' });
    const input = document.createElement('input');
    root.appendChild(input);
    try {
      input.focus();
      const active = makeHost(name, undefined)._srActiveElement();
      // when the inner input holds focus, we resolve through the shadow root to it;
      // otherwise (headless without page focus) we at least never throw and get an element
      expect(active === input || active === document.body).to.equal(true);
    } finally {
      input.blur();
      hostEl.remove();
    }
  });

  test('restores by record id when the list order changed (index is stale)', () => {
    const view = makeView(makeDocs(60), 40); // doc-40 was at the top
    makeHost(name, view)._srSaveAnchor();
    // on return, doc-40 has moved to index 12
    const reordered = makeDocs(60);
    const moved = reordered.splice(40, 1)[0];
    reordered.splice(12, 0, moved);
    const view2 = makeView(reordered, 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(12);
  });

  test('falls back to the saved index when no record id was captured', () => {
    // rows are present but the top-of-viewport row is a not-yet-loaded placeholder
    // (virtualized region), so no record id is captured — only the index.
    const view = makeView(placeholderRows(60), 40);
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView(makeDocs(60), 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
  });

  test('does nothing when there is no saved anchor for the list', () => {
    const view = makeView(makeDocs(60), 0);
    makeHost(name, view)._srMaybeRestore();
    expect(view.scrollToIndex.called).to.equal(false);
  });

  test('does not restore when the list was at the top (index 0)', () => {
    const view = makeView(makeDocs(60), 0);
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView(makeDocs(60), 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.called).to.equal(false);
  });

  test('does not restore when left at the top, even if the top record moved', () => {
    const view = makeView(makeDocs(60), 0); // doc-0 was at the top
    makeHost(name, view)._srSaveAnchor();
    // doc-0 has moved to index 8 while the user was away
    const reordered = makeDocs(60);
    const moved = reordered.splice(0, 1)[0];
    reordered.splice(8, 0, moved);
    const view2 = makeView(reordered, 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.called).to.equal(false);
  });

  test('does not restore when the anchored record has moved to the top', () => {
    const view = makeView(makeDocs(60), 40); // doc-40 was at the top of the viewport
    makeHost(name, view)._srSaveAnchor();
    // while the user was away, doc-40 became the first row
    const reordered = makeDocs(60);
    reordered.unshift(reordered.splice(40, 1)[0]);
    const view2 = makeView(reordered, 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.called).to.equal(false); // a fresh list already renders from the top
  });

  test('restores only once per (re)arm', () => {
    const view = makeView(makeDocs(60), 40);
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView(makeDocs(60), 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    // re-arming (e.g. display-mode switch) allows another restore
    host2._srRearmRestore();
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.calledTwice).to.equal(true);
  });

  test('waits for rows before restoring', () => {
    const view = makeView(makeDocs(60), 40);
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView([], 0); // rows not loaded yet
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.called).to.equal(false);
    // rows arrive
    view2.items = makeDocs(60);
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
  });

  test('corrects to the record position once the hinted region lazily loads', async () => {
    const view = makeView(makeDocs(60), 40); // doc-40 at the top
    makeHost(name, view)._srSaveAnchor();
    // on return the target region is not loaded yet (placeholders, no uids)
    const view2 = makeView(placeholderRows(60), 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    // first it jumps to the remembered index hint
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
    // the region loads with doc-40 now at index 12 (list changed while away)
    const loaded = placeholderRows(60);
    loaded[12] = { uid: 'doc-40' };
    view2.items = loaded;
    await wait(300);
    expect(view2.scrollToIndex.calledTwice).to.equal(true);
    expect(view2.scrollToIndex.secondCall.args[0]).to.equal(12);
  });

  test('leaves the hinted position alone when the region loads in the remembered order', async () => {
    const view = makeView(makeDocs(60), 40); // doc-40 at the top
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView(placeholderRows(60), 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    // the region loads with doc-40 exactly where it was remembered
    const loaded = placeholderRows(60);
    loaded[40] = { uid: 'doc-40' };
    view2.items = loaded;
    await wait(300);
    expect(view2.scrollToIndex.calledOnce).to.equal(true); // no correction needed
  });

  test('skips the re-check when the list is emptied before it runs', async () => {
    const view = makeView(makeDocs(60), 40);
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView(placeholderRows(60), 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    view2.items = []; // the list is cleared (e.g. a refresh) before the re-check fires
    await wait(300);
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
  });

  test('gives up re-checking when the record never loads', async () => {
    const view = makeView(makeDocs(60), 40);
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView(placeholderRows(60), 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    // doc-40 is gone for good: every re-check misses and the retries run out
    await wait(1000);
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
  });

  test('cancels a pending restore verification on disarm so it cannot scroll a torn-down view', () => {
    const view = makeView(makeDocs(60), 40); // doc-40 at the top
    makeHost(name, view)._srSaveAnchor();
    const view2 = makeView(placeholderRows(60), 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    // jumped to the index hint and scheduled a verify for once the region loads
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(host2._srVerifyDebouncer.isActive()).to.equal(true); // a verify is queued
    // the element detaches / the view is swapped before the verify fires
    host2._srDisarmScrollTracking();
    expect(host2._srVerifyDebouncer.isActive()).to.equal(false); // the pending verify was cancelled
  });

  test('re-saving the same list refreshes its anchor in place', () => {
    const host = makeHost(name, makeView(makeDocs(60), 40));
    host._srSaveAnchor(); // first save at index 40
    host.view = makeView(makeDocs(60), 15);
    host._srSaveAnchor(); // re-save same name at index 15 (LRU refresh path)
    const view2 = makeView(makeDocs(60), 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(15);
  });

  test('evicts the oldest anchor once the cap is exceeded', () => {
    const firstName = `evict-${Date.now()}`;
    makeHost(firstName, makeView(makeDocs(60), 40))._srSaveAnchor();
    // save more than MAX_ANCHORS (100) other lists to push the first one out
    for (let i = 0; i < 101; i++) {
      makeHost(`evict-${Date.now()}-${i}`, makeView(makeDocs(60), 40))._srSaveAnchor();
    }
    const view2 = makeView(makeDocs(60), 0);
    makeHost(firstName, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.called).to.equal(false); // anchor was evicted
  });

  test('arming scroll tracking is a no-op when the view has no list', () => {
    const host = makeHost(name, {});
    host._srArmScrollTracking({}); // no $.list — must not throw
    host._srDisarmScrollTracking(); // nothing armed — must not throw
    expect(host._srScrollList).to.be.null;
  });

  test('scroll tracking keeps the anchor fresh', async () => {
    const list = {
      firstVisibleIndex: 0,
      addEventListener: sinon.spy(),
      removeEventListener: sinon.spy(),
    };
    const view = { items: makeDocs(60), $: { list }, scrollToIndex: sinon.spy() };
    const host = makeHost(name, view);
    host._srDidInitialLoad = true; // tracking only saves after the one-shot restore
    host._srArmScrollTracking(view);
    expect(list.addEventListener.calledOnce).to.equal(true);
    // simulate the user scrolling to index 25
    list.firstVisibleIndex = 25;
    list.addEventListener.firstCall.args[1]();
    await wait(200);
    // the fresh anchor is applied on the next mount
    const view2 = makeView(makeDocs(60), 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(25);
    // and disarming removes the listener
    host._srDisarmScrollTracking();
    expect(list.removeEventListener.calledOnce).to.equal(true);
  });

  test('ignores scrolls that happen before the one-shot restore has run', async () => {
    const list = {
      firstVisibleIndex: 25,
      addEventListener: sinon.spy(),
      removeEventListener: sinon.spy(),
    };
    const view = { items: makeDocs(60), $: { list }, scrollToIndex: sinon.spy() };
    const host = makeHost(name, view);
    // `_srDidInitialLoad` is still unset: this is an initial/programmatic scroll
    host._srArmScrollTracking(view);
    list.addEventListener.firstCall.args[1]();
    await wait(200);
    const view2 = makeView(makeDocs(60), 0);
    makeHost(name, view2)._srMaybeRestore();
    expect(view2.scrollToIndex.called).to.equal(false); // nothing was anchored
  });

  test('disarming cancels a queued save so a late scroll cannot overwrite the anchor', async () => {
    const list = {
      firstVisibleIndex: 40,
      addEventListener: sinon.spy(),
      removeEventListener: sinon.spy(),
    };
    const view = { items: makeDocs(60), $: { list }, scrollToIndex: sinon.spy() };
    const host = makeHost(name, view);
    host._srDidInitialLoad = true;
    host._srSaveAnchor(); // initial anchor at index 40
    host._srArmScrollTracking(view);
    // user scrolls to 5, queuing a debounced save
    list.firstVisibleIndex = 5;
    list.addEventListener.firstCall.args[1]();
    expect(host._srScrollDebouncer.isActive()).to.equal(true); // save is queued
    // the view is swapped/torn down: disarm before the debounce fires
    host._srDisarmScrollTracking();
    expect(host._srScrollDebouncer.isActive()).to.equal(false); // queued save was cancelled
    const view2 = makeView(makeDocs(60), 0);
    makeHost(name, view2)._srMaybeRestore();
    // anchor is still the pre-scroll index 40, not the stale late 5
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
  });
});

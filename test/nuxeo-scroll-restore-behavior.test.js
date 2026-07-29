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

// Minimal host that mixes in the behavior, mimicking how `nuxeo-results` uses it.
const makeHost = (name, view) => Object.assign(Object.create(NuxeoScrollRestoreBehavior), { name, view });

// A view stub exposing the surface the behavior relies on.
const makeView = (items, firstVisibleIndex) => {
  return {
    items,
    $: { list: { firstVisibleIndex } },
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
    const view = makeView([], 40); // no item at the anchor position
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
    const placeholders = Array.from({ length: 60 }, () => {
      return {};
    });
    const view2 = makeView(placeholders, 0);
    const host2 = makeHost(name, view2);
    host2._srMaybeRestore();
    // first it jumps to the remembered index hint
    expect(view2.scrollToIndex.calledOnce).to.equal(true);
    expect(view2.scrollToIndex.firstCall.args[0]).to.equal(40);
    // the region loads with doc-40 now at index 12 (list changed while away)
    const loaded = Array.from({ length: 60 }, () => {
      return {};
    });
    loaded[12] = { uid: 'doc-40' };
    view2.items = loaded;
    await new Promise((r) => setTimeout(r, 350));
    expect(view2.scrollToIndex.calledTwice).to.equal(true);
    expect(view2.scrollToIndex.secondCall.args[0]).to.equal(12);
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
    expect(host._srScrollList).to.equal(null);
  });

  test('scroll tracking keeps the anchor fresh', () => {
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
    const handler = list.addEventListener.firstCall.args[1];
    handler();
    return new Promise((r) => setTimeout(r, 200)).then(() => {
      // the fresh anchor is applied on the next mount
      const view2 = makeView(makeDocs(60), 0);
      makeHost(name, view2)._srMaybeRestore();
      expect(view2.scrollToIndex.calledOnce).to.equal(true);
      expect(view2.scrollToIndex.firstCall.args[0]).to.equal(25);
      // and disarming removes the listener
      host._srDisarmScrollTracking();
      expect(list.removeEventListener.calledOnce).to.equal(true);
    });
  });
});

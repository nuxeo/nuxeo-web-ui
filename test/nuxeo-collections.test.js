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
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-collections/nuxeo-collections.js';

suite('nuxeo-collections', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-collections></nuxeo-collections>`);
    element.navigateTo = () => {};
    await flush();
  });

  test('_computedClass appends selected class', () => {
    expect(element._computedClass(false)).to.equal('list-item');
    expect(element._computedClass(true)).to.equal('list-item selected');
  });

  test('_canRemove checks ReadCanCollect permission', () => {
    expect(element._canRemove(null)).to.be.false;
    expect(element._canRemove({ contextParameters: { permissions: ['Browse'] } })).to.be.false;
    expect(element._canRemove({ contextParameters: { permissions: ['ReadCanCollect'] } })).to.be.true;
  });

  test('_isEmpty returns true only for empty arrays', () => {
    expect(element._isEmpty([])).to.be.true;
    expect(element._isEmpty([1])).to.be.false;
    expect(element._isEmpty(null)).to.be.null;
  });

  test('displayMembers enables members page and can select provided index', () => {
    const selectSpy = sinon.stub(element.$.membersList, 'selectIndex');
    const scrollSpy = sinon.stub(element.$.membersList, 'scrollToIndex');
    element.selectedCollection = { uid: 'c1' };
    element.$.membersList.items = [{ uid: 'm1' }, { uid: 'm2' }];

    element.displayMembers({ uid: 'c1' }, 1);

    expect(element._isDisplayMembers).to.be.true;
    expect(selectSpy).to.have.been.calledWith(1);
    expect(scrollSpy).to.have.been.calledWith(1);
    selectSpy.restore();
    scrollSpy.restore();
  });

  test('displayCollections hides members page', () => {
    element._isDisplayMembers = true;
    element.displayCollections();
    expect(element._isDisplayMembers).to.be.false;
  });

  test('_removeFromMembers removes uid and keeps selection in range', () => {
    element.$.membersList.items = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];
    const spliceSpy = sinon.spy(element.$.membersList, 'splice');
    const selectSpy = sinon.stub(element.$.membersList, 'selectIndex');

    element._removeFromMembers('b');

    expect(spliceSpy).to.have.been.calledOnce;
    expect(selectSpy).to.have.been.called;
    spliceSpy.restore();
    selectSpy.restore();
  });

  test('_removeFromCollection executes operation and emits event', async () => {
    const executeStub = sinon.stub(element.$.removeFromCollectionOp, 'execute').resolves();
    const removeSpy = sinon.spy(element, '_removeFromMembers');
    const fireSpy = sinon.spy(element, 'fire');
    element.selectedCollection = { uid: 'collection-1' };

    element._removeFromCollection({
      currentTarget: { dataset: { uid: 'doc-1' } },
      target: { dataset: { uid: 'collection-1' } },
    });
    await Promise.resolve();

    expect(executeStub).to.have.been.calledOnce;
    expect(removeSpy).to.have.been.calledWith('doc-1');
    expect(fireSpy).to.have.been.calledWith('removed-from-collection', sinon.match.object);
    executeStub.restore();
    removeSpy.restore();
    fireSpy.restore();
  });

  test('_visibleChanged refreshes list and resets selection when visible', async () => {
    const refreshSpy = sinon.stub(element, '_refreshCollections');
    const displaySpy = sinon.stub(element, 'displayCollections');
    element.selectedCollection = { uid: 'c1' };
    element.visible = true;
    await flush();

    expect(element.selectedCollection).to.be.null;
    expect(refreshSpy.callCount).to.be.greaterThan(0);
    expect(displaySpy.callCount).to.be.greaterThan(0);
    refreshSpy.restore();
    displaySpy.restore();
  });

  test('loadCollection refreshes matching selected collection', () => {
    element.selectedCollection = { uid: 'c1' };
    const resetSpy = sinon.spy(element.$.membersList, 'reset');
    const fetchSpy = sinon.spy(element.$.membersList, 'fetch');
    const displaySpy = sinon.spy(element, 'displayCollections');

    element.loadCollection({ uid: 'c1' });

    expect(element.$.membersProvider.params).to.deep.equal(['c1']);
    expect(resetSpy).to.have.been.calledOnce;
    expect(fetchSpy).to.have.been.calledOnce;
    expect(displaySpy).to.have.been.calledOnce;
    resetSpy.restore();
    fetchSpy.restore();
    displaySpy.restore();
  });

  test('loadCollection does nothing when collection uid does not match', () => {
    element.selectedCollection = { uid: 'c1' };
    const resetSpy = sinon.spy(element.$.membersList, 'reset');
    element.loadCollection({ uid: 'other' });
    expect(resetSpy).to.not.have.been.called;
    resetSpy.restore();
  });

  test('loadCollection does nothing when no selected collection', () => {
    element.selectedCollection = null;
    const resetSpy = sinon.spy(element.$.membersList, 'reset');
    element.loadCollection({ uid: 'c1' });
    expect(resetSpy).to.not.have.been.called;
    resetSpy.restore();
  });

  suite('keyboard navigation', () => {
    function makeEvent() {
      return { detail: { keyboardEvent: { preventDefault: sinon.spy() } } };
    }

    test('_navigateOnRight displays members when a collection is selected', () => {
      element._isDisplayMembers = false;
      element.selectedCollection = { uid: 'c1' };
      element.$.membersList.items = [{ uid: 'm1' }];
      sinon.stub(element.$.membersList, 'selectIndex');
      const fireSpy = sinon.spy(element.$.membersList, 'fire');

      const e = makeEvent();
      element._navigateOnRight(e);

      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
      expect(element._isDisplayMembers).to.be.true;
      expect(fireSpy).to.have.been.calledWith('iron-resize');
      expect(element.$.membersList.selectIndex).to.have.been.calledWith(0);
      expect(element._tmpJustRight).to.be.true;

      element.$.membersList.selectIndex.restore();
      fireSpy.restore();
    });

    test('_navigateOnRight does nothing when already displaying members', () => {
      element._isDisplayMembers = true;
      const e = makeEvent();
      element._navigateOnRight(e);
      expect(e.detail.keyboardEvent.preventDefault).to.not.have.been.called;
    });

    test('_navigateOnRight sets tmpJustRight even without selected collection', () => {
      element._isDisplayMembers = false;
      element.selectedCollection = null;
      const e = makeEvent();
      element._navigateOnRight(e);
      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
      expect(element._tmpJustRight).to.be.true;
    });

    test('_navigateOnLeft goes back to collections when displaying members', () => {
      element._isDisplayMembers = true;
      sinon.stub(element, 'displayCollections');
      const fireSpy = sinon.spy(element.$.collectionsList, 'fire');

      const e = makeEvent();
      element._navigateOnLeft(e);

      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
      expect(element.displayCollections).to.have.been.calledOnce;
      expect(fireSpy).to.have.been.calledWith('iron-resize');
      expect(element._tmpJustLeft).to.be.true;

      element.displayCollections.restore();
      fireSpy.restore();
    });

    test('_navigateOnLeft sets tmpJustLeft without preventing default when not in members', () => {
      element._isDisplayMembers = false;
      const e = makeEvent();
      element._navigateOnLeft(e);
      expect(e.detail.keyboardEvent.preventDefault).to.not.have.been.called;
      expect(element._tmpJustLeft).to.be.true;
    });

    test('_navigateOnDown selects next member when displaying members and just navigated right', () => {
      element._isDisplayMembers = true;
      element._tmpJustRight = true;
      sinon.stub(element.$.membersList, 'selectNext');

      const e = makeEvent();
      element._navigateOnDown(e);

      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
      expect(element.$.membersList.selectNext).to.have.been.calledOnce;
      expect(element._tmpJustRight).to.be.false;

      element.$.membersList.selectNext.restore();
    });

    test('_navigateOnDown prevents default in members view even without tmpJustRight', () => {
      element._isDisplayMembers = true;
      element._tmpJustRight = false;
      const e = makeEvent();
      element._navigateOnDown(e);
      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
    });

    test('_navigateOnDown selects next collection when not in members and just navigated left', () => {
      element._isDisplayMembers = false;
      element._tmpJustLeft = true;
      sinon.stub(element.$.collectionsList, 'selectNext');

      const e = makeEvent();
      element._navigateOnDown(e);

      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
      expect(element.$.collectionsList.selectNext).to.have.been.calledOnce;
      expect(element._tmpJustLeft).to.be.false;

      element.$.collectionsList.selectNext.restore();
    });

    test('_navigateOnUp selects previous member when in members view and just navigated right', () => {
      element._isDisplayMembers = true;
      element._tmpJustRight = true;
      sinon.stub(element.$.membersList, 'selectPrevious');

      const e = makeEvent();
      element._navigateOnUp(e);

      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
      expect(element.$.membersList.selectPrevious).to.have.been.calledOnce;
      expect(element._tmpJustRight).to.be.false;

      element.$.membersList.selectPrevious.restore();
    });

    test('_navigateOnUp does nothing in members view without tmpJustRight', () => {
      element._isDisplayMembers = true;
      element._tmpJustRight = false;
      const e = makeEvent();
      element._navigateOnUp(e);
      expect(e.detail.keyboardEvent.preventDefault).to.not.have.been.called;
    });

    test('_navigateOnUp selects previous collection when not in members and just navigated left', () => {
      element._isDisplayMembers = false;
      element._tmpJustLeft = true;
      sinon.stub(element.$.collectionsList, 'selectPrevious');

      const e = makeEvent();
      element._navigateOnUp(e);

      expect(e.detail.keyboardEvent.preventDefault).to.have.been.calledOnce;
      expect(element.$.collectionsList.selectPrevious).to.have.been.calledOnce;
      expect(element._tmpJustLeft).to.be.false;

      element.$.collectionsList.selectPrevious.restore();
    });
  });

  suite('_observeIsDisplayMembers', () => {
    test('sets slide-from-right animation and page 1 when displaying members', () => {
      element._isDisplayMembers = true;
      element._observeIsDisplayMembers();
      expect(element._entryAnimation).to.equal('slide-from-right-animation');
      expect(element._exitAnimation).to.equal('slide-left-animation');
      expect(element._selectedPage).to.equal(1);
    });

    test('sets slide-from-left animation and page 0 when displaying collections', () => {
      element._isDisplayMembers = false;
      element.selectedCollection = { uid: 'c1' };
      const fireSpy = sinon.spy(element, 'fire');
      element._observeIsDisplayMembers();
      expect(element._entryAnimation).to.equal('slide-from-left-animation');
      expect(element._exitAnimation).to.equal('slide-right-animation');
      expect(element._selectedPage).to.equal(0);
      expect(fireSpy).to.have.been.calledWith('navigate', { doc: element.selectedCollection });
      fireSpy.restore();
    });

    test('does not fire navigate when no selectedCollection on collections view', () => {
      element._isDisplayMembers = false;
      element.selectedCollection = null;
      const fireSpy = sinon.spy(element, 'fire');
      element._observeIsDisplayMembers();
      expect(fireSpy).to.not.have.been.calledWith('navigate');
      fireSpy.restore();
    });
  });

  test('_selectedCollectionChanged fires navigate event for collection', () => {
    const fireSpy = sinon.spy(element, 'fire');
    element._selectedCollectionChanged({ uid: 'c1', title: 'My Collection' });
    expect(fireSpy).to.have.been.calledWith('navigate', sinon.match({ doc: { uid: 'c1', title: 'My Collection' } }));
    fireSpy.restore();
  });

  test('_selectedCollectionChanged does nothing for falsy collection', () => {
    const fireSpy = sinon.spy(element, 'fire');
    element._selectedCollectionChanged(null);
    expect(fireSpy).to.not.have.been.called;
    fireSpy.restore();
  });

  test('_selectedMemberChanged does nothing for falsy doc', () => {
    expect(() => element._selectedMemberChanged(null)).to.not.throw();
    expect(() => element._selectedMemberChanged(undefined)).to.not.throw();
  });

  test('_refreshCollections resets and fetches the collections list', () => {
    const resetSpy = sinon.spy(element.$.collectionsList, 'reset');
    const fetchSpy = sinon.spy(element.$.collectionsList, 'fetch');
    element._refreshCollections();
    expect(resetSpy).to.have.been.calledOnce;
    expect(fetchSpy).to.have.been.calledOnce;
    resetSpy.restore();
    fetchSpy.restore();
  });

  test('displayMembers without index just sets _isDisplayMembers', () => {
    element._isDisplayMembers = false;
    element.displayMembers();
    expect(element._isDisplayMembers).to.be.true;
  });

  test('displayMembers does not select index when collection uid does not match', () => {
    element.selectedCollection = { uid: 'c1' };
    const selectSpy = sinon.stub(element.$.membersList, 'selectIndex');
    element.displayMembers({ uid: 'different' }, 0);
    expect(element._isDisplayMembers).to.be.true;
    expect(selectSpy).to.not.have.been.called;
    selectSpy.restore();
  });

  test('_removeFromMembers selects last item when removing the last element', () => {
    element.$.membersList.items = [{ uid: 'a' }, { uid: 'b' }];
    const selectSpy = sinon.stub(element.$.membersList, 'selectIndex');
    sinon.spy(element.$.membersList, 'splice');
    element._removeFromMembers('b');
    expect(selectSpy).to.have.been.calledWith(0);
    selectSpy.restore();
    element.$.membersList.splice.restore();
  });

  test('_removeFromMembers does nothing when uid is not found', () => {
    element.$.membersList.items = [{ uid: 'a' }];
    const spliceSpy = sinon.spy(element.$.membersList, 'splice');
    element._removeFromMembers('nonexistent');
    expect(spliceSpy).to.not.have.been.called;
    spliceSpy.restore();
  });
});

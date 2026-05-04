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
});

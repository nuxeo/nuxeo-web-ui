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
import { fixture, html, login } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-collections/nuxeo-favorites.js';

suite('nuxeo-favorites', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-favorites></nuxeo-favorites>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_computedClass', () => {
    test('should return list-item when not selected', () => {
      expect(element._computedClass(false)).to.equal('list-item');
    });

    test('should return list-item selected when selected', () => {
      expect(element._computedClass(true)).to.equal('list-item selected');
    });
  });

  suite('_selectedFavoriteChanged', () => {
    test('should not navigate when doc is falsy', () => {
      element._selectedFavoriteChanged(null);
    });
  });

  suite('_visibleChanged', () => {
    test('should call _refresh when visible and no favorite', () => {
      element.favorite = null;
      element.visible = true;
      sinon.stub(element, '_refresh');
      element._visibleChanged();
      expect(element._refresh).to.have.been.calledOnce;
      element._refresh.restore();
    });

    test('should not call _refresh when not visible', () => {
      element.visible = false;
      sinon.stub(element, '_refresh');
      element._visibleChanged();
      expect(element._refresh).to.not.have.been.called;
      element._refresh.restore();
    });
  });

  suite('_fetchFavorite', () => {
    test('should return cached favorite if already set', async () => {
      const fav = { uid: 'fav1' };
      element.favorite = fav;
      const result = await element._fetchFavorite();
      expect(result).to.equal(fav);
    });

    test('should execute operation and cache result', async () => {
      element.favorite = null;
      const resp = { uid: 'fav1', title: 'My Favorites' };
      sinon.stub(element.$.fetchFavOp, 'execute').resolves(resp);
      const result = await element._fetchFavorite();
      expect(result).to.equal(resp);
      expect(element.favorite).to.equal(resp);
    });

    test('should set favorite to null on 204 response', async () => {
      element.favorite = null;
      sinon.stub(element.$.fetchFavOp, 'execute').resolves({ status: 204 });
      const result = await element._fetchFavorite();
      expect(result).to.be.null;
      expect(element.favorite).to.be.null;
    });
  });

  suite('_refresh', () => {
    test('should set resultsCount to 0 and reset list when no favorite collection exists', async () => {
      sinon.stub(element, '_fetchFavorite').resolves(null);
      const resetSpy = sinon.spy(element.$.favoritesList, 'reset');
      await element._refresh();
      expect(element.$.favoritesProvider.resultsCount).to.equal(0);
      expect(resetSpy).to.have.been.calledOnce;
      expect(element.$.favoritesList._computedEmptyLabel).to.equal(element.i18n('favorites.empty'));
    });

    test('should fetch favorites list when favorite collection exists', async () => {
      const fav = { uid: 'fav-collection-1' };
      sinon.stub(element, '_fetchFavorite').resolves(fav);
      const fetchSpy = sinon.spy(element.$.favoritesList, 'fetch');
      await element._refresh();
      expect(element.$.favoritesProvider.params).to.deep.equal([fav.uid]);
      expect(element.$.favoritesProvider.page).to.equal(1);
      expect(fetchSpy).to.have.been.calledOnce;
    });

    test('should not call fetch on list when favorite is null', async () => {
      sinon.stub(element, '_fetchFavorite').resolves(null);
      const fetchSpy = sinon.spy(element.$.favoritesList, 'fetch');
      await element._refresh();
      expect(fetchSpy).to.not.have.been.called;
    });
  });

  suite('_removeFromFavorites', () => {
    test('should execute operation and fire event', async () => {
      const stub = sinon.stub(element.$.removeFromFavOp, 'execute').resolves();
      const listener = sinon.spy();
      element.addEventListener('removed-from-favorites', listener);
      const evt = {
        stopImmediatePropagation: sinon.spy(),
        model: { favorite: { uid: 'doc1' } },
      };
      element._removeFromFavorites(evt);
      expect(evt.stopImmediatePropagation).to.have.been.calledOnce;
      expect(element.$.removeFromFavOp.input).to.equal('doc1');
      await stub.returnValues[0];
      expect(listener).to.have.been.calledOnce;
    });
  });
});

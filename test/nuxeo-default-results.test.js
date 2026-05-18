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
import '../elements/nuxeo-results/nuxeo-default-results.js';

suite('nuxeo-default-results', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-default-results></nuxeo-default-results>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default _lastIndex to 0', () => {
      expect(element._lastIndex).to.equal(0);
    });
  });

  suite('_navigate', () => {
    test('should fire navigate event with doc from model', () => {
      const fireSpy = sinon.spy(element, 'fire');
      const item = { uid: 'doc-1', title: 'Doc 1' };
      const e = { model: { item, index: 0 }, stopPropagation: sinon.spy() };
      element._navigate(e);
      expect(fireSpy).to.have.been.calledWith('navigate', { doc: item, index: 0 });
      expect(e.stopPropagation).to.have.been.called;
    });

    test('should fire navigate event with doc from detail', () => {
      const fireSpy = sinon.spy(element, 'fire');
      const item = { uid: 'doc-2', title: 'Doc 2' };
      const e = { detail: { item, index: 1 }, stopPropagation: sinon.spy() };
      element._navigate(e);
      expect(fireSpy).to.have.been.calledWith('navigate', { doc: item, index: 1 });
    });
  });

  suite('_contentStoredInColdStorage', () => {
    test('should return true when doc has ColdStorage facet and coldContent', () => {
      element.hasFacet.withArgs(sinon.match.any, 'ColdStorage').returns(true);
      const doc = { properties: { 'coldstorage:coldContent': { digest: 'abc' } } };
      expect(element._contentStoredInColdStorage(doc)).to.be.ok;
    });

    test('should return false when doc does not have ColdStorage facet', () => {
      const doc = { properties: { 'coldstorage:coldContent': { digest: 'abc' } } };
      expect(element._contentStoredInColdStorage(doc)).to.not.be.ok;
    });

    test('should return false when doc has no coldContent property', () => {
      element.hasFacet.withArgs(sinon.match.any, 'ColdStorage').returns(true);
      const doc = { properties: {} };
      expect(element._contentStoredInColdStorage(doc)).to.not.be.ok;
    });
  });

  suite('_refreshAndFetch', () => {
    test('should delegate to nested results element', () => {
      sinon.stub(element.$.results, '_refreshAndFetch');
      element._refreshAndFetch();
      expect(element.$.results._refreshAndFetch).to.have.been.calledOnce;
      element.$.results._refreshAndFetch.restore();
    });
  });
});

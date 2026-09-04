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
import '../elements/nuxeo-document-bulk-actions/nuxeo-clipboard-documents-button.js';

suite('nuxeo-clipboard-documents-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-clipboard-documents-button></nuxeo-clipboard-documents-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasType').returns(false);
    sinon.stub(element, 'isVersion').returns(false);
    sinon.stub(element, 'isProxy').returns(false);
    sinon.stub(element, 'isCollectionMember').returns(false);
    sinon.stub(element, 'hasFacet').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default tooltipPosition to bottom', () => {
      expect(element.tooltipPosition).to.equal('bottom');
    });
  });

  suite('_isAvailable', () => {
    const doc = () => {
      return { uid: '1', facets: [] };
    };

    test('should return true for valid collection member documents', () => {
      element.documents = [doc()];
      element.isCollectionMember.returns(true);
      expect(element._isAvailable()).to.be.true;
    });

    test('should return true for documents with Collection facet', () => {
      element.documents = [{ uid: '1', facets: ['Collection'] }];
      expect(element._isAvailable()).to.be.true;
    });

    test('should return false when a document is trashed', () => {
      element.documents = [doc()];
      element.isCollectionMember.returns(true);
      element.isTrashed.returns(true);
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when a document is Favorites type', () => {
      element.documents = [doc()];
      element.isCollectionMember.returns(true);
      element.hasType.withArgs(sinon.match.any, 'Favorites').returns(true);
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when a document is a version', () => {
      element.documents = [doc()];
      element.isCollectionMember.returns(true);
      element.isVersion.returns(true);
      expect(element._isAvailable()).to.be.false;
    });

    // a published document must be able to reach the clipboard so it can be reorganised
    // within the publication area; where it may then be pasted is up to nuxeo-clipboard
    test('should return true when a document is a proxy', () => {
      element.documents = [doc()];
      element.isCollectionMember.returns(true);
      element.isProxy.returns(true);
      expect(element._isAvailable()).to.be.true;
    });
  });

  suite('addToClipBoard', () => {
    test('should fire add-to-clipboard event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element.documents = [{ uid: '1', facets: [] }];
      element.addToClipBoard();
      expect(fireSpy).to.have.been.calledWith('add-to-clipboard', { documents: element.documents });
    });

    test('should fire clear-selected-items event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element.documents = [{ uid: '1', facets: [] }];
      element.addToClipBoard();
      expect(fireSpy).to.have.been.calledWith('clear-selected-items');
    });
  });
});

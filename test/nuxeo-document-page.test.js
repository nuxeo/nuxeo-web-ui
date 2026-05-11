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
import '../elements/document/nuxeo-document-page.js';

suite('nuxeo-document-page', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-page></nuxeo-document-page>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasCollections').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default to comments tab', () => {
      expect(element.selectedTab).to.equal('comments');
    });

    test('should default opened to false', () => {
      expect(element.opened).to.be.false;
    });
  });

  suite('_toggleOpened', () => {
    test('should toggle opened state from false to true', () => {
      element.opened = false;
      element._toggleOpened();
      expect(element.opened).to.be.true;
    });

    test('should toggle opened state from true to false', () => {
      element.opened = true;
      element._toggleOpened();
      expect(element.opened).to.be.false;
    });
  });

  suite('_isMutable', () => {
    test('should return true for a normal mutable document', () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.returns(false);
      element.isTrashed.returns(false);
      expect(element._isMutable(doc)).to.be.true;
    });

    test('should return false for an Immutable document', () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.withArgs(doc, 'Immutable').returns(true);
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should return false for a Root document', () => {
      const doc = { uid: '1', type: 'Root' };
      element.hasFacet.returns(false);
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should return false for a trashed document', () => {
      const doc = { uid: '1', type: 'File' };
      element.isTrashed.returns(true);
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should throw for null document', () => {
      expect(() => element._isMutable(null)).to.throw();
    });
  });

  suite('_hasCollections', () => {
    test('should delegate to hasCollections', () => {
      const doc = { uid: '1' };
      element.hasCollections.returns(true);
      expect(element._hasCollections(doc)).to.be.true;
    });
  });

  suite('_documentChanged', () => {
    test('should switch to activity tab when document has NuxeoEventListener facet', () => {
      const doc = { uid: '1' };
      element.hasFacet.withArgs(doc, 'NuxeoEventListener').returns(true);
      element._documentChanged(doc);
      expect(element.selectedTab).to.equal('activity');
    });

    test('should switch to activity tab for non-Commentable documents', () => {
      const doc = { uid: '1' };
      element.hasFacet.returns(false);
      element._documentChanged(doc);
      expect(element.selectedTab).to.equal('activity');
    });
  });
});

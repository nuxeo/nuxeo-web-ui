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
import '../elements/nuxeo-publication/nuxeo-publish-button.js';

suite('nuxeo-publish-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-publish-button></nuxeo-publish-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'isPublishable').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default icon to editor:publish', () => {
      expect(element.icon).to.equal('editor:publish');
    });

    test('should default selectedTab to internal', () => {
      expect(element.selectedTab).to.equal('internal');
    });

    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_computeLabel', () => {
    test('should return publication tooltip label', () => {
      const label = element._computeLabel();
      expect(label).to.equal('publication.button.tooltip');
    });
  });

  suite('_isAvailable', () => {
    test('should return falsy when no document or documents', () => {
      element.document = null;
      element.documents = null;
      expect(element._isAvailable()).to.not.be.ok;
    });

    test('should return true when document is publishable', () => {
      element.document = { uid: '1', type: 'File' };
      element.isPublishable.returns(true);
      expect(element._isAvailable()).to.be.true;
    });

    test('should return falsy when document is not publishable', () => {
      element.document = { uid: '1', type: 'File' };
      element.isPublishable.returns(false);
      element.documents = null;
      expect(element._isAvailable()).to.not.be.ok;
    });

    test('should return true when all documents are publishable', () => {
      element.document = null;
      const docs = [{ uid: '1' }, { uid: '2' }];
      element.documents = docs;
      element.isPublishable.returns(true);
      expect(element._isAvailable()).to.be.true;
    });

    test('should return false when some documents are not publishable', () => {
      element.document = null;
      const doc1 = { uid: '1' };
      const doc2 = { uid: '2' };
      element.documents = [doc1, doc2];
      element.isPublishable.withArgs(doc1).returns(true);
      element.isPublishable.withArgs(doc2).returns(false);
      expect(element._isAvailable()).to.be.false;
    });
  });

  suite('_publishContext', () => {
    test('should return empty object when not opened', () => {
      element.opened = false;
      const ctx = element._publishContext();
      expect(ctx).to.deep.equal({});
    });

    test('should return context with document when opened', () => {
      element.opened = true;
      const doc = { uid: '1' };
      element.document = doc;
      element.documents = [doc];
      const ctx = element._publishContext();
      expect(ctx.document).to.equal(doc);
      expect(ctx.selection).to.deep.equal([doc]);
    });
  });
});

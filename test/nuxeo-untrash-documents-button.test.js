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
import '../elements/nuxeo-document-bulk-actions/nuxeo-untrash-documents-button.js';

suite('nuxeo-untrash-documents-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-untrash-documents-button></nuxeo-untrash-documents-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasPermission').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default icon to nuxeo:restore-deleted', () => {
      expect(element.icon).to.equal('nuxeo:restore-deleted');
    });

    test('should default operation to Document.Untrash', () => {
      expect(element.operation).to.equal('Document.Untrash');
    });
  });

  suite('_docHasPermissions', () => {
    test('should return true when doc has Write permission', () => {
      const doc = { uid: '1' };
      element.hasPermission.withArgs(doc, 'Write').returns(true);
      expect(element._docHasPermissions(doc)).to.be.true;
    });

    test('should return false when doc lacks Write permission', () => {
      const doc = { uid: '1' };
      expect(element._docHasPermissions(doc)).to.be.false;
    });
  });

  suite('_checkDocsAreTrashed', () => {
    test('should return true when all docs are trashed', () => {
      element.documents = [{ uid: '1' }, { uid: '2' }];
      element.isTrashed.returns(true);
      expect(element._checkDocsAreTrashed()).to.be.true;
    });

    test('should return false when some docs are not trashed', () => {
      const doc1 = { uid: '1' };
      const doc2 = { uid: '2' };
      element.documents = [doc1, doc2];
      element.isTrashed.withArgs(doc1).returns(true);
      element.isTrashed.withArgs(doc2).returns(false);
      expect(element._checkDocsAreTrashed()).to.be.false;
    });
  });

  suite('_checkDocsPermissions', () => {
    test('should set docsHavePermissions to true when all have Write', () => {
      element.documents = [{ uid: '1' }];
      element.hasPermission.returns(true);
      element._checkDocsPermissions();
      expect(element.docsHavePermissions).to.be.true;
    });

    test('should set docsHavePermissions to false when some lack Write', () => {
      const doc1 = { uid: '1' };
      element.documents = [doc1];
      element.hasPermission.withArgs(doc1, 'Write').returns(false);
      element._checkDocsPermissions();
      expect(element.docsHavePermissions).to.be.false;
    });
  });
});

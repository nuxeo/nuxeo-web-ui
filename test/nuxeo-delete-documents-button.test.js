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
import '../elements/nuxeo-document-bulk-actions/nuxeo-delete-documents-button.js';

suite('nuxeo-delete-documents-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-delete-documents-button></nuxeo-delete-documents-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasPermission').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default hard to false', () => {
      expect(element.hard).to.be.false;
    });
  });

  suite('_operation', () => {
    test('should return Document.Trash when hard is false', () => {
      element.hard = false;
      expect(element._operation()).to.equal('Document.Trash');
    });

    test('should return Document.Delete when hard is true', () => {
      element.hard = true;
      expect(element._operation()).to.equal('Document.Delete');
    });
  });

  suite('_docHasPermissions', () => {
    test('should return true when doc has Remove permission', () => {
      const doc = { uid: '1' };
      element.hasPermission.withArgs(doc, 'Remove').returns(true);
      expect(element._docHasPermissions(doc)).to.be.true;
    });

    test('should return false when doc lacks Remove permission', () => {
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

  suite('_updateIcon', () => {
    test('should set delete-permanently icon when hard', () => {
      element._updateIcon(true);
      expect(element.icon).to.equal('nuxeo:delete-permanently');
    });

    test('should set delete icon when not hard', () => {
      element._updateIcon(false);
      expect(element.icon).to.equal('nuxeo:delete');
    });
  });

  suite('_updateLabel', () => {
    test('should set permanently label when hard', () => {
      element._updateLabel(true);
      expect(element.label).to.equal('deleteDocumentsButton.tooltip.permanently');
    });

    test('should set normal label when not hard', () => {
      element._updateLabel(false);
      expect(element.label).to.equal('deleteDocumentsButton.tooltip');
    });
  });
});

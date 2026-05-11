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
import '../elements/nuxeo-document-bulk-actions/nuxeo-download-documents-button.js';

suite('nuxeo-download-documents-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-download-documents-button></nuxeo-download-documents-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('_isAvailable', () => {
    test('should return true when documents are regular array', () => {
      element.documents = [{ uid: '1' }];
      expect(element._isAvailable()).to.be.true;
    });
  });

  suite('_params', () => {
    test('should return selection filename when no document', () => {
      element.document = null;
      const params = element._params();
      expect(params.filename).to.include('bulkDownload');
    });

    test('should return title-based filename for Collection document', () => {
      const doc = { uid: '1', title: 'My Collection' };
      element.document = doc;
      element.hasFacet.withArgs(doc, 'Collection').returns(true);
      const params = element._params();
      expect(params.filename).to.include('My Collection');
      expect(params.filename).to.include('.zip');
    });

    test('should return title-based filename for Folderish document', () => {
      const doc = { uid: '1', title: 'My Folder' };
      element.document = doc;
      element.hasFacet.withArgs(doc, 'Folderish').returns(true);
      const params = element._params();
      expect(params.filename).to.include('My Folder');
      expect(params.filename).to.include('.zip');
    });
  });

  suite('_input', () => {
    test('should return docs: prefixed uid string for documents array', () => {
      element.documents = [{ uid: 'a' }, { uid: 'b' }];
      const input = element._input();
      expect(input).to.equal('docs:a,b');
    });

    test('should use document uid when document is set', () => {
      element.document = { uid: 'doc-1' };
      element.documents = [];
      const input = element._input();
      expect(input).to.equal('docs:doc-1');
    });
  });
});

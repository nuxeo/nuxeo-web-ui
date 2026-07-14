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
import '../elements/nuxeo-results/nuxeo-document-trash-content.js';

suite('nuxeo-document-trash-content', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-trash-content></nuxeo-document-trash-content>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasPermission').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default provider to advanced_document_content', () => {
      expect(element.provider).to.equal('advanced_document_content');
    });

    test('should default pageSize to 40', () => {
      expect(element.pageSize).to.equal(40);
    });

    test('should default schemas', () => {
      expect(element.schemas).to.equal('dublincore,common,uid,file');
    });

    test('should default enrichers to thumbnail, permissions', () => {
      expect(element.enrichers).to.equal('thumbnail, permissions');
    });

    test('should default _lastIndex to 0', () => {
      expect(element._lastIndex).to.equal(0);
    });
  });

  suite('_computeParams', () => {
    test('should return params with ecm_trashed true when document exists', () => {
      const doc = { uid: 'doc-123' };
      const params = element._computeParams(doc);
      expect(params).to.deep.equal({ ecm_parentId: 'doc-123', ecm_trashed: true });
    });

    test('should return empty object when document is null', () => {
      expect(element._computeParams(null)).to.deep.equal({});
    });

    test('should return empty object when document is undefined', () => {
      expect(element._computeParams(undefined)).to.deep.equal({});
    });
  });

  suite('_computeSortOptions', () => {
    test('should return 4 sort options', () => {
      const options = element._computeSortOptions();
      expect(options).to.have.length(4);
    });

    test('should have dc:title as first option', () => {
      const options = element._computeSortOptions();
      expect(options[0].field).to.equal('dc:title');
    });

    test('should have dc:created as selected option', () => {
      const options = element._computeSortOptions();
      const selected = options.find((o) => o.selected);
      expect(selected.field).to.equal('dc:created');
    });

    test('should include dc:modified and dc:lastContributor', () => {
      const options = element._computeSortOptions();
      const fields = options.map((o) => o.field);
      expect(fields).to.include('dc:modified');
      expect(fields).to.include('dc:lastContributor');
    });
  });

  suite('_emptyTrash', () => {
    test('should call execute on opEmptyTrash', () => {
      const executeStub = sinon.stub(element.$.opEmptyTrash, 'execute').resolves();
      element._emptyTrash();
      expect(executeStub).to.have.been.calledOnce;
      executeStub.restore();
    });
  });
});

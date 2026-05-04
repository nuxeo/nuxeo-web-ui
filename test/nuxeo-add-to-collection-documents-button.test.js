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
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-operation-button.js';
import '../elements/nuxeo-document-bulk-actions/nuxeo-add-to-collection-documents-button.js';

suite('nuxeo-add-to-collection-documents-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(
      html`<nuxeo-add-to-collection-documents-button></nuxeo-add-to-collection-documents-button>`,
    );
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default icon to nuxeo:collections', () => {
      expect(element.icon).to.equal('nuxeo:collections');
    });

    test('should default operation to Document.AddToCollection', () => {
      expect(element.operation).to.equal('Document.AddToCollection');
    });
  });

  suite('_params', () => {
    test('should return collection in params', () => {
      element.collection = 'col-123';
      expect(element._params()).to.deep.equal({ collection: 'col-123' });
    });
  });

  suite('_isNew', () => {
    test('should return true when collection is -1', () => {
      element.collection = -1;
      expect(element._isNew()).to.be.true;
    });

    test('should return false for a regular collection id', () => {
      element.collection = 'col-123';
      expect(element._isNew()).to.be.false;
    });
  });

  suite('_isValid', () => {
    test('should return true when collection is set', () => {
      element.collection = 'col-123';
      expect(element._isValid()).to.be.ok;
    });

    test('should return false when collection is empty', () => {
      element.collection = '';
      expect(element._isValid()).to.not.be.ok;
    });

    test('should return false when collection is null', () => {
      element.collection = null;
      expect(element._isValid()).to.not.be.ok;
    });
  });

  suite('_resultsFilter', () => {
    test('should return true for regular entries', () => {
      expect(element._resultsFilter({ id: 'col-123' })).to.be.true;
    });

    test('should return false for entries with -999999', () => {
      expect(element._resultsFilter({ id: 'col-999999' })).to.be.false;
    });
  });

  suite('_newEntryFormatter', () => {
    test('should return object with id -1 and displayLabel', () => {
      const result = element._newEntryFormatter('My New Collection');
      expect(result.id).to.equal(-1);
      expect(result.displayLabel).to.equal('My New Collection');
    });
  });

  suite('_resetPopup', () => {
    test('should clear collection and description', () => {
      element.collection = 'col-123';
      element.description = 'test desc';
      element._resetPopup();
      expect(element.collection).to.be.null;
      expect(element.description).to.equal('');
    });
  });
});

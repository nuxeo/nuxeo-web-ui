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

  suite('_resultAndSelectionFormatter', () => {
    test('should escape HTML for regular entries', () => {
      const result = element._resultAndSelectionFormatter({ id: 'col-1', displayLabel: '<b>Col</b>' });
      expect(result).to.not.contain('<b>');
    });

    test('should use title when displayLabel is absent', () => {
      const result = element._resultAndSelectionFormatter({ id: 'col-1', title: 'My Collection' });
      expect(result).to.include('My Collection');
    });

    test('should return raw label for new entry (id === -1)', () => {
      const result = element._resultAndSelectionFormatter({ id: -1, displayLabel: '<em>New</em>' });
      expect(result).to.equal('<em>New</em>');
    });
  });

  suite('_execute', () => {
    test('should toggle dialog', () => {
      sinon.stub(element.$.dialog, 'toggle');
      element._execute();
      expect(element.$.dialog.toggle).to.have.been.calledOnce;
    });
  });

  suite('_toggleDialog', () => {
    test('should toggle dialog', () => {
      sinon.stub(element.$.dialog, 'toggle');
      element._toggleDialog();
      expect(element.$.dialog.toggle).to.have.been.calledOnce;
    });
  });

  suite('_isHidden', () => {
    test('should return false when documents have no NotCollectionMember facet', () => {
      element.documents = [
        { uid: 'doc1', facets: [] },
        { uid: 'doc2', facets: [] },
      ];
      expect(element._isHidden()).to.be.false;
    });

    test('should return true when any document has NotCollectionMember facet', () => {
      element.hasFacet.restore();
      sinon.stub(element, 'hasFacet').callsFake((doc, facet) => facet === 'NotCollectionMember' && doc.uid === 'doc2');
      element.documents = [{ uid: 'doc1' }, { uid: 'doc2' }];
      expect(element._isHidden()).to.be.true;
    });

    test('should return true when documents is empty', () => {
      element.documents = [];
      expect(element._isHidden()).to.be.true;
    });

    test('should return true when documents is null', () => {
      element.documents = null;
      expect(element._isHidden()).to.be.true;
    });
  });

  suite('add', () => {
    test('should call _addToCollection directly when collection is not new', () => {
      element.collection = 'existing-col-id';
      sinon.stub(element, '_addToCollection');
      element.add();
      expect(element._addToCollection).to.have.been.calledOnce;
    });

    test('should create collection then add when collection is new', async () => {
      element.collection = -1;
      element.description = 'New collection desc';
      const createOp = { input: null, params: null, execute: sinon.stub().resolves({ uid: 'new-col-uid' }) };
      sinon.stub(element, '$$').returns(createOp);
      element.$.nxSelect = { selectedItem: { displayLabel: 'My New Col' } };
      sinon.stub(element, '_addToCollection');
      await element.add();
      expect(createOp.params).to.deep.equal({ name: 'My New Col', description: 'New collection desc' });
      expect(element.collection).to.equal('new-col-uid');
      expect(element._addToCollection).to.have.been.calledOnce;
    });
  });

  suite('_addToCollection', () => {
    test('should set input, params and fire event for regular documents', async () => {
      element.documents = [{ uid: 'doc1' }, { uid: 'doc2' }];
      element.collection = 'col-123';
      const parentExecute = sinon.stub(Nuxeo.OperationButton.prototype, '_execute').resolves();
      sinon.stub(element, 'fire');
      sinon.stub(element, '_resetPopup');
      sinon.stub(element, '_toggleDialog');
      element._addToCollection();
      await parentExecute.firstCall.returnValue;
      expect(element.input).to.equal(element.documents);
      expect(element.params).to.deep.equal({ collection: 'col-123' });
      expect(element.fire).to.have.been.calledWith('added-to-collection', {
        docIds: ['doc1', 'doc2'],
        collectionId: 'col-123',
      });
      expect(element._resetPopup).to.have.been.calledOnce;
      expect(element._toggleDialog).to.have.been.calledOnce;
      parentExecute.restore();
    });
  });
});

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
import '../elements/nuxeo-recent-documents/nuxeo-recent-documents.js';

suite('nuxeo-recent-documents', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-recent-documents></nuxeo-recent-documents>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'isTrashed').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default maxSize to 10', () => {
      expect(element.maxSize).to.equal(10);
    });
  });

  suite('_computedClass', () => {
    test('should return list-item when not selected', () => {
      expect(element._computedClass(false)).to.equal('list-item');
    });

    test('should return list-item selected when selected', () => {
      expect(element._computedClass(true)).to.equal('list-item selected');
    });
  });

  suite('_title', () => {
    test('should return a value (via i18n) for Root type', () => {
      const result = element._title({ type: 'Root', title: 'Main' });
      expect(result).to.be.a('string');
    });

    test('should return title for non-Root types', () => {
      expect(element._title({ type: 'File', title: 'My File' })).to.equal('My File');
    });

    test('should return undefined for null document', () => {
      expect(element._title(null)).to.be.undefined;
    });
  });

  suite('_selectedRecentChanged', () => {
    test('should not throw when doc is null', () => {
      expect(() => element._selectedRecentChanged(null)).to.not.throw();
    });
  });

  suite('_addOrUpdateStorage', () => {
    test('should call add when doc is not in storage', () => {
      sinon.stub(element, 'contains').returns(false);
      const addSpy = sinon.stub(element, 'add');
      const updateSpy = sinon.stub(element, 'update');
      element._addOrUpdateStorage({ uid: '1' });
      expect(addSpy).to.have.been.calledOnce;
      expect(updateSpy).to.not.have.been.called;
    });

    test('should call update when doc is already in storage', () => {
      sinon.stub(element, 'contains').returns(true);
      const addSpy = sinon.stub(element, 'add');
      const updateSpy = sinon.stub(element, 'update');
      element._addOrUpdateStorage({ uid: '1' });
      expect(updateSpy).to.have.been.calledOnce;
      expect(addSpy).to.not.have.been.called;
    });
  });

  suite('add', () => {
    test('should not throw when storage leaves documents null', () => {
      element.documents = null;
      sinon.stub(element.$.storage, 'add');
      expect(() => element.add({ uid: '1', type: 'File' })).to.not.throw();
    });

    test('should trim the list to maxSize', () => {
      element.maxSize = 2;
      element.documents = [{ uid: '1' }, { uid: '2' }, { uid: '3' }];
      sinon.stub(element.$.storage, 'add');
      element.add({ uid: '4' });
      expect(element.documents).to.have.lengthOf(2);
    });
  });

  suite('_currentDocumentChanged', () => {
    test('should not process trashed documents', () => {
      element.isTrashed.returns(true);
      const spy = sinon.stub(element, '_addOrUpdateStorage');
      element._currentDocumentChanged({ uid: '1' });
      expect(spy).to.not.have.been.called;
    });

    test('should call _addOrUpdateStorage when documents list exists', () => {
      element.documents = [];
      sinon.stub(element, 'contains').returns(false);
      const addSpy = sinon.stub(element, 'add');
      element._currentDocumentChanged({ uid: '1', type: 'File' });
      expect(addSpy).to.have.been.calledOnce;
    });
  });
});

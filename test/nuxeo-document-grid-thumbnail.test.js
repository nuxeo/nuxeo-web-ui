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
import '../elements/nuxeo-data-grid/nuxeo-document-grid-thumbnail.js';

suite('nuxeo-document-grid-thumbnail', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-grid-thumbnail></nuxeo-document-grid-thumbnail>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default selected to false', () => {
      expect(element.selected).to.be.false;
    });

    test('should default offset to -1', () => {
      expect(element.offset).to.equal(-1);
    });

    test('should default selectedItems to empty array', () => {
      expect(element.selectedItems).to.deep.equal([]);
    });
  });

  suite('_thumbnail', () => {
    test('should return thumbnail URL with clientReason for doc with uid', () => {
      const doc = { uid: '1', contextParameters: { thumbnail: { url: 'http://example.com/thumb.jpg' } } };
      const result = element._thumbnail(doc);
      expect(result).to.include('http://example.com/thumb.jpg');
      expect(result).to.include('clientReason=view');
    });

    test('should return empty string when no thumbnail context', () => {
      const doc = { uid: '1', contextParameters: {} };
      expect(element._thumbnail(doc)).to.equal('');
    });

    test('should return empty string when doc is null', () => {
      expect(element._thumbnail(null)).to.equal('');
    });
  });

  suite('_selectedItemsChanged', () => {
    test('should enable selectionMode when items exist', () => {
      element.selectedItems = [{ uid: '1' }];
      element._selectedItemsChanged();
      expect(element.selectionMode).to.be.true;
    });

    test('should disable selectionMode when no items', () => {
      element.selectedItems = [];
      element._selectedItemsChanged();
      expect(element.selectionMode).to.be.false;
    });
  });
});

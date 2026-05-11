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
import '../elements/nuxeo-collections/nuxeo-collection-remove-action.js';

suite('nuxeo-collection-remove-action', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-collection-remove-action></nuxeo-collection-remove-action>`);
  });

  teardown(() => {
    server.restore();
  });

  suite('constructor defaults', () => {
    test('should set icon to nuxeo:remove', () => {
      expect(element.icon).to.equal('nuxeo:remove');
    });

    test('should set operation to Collection.RemoveFromCollection', () => {
      expect(element.operation).to.equal('Collection.RemoveFromCollection');
    });

    test('should set label', () => {
      expect(element.label).to.equal('collections.remove');
    });

    test('should set event to refresh', () => {
      expect(element.event).to.equal('refresh');
    });

    test('should set syncIndexing to true', () => {
      expect(element.syncIndexing).to.be.true;
    });
  });

  suite('_isHidden', () => {
    test('should return true when collection has no contextParameters', () => {
      expect(element._isHidden([], {})).to.be.true;
    });

    test('should return true when collection has no permissions', () => {
      expect(element._isHidden([], { contextParameters: {} })).to.be.true;
    });

    test('should return true when permissions lack WriteProperties', () => {
      const col = { contextParameters: { permissions: ['Read'] } };
      expect(element._isHidden([], col)).to.be.true;
    });

    test('should return false when permissions include WriteProperties', () => {
      const col = { contextParameters: { permissions: ['WriteProperties', 'Read'] } };
      expect(element._isHidden([], col)).to.be.false;
    });
  });

  suite('_params', () => {
    test('should return collection uid', () => {
      element.collection = { uid: 'col-1' };
      expect(element._params()).to.deep.equal({ collection: 'col-1' });
    });
  });
});

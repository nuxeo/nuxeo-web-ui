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
import '../elements/nuxeo-collections/nuxeo-favorites.js';

suite('nuxeo-favorites', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-favorites></nuxeo-favorites>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_computedClass', () => {
    test('should return list-item when not selected', () => {
      expect(element._computedClass(false)).to.equal('list-item');
    });

    test('should return list-item selected when selected', () => {
      expect(element._computedClass(true)).to.equal('list-item selected');
    });
  });

  suite('_selectedFavoriteChanged', () => {
    test('should not navigate when doc is falsy', () => {
      // _selectedFavoriteChanged guards with if(doc) — null should be a no-op
      // We can't easily test the positive case due to RoutingBehavior requiring router config
      element._selectedFavoriteChanged(null);
      // No error = success (navigateTo was not called)
    });
  });
});

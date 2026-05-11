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
import '../elements/nuxeo-browser/nuxeo-repositories.js';

suite('nuxeo-repositories', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-repositories></nuxeo-repositories>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_isHidden', () => {
    test('should return true when fewer than 2 repositories', () => {
      expect(element._isHidden([])).to.be.true;
      expect(element._isHidden([{ name: 'default' }])).to.be.true;
    });

    test('should return false when 2 or more repositories', () => {
      expect(element._isHidden([{ name: 'default' }, { name: 'other' }])).to.be.false;
    });
  });

  suite('_updateSelected', () => {
    test('should use repository name from connection', () => {
      element.$.nx.repositoryName = 'myrepo';
      element._updateSelected();
      expect(element._selected).to.equal('myrepo');
    });

    test('should fall back to default repo when connection has no repositoryName', () => {
      element.$.nx.repositoryName = '';
      element.repositories = [
        { name: 'other', isDefault: false },
        { name: 'default', isDefault: true },
      ];
      element._updateSelected();
      expect(element._selected).to.equal('default');
    });

    test('should leave _selected falsy when no default repo and no connection name', () => {
      element.$.nx.repositoryName = '';
      element.repositories = [{ name: 'other', isDefault: false }];
      element._updateSelected();
      expect(element._selected).to.not.be.ok;
    });
  });
});

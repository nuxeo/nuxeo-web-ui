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
import '../elements/nuxeo-drive-sync-toggle-button.js';

suite('nuxeo-drive-sync-toggle-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-drive-sync-toggle-button></nuxeo-drive-sync-toggle-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isVersion').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_icon', () => {
    test('should return sync-disabled when synchronized', () => {
      expect(element._icon(true)).to.equal('notification:sync-disabled');
    });

    test('should return sync when not synchronized', () => {
      expect(element._icon(false)).to.equal('notification:sync');
    });
  });

  suite('_computeLabel', () => {
    test('should return unsync label when synchronized', () => {
      const label = element._computeLabel(true);
      expect(label).to.include('unsync');
    });

    test('should return sync label when not synchronized', () => {
      const label = element._computeLabel(false);
      expect(label).to.include('sync');
    });
  });

  suite('_isAvailable', () => {
    test('should return false when no document', () => {
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false for version documents', () => {
      element.document = { uid: '1', type: 'File' };
      element.isVersion.returns(true);
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false for excluded doctypes', () => {
      element.document = { uid: '1', type: 'Domain' };
      expect(element._isAvailable()).to.be.false;
    });
  });
});

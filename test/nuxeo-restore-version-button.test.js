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
import '../elements/nuxeo-restore-version-button/nuxeo-restore-version-button.js';

suite('nuxeo-restore-version-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-restore-version-button></nuxeo-restore-version-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'isRecord').returns(false);
    // Stub the _update observer to prevent it from calling nuxeo-operation execute
    sinon.stub(element, '_update');
  });

  teardown(() => {
    server.restore();
  });

  suite('_isAvailable', () => {
    test('should return false when no document', () => {
      element.document = null;
      element.latest = null;
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when no latest', () => {
      element.document = {
        uid: '1',
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      element.latest = null;
      expect(element._isAvailable()).to.be.false;
    });

    test('should return true when versions differ', () => {
      element.document = {
        uid: '1',
        isVersion: true,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      element.latest = {
        uid: '2',
        isCheckedOut: false,
        properties: { 'uid:major_version': 2, 'uid:minor_version': 0 },
      };
      expect(element._isAvailable()).to.be.true;
    });

    test('should return isCheckedOut when versions match', () => {
      element.document = {
        uid: '1',
        isVersion: true,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      element.latest = {
        uid: '2',
        isCheckedOut: true,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      expect(element._isAvailable()).to.be.true;
    });

    test('should return false when latest is a record', () => {
      element.document = {
        uid: '1',
        isVersion: true,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      element.latest = {
        uid: '2',
        isCheckedOut: false,
        properties: { 'uid:major_version': 2, 'uid:minor_version': 0 },
      };
      element.isRecord.returns(true);
      expect(element._isAvailable()).to.be.false;
    });
  });
});

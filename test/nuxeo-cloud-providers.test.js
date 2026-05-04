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
import '../elements/nuxeo-cloud-services/nuxeo-cloud-providers.js';

suite('nuxeo-cloud-providers', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-cloud-providers></nuxeo-cloud-providers>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_addEntry', () => {
    test('should initialize new entry with defaults', () => {
      element._addEntry();
      expect(element._isNew).to.be.true;
      expect(element._selectedEntry).to.exist;
      expect(element._selectedEntry['entity-type']).to.equal('nuxeoOAuth2ServiceProvider');
      expect(element._selectedEntry.isEnabled).to.be.false;
    });
  });

  suite('_editEntry', () => {
    test('should clone entry and convert scopes array to string', () => {
      const item = {
        serviceName: 'google',
        scopes: ['email', 'profile'],
        isEnabled: true,
        'entity-type': 'nuxeoOAuth2ServiceProvider',
      };
      const mockEvent = { target: { parentNode: { item } } };
      element._editEntry(mockEvent);
      expect(element._isNew).to.be.false;
      expect(element._selectedEntry.scopes).to.equal('email,profile');
      expect(element._selectedServiceName).to.equal('google');
    });
  });

  suite('_computeDialogHeading', () => {
    test('should return add heading for new entry', () => {
      expect(element._computeDialogHeading(true)).to.include('cloudProviders');
    });

    test('should return edit heading for existing entry', () => {
      expect(element._computeDialogHeading(false)).to.include('cloudProviders');
    });
  });
});

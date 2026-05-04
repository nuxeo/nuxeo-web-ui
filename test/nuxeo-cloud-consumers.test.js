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
import '../elements/nuxeo-cloud-services/nuxeo-cloud-consumers.js';

suite('nuxeo-cloud-consumers', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-cloud-consumers></nuxeo-cloud-consumers>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default oauth2Consumers to empty array', () => {
      expect(element.oauth2Consumers).to.deep.equal([]);
    });
  });

  suite('_addEntry', () => {
    test('should create new entry with oauth2Client entity type', () => {
      element._addEntry();
      expect(element._selectedEntry).to.exist;
      expect(element._selectedEntry['entity-type']).to.equal('oauth2Client');
      expect(element._selectedEntry.redirectURIs).to.equal('');
    });
  });

  suite('_editEntry', () => {
    test('should clone entry and convert redirect URIs array to string', () => {
      const item = {
        id: 'client1',
        redirectURIs: ['http://localhost:8080/callback', 'http://example.com/callback'],
        isEnabled: true,
        'entity-type': 'oauth2Client',
      };
      const mockEvent = { target: { parentNode: { item } } };
      element._editEntry(mockEvent);
      expect(element._selectedEntry.redirectURIs).to.be.a('string');
      expect(element._selectedEntry.redirectURIs).to.include('http://localhost:8080/callback');
      expect(element._selectedClientId).to.equal('client1');
    });
  });
});

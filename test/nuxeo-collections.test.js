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

/**
 * Unit tests for nuxeo-collections (WEBUI-1823).
 *
 * Verifies that the user_collections page provider request does NOT include
 * hardcoded sort parameters (sortBy / sortOrder), so that any server-side
 * customisation of the sort order is respected.
 */
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-collections/nuxeo-collections.js';

const jsonHeader = { 'Content-Type': 'application/json' };

const emptyPageProviderResponse = JSON.stringify({
  'entity-type': 'documents',
  isPaginable: true,
  resultsCount: 0,
  pageSize: 40,
  maxPageSize: 40,
  currentPageSize: 0,
  currentPageIndex: 0,
  numberOfPages: 0,
  isPreviousPageAvailable: false,
  isNextPageAvailable: false,
  isLastPageAvailable: false,
  isSortable: true,
  entries: [],
});

suite('nuxeo-collections — WEBUI-1823: no hardcoded sort on user_collections provider', () => {
  let server;

  setup(async () => {
    server = await login();
    // Stub the user_collections page provider endpoint (no sortBy/sortOrder in URL)
    server.respondWith(
      'GET',
      /\/api\/v1\/search\/pp\/user_collections\/execute/,
      [200, jsonHeader, emptyPageProviderResponse],
    );
    // Stub the Operation.RemoveFromCollection (required by nuxeo-operation import)
    server.respondWith('POST', '/api/v1/automation/Collection.RemoveFromCollection', [
      200,
      jsonHeader,
      JSON.stringify({}),
    ]);
  });

  teardown(() => {
    server.restore();
  });

  test('user_collections page provider request must not include sortBy or sortOrder parameters', async () => {
    await fixture(html`<nuxeo-collections visible></nuxeo-collections>`, true);
    await flush();

    // Find the request(s) made to the user_collections page provider
    const ppRequests = server.requests.filter((req) => req.url.includes('/search/pp/user_collections/execute'));

    expect(ppRequests).to.have.length.greaterThan(0, 'Expected at least one request to user_collections provider');

    ppRequests.forEach((req) => {
      expect(req.url).to.not.include('sortBy', `Request URL should not contain sortBy: ${req.url}`);
      expect(req.url).to.not.include('sortOrder', `Request URL should not contain sortOrder: ${req.url}`);
    });
  });

  test('user_collections page provider request must include the expected searchTerm and user params', async () => {
    await fixture(html`<nuxeo-collections visible></nuxeo-collections>`, true);
    await flush();

    const ppRequests = server.requests.filter((req) => req.url.includes('/search/pp/user_collections/execute'));

    expect(ppRequests).to.have.length.greaterThan(0, 'Expected at least one request to user_collections provider');

    // The params '{"searchTerm":"%","user": "$currentUser"}' should be passed as namedParameters
    ppRequests.forEach((req) => {
      expect(req.url).to.include('searchTerm', `Request URL should contain searchTerm param: ${req.url}`);
    });
  });
});

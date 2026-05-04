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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-admin/nuxeo-distribution-analytics.js';

suite('nuxeo-distribution-analytics', () => {
  let el;

  setup(async () => {
    el = await fixture(html`<nuxeo-distribution-analytics></nuxeo-distribution-analytics>`);
    sinon.stub(el, 'i18n').callsFake((k) => k);
    await flush();
  });

  test('_params builds nxql scoped to path', () => {
    el.path = '/default-domain/workspaces/';
    const { queryParams } = el._params();
    expect(queryParams).to.include("ecm:path STARTSWITH '/default-domain/workspaces/'");
    expect(queryParams).to.include('ecm:isTrashed = 0');
  });

  test('_headers sets document fetch enricher', () => {
    expect(el._headers()['fetch-document']).to.equal('properties');
    expect(el._headers()['Content-Type']).to.equal('application/json');
  });
});

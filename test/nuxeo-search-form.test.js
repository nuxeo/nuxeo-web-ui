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
 * Unit tests for nuxeo-search-form paramMutator logic (WEBUI-1934).
 *
 * Two end-to-end tests covering the major fix scenarios:
 *  1. Single-select hierarchical vocabulary → path reconstructed (e.g. "bankN1/normalCard")
 *  2. Multi-select hierarchical vocabulary → each item reconstructed to path string
 */

import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/search/nuxeo-search-form.js';

suite('nuxeo-search-form — paramMutator (WEBUI-1934)', () => {
  let mutate;

  setup(async () => {
    const el = await fixture(html`<nuxeo-search-form></nuxeo-search-form>`);
    mutate = el.paramMutator.bind(el);
  });

  test('single-select hierarchical vocab: reconstructs full parent/child path and strips dc:title', () => {
    // Simulates saved search params returned by REST API for a single-select hierarchical vocab field.
    // Before the fix: the raw object was passed through, giving 0 results on reload.
    // After the fix: the path string "bankN1/normalCard" is reconstructed for the server query.
    const savedSearchParams = {
      'dc:title': 'My Invoice Search',
      'invoice:cardType': {
        id: 'normalCard',
        properties: {
          label: 'Normal Card',
          parent: {
            id: 'bankN1',
            properties: { label: 'Bank N1' },
          },
        },
      },
      ecm_fulltext: '',
      'cvd:contentViewName': 'invoice_search',
    };

    const result = mutate(savedSearchParams, true);

    expect(result).to.not.have.property('dc:title');
    expect(result['invoice:cardType']).to.equal('bankN1/normalCard');
    expect(result.ecm_fulltext).to.equal('');
    expect(result['cvd:contentViewName']).to.equal('invoice_search');
  });

  test('multi-select hierarchical vocab: each item reconstructed to path string; modifyPayload=false is a no-op', () => {
    // Simulates saved search params for a multi-select hierarchical vocab field.
    // Also guards against the modifyPayload=true regression introduced by WEBUI-941:
    // without modifyPayload=true the array items would not be transformed at all.
    const savedSearchParams = {
      'invoice:cardType': [
        {
          id: 'normalCard',
          properties: {
            label: 'Normal Card',
            parent: { id: 'bankN1', properties: { label: 'Bank N1' } },
          },
        },
        {
          id: 'goldCard',
          properties: {
            label: 'Gold Card',
            parent: { id: 'bankN2', properties: { label: 'Bank N2' } },
          },
        },
      ],
    };

    // With modifyPayload=true (correct caller behaviour)
    const result = mutate(savedSearchParams, true);
    expect(result['invoice:cardType']).to.deep.equal(['bankN1/normalCard', 'bankN2/goldCard']);

    // Without modifyPayload (regression guard: objects must NOT be transformed)
    const resultNoModify = mutate(savedSearchParams, false);
    expect(resultNoModify['invoice:cardType']).to.deep.equal(savedSearchParams['invoice:cardType']);
  });
});

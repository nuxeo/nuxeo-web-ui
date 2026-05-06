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
 * Tests covering:
 *  1. Single-select hierarchical vocabulary → path reconstructed (e.g. "parent/child")
 *  2. Multi-select hierarchical vocabulary → each item reconstructed to path string
 *  3. Defensive parent shapes: string parent id and parent.properties.id
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
    // After the fix: the path string "parentCategory/childItem" is reconstructed for the server query.
    const savedSearchParams = {
      'dc:title': 'My Saved Search',
      'my:vocabField': {
        id: 'childItem',
        properties: {
          label: 'Child Item',
          parent: {
            id: 'parentCategory',
            properties: { label: 'Parent Category' },
          },
        },
      },
      ecm_fulltext: '',
      'cvd:contentViewName': 'my_search',
    };

    const result = mutate(savedSearchParams, true);

    expect(result).to.not.have.property('dc:title');
    expect(result['my:vocabField']).to.equal('parentCategory/childItem');
    expect(result.ecm_fulltext).to.equal('');
    expect(result['cvd:contentViewName']).to.equal('my_search');

    // Defensive parent shapes: verify string and nested-object parent id variants
    // (a) properties.parent is a plain string id
    const stringParent = { id: 'child', properties: { parent: 'parentStringId' } };
    expect(mutate({ 'my:field': stringParent }, true)['my:field']).to.equal('parentStringId/child');

    // (b) properties.parent is an object whose id is under parent.properties.id
    const nestedIdParent = { id: 'child', properties: { parent: { properties: { id: 'nestedParentId' } } } };
    expect(mutate({ 'my:field': nestedIdParent }, true)['my:field']).to.equal('nestedParentId/child');
  });

  test('multi-select hierarchical vocab: each item reconstructed to path string; vocab objects without modifyPayload are not converted to path strings', () => {
    // Simulates saved search params for a multi-select hierarchical vocab field.
    const savedSearchParams = {
      'my:vocabField': [
        {
          id: 'childItem1',
          properties: {
            label: 'Child Item 1',
            parent: { id: 'parentCategory1', properties: { label: 'Parent Category 1' } },
          },
        },
        {
          id: 'childItem2',
          properties: {
            label: 'Child Item 2',
            parent: { id: 'parentCategory2', properties: { label: 'Parent Category 2' } },
          },
        },
      ],
    };

    // With modifyPayload=true (correct caller behaviour)
    const result = mutate(savedSearchParams, true);
    expect(result['my:vocabField']).to.deep.equal(['parentCategory1/childItem1', 'parentCategory2/childItem2']);

    // Without modifyPayload (regression guard: objects must NOT be transformed)
    const resultNoModify = mutate(savedSearchParams, false);
    expect(resultNoModify['my:vocabField']).to.deep.equal(savedSearchParams['my:vocabField']);

    // Defensive parent shapes in array items: verify string and nested-object parent id variants
    // (a) properties.parent is a plain string id
    const stringParentArray = [{ id: 'child', properties: { parent: 'parentStringId' } }];
    expect(mutate({ 'my:field': stringParentArray }, true)['my:field']).to.deep.equal(['parentStringId/child']);

    // (b) properties.parent is an object whose id is under parent.properties.id
    const nestedIdArray = [{ id: 'child', properties: { parent: { properties: { id: 'nestedParentId' } } } }];
    expect(mutate({ 'my:field': nestedIdArray }, true)['my:field']).to.deep.equal(['nestedParentId/child']);
  });
});

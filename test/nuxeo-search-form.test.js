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
 * Unit tests for nuxeo-search-form paramMutator logic.
 *
 * These tests cover the scenarios described in WEBUI-1934:
 * "Saved Search not working with hierarchical vocabularies"
 *
 * Root cause: WEBUI-1386 introduced paramMutator but only handled the
 * multi-select (Array) case. Single-select hierarchical vocabulary fields
 * store their value as a plain object {id, properties: {parent: ...}},
 * which fell through to raw assignment, losing the parent prefix.
 *
 * Additionally, WEBUI-941 accidentally dropped modifyPayload=true on all
 * load paths, also breaking the multi-select case.
 *
 * Scenarios tested:
 *  1. Single-select, 2-level hierarchy  (e.g. bankN1/normalCard)
 *  2. Single-select, 3-level hierarchy  (e.g. l1/l2/l3)
 *  3. Single-select, 1-level (root entry, no parent)
 *  4. Single-select, string parent (properties.parent is a plain string id)  [Copilot review]
 *  5. Single-select, unresolvable parent stops traversal cleanly             [Copilot review]
 *  6. Multi-select, 2-level hierarchy   (array of objects)
 *  7. Multi-select mixed: object entries and plain string entries
 *  8. Multi-select, 3-level hierarchy
 *  9. Multi-select, string parent handled defensively                        [Copilot review]
 * 10. Multi-select, unresolvable parent stops traversal cleanly              [Copilot review]
 * 11. Null values are filtered out
 * 12. dc:title is filtered out
 * 13. Boolean values are converted to strings
 * 14. Scalar string values are passed through unchanged
 * 15. modifyPayload=false (default): vocabulary objects are NOT transformed
 * 16. modifyPayload=false (default): arrays are NOT transformed
 * 17. cvd:contentViewName is injected when absent
 * 18. cvd:contentViewName is NOT overwritten when already present
 */

// Import the Polymer element so paramMutator property is accessible.
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/search/nuxeo-search-form.js';

suite('nuxeo-search-form — paramMutator (WEBUI-1934)', () => {
  let mutate;

  setup(async () => {
    // Instantiate the element and extract its default paramMutator function.
    const el = await fixture(html`<nuxeo-search-form></nuxeo-search-form>`);
    mutate = el.paramMutator.bind(el);
  });

  // ─── Single-select hierarchical vocabulary ──────────────────────────────

  suite('single-select hierarchical vocabulary', () => {
    test('2-level: reconstructs parent/child path (e.g. bankN1/normalCard)', () => {
      const params = {
        'invoice:cardType': {
          id: 'normalCard',
          properties: {
            parent: {
              id: 'bankN1',
              properties: {},
            },
          },
        },
      };
      const result = mutate(params, true);
      expect(result['invoice:cardType']).to.equal('bankN1/normalCard');
    });

    test('3-level: reconstructs grandparent/parent/child path', () => {
      const params = {
        'my:field': {
          id: 'l3',
          properties: {
            parent: {
              id: 'l2',
              properties: {
                parent: {
                  id: 'l1',
                  properties: {},
                },
              },
            },
          },
        },
      };
      const result = mutate(params, true);
      expect(result['my:field']).to.equal('l1/l2/l3');
    });

    test('1-level root entry (no parent): returns id as-is', () => {
      const params = {
        'my:field': {
          id: 'rootEntry',
          properties: {},
        },
      };
      const result = mutate(params, true);
      expect(result['my:field']).to.equal('rootEntry');
    });

    test('string parent: properties.parent is a plain string id (defensive handling)', () => {
      // Copilot review: properties.parent can be a string id in some codebase variants
      const params = {
        'my:field': {
          id: 'child',
          properties: {
            parent: 'parentStringId',
          },
        },
      };
      const result = mutate(params, true);
      expect(result['my:field']).to.equal('parentStringId/child');
    });

    test('unresolvable parent: stops traversal without producing "undefined/..." path', () => {
      // Copilot review: if parent has no id, traversal must stop cleanly
      const params = {
        'my:field': {
          id: 'child',
          properties: {
            parent: { properties: {} }, // no id field
          },
        },
      };
      const result = mutate(params, true);
      expect(result['my:field']).to.not.include('undefined');
      expect(result['my:field']).to.equal('child');
    });

    test('modifyPayload=false: single-select object is NOT transformed (raw value kept)', () => {
      const vocabObject = {
        id: 'normalCard',
        properties: {
          parent: { id: 'bankN1', properties: {} },
        },
      };
      const params = { 'invoice:cardType': vocabObject };
      const result = mutate(params, false);
      // Without modifyPayload the object passes through as-is
      expect(result['invoice:cardType']).to.deep.equal(vocabObject);
    });
  });

  // ─── Multi-select hierarchical vocabulary ───────────────────────────────

  suite('multi-select hierarchical vocabulary', () => {
    test('2-level array: each item reconstructed to parent/child path', () => {
      const params = {
        'invoice:cardType': [
          {
            id: 'normalCard',
            properties: { parent: { id: 'bankN1', properties: {} } },
          },
          {
            id: 'goldCard',
            properties: { parent: { id: 'bankN2', properties: {} } },
          },
        ],
      };
      const result = mutate(params, true);
      expect(result['invoice:cardType']).to.deep.equal(['bankN1/normalCard', 'bankN2/goldCard']);
    });

    test('3-level array: each item reconstructed to grandparent/parent/child', () => {
      const params = {
        'my:field': [
          {
            id: 'c',
            properties: {
              parent: {
                id: 'b',
                properties: {
                  parent: { id: 'a', properties: {} },
                },
              },
            },
          },
        ],
      };
      const result = mutate(params, true);
      expect(result['my:field']).to.deep.equal(['a/b/c']);
    });

    test('mixed array: object entries and plain string entries both handled', () => {
      const params = {
        'my:field': [{ id: 'child', properties: { parent: { id: 'parent', properties: {} } } }, 'plainString'],
      };
      const result = mutate(params, true);
      expect(result['my:field']).to.deep.equal(['parent/child', 'plainString']);
    });

    test('modifyPayload=false: array is NOT transformed (raw array kept)', () => {
      const arr = [{ id: 'normalCard', properties: { parent: { id: 'bankN1', properties: {} } } }];
      const params = { 'invoice:cardType': arr };
      const result = mutate(params, false);
      expect(result['invoice:cardType']).to.deep.equal(arr);
    });

    test('array: string parent handled defensively (Copilot review)', () => {
      const params = {
        'my:field': [{ id: 'child', properties: { parent: 'parentStringId' } }],
      };
      const result = mutate(params, true);
      expect(result['my:field']).to.deep.equal(['parentStringId/child']);
    });

    test('array: unresolvable parent stops traversal without "undefined/..." (Copilot review)', () => {
      const params = {
        'my:field': [{ id: 'child', properties: { parent: { properties: {} } } }],
      };
      const result = mutate(params, true);
      expect(result['my:field'][0]).to.not.include('undefined');
      expect(result['my:field']).to.deep.equal(['child']);
    });
  });

  // ─── General param filtering & passthrough ───────────────────────────────

  suite('general parameter handling', () => {
    test('null values are filtered out', () => {
      const params = { 'dc:description': null, 'dc:subjects': ['topic1'] };
      const result = mutate(params, true);
      expect(result).to.not.have.property('dc:description');
      expect(result['dc:subjects']).to.deep.equal(['topic1']);
    });

    test('dc:title is always filtered out', () => {
      const params = { 'dc:title': 'My Saved Search', ecm_fulltext: 'hello' };
      const result = mutate(params, true);
      expect(result).to.not.have.property('dc:title');
      expect(result.ecm_fulltext).to.equal('hello');
    });

    test('boolean true is converted to string "true"', () => {
      const params = { someBool: true };
      const result = mutate(params, false);
      expect(result.someBool).to.equal('true');
    });

    test('boolean false is converted to string "false"', () => {
      const params = { someBool: false };
      const result = mutate(params, false);
      expect(result.someBool).to.equal('false');
    });

    test('scalar string values pass through unchanged', () => {
      const params = { ecm_fulltext: 'invoice*', ecm_path: '/default-domain' };
      const result = mutate(params, false);
      expect(result.ecm_fulltext).to.equal('invoice*');
      expect(result.ecm_path).to.equal('/default-domain');
    });

    test('numeric values pass through unchanged', () => {
      const params = { 'nxql:pageSize': 40 };
      const result = mutate(params, false);
      expect(result['nxql:pageSize']).to.equal(40);
    });
  });

  // ─── cvd:contentViewName injection ──────────────────────────────────────

  suite('cvd:contentViewName', () => {
    test('is injected as "default_search" when absent', () => {
      const params = { ecm_fulltext: 'hello' };
      const result = mutate(params, false);
      expect(result['cvd:contentViewName']).to.equal('default_search');
    });

    test('is NOT overwritten when already present', () => {
      const params = { 'cvd:contentViewName': 'custom_view', ecm_fulltext: 'hello' };
      const result = mutate(params, false);
      expect(result['cvd:contentViewName']).to.equal('custom_view');
    });

    test('returns only cvd:contentViewName when params is empty object', () => {
      const result = mutate({}, false);
      expect(result).to.deep.equal({ 'cvd:contentViewName': 'default_search' });
    });

    test('returns empty object when params is null/undefined', () => {
      expect(mutate(null, false)).to.deep.equal({});
      expect(mutate(undefined, false)).to.deep.equal({});
    });
  });

  // ─── Full saved-search reload scenario (WEBUI-1934 end-to-end) ──────────

  suite('WEBUI-1934 end-to-end: saved search reload with hierarchical vocabulary', () => {
    test('loading saved search with single-select vocab field produces correct query param', () => {
      // Simulates the params object returned by the REST API for a saved search
      // where the user saved an Invoice document with Card Type = "Normal Card" (bankN1/normalCard)
      const savedSearchParams = {
        'dc:title': 'My Invoice Search',
        'invoice:cardType': {
          id: 'normalCard',
          properties: {
            label: 'Normal Card',
            parent: {
              id: 'bankN1',
              properties: {
                label: 'Bank N1',
              },
            },
          },
        },
        ecm_fulltext: '',
        'cvd:contentViewName': 'invoice_search',
      };

      const result = mutate(savedSearchParams, true);

      // dc:title must be stripped
      expect(result).to.not.have.property('dc:title');
      // vocabulary must be reconstructed to full path
      expect(result['invoice:cardType']).to.equal('bankN1/normalCard');
      // other fields pass through
      expect(result.ecm_fulltext).to.equal('');
      // existing cvd:contentViewName must not be overwritten
      expect(result['cvd:contentViewName']).to.equal('invoice_search');
    });

    test('loading saved search with multi-select vocab field produces correct query params array', () => {
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

      const result = mutate(savedSearchParams, true);
      expect(result['invoice:cardType']).to.deep.equal(['bankN1/normalCard', 'bankN2/goldCard']);
    });

    test('WITHOUT modifyPayload (regression guard): vocab object is not transformed', () => {
      // This guards against accidentally dropping modifyPayload=true in callers,
      // which was the secondary regression introduced by WEBUI-941.
      const vocabObject = {
        id: 'normalCard',
        properties: { parent: { id: 'bankN1', properties: {} } },
      };
      const savedSearchParams = { 'invoice:cardType': vocabObject };

      // modifyPayload defaults to false — object should NOT be path-reconstructed
      const result = mutate(savedSearchParams);
      expect(result['invoice:cardType']).to.deep.equal(vocabObject);
    });
  });
});

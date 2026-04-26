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
 * Tests for WEBUI-1734 (Part 2):
 *
 * The fix replaces `role="widget"` + `aria-label` on child inputs with the
 * correct ARIA grouping pattern:
 *   - wrapper div gets `role="group"` + `aria-labelledby="<id>"`
 *   - the sibling `<label>` gets a matching `id`
 *   - the child input/dropdown loses its redundant `aria-label`
 */

let tmpl;

suiteSetup(async () => {
  const url = '/elements/search/default/nuxeo-default-search-form.html';
  const selector = 'dom-module#nuxeo-default-search-form template';
  const response = await fetch(url);
  expect(response.ok, `Failed to fetch ${url}: ${response.status} ${response.statusText}`).to.be.true;
  const text = await response.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const parsedTemplate = doc.querySelector(selector);
  expect(parsedTemplate, `Template not found for selector "${selector}" in ${url}`).to.not.be.null;
  tmpl = parsedTemplate;
});

suite('nuxeo-default-search-form', () => {
  // Each entry: [labelId, child selector]
  const groups = [
    ['authorsLabel', 'nuxeo-dropdown-aggregation[name="authors"]'],
    ['collectionsLabel', null], // child is inside a nested dom-if template
    ['tagsLabel', 'nuxeo-tag-suggestion[name="tags"]'],
  ];

  groups.forEach(([labelId, childSelector]) => {
    test(`${labelId}: wrapper uses role="group" labelled by a matching label id`, () => {
      const group = tmpl.content.querySelector(`div[aria-labelledby="${labelId}"]`);
      expect(group, `div[aria-labelledby="${labelId}"] not found`).to.not.be.null;
      expect(group.getAttribute('role')).to.equal('group');
      expect(group.querySelector(`label#${labelId}`), `label#${labelId} not found`).to.not.be.null;
    });

    if (childSelector) {
      test(`${labelId}: child input has no redundant aria-label`, () => {
        const group = tmpl.content.querySelector(`div[aria-labelledby="${labelId}"]`);
        const child = group.querySelector(childSelector);
        expect(child, `${childSelector} not found`).to.not.be.null;
        expect(child.hasAttribute('aria-label'), 'aria-label should be removed').to.be.false;
      });
    }
  });

  test('collectionsLabel: nuxeo-selectivity inside dom-if has no redundant aria-label', () => {
    const group = tmpl.content.querySelector('div[aria-labelledby="collectionsLabel"]');
    const innerTmpl = group.querySelector('template');
    const selectivity = innerTmpl.content.querySelector('nuxeo-selectivity[name="collections"]');
    expect(selectivity, 'nuxeo-selectivity[name="collections"] not found').to.not.be.null;
    expect(selectivity.hasAttribute('aria-label'), 'aria-label should be removed').to.be.false;
  });
});

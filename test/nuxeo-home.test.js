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
 * Tests for WEBUI-1736 (nuxeo-home):
 *
 * The fix applies WCAG H2 technique: `<nuxeo-document-thumbnail alt="">` is
 * combined with the document title text inside a single `<a>` element across
 * all three dashboard data tables (recently edited, recently viewed, favorites)
 * so that screen readers do not announce the link twice.
 */

/** Recursively collect all elements matching selector, descending into <template> content. */
function queryAllDeep(root, selector) {
  const results = [];
  root.querySelectorAll(selector).forEach((el) => results.push(el));
  root.querySelectorAll('template').forEach((t) => {
    results.push(...queryAllDeep(t.content, selector));
  });
  return results;
}

let tmpl;

suiteSetup(async () => {
  const url = '/elements/nuxeo-home.html';
  const selector = 'dom-module#nuxeo-home template';
  const response = await fetch(url);
  expect(response.ok, `Failed to fetch ${url}: ${response.status} ${response.statusText}`).to.be.true;
  const text = await response.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  tmpl = doc.querySelector(selector);
  expect(tmpl, `Template not found for selector "${selector}" in ${url}`).to.not.be.null;
});

suite('nuxeo-home', () => {
  suite('WCAG H2: thumbnail combined with title in one link across all dashboard tables', () => {
    test('has three nuxeo-document-thumbnail instances (one per dashboard section)', () => {
      const thumbnails = queryAllDeep(tmpl.content, 'nuxeo-document-thumbnail');
      expect(thumbnails.length).to.equal(
        3,
        'should have thumbnails in recently-edited, recently-viewed, and favorites sections',
      );
    });

    test('every nuxeo-document-thumbnail has alt="" (decorative image)', () => {
      const thumbnails = queryAllDeep(tmpl.content, 'nuxeo-document-thumbnail');
      thumbnails.forEach((thumb) => {
        expect(thumb.getAttribute('alt')).to.equal(
          '',
          `thumbnail should have alt="" but got "${thumb.getAttribute('alt')}"`,
        );
      });
    });

    test('every nuxeo-document-thumbnail is inside an <a> link', () => {
      const thumbnails = queryAllDeep(tmpl.content, 'nuxeo-document-thumbnail');
      thumbnails.forEach((thumb) => {
        const link = thumb.closest('a');
        expect(link, 'nuxeo-document-thumbnail should be a descendant of an <a> element').to.exist;
      });
    });
  });
});

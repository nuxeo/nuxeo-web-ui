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

import { queryAllDeep, loadDomModuleTemplate } from './helpers/template-utils.js';

/**
 * Tests for WEBUI-1736 (nuxeo-trash-search-results):
 *
 * The fix applies WCAG H2 technique: `<nuxeo-document-thumbnail alt="">` is
 * combined with the document title text inside a single `<a>` element so that
 * screen readers do not announce the link twice.
 */

let tmpl;

suiteSetup(async () => {
  tmpl = await loadDomModuleTemplate(
    '/elements/search/trash/nuxeo-trash-search-results.html',
    'nuxeo-trash-search-results',
  );
});

suite('nuxeo-trash-search-results', () => {
  suite('WCAG H2: thumbnail combined with title text in one link', () => {
    test('nuxeo-document-thumbnail is present in the template', () => {
      const thumbnails = queryAllDeep(tmpl.content, 'nuxeo-document-thumbnail');
      expect(thumbnails.length).to.be.greaterThan(0, 'should have at least one nuxeo-document-thumbnail');
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

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
 * Tests for WEBUI-1736 (nuxeo-nxql-search-results):
 *
 * The fix applies WCAG H2 technique: `<nuxeo-document-thumbnail alt="">` is
 * combined with the document title/path text inside a single `<a>` element so
 * that screen readers do not announce the link twice.  Both the title column
 * and the path column were updated.
 */

let tmpl;

suiteSetup(async () => {
  tmpl = await loadDomModuleTemplate(
    '/elements/search/nxql/nuxeo-nxql-search-results.html',
    'nuxeo-nxql-search-results',
  );
});

suite('nuxeo-nxql-search-results', () => {
  suite('WCAG H2: thumbnail combined with text in one link (title and path columns)', () => {
    test('has thumbnails in both the title and path columns', () => {
      const thumbnails = queryAllDeep(tmpl.content, 'nuxeo-document-thumbnail');
      expect(thumbnails.length).to.be.at.least(2, 'should have thumbnails in both title and path columns');
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

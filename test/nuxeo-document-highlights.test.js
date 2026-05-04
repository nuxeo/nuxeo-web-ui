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
import '../elements/nuxeo-document-highlight/nuxeo-document-highlights.js';

suite('nuxeo-document-highlights', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-highlights></nuxeo-document-highlights>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_highlightFieldLabel', () => {
    test('should return i18n key for field', () => {
      const highlight = { field: 'dc:title', segments: [] };
      expect(element._highlightFieldLabel(highlight)).to.include('dc:title');
    });
  });

  suite('_preSegment', () => {
    test('should return text before em tag', () => {
      const result = element._preSegment('hello <em>world</em> test');
      expect(result).to.equal('hello ');
    });

    test('should return full text when no em tag', () => {
      const result = element._preSegment('no highlight');
      expect(result).to.equal('no highlight');
    });
  });

  suite('_segment', () => {
    test('should return text within em tags', () => {
      const result = element._segment('hello <em>world</em> test');
      expect(result).to.equal('world');
    });
  });

  suite('_postSegment', () => {
    test('should return text after em closing tag', () => {
      const result = element._postSegment('hello <em>world</em> test');
      expect(result).to.equal(' test');
    });
  });
});

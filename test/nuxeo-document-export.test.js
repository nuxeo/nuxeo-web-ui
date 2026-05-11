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
import '../elements/nuxeo-document-export/nuxeo-document-export.js';

suite('nuxeo-document-export', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-export></nuxeo-document-export>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_filterRenditions', () => {
    test('should return empty array when document is null', () => {
      expect(element._filterRenditions(null)).to.deep.equal([]);
    });

    test('should return empty array when document has no contextParameters', () => {
      expect(element._filterRenditions({ uid: '1' })).to.deep.equal([]);
    });

    test('should filter out video conversions', () => {
      const doc = {
        contextParameters: {
          renditions: [
            { name: 'pdf', kind: 'nuxeo:rendition', url: '/pdf' },
            { name: 'mp4', kind: 'nuxeo:video:conversion', url: '/mp4' },
          ],
        },
      };
      const result = element._filterRenditions(doc);
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('documentExport.pdf');
    });

    test('should filter out picture conversions', () => {
      const doc = {
        contextParameters: {
          renditions: [
            { name: 'xml', kind: 'nuxeo:rendition', url: '/xml' },
            { name: 'thumb', kind: 'nuxeo:picture:conversion', url: '/thumb' },
          ],
        },
      };
      const result = element._filterRenditions(doc);
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('documentExport.xml');
    });

    test('should prefix rendition names with documentExport', () => {
      const doc = {
        contextParameters: {
          renditions: [{ name: 'zipExport', kind: 'nuxeo:rendition', url: '/zip' }],
        },
      };
      const result = element._filterRenditions(doc);
      expect(result[0].name).to.equal('documentExport.zipExport');
    });
  });
});

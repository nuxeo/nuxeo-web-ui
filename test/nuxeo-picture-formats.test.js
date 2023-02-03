/**
 @license
 (C) Copyright Nuxeo Corp. (http://nuxeo.com/)

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
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/document/nuxeo-picture-formats.js';

suite('nuxeo-picture-formats', () => {
  let element;
  setup(async () => {
    element = await fixture(
      html`
        <nuxeo-picture-formats></nuxeo-picture-formats>
      `,
    );
  });

  suite('additional formats or renditions', () => {
    test('Should get additional formats for asset ', () => {
      const document = {
        properties: {
          'file:content': {
            appLinks: [],
            data: 'kitten1%20(4).jpeg?changeToken=67',
            digest: '2e7d1a1ba7018c048bebdf1d07481ee3',
            digestAlgorithm: 'MD5',
            encoding: null,
            length: '5763',
            'mime-type': 'image/jpeg',
            name: 'kitten1 (4).jpeg',
          },
          'picture:views': [
            {
              description: 'thumbnail',
              info: {
                width: 66,
                height: 66,
                format: 'picture/jpeg',
              },
              content: {
                data: 'file1.jpeg?changeToken=1-0',
                length: '',
                downloadUrl: 'file1.jpeg?changeToken=1-0&clientReason=download',
              },
            },
          ],
        },
      };
      const additionalFormats = [
        {
          name: 'thumbnail',
          dimensions: '66 x 66',
          size: '',
          format: 'picture/jpeg',
          downloadUrl: 'file1.jpeg?changeToken=1-0&clientReason=download',
        },
      ];
      element.xpath = 'file:content';
      expect(element._getAdditionalFormats(document)).to.eql(additionalFormats);
    });
  });
});

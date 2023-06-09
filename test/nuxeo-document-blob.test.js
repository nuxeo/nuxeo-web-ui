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
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-document-blob/nuxeo-document-blob.js';

suite('nuxeo-document-blob', () => {
  let element;
  setup(async () => {
    element = await fixture(
      html`
        <nuxeo-document-blob></nuxeo-document-blob>
      `,
    );
  });

  suite('fetch document blob url', () => {
    test('Should fetch download url when blob has downloadUrl property', () => {
      element.blob = {
        downloadUrl: 'abc.docx?changeToken=1-0&clientReason=download',
      };
      expect(element._getDocumentBlobUrl()).to.equal('abc.docx?changeToken=1-0&clientReason=download');
    });

    test('Should fetch download url when blob does not have downloadUrl property', () => {
      element.blob = {
        data: 'abc.docx?changeToken=1-0',
      };
      expect(element._getDocumentBlobUrl()).to.equal('abc.docx?changeToken=1-0');
    });
  });
});

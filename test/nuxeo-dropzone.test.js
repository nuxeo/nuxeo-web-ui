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
import '../elements/nuxeo-dropzone/nuxeo-dropzone';

suite('nuxeo-dropzone', () => {
  let element;
  setup(async () => {
    element = await fixture(
      html`
        <nuxeo-dropzone></nuxeo-dropzone>
      `,
    );
  });

  suite('should return whether property is under retention', () => {
    const document = {
      isUnderRetentionOrLegalHold: true,
      retainedProperties: ['checkext:single', 'file:content'],
    };
    test('when xpath =  checkext:single', () => {
      element.xpath = 'checkext:single';
      expect(element._isDropzoneVisible(document)).to.eql(false);
    });
    test('when xpath =  checkext:multiple', () => {
      element.xpath = 'checkext:multiple';
      expect(element._isDropzoneVisible(document)).to.eql(true);
    });
    test('when xpath =  file:content, for document viewer', () => {
      element.xpath = 'file:content';
      expect(element._isDropzoneVisible(document)).to.eql(false);
    });
  });
});

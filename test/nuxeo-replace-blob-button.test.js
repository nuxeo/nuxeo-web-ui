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
import '../elements/nuxeo-document-actions/nuxeo-replace-blob-button';

suite('nuxeo-replace-blob-button', () => {
  let element;
  setup(async () => {
    element = await fixture(
      html`
        <nuxeo-replace-blob-button></nuxeo-replace-blob-button>
      `,
    );
    sinon.stub(element, 'hasPermission').returns(true);
    sinon.stub(element, 'isImmutable').returns(false);
    sinon.stub(element, 'hasType').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'hasContent').returns(false);
    sinon.spy(element, '_isAvailable');
  });

  suite('should return whether property is under retention', () => {
    const document = {
      isUnderRetentionOrLegalHold: true,
      retainedProperties: [
        'checkext:single',
        'checkext:field1/2/item',
        'files:files/*/file',
        'checkext:multiple',
        'file:content',
      ],
    };
    test('when xpath =  checkext:single, for document blob', () => {
      element.xpath = 'checkext:single';
      expect(element._isAvailable(document)).to.eql(false);
    });
    test('when xpath =  checkext:multiple/0, for document attachement', () => {
      element.xpath = 'checkext:multiple/0';
      expect(element._isAvailable(document)).to.eql(false);
    });
    test('when xpath =  checkext:multiple/1, for document attachement', () => {
      element.xpath = 'checkext:multiple/1';
      expect(element._isAvailable(document)).to.eql(false);
    });
    test('when xpath =  checkext:field1/0, for custom property - document attachment', () => {
      element.xpath = 'checkext:field1/0';
      expect(element._isAvailable(document)).to.eql(true);
    });
    test('when xpath =  checkext:field1/2, for custom property - document attachment', () => {
      element.xpath = 'checkext:field1/2';
      expect(element._isAvailable(document)).to.eql(false);
    });
    test('when xpath =  files:files/0/file, for document attachement', () => {
      element.xpath = 'files:files/0/file';
      expect(element._isAvailable(document)).to.eql(false);
    });
    test('when xpath =  file:content, for document viewer', () => {
      element.xpath = 'file:content';
      expect(element._isAvailable(document)).to.eql(false);
    });
  });
});

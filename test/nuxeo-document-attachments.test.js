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
import '../elements/nuxeo-document-attachments/nuxeo-document-attachments.js';

suite('nuxeo-document-attachments', () => {
  let element;
  setup(async () => {
    element = await fixture(html` <nuxeo-document-attachments></nuxeo-document-attachments> `);
    sinon.stub(element, 'hasPermission').returns(true);
    sinon.stub(element, 'isImmutable').returns(false);
    sinon.stub(element, 'hasType').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.spy(element, '_isDropzoneAvailable');
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
    test('when xpath =  checkext:single, for dropzone', () => {
      element.xpath = 'checkext:single';
      expect(element._isDropzoneAvailable(document)).to.eql(false);
    });
    test('when xpath =  checkext:multiple, for dropzone', () => {
      element.xpath = 'checkext:multiple';
      expect(element._isDropzoneAvailable(document)).to.eql(false);
    });
  });

  suite('helpers', () => {
    test('returns empty files list when attachments are not set', () => {
      expect(element._computeFiles()).to.eql([]);
    });

    test('detects whether attachments list has files', () => {
      expect(element._hasFiles([{ file: { name: 'a.txt' } }])).to.eql(true);
      expect(element._hasFiles([])).to.eql(false);
      expect(element._hasFiles(null)).to.eql(null);
    });

    test('computes blob xpath for default and custom list properties', () => {
      expect(element._computeBlobXpath('files:files', 2)).to.eql('files:files/2/file');
      expect(element._computeBlobXpath('custom:attachments', 1)).to.eql('custom:attachments/1');
    });

    test('computes file wrapper key depending on xpath', () => {
      element.xpath = 'files:files';
      expect(element._getFileValue()).to.eql('file');

      element.xpath = 'custom:attachments';
      expect(element._getFileValue()).to.eql('');
    });

    test('keeps dropzone available for writable documents', () => {
      const doc = { uid: 'doc-1' };
      expect(element._isDropzoneAvailable(doc)).to.eql(true);
    });
  });

  // WEBUI-1820: attachment changes are a document write, so they take part in optimistic locking
  suite('optimistic locking', () => {
    setup(() => {
      element.xpath = 'files:files';
      element._attachments = [];
      element.document = { uid: 'doc-1', repository: 'default', changeToken: '5-2', properties: {} };
      sinon.stub(element, 'i18n').callsFake((key) => key);
      sinon.stub(element, 'notify');
      sinon.stub(element, 'fire');
    });

    teardown(() => {
      element.i18n.restore();
      element.notify.restore();
      element.fire.restore();
      if (element.$.doc.put.restore) {
        element.$.doc.put.restore();
      }
    });

    test('sends the change token of the loaded document', async () => {
      sinon.stub(element.$.doc, 'put').resolves({ uid: 'doc-1', properties: {} });
      await element._valueChanged({});
      expect(element.$.doc.data.changeToken).to.equal('5-2');
    });

    test('reports a conflict and reloads when the write is stale', async () => {
      sinon.stub(element.$.doc, 'put').rejects({ status: 409 });
      await element._valueChanged({});
      expect(element.notify).to.have.been.calledOnce;
      expect(element.notify.firstCall.args[0].message).to.equal('documentUpdate.conflict');
      expect(element.fire).to.have.been.calledWith('document-updated');
    });

    test('still rejects other failures', async () => {
      sinon.stub(element.$.doc, 'put').rejects({ status: 500 });
      let caught;
      await element._valueChanged({}).catch((err) => {
        caught = err;
      });
      expect(caught).to.deep.equal({ status: 500 });
      expect(element.notify).to.not.have.been.called;
    });
  });
});

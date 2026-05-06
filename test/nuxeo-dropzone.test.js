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
import '../elements/nuxeo-dropzone/nuxeo-dropzone.js';

suite('nuxeo-dropzone', () => {
  let element;
  setup(async () => {
    element = await fixture(html` <nuxeo-dropzone></nuxeo-dropzone> `);
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

  suite('upload payload mapping', () => {
    test('builds single upload payload for uploader batch', () => {
      const data = { type: 'batchFinished', detail: { batchId: 'batch-1' } };

      expect(element._getFiles(data)).to.eql({
        'upload-batch': 'batch-1',
        'upload-fileId': '0',
      });
    });

    test('builds single upload payload for blob picker', () => {
      const data = {
        type: 'nx-blob-picked',
        detail: { blobs: [{ providerId: 'drive', user: 'jdoe', fileId: 'blob-id' }] },
      };

      expect(element._getFiles(data)).to.eql({
        providerId: 'drive',
        user: 'jdoe',
        fileId: 'blob-id',
      });
    });

    test('builds list payload with valueKey for multiple uploads', () => {
      element.multiple = true;
      element.valueKey = 'file';
      element.files = [{ index: 0 }, { index: 1, error: true }, { index: 2 }];

      const files = element._getFiles({ type: 'batchFinished', detail: { batchId: 'batch-2' } });

      expect(files).to.eql([
        { file: { 'upload-batch': 'batch-2', 'upload-fileId': '0' } },
        { file: { 'upload-batch': 'batch-2', 'upload-fileId': '2' } },
      ]);
    });

    test('builds list payload for blob picker in multiple mode', () => {
      element.multiple = true;
      element.files = [
        { providerId: 'drive', user: 'jdoe', fileId: 'f-1' },
        { providerId: 'drive', user: 'jdoe', fileId: 'f-2' },
      ];

      const files = element._getFiles({ type: 'nx-blob-picked', detail: {} });

      expect(files).to.eql([
        { providerId: 'drive', user: 'jdoe', fileId: 'f-1' },
        { providerId: 'drive', user: 'jdoe', fileId: 'f-2' },
      ]);
    });
  });

  suite('validity checks', () => {
    test('invalid while uploading', () => {
      element.uploading = true;
      element.files = [];

      expect(element._getValidity()).to.eql(false);
      expect(element._errorMessage).to.eql('dropzone.invalid.uploading');
    });

    test('invalid when any file has upload error', () => {
      element.uploading = false;
      element.files = [{ name: 'ok.txt' }, { name: 'bad.txt', error: 'failed' }];

      expect(element._getValidity()).to.eql(false);
      expect(element._errorMessage).to.eql('dropzone.invalid.error');
    });

    test('invalid when file does not match accepted extensions', () => {
      element.accept = '.pdf,.png';
      element.files = [{ name: 'report.txt', type: 'text/plain' }];

      expect(element._getValidity()).to.eql(false);
      expect(element._errorMessage).to.eql('dropzone.invalid.file');
    });

    test('valid when file matches accepted mime type', () => {
      element.accept = 'application/pdf';
      element.files = [{ name: 'report.unknown', type: 'application/pdf' }];

      expect(element._getValidity()).to.eql(true);
    });

    test('required dropzone without files is invalid', () => {
      element.required = true;
      element.accept = '';
      element.files = [];

      expect(element._getValidity()).to.eql(false);
    });
  });

  suite('visibility and helper behavior', () => {
    test('shows drag content message when dragging', () => {
      element._setDraggingFiles(true);
      element.message = 'dropzone.add';
      element.dragContentMessage = 'dropzone.dropFile';

      expect(element._computeMessage()).to.eql(element.i18n('dropzone.dropFile'));
    });

    test('shows default message when not dragging', () => {
      element._setDraggingFiles(false);
      element.message = 'dropzone.add';

      expect(element._computeMessage()).to.eql(element.i18n('dropzone.add'));
    });

    test('displays actions only when not uploading and not in legacy update mode', () => {
      element._setHasFiles(true);
      element.uploading = false;
      element.updateDocument = false;
      expect(element._areActionsVisible()).to.eql(true);

      element.uploading = true;
      expect(element._areActionsVisible()).to.eql(false);
    });

    test('shows abort button only if upload can be aborted', () => {
      sinon.stub(element, 'hasAbort').returns(true);
      expect(element._showAbort(true)).to.eql(true);
      expect(element._showAbort(false)).to.eql(false);
    });

    test('display progress bar only for in-flight uploads', () => {
      expect(element._displayProgressBar({ base: { providerId: null, complete: false, error: '' } })).to.eql(true);
      expect(element._displayProgressBar({ base: { providerId: 'drive', complete: false, error: '' } })).to.eql(false);
      expect(element._displayProgressBar({ base: { providerId: null, complete: true, error: '' } })).to.eql(false);
      expect(element._displayProgressBar({ base: { providerId: null, complete: false, error: 'boom' } })).to.eql(false);
    });
  });

  suite('drag and upload interactions', () => {
    test('dragover updates drop effect and dragging state', () => {
      const preventDefault = sinon.spy();
      const event = {
        preventDefault,
        dataTransfer: { dropEffect: '' },
      };

      element._dragover(event);

      expect(preventDefault.calledOnce).to.eql(true);
      expect(event.dataTransfer.dropEffect).to.eql('copy');
      expect(element.draggingFiles).to.eql(true);
    });

    test('dragleave clears dragging state', () => {
      element._setDraggingFiles(true);
      element._dragleave();
      expect(element.draggingFiles).to.eql(false);
    });

    test('drop uploads files only when valid', () => {
      const uploadSpy = sinon.spy(element, '_upload');
      sinon.stub(element, 'validate').returns(true);
      const preventDefault = sinon.spy();
      const droppedFile = { name: 'dropped.txt' };
      const event = {
        preventDefault,
        dataTransfer: { files: [droppedFile] },
      };

      element._drop(event);

      expect(preventDefault.calledOnce).to.eql(true);
      expect(uploadSpy.calledOnceWithExactly(event.dataTransfer.files)).to.eql(true);
    });

    test('upload keeps uploaded files for single and multiple mode', () => {
      const uploadFilesSpy = sinon.spy(element, 'uploadFiles');
      const firstFile = { name: 'f1.txt' };
      const secondFile = { name: 'f2.txt' };

      element.multiple = false;
      element._upload([firstFile]);
      expect(element.uploadedFiles).to.eql([firstFile]);

      element.multiple = true;
      element.uploadedFiles = [firstFile];
      element._upload([secondFile]);
      expect(element.uploadedFiles).to.eql([firstFile, secondFile]);
      expect(uploadFilesSpy.callCount).to.eql(2);
    });

    test('reset clears files and cancels current batch when needed', () => {
      element.files = [{ name: 'f1.txt' }];
      element.uploading = true;
      element.multiple = true;
      element._allUploadedFiles = [{ name: 'f1.txt' }];
      sinon.spy(element, 'cancelBatch');

      element._reset(null);

      expect(element.cancelBatch.calledOnce).to.eql(true);
      expect(element.files).to.eql([]);
      expect(element._allUploadedFiles).to.eql([]);
    });
  });

  suite('batch and value management', () => {
    test('importBatch reports failed files and keeps invalid state synchronized', async () => {
      const notifySpy = sinon.spy(element, 'notify');
      const validateSpy = sinon.stub(element, 'validate').returns(false);
      const stopSpy = sinon.spy();
      element.files = [
        { name: 'ok.txt', index: 0 },
        { name: 'bad.txt', index: 1, error: 'failed' },
      ];
      element.uploadedFiles = [{ name: 'ok.txt' }, { name: 'bad.txt' }];
      element.i18n = sinon.stub().callsFake((key, value) => (value ? `${key}:${value}` : key));
      element.invalid = true;

      await element.importBatch({
        type: 'batchFinished',
        stopPropagation: stopSpy,
        detail: { batchId: 'batch-1' },
      });

      expect(stopSpy).to.have.been.calledOnce;
      expect(notifySpy).to.have.been.calledOnce;
      expect(notifySpy.firstCall.args[0].message).to.contain('dropzone.toast.error');
      expect(validateSpy).to.have.been.calledOnce;
      notifySpy.restore();
      validateSpy.restore();
    });

    test('importBatch stores successful files in multiple mode and notifies success', async () => {
      const notifySpy = sinon.spy(element, 'notify');
      const legacyStub = sinon.stub(element, '_legacyUpdateDocument').resolves();
      element.multiple = true;
      element.xpath = 'file:content';
      element.document = { uid: 'doc-1' };
      element.value = [];
      element.files = [{ name: 'ok.txt', index: 0 }];
      element.uploadedFiles = [{ name: 'ok.txt' }];
      element.i18n = sinon.stub().callsFake((key) => key);

      await element.importBatch({
        type: 'batchFinished',
        stopPropagation: sinon.spy(),
        detail: { batchId: 'batch-2' },
      });

      expect(element.value).to.have.length(1);
      expect(element._allUploadedFiles).to.have.length(1);
      expect(element.hasFilesUploaded).to.eql(true);
      expect(legacyStub).to.have.been.calledOnce;
      expect(notifySpy.lastCall.args[0].message).to.eql('dropzone.uploaded');
      notifySpy.restore();
      legacyStub.restore();
    });

    test('deleteFile prunes uploaded values in multiple mode', () => {
      sinon.stub(element, 'validate');
      element.required = false;
      element.multiple = true;
      element.value = [{ id: 1 }, { id: 2 }, { id: 3 }];
      element.files = [{ name: 'f2' }, { name: 'f3' }];
      element.uploadedFiles = [{ name: 'f2' }, { name: 'f3' }];
      element._allUploadedFiles = [{ name: 'f2' }, { name: 'f3' }];

      element._deleteFile({ model: { itemsIndex: 1 } });

      expect(element.value).to.eql([{ id: 1 }, { id: 2 }]);
      expect(element.files).to.eql([{ name: 'f2' }]);
      expect(element.uploadedFiles).to.eql([{ name: 'f2' }]);
      expect(element.validate).to.have.been.calledOnce;
      element.validate.restore();
    });

    test('deleteFile resets single value mode', () => {
      const resetSpy = sinon.spy(element, '_reset');
      element.multiple = false;
      element.value = { id: 'existing' };
      element.uploadedFiles = [{ name: 'f1' }];

      element._deleteFile({ model: { itemsIndex: 0 } });

      expect(resetSpy.callCount).to.be.greaterThan(0);
      expect(element.value).to.eql('');
      expect(element.uploadedFiles).to.eql([]);
      resetSpy.restore();
    });

    test('uploadInputFiles triggers upload only when valid', () => {
      const uploadSpy = sinon.spy(element, '_upload');
      sinon.stub(element, 'validate').returns(false);
      const file = { name: 'x.txt' };

      element._uploadInputFiles({ target: { files: [file] } });

      expect(element.files).to.eql([file]);
      expect(uploadSpy).to.not.have.been.called;
      element.validate.restore();
      uploadSpy.restore();
    });

    test('abortUpload removes file only when abort is available', () => {
      element.files = [{ name: 'a' }, { name: 'b' }];
      const abortSpy = sinon.spy(element, 'abort');
      sinon.stub(element, 'hasAbort').returns(false);

      element._abortUpload({ model: { itemsIndex: 0 } });
      expect(element.files).to.have.length(2);

      element.hasAbort.restore();
      sinon.stub(element, 'hasAbort').returns(true);
      element._abortUpload({ model: { itemsIndex: 1 } });
      expect(abortSpy).to.have.been.calledOnce;
      expect(element.files).to.eql([{ name: 'a' }]);

      abortSpy.restore();
      element.hasAbort.restore();
    });
  });
});

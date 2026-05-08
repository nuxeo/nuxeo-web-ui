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
import '../elements/nuxeo-document-import-csv.js';

suite('nuxeo-document-import-csv', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-import-csv></nuxeo-document-import-csv>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default accept to .csv', () => {
      expect(element.accept).to.equal('.csv');
    });

    test('should default hasFile to false', () => {
      expect(element.hasFile).to.be.false;
    });

    test('should default stage to upload', () => {
      expect(element.stage).to.equal('upload');
    });

    test('should default _creating to false', () => {
      expect(element._creating).to.be.false;
    });

    test('should default _error to false', () => {
      expect(element._error).to.be.false;
    });

    test('should default receiveEmailReport to false', () => {
      expect(element.receiveEmailReport).to.be.false;
    });
  });

  suite('_canImport', () => {
    test('should return true when hasFile and not creating', () => {
      element.hasFile = true;
      element._creating = false;
      expect(element._canImport()).to.be.true;
    });

    test('should return false when no file', () => {
      element.hasFile = false;
      expect(element._canImport()).to.be.false;
    });

    test('should return false when creating', () => {
      element.hasFile = true;
      element._creating = true;
      expect(element._canImport()).to.be.false;
    });
  });

  suite('_filterLogs', () => {
    test('should filter to only ERROR and SKIPPED logs', () => {
      const logs = [
        { status: 'ERROR', message: 'err' },
        { status: 'SUCCESS', message: 'ok' },
        { status: 'SKIPPED', message: 'skip' },
      ];
      const result = element._filterLogs(logs);
      expect(result).to.have.length(2);
    });

    test('should return empty array for all success logs', () => {
      const logs = [{ status: 'SUCCESS' }];
      expect(element._filterLogs(logs)).to.have.length(0);
    });
  });

  suite('_isError', () => {
    test('should return true for ERROR status', () => {
      expect(element._isError({ status: 'ERROR' })).to.be.true;
    });

    test('should return false for non-ERROR status', () => {
      expect(element._isError({ status: 'SUCCESS' })).to.be.false;
    });
  });

  suite('_isSkipped', () => {
    test('should return true for SKIPPED status', () => {
      expect(element._isSkipped({ status: 'SKIPPED' })).to.be.true;
    });

    test('should return false for non-SKIPPED status', () => {
      expect(element._isSkipped({ status: 'SUCCESS' })).to.be.false;
    });
  });

  suite('_computeImportDocTypes', () => {
    test('should filter out blacklisted types', () => {
      globalThis.nuxeo = globalThis.nuxeo || {};
      globalThis.nuxeo.importBlacklist = ['Blacklisted'];
      element.subtypes = [
        { type: 'File', facets: [] },
        { type: 'Blacklisted', facets: [] },
      ];
      const result = element._computeImportDocTypes();
      expect(result).to.have.length(1);
      expect(result[0].type).to.equal('File');
    });
  });

  suite('_i18n', () => {
    test('should call i18n with only label when params are missing', () => {
      expect(element._i18n('csv.import.title')).to.equal('csv.import.title');
    });

    test('should call i18n with one param', () => {
      expect(element._i18n('csv.import.title', ['a'])).to.equal('csv.import.title');
      expect(element.i18n).to.have.been.calledWith('csv.import.title', 'a');
    });

    test('should call i18n with two params', () => {
      expect(element._i18n('csv.import.title', ['a', 'b'])).to.equal('csv.import.title');
      expect(element.i18n).to.have.been.calledWith('csv.import.title', 'a', 'b');
    });
  });

  suite('_observeVisible', () => {
    test('should clear state when element becomes visible', () => {
      const clearStub = sinon.stub(element, '_clear');
      element.visible = true;
      element._observeVisible();
      expect(clearStub).to.have.been.called;
    });

    test('should clear pending timeout when hidden', () => {
      const clearTimeoutStub = sinon.stub(window, 'clearTimeout');
      element.visible = false;
      element._waitProgressId = 99;
      element._observeVisible();
      expect(clearTimeoutStub).to.have.been.calledWith(99);
    });
  });

  suite('_observeFiles', () => {
    test('should set file and creating flags when file is added', () => {
      element.files = [{ name: 'import.csv' }];
      element._observeFiles({
        path: 'files.splices',
        value: { indexSplices: [{ index: 0, addedCount: 1 }] },
      });
      expect(element.file.name).to.equal('import.csv');
      expect(element.hasFile).to.be.true;
      expect(element._creating).to.be.true;
    });

    test('should mark import as complete when file upload finishes', () => {
      element.complete = false;
      element._creating = true;
      element._observeFiles({
        path: 'files.0.complete',
      });
      expect(element.complete).to.be.true;
      expect(element._creating).to.be.false;
    });
  });

  suite('_showUploadDialog', () => {
    test('should prevent default and trigger hidden file input', () => {
      const clickStub = sinon.stub();
      element.$.uploadFiles = { click: clickStub };
      const event = { preventDefault: sinon.spy() };
      element._showUploadDialog(event);
      expect(event.preventDefault).to.have.been.calledOnce;
      expect(clickStub).to.have.been.calledOnce;
    });
  });

  suite('_fileChanged', () => {
    test('should upload selected files and set hasFile', () => {
      const uploadStub = sinon.stub(element, 'uploadFiles');
      const fileList = [{ name: 'import.csv' }];
      element._fileChanged({ target: { files: fileList } });
      expect(uploadStub).to.have.been.calledWith(fileList);
      expect(element.hasFile).to.be.true;
    });
  });

  suite('_visibleOnStage', () => {
    test('should enable path suggester only for visible upload stage', () => {
      element.$.pathSuggesterUpload = { disabled: true };
      element.visible = true;
      element.stage = 'upload';
      element._visibleOnStage();
      expect(element.$.pathSuggesterUpload.disabled).to.be.false;
    });

    test('should disable path suggester outside upload stage', () => {
      element.$.pathSuggesterUpload = { disabled: false };
      element.visible = true;
      element.stage = 'progress';
      element._visibleOnStage();
      expect(element.$.pathSuggesterUpload.disabled).to.be.true;
    });
  });

  suite('_toast and _handleError', () => {
    test('should open toast with provided message', () => {
      element.$.toast = { text: '', open: sinon.spy() };
      element._toast('problem');
      expect(element.$.toast.text).to.equal('problem');
      expect(element.$.toast.open).to.have.been.calledOnce;
    });

    test('should format toast message for errors', () => {
      const toastStub = sinon.stub(element, '_toast');
      element._handleError({ message: 'failure' });
      expect(toastStub).to.have.been.calledWith('ERROR: failure');
    });
  });

  suite('_removeBlob', () => {
    test('should clear selected file when remove succeeds', async () => {
      element.batchId = '123';
      element.$.uploadFiles = { value: 'something' };
      element.$.csvImportRes = { path: '', remove: sinon.stub().resolves() };
      element.file = { name: 'import.csv' };
      element.hasFile = true;
      element._removeBlob();
      await element.$.csvImportRes.remove.firstCall.returnValue;
      expect(element.$.csvImportRes.path).to.equal('upload/123/0');
      expect(element.file).to.deep.equal({});
      expect(element.hasFile).to.be.false;
      expect(element.$.uploadFiles.value).to.equal('');
    });

    test('should handle errors from remove operation', async () => {
      const error = { message: 'cannot remove' };
      const errorStub = sinon.stub(element, '_handleError');
      element.batchId = '123';
      element.$.csvImportRes = { path: '', remove: sinon.stub().rejects(error) };
      element._removeBlob();
      await element.$.csvImportRes.remove.firstCall.returnValue.catch(() => {});
      expect(errorStub).to.have.been.called;
    });
  });

  suite('_clear and _cancel', () => {
    test('should reset import state when clearing', () => {
      element.$.importProgress = { indeterminate: false };
      element.$.uploadFiles = { value: 'x' };
      element.stage = 'progress';
      element.hasFile = true;
      element._creating = true;
      element._error = true;
      element._hasResult = true;
      element.progressLabel = 'running';
      element._clear();
      expect(element.stage).to.equal('upload');
      expect(element.hasFile).to.be.false;
      expect(element._creating).to.be.false;
      expect(element._error).to.be.false;
      expect(element._hasResult).to.be.false;
      expect(element.$.importProgress.indeterminate).to.be.true;
      expect(element.$.uploadFiles.value).to.equal('');
    });

    test('should cancel batch, clear and show tabs', () => {
      element.batchId = 'batch-id';
      const cancelStub = sinon.stub(element, 'cancelBatch');
      const clearStub = sinon.stub(element, '_clear');
      const fireStub = sinon.stub(element, 'fire');
      element._cancel();
      expect(cancelStub).to.have.been.calledOnce;
      expect(clearStub).to.have.been.calledOnce;
      expect(fireStub).to.have.been.calledWith('nx-creation-wizard-show-tabs');
      expect(element.stage).to.equal('upload');
    });
  });

  suite('_import and _waitForProgress', () => {
    test('should trigger CSV import and switch to progress stage', async () => {
      const timeoutStub = sinon.stub(window, 'setTimeout').returns(77);
      element.batchId = 'batch-id';
      element.targetPath = '/default-domain';
      element.receiveEmailReport = true;
      element.enableImportMode = true;
      element.$.csvImportRes = { path: '', data: null, post: sinon.stub().resolves('import-1') };
      element._import();
      await element.$.csvImportRes.post.firstCall.returnValue;
      expect(element.$.csvImportRes.path).to.equal('upload/batch-id/0/execute/CSV.Import');
      expect(element.stage).to.equal('progress');
      expect(timeoutStub).to.have.been.called;
      expect(element._waitProgressId).to.equal(77);
    });

    test('should update progress and schedule next poll for running imports', async () => {
      const timeoutStub = sinon.stub(window, 'setTimeout').returns(88);
      element.$.importProgress = { indeterminate: true };
      element.$.cvsImportStatus = {
        input: null,
        execute: sinon.stub().resolves({
          value: { state: 'RUNNING', numberOfProcessedDocument: 2, totalNumberOfDocument: 10 },
        }),
      };
      element._waitForProgress('import-1');
      await element.$.cvsImportStatus.execute.firstCall.returnValue;
      expect(element._count).to.equal(2);
      expect(element._total).to.equal(10);
      expect(element.$.importProgress.indeterminate).to.be.false;
      expect(element.progressLabel).to.equal('csv.import.progress.statusWithTotal');
      expect(timeoutStub).to.have.been.called;
      expect(element._waitProgressId).to.equal(88);
    });

    test('should flag import as error when status is ERROR', async () => {
      element.$.cvsImportStatus = {
        input: null,
        execute: sinon.stub().resolves({
          value: { state: 'ERROR', numberOfProcessedDocument: 0, totalNumberOfDocument: 0 },
        }),
      };
      element._waitForProgress('import-2');
      await element.$.cvsImportStatus.execute.firstCall.returnValue;
      expect(element._error).to.be.true;
    });

    test('should fetch logs and results when import completes', async () => {
      element._count = 0;
      element.$.list = { notifyResize: sinon.stub() };
      element.$.cvsImportStatus = {
        input: null,
        execute: sinon.stub().resolves({
          value: { state: 'COMPLETED', numberOfProcessedDocument: 4, totalNumberOfDocument: 4 },
        }),
      };
      element.$.cvsImportLogOp = {
        input: null,
        execute: sinon.stub().resolves({ value: [{ status: 'ERROR' }, { status: 'SUCCESS' }] }),
      };
      element.$.cvsImportResultOp = {
        input: null,
        execute: sinon.stub().resolves({ value: { totalLineCount: 4, successLineCount: 3 } }),
      };
      element._waitForProgress('import-3');
      await element.$.cvsImportStatus.execute.firstCall.returnValue;
      await element.$.cvsImportLogOp.execute.firstCall.returnValue;
      await element.$.cvsImportResultOp.execute.firstCall.returnValue;
      expect(element._waitProgressId).to.equal(null);
      expect(element._importLogs).to.have.length(1);
      expect(element._hasResult).to.be.true;
      expect(element.$.list.notifyResize).to.have.been.calledOnce;
    });

    test('should mark completed import as error when count is negative', async () => {
      element.$.cvsImportStatus = {
        input: null,
        execute: sinon.stub().resolves({
          value: { state: 'COMPLETED', numberOfProcessedDocument: -1, totalNumberOfDocument: 1 },
        }),
      };
      element._waitForProgress('import-4');
      await element.$.cvsImportStatus.execute.firstCall.returnValue;
      expect(element._error).to.be.true;
    });

    test('should handle unknown statuses', async () => {
      const errorStub = sinon.stub(element, '_handleError');
      element.$.cvsImportStatus = {
        input: null,
        execute: sinon.stub().resolves({
          value: { state: 'UNKNOWN', numberOfProcessedDocument: 0, totalNumberOfDocument: 0 },
        }),
      };
      element._waitForProgress('import-5');
      await element.$.cvsImportStatus.execute.firstCall.returnValue;
      expect(errorStub).to.have.been.calledWithMatch({ message: sinon.match('unknown status') });
    });
  });

  suite('_close', () => {
    test('should navigate parent and clear pending timeout when import progressed', () => {
      const clearTimeoutStub = sinon.stub(window, 'clearTimeout');
      const fireStub = sinon.stub(element, 'fire');
      const navigateStub = sinon.stub(element, 'navigateTo');
      element.stage = 'progress';
      element._count = 3;
      element.parent = '/default-domain/workspaces';
      element._waitProgressId = 111;
      element._close();
      expect(fireStub).to.have.been.calledWith('document-updated');
      expect(navigateStub).to.have.been.calledWith('/default-domain/workspaces');
      expect(clearTimeoutStub).to.have.been.calledWith(111);
    });
  });
});

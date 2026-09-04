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
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import '../elements/document/nuxeo-document-import.js';

suite('nuxeo-document-import', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-document-import></nuxeo-document-import>`);
    sinon.stub(element, 'i18n').callsFake((key, ...args) => (args.length > 0 ? `${key}(${args.join(',')})` : key));
    await flush();
  });

  suite('initial state', () => {
    test('should default stage to upload', () => {
      expect(element.stage).to.equal('upload');
    });

    test('should default docIdx to -1', () => {
      expect(element.docIdx).to.equal(-1);
    });

    test('should default localFiles to empty array', () => {
      expect(element.localFiles).to.deep.equal([]);
    });

    test('should default remoteFiles to empty array', () => {
      expect(element.remoteFiles).to.deep.equal([]);
    });

    test('should default hasLocalFiles to false', () => {
      expect(element.hasLocalFiles).to.be.false;
    });

    test('should default hasRemoteFiles to false', () => {
      expect(element.hasRemoteFiles).to.be.false;
    });

    test('should default _creating to false', () => {
      expect(element._creating).to.be.false;
    });

    test('should default _initializingDoc to false', () => {
      expect(element._initializingDoc).to.be.false;
    });

    test('should default batchAppend to true', () => {
      expect(element.batchAppend).to.be.true;
    });

    test('should default _importErrorMessage to empty string', () => {
      expect(element._importErrorMessage).to.equal('');
    });
  });

  suite('_computeHasFiles', () => {
    test('should return false when no local or remote files', () => {
      element.hasLocalFiles = false;
      element.hasRemoteFiles = false;
      expect(element._computeHasFiles()).to.be.false;
    });

    test('should return true when has local files', () => {
      element.hasLocalFiles = true;
      element.hasRemoteFiles = false;
      expect(element._computeHasFiles()).to.be.true;
    });

    test('should return true when has remote files', () => {
      element.hasLocalFiles = false;
      element.hasRemoteFiles = true;
      expect(element._computeHasFiles()).to.be.true;
    });

    test('should return true when has both', () => {
      element.hasLocalFiles = true;
      element.hasRemoteFiles = true;
      expect(element._computeHasFiles()).to.be.true;
    });
  });

  suite('_getAllFiles', () => {
    test('should combine local and remote files', () => {
      element.localFiles = [{ name: 'a.txt' }];
      element.remoteFiles = [{ name: 'b.txt' }];
      const result = element._getAllFiles();
      expect(result).to.have.length(2);
      expect(result[0].name).to.equal('a.txt');
      expect(result[1].name).to.equal('b.txt');
    });

    test('should return only localFiles when remoteFiles is empty', () => {
      element.localFiles = [{ name: 'a.txt' }];
      element.remoteFiles = [];
      const result = element._getAllFiles();
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('a.txt');
    });

    test('should return only remoteFiles when localFiles is empty', () => {
      element.localFiles = [];
      element.remoteFiles = [{ name: 'b.txt' }];
      const result = element._getAllFiles();
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('b.txt');
    });

    test('should return empty array when both are empty', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      expect(element._getAllFiles()).to.deep.equal([]);
    });
  });

  suite('_getTotalFileCount', () => {
    test('should count total files from both arrays', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [{ name: 'c' }];
      expect(element._getTotalFileCount()).to.equal(3);
    });

    test('should count only remote when local is empty', () => {
      element.localFiles = [];
      element.remoteFiles = [{ name: 'c' }];
      expect(element._getTotalFileCount()).to.equal(1);
    });

    test('should count only local when remote is empty', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      expect(element._getTotalFileCount()).to.equal(1);
    });

    test('should return 0 for empty arrays', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      expect(element._getTotalFileCount()).to.equal(0);
    });
  });

  suite('_getCurrentFile', () => {
    test('should return file at current docIdx', () => {
      element.localFiles = [{ name: 'a.txt' }, { name: 'b.txt' }];
      element.remoteFiles = [];
      element.docIdx = 1;
      expect(element._getCurrentFile().name).to.equal('b.txt');
    });

    test('should return remote file when docIdx exceeds local count', () => {
      element.localFiles = [{ name: 'a.txt' }];
      element.remoteFiles = [{ name: 'r.txt' }];
      element.docIdx = 1;
      expect(element._getCurrentFile().name).to.equal('r.txt');
    });

    test('should return undefined for invalid docIdx', () => {
      element.localFiles = [{ name: 'a.txt' }];
      element.remoteFiles = [];
      element.docIdx = 5;
      expect(element._getCurrentFile()).to.be.undefined;
    });
  });

  suite('_isValidFileIndex', () => {
    test('should return true for valid indices', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [{ name: 'c' }];
      expect(element._isValidFileIndex(0)).to.be.true;
      expect(element._isValidFileIndex(1)).to.be.true;
      expect(element._isValidFileIndex(2)).to.be.true;
    });

    test('should return false for negative index', () => {
      element.localFiles = [{}];
      element.remoteFiles = [];
      expect(element._isValidFileIndex(-1)).to.be.false;
    });

    test('should return false for index >= total count', () => {
      element.localFiles = [{}];
      element.remoteFiles = [];
      expect(element._isValidFileIndex(1)).to.be.false;
    });

    test('should return false for empty arrays', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      expect(element._isValidFileIndex(0)).to.be.false;
    });
  });

  suite('_getFile', () => {
    test('should return file for valid index', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [{ name: 'b' }];
      expect(element._getFile(0).name).to.equal('a');
      expect(element._getFile(1).name).to.equal('b');
    });

    test('should return undefined for invalid index', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      expect(element._getFile(0)).to.be.undefined;
    });
  });

  suite('_getCurrentFileTitle', () => {
    test('should return file name', () => {
      element.localFiles = [{ name: 'report.pdf' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      expect(element._getCurrentFileTitle()).to.equal('report.pdf');
    });

    test('should return empty string for invalid docIdx', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      element.docIdx = 0;
      expect(element._getCurrentFileTitle()).to.equal('');
    });
  });

  suite('_getRemainingDocs', () => {
    test('should return i18n string with remaining count', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      const result = element._getRemainingDocs();
      expect(result).to.include('documentImportForm.addProperties.otherDocuments');
    });

    test('should return empty string when only one file', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      expect(element._getRemainingDocs()).to.equal('');
    });
  });

  suite('_hasNextFile', () => {
    test('should return true when more files ahead', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = false;
      expect(element._hasNextFile()).to.be.true;
    });

    test('should return false at last file', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 1;
      element.canCreate = true;
      element._creating = false;
      expect(element._hasNextFile()).to.be.false;
    });

    test('should return false when only one file', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = false;
      expect(element._hasNextFile()).to.be.false;
    });

    test('should return false when creating', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = true;
      expect(element._hasNextFile()).to.be.false;
    });

    test('should return false when cannot create', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = false;
      element._creating = false;
      expect(element._hasNextFile()).to.be.false;
    });
  });

  suite('_hasPreviousFile', () => {
    test('should return true when not at first file', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 1;
      element.canCreate = true;
      element._creating = false;
      expect(element._hasPreviousFile()).to.be.true;
    });

    test('should return false at first file', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = false;
      expect(element._hasPreviousFile()).to.be.false;
    });

    test('should return false when only one file', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = false;
      expect(element._hasPreviousFile()).to.be.false;
    });

    test('should return false when creating', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 1;
      element.canCreate = true;
      element._creating = true;
      expect(element._hasPreviousFile()).to.be.false;
    });
  });

  suite('_canImport', () => {
    test('should return true when all conditions met for local files', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.hasLocalFiles = true;
      element.hasRemoteFiles = false;
      element.hasLocalFilesUploaded = true;
      element.canCreate = true;
      element._creating = false;
      expect(element._canImport()).to.be.true;
    });

    test('should return true when all conditions met for remote files', () => {
      element.localFiles = [];
      element.remoteFiles = [{ name: 'r' }];
      element.hasLocalFiles = false;
      element.hasRemoteFiles = true;
      element.canCreate = true;
      element._creating = false;
      expect(element._canImport()).to.be.true;
    });

    test('should return false when no files', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      element.hasLocalFiles = false;
      element.hasRemoteFiles = false;
      element.canCreate = true;
      element._creating = false;
      expect(element._canImport()).to.be.false;
    });

    test('should return false when creating', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.hasLocalFiles = true;
      element.hasLocalFilesUploaded = true;
      element.canCreate = true;
      element._creating = true;
      expect(element._canImport()).to.be.false;
    });

    test('should return false when local files not uploaded', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.hasLocalFiles = true;
      element.hasRemoteFiles = false;
      element.hasLocalFilesUploaded = false;
      element.canCreate = true;
      element._creating = false;
      expect(element._canImport()).to.be.false;
    });

    test('should reset hasLocalFilesUploaded when no files exist', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      element.hasLocalFilesUploaded = true;
      element.canCreate = true;
      element._creating = false;
      element._canImport();
      expect(element.hasLocalFilesUploaded).to.be.false;
    });

    test('should return false when canCreate is false', () => {
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.hasLocalFiles = true;
      element.hasLocalFilesUploaded = true;
      element.canCreate = false;
      element._creating = false;
      expect(element._canImport()).to.be.false;
    });
  });

  suite('_isUploadingOrImporting', () => {
    test('should return true when creating', () => {
      element._creating = true;
      expect(element._isUploadingOrImporting()).to.be.true;
    });

    test('should return true when local files not yet uploaded', () => {
      element._creating = false;
      element.hasLocalFiles = true;
      element.hasLocalFilesUploaded = false;
      expect(element._isUploadingOrImporting()).to.be.true;
    });

    test('should return false when no local files and not creating', () => {
      element._creating = false;
      element.hasLocalFiles = false;
      expect(element._isUploadingOrImporting()).to.be.false;
    });

    test('should return false when local files uploaded and not creating', () => {
      element.localFiles = [{ name: 'a' }];
      element.hasLocalFiles = true;
      element.hasLocalFilesUploaded = true;
      element._creating = false;
      expect(element._isUploadingOrImporting()).to.be.false;
    });
  });

  suite('_canImportWithMetadata', () => {
    test('should return true when all files have checked property and canImport', () => {
      element.localFiles = [{ name: 'a', checked: true }];
      element.remoteFiles = [];
      element.hasLocalFiles = true;
      element.hasLocalFilesUploaded = true;
      element.canCreate = true;
      element._creating = false;
      expect(element._canImportWithMetadata()).to.be.true;
    });

    test('should return false when some files missing checked property', () => {
      element.localFiles = [{ name: 'a', checked: true }, { name: 'b' }];
      element.remoteFiles = [];
      element.hasLocalFiles = true;
      element.hasLocalFilesUploaded = true;
      element.canCreate = true;
      element._creating = false;
      expect(element._canImportWithMetadata()).to.be.false;
    });

    test('should return true when checked is false (property exists)', () => {
      element.localFiles = [{ name: 'a', checked: false }];
      element.remoteFiles = [];
      element.hasLocalFiles = true;
      element.hasLocalFilesUploaded = true;
      element.canCreate = true;
      element._creating = false;
      expect(element._canImportWithMetadata()).to.be.true;
    });
  });

  suite('_canAddProperties', () => {
    test('should return true when has files, can create, not creating', () => {
      element.hasFiles = true;
      element.hasLocalFiles = true;
      element.canCreate = true;
      element._creating = false;
      expect(element._canAddProperties()).to.be.true;
    });

    test('should return false when creating', () => {
      element.hasFiles = true;
      element.hasLocalFiles = true;
      element.canCreate = true;
      element._creating = true;
      expect(element._canAddProperties()).to.be.false;
    });

    test('should return false when no files', () => {
      element.hasFiles = false;
      element.hasLocalFiles = false;
      element.hasRemoteFiles = false;
      element.canCreate = true;
      element._creating = false;
      expect(element._canAddProperties()).to.be.false;
    });

    test('should return false when cannot create', () => {
      element.hasFiles = true;
      element.hasLocalFiles = true;
      element.canCreate = false;
      element._creating = false;
      expect(element._canAddProperties()).to.be.false;
    });
  });

  suite('_canTapDoc', () => {
    test('should return true when canCreate and not initializing', () => {
      element.canCreate = true;
      element._initializingDoc = false;
      expect(element._canTapDoc()).to.be.true;
    });

    test('should return false when initializing', () => {
      element.canCreate = true;
      element._initializingDoc = true;
      expect(element._canTapDoc()).to.be.false;
    });

    test('should return false when cannot create', () => {
      element.canCreate = false;
      element._initializingDoc = false;
      expect(element._canTapDoc()).to.be.false;
    });
  });

  suite('_canApplyToAll', () => {
    test('should return true when at first doc with multiple files', () => {
      element.customizing = true;
      element.docIdx = 0;
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.canCreate = true;
      element._creating = false;
      expect(element._canApplyToAll()).to.be.true;
    });

    test('should return false when not customizing', () => {
      element.customizing = false;
      element.docIdx = 0;
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.canCreate = true;
      element._creating = false;
      expect(element._canApplyToAll()).to.be.false;
    });

    test('should return false when not at first doc', () => {
      element.customizing = true;
      element.docIdx = 1;
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.canCreate = true;
      element._creating = false;
      expect(element._canApplyToAll()).to.be.false;
    });

    test('should return false when only one file', () => {
      element.customizing = true;
      element.docIdx = 0;
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.canCreate = true;
      element._creating = false;
      expect(element._canApplyToAll()).to.be.false;
    });

    test('should return false when creating', () => {
      element.customizing = true;
      element.docIdx = 0;
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.canCreate = true;
      element._creating = true;
      expect(element._canApplyToAll()).to.be.false;
    });
  });

  suite('_showDropzoneFileHeadings', () => {
    test('should return true when both local and remote files exist', () => {
      element.hasLocalFiles = true;
      element.hasRemoteFiles = true;
      expect(element._showDropzoneFileHeadings()).to.be.true;
    });

    test('should return false when only local files', () => {
      element.hasLocalFiles = true;
      element.hasRemoteFiles = false;
      expect(element._showDropzoneFileHeadings()).to.be.false;
    });

    test('should return false when only remote files', () => {
      element.hasLocalFiles = false;
      element.hasRemoteFiles = true;
      expect(element._showDropzoneFileHeadings()).to.be.false;
    });

    test('should return false when no files', () => {
      element.hasLocalFiles = false;
      element.hasRemoteFiles = false;
      expect(element._showDropzoneFileHeadings()).to.be.false;
    });
  });

  suite('_computedCheckItem', () => {
    test('should return check-circle when checked', () => {
      expect(element._computedCheckItem({ base: { checked: true } })).to.equal('icons:check-circle');
    });

    test('should return radio-button-unchecked when not checked', () => {
      expect(element._computedCheckItem({ base: { checked: false } })).to.equal('icons:radio-button-unchecked');
    });

    test('should return radio-button-unchecked when base has no checked', () => {
      expect(element._computedCheckItem({ base: {} })).to.equal('icons:radio-button-unchecked');
    });

    test('should return radio-button-unchecked when base is null', () => {
      expect(element._computedCheckItem({})).to.equal('icons:radio-button-unchecked');
    });
  });

  suite('_styleFileCheck', () => {
    test('should return checked for checked files', () => {
      expect(element._styleFileCheck({ base: { checked: true } })).to.equal('checked');
    });

    test('should return unchecked for unchecked files', () => {
      expect(element._styleFileCheck({ base: { checked: false } })).to.equal('unchecked');
    });

    test('should return hidden when checked property absent', () => {
      expect(element._styleFileCheck({ base: {} })).to.equal('hidden');
    });

    test('should return hidden when base is undefined', () => {
      expect(element._styleFileCheck({})).to.equal('hidden');
    });
  });

  suite('_computeRemoveIcon', () => {
    test('should return nuxeo:remove when complete', () => {
      expect(element._computeRemoveIcon({ base: { complete: true, error: false } })).to.equal('nuxeo:remove');
    });

    test('should return nuxeo:remove when error', () => {
      expect(element._computeRemoveIcon({ base: { complete: false, error: true } })).to.equal('nuxeo:remove');
    });

    test('should return icons:cancel when hasAbort and in progress', () => {
      sinon.stub(element, 'hasAbort').returns(true);
      expect(element._computeRemoveIcon({ base: { complete: false, error: false } })).to.equal('icons:cancel');
      element.hasAbort.restore();
    });

    test('should return empty string when no abort and in progress', () => {
      sinon.stub(element, 'hasAbort').returns(false);
      expect(element._computeRemoveIcon({ base: { complete: false, error: false } })).to.equal('');
      element.hasAbort.restore();
    });

    test('should return empty string when base is undefined', () => {
      expect(element._computeRemoveIcon({})).to.equal('');
    });
  });

  suite('_computeRemoveLabel', () => {
    test('should return command.remove when complete', () => {
      expect(element._computeRemoveLabel({ base: { complete: true, error: false } })).to.equal('command.remove');
    });

    test('should return command.remove when error', () => {
      expect(element._computeRemoveLabel({ base: { complete: false, error: true } })).to.equal('command.remove');
    });

    test('should return cancel label when hasAbort and in progress', () => {
      sinon.stub(element, 'hasAbort').returns(true);
      const result = element._computeRemoveLabel({ base: { complete: false, error: false } });
      expect(result).to.be.a('string');
      expect(result.length).to.be.greaterThan(0);
      element.hasAbort.restore();
    });

    test('should return empty string when no abort and in progress', () => {
      sinon.stub(element, 'hasAbort').returns(false);
      expect(element._computeRemoveLabel({ base: { complete: false, error: false } })).to.equal('');
      element.hasAbort.restore();
    });

    test('should return empty string when base is undefined', () => {
      expect(element._computeRemoveLabel({})).to.equal('');
    });
  });

  suite('_computeRemoveBtnTitle', () => {
    test('should concatenate file name with remove label', () => {
      const result = element._computeRemoveBtnTitle('test.pdf');
      expect(result).to.include('test.pdf');
      expect(result).to.include('command.remove');
    });
  });

  suite('_displayProgressBar', () => {
    test('should return true for active local upload', () => {
      expect(element._displayProgressBar({ base: { providerId: null, complete: false, error: false } })).to.be.true;
    });

    test('should return false for remote file (has providerId)', () => {
      expect(element._displayProgressBar({ base: { providerId: 'drive', complete: false, error: false } })).to.be.false;
    });

    test('should return false when complete', () => {
      expect(element._displayProgressBar({ base: { providerId: null, complete: true, error: false } })).to.be.false;
    });

    test('should return false when error', () => {
      expect(element._displayProgressBar({ base: { providerId: null, complete: false, error: true } })).to.be.false;
    });

    test('should return falsy when base is undefined', () => {
      expect(element._displayProgressBar({})).to.not.be.ok;
    });
  });

  suite('_displayRemoveBlobBtn', () => {
    test('should return true when complete', () => {
      expect(element._displayRemoveBlobBtn({ base: { complete: true, error: false } })).to.be.true;
    });

    test('should return true when error', () => {
      expect(element._displayRemoveBlobBtn({ base: { complete: false, error: true } })).to.be.true;
    });

    test('should return true when hasAbort', () => {
      sinon.stub(element, 'hasAbort').returns(true);
      expect(element._displayRemoveBlobBtn({ base: { complete: false, error: false } })).to.be.true;
      element.hasAbort.restore();
    });

    test('should return false when not complete, not error, no abort', () => {
      sinon.stub(element, 'hasAbort').returns(false);
      expect(element._displayRemoveBlobBtn({ base: { complete: false, error: false } })).to.be.false;
      element.hasAbort.restore();
    });

    test('should return falsy when base is undefined', () => {
      expect(element._displayRemoveBlobBtn({})).to.not.be.ok;
    });
  });

  suite('_mergeResponses', () => {
    test('should merge multiple responses into one', () => {
      const result = element._mergeResponses(
        { 'entity-type': 'document', uid: '1' },
        { 'entity-type': 'document', uid: '2' },
      );
      expect(result['entity-type']).to.equal('Documents');
      expect(result.entries).to.have.length(2);
    });

    test('should handle response with entries array', () => {
      const result = element._mergeResponses({ entries: [{ uid: '1' }] }, { 'entity-type': 'document', uid: '2' });
      expect(result['entity-type']).to.equal('Documents');
      expect(result.entries).to.deep.equal([{ uid: '1' }, { 'entity-type': 'document', uid: '2' }]);
    });

    test('should return the union of the entries of every Documents response', () => {
      const result = element._mergeResponses(
        { 'entity-type': 'Documents', entries: [{ uid: '1' }, { uid: '2' }] },
        { 'entity-type': 'Documents', entries: [{ uid: '3' }] },
        { 'entity-type': 'Documents', entries: [{ uid: '4' }, { uid: '5' }] },
      );
      expect(result['entity-type']).to.equal('Documents');
      expect(result.entries).to.have.length(5);
      expect(result.entries.map((entry) => entry.uid)).to.deep.equal(['1', '2', '3', '4', '5']);
    });

    test('should handle single response', () => {
      const result = element._mergeResponses({ uid: '1' });
      expect(result['entity-type']).to.equal('Documents');
      expect(result.entries).to.have.length(1);
    });
  });

  suite('_processFilesWithMetadata', () => {
    const buildFiles = (count, prefix) =>
      Array.from({ length: count }, (_, i) => {
        return {
          name: `${prefix}-${i}.txt`,
          checked: true,
          docData: { document: { properties: {} }, parent: '/default-domain', type: { id: 'File' } },
        };
      });

    setup(() => {
      sinon.stub(element, '_handleSuccess');
      sinon.stub(element, '_selectDoc');
    });

    teardown(() => {
      element._handleSuccess.restore();
      element._selectDoc.restore();
      if (element._processFileWithMetadata.restore) {
        element._processFileWithMetadata.restore();
      }
    });

    const stubImport = (failingNames) =>
      sinon
        .stub(element, '_processFileWithMetadata')
        .callsFake((file) =>
          failingNames.includes(file.name)
            ? Promise.reject({ 'entity-type': 'exception', message: 'could not be created' })
            : Promise.resolve({ 'entity-type': 'document', uid: file.name, type: 'File' }),
        );

    test('should keep exactly the failed local files when more than ten are imported', async () => {
      element.localFiles = buildFiles(12, 'local');
      element.remoteFiles = [];
      stubImport(['local-3.txt', 'local-11.txt']);

      element._processFilesWithMetadata();
      await flush();

      expect(element.localFiles.map((file) => file.name)).to.deep.equal(['local-3.txt', 'local-11.txt']);
      expect(element._importWithPropertiesError).to.equal('These documents could not be created.');
    });

    test('should keep exactly the failed remote files when more than ten are imported', async () => {
      element.localFiles = [];
      element.remoteFiles = buildFiles(12, 'remote');
      stubImport(['remote-0.txt', 'remote-10.txt']);

      element._processFilesWithMetadata();
      await flush();

      expect(element.remoteFiles.map((file) => file.name)).to.deep.equal(['remote-0.txt', 'remote-10.txt']);
    });

    test('should leave the file lists untouched when every import succeeds', async () => {
      element.localFiles = buildFiles(12, 'local');
      element.remoteFiles = [];
      stubImport([]);

      element._processFilesWithMetadata();
      await flush();

      expect(element.localFiles).to.have.length(12);
      expect(element._selectDoc).to.not.have.been.called;
    });
  });

  suite('_filterImportDocTypes', () => {
    test('should include types not in blacklist', () => {
      window.nuxeo = window.nuxeo || {};
      window.nuxeo.importBlacklist = window.nuxeo.importBlacklist || [];
      expect(element._filterImportDocTypes({ type: 'File' })).to.be.true;
    });

    test('should exclude types in blacklist', () => {
      window.nuxeo = window.nuxeo || {};
      window.nuxeo.importBlacklist = ['File'];
      expect(element._filterImportDocTypes({ type: 'File' })).to.be.false;
      window.nuxeo.importBlacklist = [];
    });
  });

  suite('_selectedLocalDocStyle', () => {
    test('should return selected when index matches docIdx', () => {
      element.docIdx = 2;
      element._initializingDoc = false;
      expect(element._selectedLocalDocStyle(2)).to.equal('selected');
    });

    test('should return empty when index does not match', () => {
      element.docIdx = 1;
      element._initializingDoc = false;
      expect(element._selectedLocalDocStyle(0)).to.equal('');
    });

    test('should return empty when initializing', () => {
      element.docIdx = 0;
      element._initializingDoc = true;
      expect(element._selectedLocalDocStyle(0)).to.equal('');
    });
  });

  suite('_selectedRemoteDocStyle', () => {
    test('should return selected when remote index matches docIdx offset', () => {
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.docIdx = 3;
      element._initializingDoc = false;
      expect(element._selectedRemoteDocStyle(1)).to.equal('selected');
    });

    test('should return empty when not matching', () => {
      element.localFiles = [{ name: 'a' }];
      element.docIdx = 0;
      element._initializingDoc = false;
      expect(element._selectedRemoteDocStyle(0)).to.equal('');
    });
  });

  suite('_disableEditPrevious', () => {
    test('should return true when initializing', () => {
      element._initializingDoc = true;
      expect(element._disableEditPrevious()).to.be.true;
    });

    test('should return true when no previous file', () => {
      element._initializingDoc = false;
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = false;
      expect(element._disableEditPrevious()).to.be.true;
    });

    test('should return false when has previous file and not initializing', () => {
      element._initializingDoc = false;
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 1;
      element.canCreate = true;
      element._creating = false;
      expect(element._disableEditPrevious()).to.be.false;
    });
  });

  suite('_disableEditNext', () => {
    test('should return true when initializing', () => {
      element._initializingDoc = true;
      expect(element._disableEditNext()).to.be.true;
    });

    test('should return true when no next file', () => {
      element._initializingDoc = false;
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = false;
      expect(element._disableEditNext()).to.be.true;
    });

    test('should return false when has next file and not initializing', () => {
      element._initializingDoc = false;
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.docIdx = 0;
      element.canCreate = true;
      element._creating = false;
      expect(element._disableEditNext()).to.be.false;
    });
  });

  suite('_disableApplyToAll', () => {
    test('should return true when initializing', () => {
      element._initializingDoc = true;
      expect(element._disableApplyToAll()).to.be.true;
    });

    test('should return true when cannot apply to all', () => {
      element._initializingDoc = false;
      element.customizing = false;
      expect(element._disableApplyToAll()).to.be.true;
    });

    test('should return false when can apply to all and not initializing', () => {
      element._initializingDoc = false;
      element.customizing = true;
      element.docIdx = 0;
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element.remoteFiles = [];
      element.canCreate = true;
      element._creating = false;
      expect(element._disableApplyToAll()).to.be.false;
    });
  });

  suite('_setFileProp', () => {
    test('should update local file property by index', () => {
      element.localFiles = [{ checked: false }, { checked: false }];
      element.remoteFiles = [];
      element._setFileProp(1, 'checked', true);
      expect(element.localFiles[1].checked).to.be.true;
    });

    test('should update remote file property by offset index', () => {
      element.localFiles = [{ checked: false }];
      element.remoteFiles = [{ checked: false }];
      element._setFileProp(1, 'checked', true);
      expect(element.remoteFiles[0].checked).to.be.true;
    });

    test('should do nothing for invalid index', () => {
      element.localFiles = [];
      element.remoteFiles = [];
      element._setFileProp(0, 'checked', true); // no crash
    });
  });

  suite('_toggleCustomize', () => {
    test('should switch from upload to customize', () => {
      const fireSpy = sinon.spy(element, 'fire');
      sinon.stub(element, '_selectDoc');
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [];
      element.stage = 'upload';

      element._toggleCustomize();
      expect(element.stage).to.equal('customize');
      expect(element.customizing).to.be.true;
      expect(fireSpy).to.have.been.calledWith('nx-creation-wizard-hide-tabs');
      fireSpy.restore();
    });

    test('should switch from customize to upload', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element.stage = 'customize';

      element._toggleCustomize();
      expect(element.stage).to.equal('upload');
      expect(element.customizing).to.be.false;
      expect(fireSpy).to.have.been.calledWith('nx-creation-wizard-show-tabs');
      fireSpy.restore();
    });

    test('should select first non-error file', () => {
      sinon.stub(element, '_selectDoc');
      element.localFiles = [{ error: 'fail' }, { error: false }, { error: false }];
      element.remoteFiles = [];
      element.stage = 'upload';

      element._toggleCustomize();
      expect(element._selectDoc).to.have.been.calledWith(1);
    });

    test('should select index 0 when all files have errors', () => {
      sinon.stub(element, '_selectDoc');
      element.localFiles = [{ error: 'fail' }, { error: 'fail' }];
      element.remoteFiles = [];
      element.stage = 'upload';

      element._toggleCustomize();
      expect(element._selectDoc).to.have.been.calledWith(0);
    });
  });

  suite('_checkTappedLocal', () => {
    test('should toggle checked property', () => {
      element.localFiles = [{ checked: false }];
      element._checkTappedLocal({
        stopPropagation: sinon.spy(),
        model: { index: 0, file: element.localFiles[0] },
      });
      expect(element.localFiles[0].checked).to.be.true;
    });

    test('should not toggle when file has error', () => {
      element.localFiles = [{ checked: false, error: 'Upload failed' }];
      element._checkTappedLocal({
        stopPropagation: sinon.spy(),
        model: { index: 0, file: element.localFiles[0] },
      });
      expect(element.localFiles[0].checked).to.be.false;
    });

    test('should call stopPropagation', () => {
      element.localFiles = [{ checked: false }];
      const event = {
        stopPropagation: sinon.spy(),
        model: { index: 0, file: element.localFiles[0] },
      };
      element._checkTappedLocal(event);
      expect(event.stopPropagation).to.have.been.calledOnce;
    });
  });

  suite('_checkTappedRemote', () => {
    test('should toggle checked property', () => {
      element.remoteFiles = [{ checked: false }];
      element._checkTappedRemote({
        stopPropagation: sinon.spy(),
        model: { index: 0, file: element.remoteFiles[0] },
      });
      expect(element.remoteFiles[0].checked).to.be.true;
    });

    test('should not toggle when file has error', () => {
      element.remoteFiles = [{ checked: false, error: 'Upload failed' }];
      element._checkTappedRemote({
        stopPropagation: sinon.spy(),
        model: { index: 0, file: element.remoteFiles[0] },
      });
      expect(element.remoteFiles[0].checked).to.be.false;
    });
  });

  suite('_visibleOnStage', () => {
    test('should enable upload path suggester when visible and upload stage', () => {
      element.visible = true;
      element.stage = 'upload';
      element._visibleOnStage();
      expect(element.$.pathSuggesterUpload.disabled).to.be.false;
      expect(element.$.pathSuggesterCustomize.disabled).to.be.true;
    });

    test('should enable customize path suggester when visible and customize stage', () => {
      element.visible = true;
      element.stage = 'customize';
      element._visibleOnStage();
      expect(element.$.pathSuggesterUpload.disabled).to.be.true;
      expect(element.$.pathSuggesterCustomize.disabled).to.be.false;
    });

    test('should disable both when not visible', () => {
      element.visible = false;
      element.stage = 'upload';
      element._visibleOnStage();
      expect(element.$.pathSuggesterUpload.disabled).to.be.true;
      expect(element.$.pathSuggesterCustomize.disabled).to.be.true;
    });
  });

  suite('_observeRemoteFiles', () => {
    test('should set hasRemoteFiles to true when remote files exist', () => {
      element.remoteFiles = [{ name: 'r.txt' }];
      element._observeRemoteFiles();
      expect(element.hasRemoteFiles).to.be.true;
    });

    test('should set hasRemoteFiles to false when empty', () => {
      element.remoteFiles = [];
      element._observeRemoteFiles();
      expect(element.hasRemoteFiles).to.be.false;
    });
  });

  suite('_doNativeValidation', () => {
    test('should always return true', () => {
      expect(element._doNativeValidation()).to.be.true;
    });
  });

  suite('_validate', () => {
    let innerLayout;

    setup(() => {
      innerLayout = {
        _getValidatableElements: sinon.stub().returns([]),
        element: { root: document.createElement('div') },
      };
      sinon
        .stub(element, '$$')
        .withArgs('#document-import')
        .returns({ $: { layout: innerLayout } });
      sinon.stub(element.$.form, 'validate').returns(false);
    });

    teardown(() => {
      element.$$.restore();
      element.$.form.validate.restore();
    });

    test('should scroll to and focus invalid field on validation failure', () => {
      const invalidField = { invalid: true, scrollIntoView: sinon.spy(), focus: sinon.spy() };
      innerLayout._getValidatableElements.returns([{ invalid: false }, invalidField]);
      element._validate();
      // the options matter: `nearest` keeps the error summary in view and `preventScroll` stops
      // the focus call from scrolling again, so assert them rather than just the call count.
      // Compare the recorded args instead of using `calledOnceWithExactly`: a mismatch on the
      // spy matcher never reaches the reporter and the runner session times out with no result.
      expect(invalidField.scrollIntoView.args).to.deep.equal([[{ block: 'nearest' }]]);
      expect(invalidField.focus.args).to.deep.equal([[{ preventScroll: true }]]);
    });

    test('should not scroll when no field reports itself invalid', () => {
      const field = { invalid: false, scrollIntoView: sinon.spy(), focus: sinon.spy() };
      innerLayout._getValidatableElements.returns([field]);
      element._validate();
      expect(field.scrollIntoView).to.not.have.been.called;
      expect(field.focus).to.not.have.been.called;
    });

    test('should return true without scrolling when the form is valid', () => {
      element.$.form.validate.returns(true);
      expect(element._validate()).to.be.true;
      expect(innerLayout._getValidatableElements).to.not.have.been.called;
    });
  });

  suite('_clear', () => {
    test('should reset all properties to initial state', () => {
      element.stage = 'customize';
      element.localFiles = [{ name: 'a' }];
      element.remoteFiles = [{ name: 'b' }];
      element.docIdx = 3;
      element._creating = true;
      element._initializingDoc = true;
      element._importErrorMessage = 'error';
      element._importWithPropertiesError = 'error';
      element.customizing = true;

      element._clear();

      expect(element.stage).to.equal('upload');
      expect(element.localFiles).to.deep.equal([]);
      expect(element.remoteFiles).to.deep.equal([]);
      expect(element.docIdx).to.equal(-1);
      expect(element._creating).to.be.false;
      expect(element._initializingDoc).to.be.false;
      expect(element._importErrorMessage).to.equal('');
      expect(element._importWithPropertiesError).to.equal('');
      expect(element.customizing).to.be.false;
      expect(element.hasLocalFiles).to.be.false;
      expect(element.hasRemoteFiles).to.be.false;
      expect(element.hasLocalFilesUploaded).to.be.false;
      expect(element._doNotCreate).to.be.false;
    });
  });

  suite('_cancel', () => {
    test('should cancel batch, clear, and fire show-tabs event', () => {
      sinon.stub(element, 'cancelBatch');
      const fireSpy = sinon.spy(element, 'fire');

      element._cancel();

      expect(element.cancelBatch).to.have.been.calledOnce;
      expect(element.stage).to.equal('upload');
      expect(fireSpy).to.have.been.calledWith('nx-creation-wizard-show-tabs');
      element.cancelBatch.restore();
      fireSpy.restore();
    });
  });

  suite('_handleError', () => {
    test('should set creating to false and set error message', () => {
      sinon.stub(element, 'notify');
      element._creating = true;
      element._handleError(new Error('test error'));
      expect(element._creating).to.be.false;
      expect(element._importErrorMessage).to.equal('documentImport.error.importFailed');
      element.notify.restore();
    });

    test('should handle string error', () => {
      sinon.stub(element, 'notify');
      element._handleError('Something went wrong');
      expect(element._creating).to.be.false;
      element.notify.restore();
    });

    test('should handle backend error payload', () => {
      sinon.stub(element, 'notify');
      element._handleError({ message: 'Backend error' });
      expect(element._creating).to.be.false;
      element.notify.restore();
    });

    test('should handle error with detail.error', () => {
      sinon.stub(element, 'notify');
      element._handleError({ detail: { error: 'Detail error' } });
      expect(element._creating).to.be.false;
      element.notify.restore();
    });
  });

  suite('_tapLocalDoc', () => {
    test('should call selectDoc with model index', () => {
      sinon.stub(element, '_selectDoc');
      element._tapLocalDoc({ model: { index: 2 } });
      expect(element._selectDoc).to.have.been.calledWith(2);
    });
  });

  suite('_tapRemoteDoc', () => {
    test('should call selectDoc with offset index', () => {
      sinon.stub(element, '_selectDoc');
      element.localFiles = [{ name: 'a' }, { name: 'b' }];
      element._tapRemoteDoc({ model: { index: 1 } });
      expect(element._selectDoc).to.have.been.calledWith(3);
    });
  });

  suite('_parentValidated', () => {
    test('should disable creation when no import doc types available', () => {
      element.canCreate = true;
      // Set subtypes to empty to make _importDocTypes compute to []
      element.subtypes = [];
      element._parentValidated();
      expect(element.canCreate).to.be.false;
    });

    test('should not change canCreate when canCreate is false', () => {
      element.canCreate = false;
      element._parentValidated();
      expect(element.canCreate).to.be.false;
    });
  });

  suite('_getDocumentProperties', () => {
    test('should return the _docProperties object', () => {
      element._docProperties = { 'dc:title': 'test' };
      expect(element._getDocumentProperties()).to.deep.equal({ 'dc:title': 'test' });
    });

    test('should return empty object by default', () => {
      element._docProperties = {};
      expect(element._getDocumentProperties()).to.deep.equal({});
    });
  });
});

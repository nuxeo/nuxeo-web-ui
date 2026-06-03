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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import { PageProviderDisplayBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-page-provider-display-behavior.js';
import '../elements/nuxeo-drive-download-button.js';
import { setupI18n, stubToast, addShowErrorSuite, addToggleInstallSuite } from './nuxeo-drive-test-helpers.test.js';

// Setup i18n keys used by the component
setupI18n({
  'driveDownloadButton.tooltip': 'Download with Nuxeo Drive',
  'driveDownload.noDocumentsSelected': 'No documents selected for download.',
  'driveDownload.tooManyDocuments':
    'You have selected more documents than supported. Please select up to {0} documents to download via Nuxeo Drive.',
  'driveDownload.directTransfer.failed': 'An error occurred while trying to download the document with Nuxeo Drive.',
  'driveButton.dialog.heading': 'Nuxeo Drive',
  'driveButton.dialog.description': 'Use Nuxeo Drive to work with your documents directly from your desktop.',
  'command.close': 'Close',
});

suite('nuxeo-drive-download-button', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-download-button></nuxeo-drive-download-button>`);
  });

  // Shared suites
  addShowErrorSuite(() => element);
  addToggleInstallSuite(() => element);

  // ---------------------------------------------------------------------------
  // _isAvailable
  // ---------------------------------------------------------------------------
  suite('_isAvailable', () => {
    test('returns true when documents is a plain array', () => {
      element.documents = [{ uid: 'doc-1' }, { uid: 'doc-2' }];
      expect(element._isAvailable()).to.be.true;
    });

    test('returns false when documents array is empty', () => {
      element.documents = [];
      expect(element._isAvailable()).to.be.false;
    });

    test('returns true when select-all is active and the view has items', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [{ uid: 'doc-1' }, { uid: 'doc-2' }],
      };
      element.documents = viewStub;
      expect(element._isAvailable()).to.be.true;
    });

    test('returns false when select-all is active but the view has no items', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [],
      };
      element.documents = viewStub;
      expect(element._isAvailable()).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // action div visibility
  // ---------------------------------------------------------------------------
  suite('action div visibility', () => {
    teardown(() => {
      sinon.restore();
    });

    test('action div is visible when documents is a plain array', async () => {
      element.documents = [{ uid: 'doc-1' }];
      await flush();
      const actionDiv = element.shadowRoot.querySelector('.action');
      expect(actionDiv).to.exist;
      expect(actionDiv.hasAttribute('hidden')).to.be.false;
    });

    test('action div is hidden when _isAvailable returns false', async () => {
      sinon.stub(element, '_isAvailable').returns(false);
      element.documents = [];
      await flush();
      const actionDiv = element.shadowRoot.querySelector('.action');
      expect(actionDiv).to.exist;
      expect(actionDiv.hasAttribute('hidden')).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // _getSelectedDocumentUids
  // ---------------------------------------------------------------------------
  suite('_getSelectedDocumentUids', () => {
    test('returns UIDs from documents array when populated', () => {
      element.documents = [{ uid: 'aaa-111' }, { uid: 'bbb-222' }, { uid: 'ccc-333' }];
      expect(element._getSelectedDocumentUids()).to.deep.equal(['aaa-111', 'bbb-222', 'ccc-333']);
    });

    test('falls back to single document.uid when documents array is empty', () => {
      element.documents = [];
      element.document = { uid: 'single-doc-uid' };
      expect(element._getSelectedDocumentUids()).to.deep.equal(['single-doc-uid']);
    });

    test('returns empty array when both documents and document are unset', () => {
      element.documents = [];
      element.document = null;
      expect(element._getSelectedDocumentUids()).to.deep.equal([]);
    });

    test('documents array takes precedence over single document', () => {
      element.documents = [{ uid: 'from-array' }];
      element.document = { uid: 'from-document' };
      expect(element._getSelectedDocumentUids()).to.deep.equal(['from-array']);
    });

    test('returns UIDs from view items when select-all is active', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [{ uid: 'select-all-uid-1' }, { uid: 'select-all-uid-2' }, { uid: 'select-all-uid-3' }],
      };
      element.documents = viewStub;
      expect(element._getSelectedDocumentUids()).to.deep.equal([
        'select-all-uid-1',
        'select-all-uid-2',
        'select-all-uid-3',
      ]);
    });

    test('returns empty array when select-all is active but view has no items', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [],
      };
      element.documents = viewStub;
      expect(element._getSelectedDocumentUids()).to.deep.equal([]);
    });

    test('returns UIDs from selectedItems when select-all is active and some items are deselected', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: Array.from({ length: 36 }, (_, i) => {
          return { uid: `uid-${i}` };
        }),
        selectedItems: Array.from({ length: 22 }, (_, i) => {
          return { uid: `uid-${i}` };
        }),
      };
      element.documents = viewStub;
      const uids = element._getSelectedDocumentUids();
      expect(uids).to.have.length(22);
      expect(uids[0]).to.equal('uid-0');
      expect(uids[21]).to.equal('uid-21');
    });

    test('falls back to items when select-all is active and selectedItems is absent', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [{ uid: 'item-uid-1' }, { uid: 'item-uid-2' }],
      };
      element.documents = viewStub;
      expect(element._getSelectedDocumentUids()).to.deep.equal(['item-uid-1', 'item-uid-2']);
    });
  });

  // ---------------------------------------------------------------------------
  // _buildOriginalUrl
  // ---------------------------------------------------------------------------
  suite('_buildOriginalUrl', () => {
    test('builds correct nxdrive URL for a single document', () => {
      element.documents = [{ uid: '00000000-0000-0000-0000-000000000001' }];
      const url = element._buildOriginalUrl();
      expect(url).to.match(/^nxdrive:\/\/direct-download\//);
      expect(url).to.include('00000000-0000-0000-0000-000000000001');
    });

    test('joins multiple UIDs with " | " delimiter', () => {
      element.documents = [
        { uid: '00000000-0000-0000-0000-000000000001' },
        { uid: '00000000-0000-0000-0000-000000000002' },
      ];
      const url = element._buildOriginalUrl();
      expect(url).to.include(' | ');
      expect(url).to.include('00000000-0000-0000-0000-000000000001');
      expect(url).to.include('00000000-0000-0000-0000-000000000002');
    });

    test('URL contains a server/host segment after the direct-download scheme', () => {
      element.documents = [{ uid: '00000000-0000-0000-0000-000000000001' }];
      const url = element._buildOriginalUrl();
      const path = url.replace('nxdrive://direct-download/', '');
      const segments = path.split('/');
      expect(segments.length).to.be.at.least(2);
    });
  });

  // ---------------------------------------------------------------------------
  // _compressFromOriginalUrl / directDownloadUrl
  // ---------------------------------------------------------------------------
  suite('_compressFromOriginalUrl', () => {
    test('returns a nxdrive://direct-download/<base64> URL', () => {
      element.documents = [{ uid: '00000000-1111-2222-3333-444444444444' }];
      const original = element._buildOriginalUrl();
      const compressed = element._compressFromOriginalUrl(original);
      expect(compressed).to.match(/^nxdrive:\/\/direct-download\/[A-Za-z0-9_-]+$/);
    });

    test('compressed URL does not contain the raw UID', () => {
      element.documents = [{ uid: '00000000-1111-2222-3333-444444444444' }];
      const original = element._buildOriginalUrl();
      const compressed = element._compressFromOriginalUrl(original);
      expect(compressed).to.not.include('00000000-1111-2222-3333-444444444444');
    });

    test('different documents produce different compressed URLs', () => {
      element.documents = [{ uid: 'aaaaaaaa-0000-0000-0000-000000000000' }];
      const url1 = element._compressFromOriginalUrl(element._buildOriginalUrl());

      element.documents = [{ uid: 'bbbbbbbb-0000-0000-0000-000000000000' }];
      const url2 = element._compressFromOriginalUrl(element._buildOriginalUrl());

      expect(url1).to.not.equal(url2);
    });

    test('directDownloadUrl getter returns a valid nxdrive URL', () => {
      element.documents = [{ uid: '00000000-1111-2222-3333-444444444444' }];
      expect(element.directDownloadUrl).to.match(/^nxdrive:\/\/direct-download\/[A-Za-z0-9_-]+$/);
    });

    test('throws when server host segment exceeds 255 bytes', () => {
      const longServer = 'http/' + 'a'.repeat(260) + '/00000000-1111-2222-3333-444444444444';
      const longUrl = `nxdrive://direct-download/${longServer}`;
      expect(() => element._compressFromOriginalUrl(longUrl)).to.throw();
    });
  });

  // ---------------------------------------------------------------------------
  // _download — guard conditions
  // ---------------------------------------------------------------------------
  suite('_download', () => {
    let toastStub;

    setup(() => {
      toastStub = stubToast(element);
      // Prevent nxdrive:// anchor clicks from triggering a Karma page reload.
      // In Chrome 148+, click() is inherited from HTMLElement.prototype, so sinon.stub()
      // on HTMLAnchorElement.prototype has no effect. A direct own-property assignment shadows it.
      HTMLAnchorElement.prototype.click = function () {};
    });

    teardown(() => {
      delete HTMLAnchorElement.prototype.click;
      sinon.restore();
    });

    test('shows noDocumentsSelected error when documents is empty and document is unset', () => {
      element.documents = [];
      element.document = null;
      element._download();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('No documents selected');
    });

    test('shows noDocumentsSelected error when select-all is active but view has no items', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [],
      };
      element.documents = viewStub;
      element._download();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('No documents selected');
    });

    test('shows tooManyDocuments error when select-all yields more than 25 items', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: Array.from({ length: 26 }, (_, i) => {
          return { uid: `sa-uid-${i}` };
        }),
      };
      element.documents = viewStub;
      element._download();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('25');
    });

    test('shows tooManyDocuments error when more than 25 documents are selected', () => {
      element.documents = Array.from({ length: 26 }, (_, i) => {
        return { uid: `uid-${i}` };
      });
      element._download();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('25');
    });

    test('does not show error when exactly 25 documents are selected', () => {
      element.documents = Array.from({ length: 25 }, (_, i) => {
        return { uid: `uid-${i}` };
      });
      element._download();
      expect(toastStub.open).to.not.have.been.called;
    });

    test('succeeds after deselecting items so count drops to ≤ 25', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: Array.from({ length: 36 }, (_, i) => {
          return { uid: `uid-${i}` };
        }),
        selectedItems: Array.from({ length: 23 }, (_, i) => {
          return { uid: `uid-${i}` };
        }),
      };
      element.documents = viewStub;
      element._download();
      expect(toastStub.open).to.not.have.been.called;
    });

    test('does not show error for a single document via document property', () => {
      element.documents = [];
      element.document = { uid: 'single-doc-uid' };
      element._download();
      expect(toastStub.open).to.not.have.been.called;
    });

    test('folder UID is collected as a single item', () => {
      element.documents = [{ uid: 'folder-uid-1' }, { uid: 'folder-uid-2' }];
      const uids = element._getSelectedDocumentUids();
      expect(uids).to.deep.equal(['folder-uid-1', 'folder-uid-2']);
      expect(uids).to.have.length(2);
    });

    test('mixed selection of documents and folders produces all UIDs in the URL', () => {
      element.documents = [
        { uid: 'doc-uid-1' },
        { uid: 'folder-uid-1' },
        { uid: 'doc-uid-2' },
        { uid: 'folder-uid-2' },
      ];
      const url = element._buildOriginalUrl();
      expect(url).to.include('doc-uid-1');
      expect(url).to.include('folder-uid-1');
      expect(url).to.include('doc-uid-2');
      expect(url).to.include('folder-uid-2');
    });

    test('triggers download for select-all items within limit', () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [{ uid: 'sa-uid-1' }, { uid: 'sa-uid-2' }, { uid: 'sa-uid-3' }],
      };
      element.documents = viewStub;
      element._download();
      expect(toastStub.open).to.not.have.been.called;
    });

    test('shows error with userMessage when _compressFromOriginalUrl throws with userMessage', () => {
      element.documents = [{ uid: 'doc-uid-1' }];
      const err = new Error('internal error');
      err.userMessage = 'The server URL is too long';
      sinon.stub(element, '_compressFromOriginalUrl').throws(err);
      element._download();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.equal('The server URL is too long');
    });

    test('shows error with message when _compressFromOriginalUrl throws without userMessage', () => {
      element.documents = [{ uid: 'doc-uid-1' }];
      sinon.stub(element, '_compressFromOriginalUrl').throws(new Error('generic error'));
      element._download();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.equal('generic error');
    });
  });
});

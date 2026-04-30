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

// Setup i18n keys used by the component
window.nuxeo = window.nuxeo || {};
window.nuxeo.I18n = window.nuxeo.I18n || {};
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['driveDownloadButton.tooltip'] = 'Download with Nuxeo Drive';
window.nuxeo.I18n.en['driveDownload.noDocumentsSelected'] = 'No documents selected for download.';
window.nuxeo.I18n.en['driveDownload.tooManyDocuments'] =
  'You have selected more documents than supported. Please select up to {0} documents to download via Nuxeo Drive.';
window.nuxeo.I18n.en['driveDownload.directTransfer.failed'] =
  'An error occurred while trying to download the document with Nuxeo Drive.';
window.nuxeo.I18n.en['driveDownload.serverUrlTooLong'] =
  'The server URL is too long to generate a Nuxeo Drive download link.';
window.nuxeo.I18n.en['driveEditButton.dialog.heading'] = 'Download Nuxeo Drive Client';
window.nuxeo.I18n.en['command.close'] = 'Close';

suite('nuxeo-drive-download-button', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-download-button></nuxeo-drive-download-button>`);
  });

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
      // hidden$ binding: hidden attribute should NOT be set
      expect(actionDiv.hasAttribute('hidden')).to.be.false;
    });

    test('action div is hidden when _isAvailable returns false', async () => {
      // Stub _isAvailable to return false (simulates select-all active)
      sinon.stub(element, '_isAvailable').returns(false);
      // Re-trigger the binding by setting documents
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

    test('returns UIDs from selectedItems (not items) when select-all is active and some items are deselected', () => {
      // Simulates: select-all on 36 docs, then deselect 14 → 22 remain selected.
      // selectAllActive stays true; selectedItems reflects the actual selection.
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
        // no selectedItems property
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
  });

  // ---------------------------------------------------------------------------
  // _base64UrlSafeEncode
  // ---------------------------------------------------------------------------
  suite('_base64UrlSafeEncode', () => {
    test('output contains no standard base64 padding (=)', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const result = element._base64UrlSafeEncode(bytes);
      expect(result).to.not.include('=');
    });

    test('output contains no + characters (URL-safe)', () => {
      // Use bytes that would produce '+' in standard base64
      const bytes = new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 200));
      const result = element._base64UrlSafeEncode(bytes);
      expect(result).to.not.include('+');
    });

    test('output contains no / characters (URL-safe)', () => {
      const bytes = new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 200));
      const result = element._base64UrlSafeEncode(bytes);
      expect(result).to.not.include('/');
    });
  });

  // ---------------------------------------------------------------------------
  // _download — guard conditions
  // ---------------------------------------------------------------------------
  suite('_download', () => {
    let toastStub;

    setup(() => {
      toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);
    });

    teardown(() => {
      sinon.restore();
    });

    test('shows noDocumentsSelected error when documents is empty and document is unset', async () => {
      element.documents = [];
      element.document = null;
      element._download();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('No documents selected');
    });

    test('triggers download for all items in view when select-all is active', async () => {
      const viewStub = {
        selectAllActive: true,
        behaviors: [...PageProviderDisplayBehavior],
        items: [{ uid: 'sa-uid-1' }, { uid: 'sa-uid-2' }, { uid: 'sa-uid-3' }],
      };
      element.documents = viewStub;
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openStub = sinon.stub(window, 'open');

      element._download();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.open).to.not.have.been.called;
      expect(openStub).to.have.been.calledOnce;
      expect(openStub.firstCall.args[1]).to.equal('_top');
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

    test('succeeds after deselecting items so count drops to ≤ 25, even though selectAllActive stays true', async () => {
      // Simulates the bug fix: select-all on 36 docs → deselect 13 → 23 selectedItems.
      // selectAllActive remains true but selectedItems has only 23 entries.
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
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openStub = sinon.stub(window, 'open');

      element._download();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.open).to.not.have.been.called;
      expect(openStub).to.have.been.calledOnce;
      expect(openStub.firstCall.args[1]).to.equal('_top');
    });

    test('shows tooManyDocuments error when more than 25 documents are selected', async () => {
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
      // Stub token.get to prevent real network call; stub window.open before _download is called
      sinon.stub(element.$.token, 'get').returns(new Promise(() => {})); // never resolves — prevents window.open
      element._download();
      // The toast should not have been opened at this point (no guard condition triggered)
      expect(toastStub.open).to.not.have.been.called;
    });

    test('calls window.open with directDownloadUrl when a valid Drive token exists', async () => {
      element.documents = [{ uid: 'doc-uid-1' }, { uid: 'doc-uid-2' }];
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openStub = sinon.stub(window, 'open');

      element._download();
      // Let the promise chain resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(openStub).to.have.been.calledOnce;
      const calledUrl = openStub.firstCall.args[0];
      expect(calledUrl).to.match(/^nxdrive:\/\/direct-download\/[A-Za-z0-9_-]+$/);
      expect(openStub.firstCall.args[1]).to.equal('_top');
    });

    test('opens Drive install dialog when no Drive token is found', async () => {
      element.documents = [{ uid: 'doc-uid-1' }];
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._download();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dialogToggleStub).to.have.been.calledOnce;
      expect(toastStub.open).to.not.have.been.called;
    });

    test('shows directTransfer.failed error when token.get rejects', async () => {
      element.documents = [{ uid: 'doc-uid-1' }];
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));

      element._download();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('error occurred');
    });

    test('folder UID is collected as a single item (folder = one ID)', () => {
      // Folders are treated as a single document ID — no enumeration of contents
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

    test('single document action (via document property) triggers download with correct UID', async () => {
      element.documents = [];
      element.document = { uid: 'single-doc-uid' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openStub = sinon.stub(window, 'open');

      element._download();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(openStub).to.have.been.calledOnce;
      // Verify the UID is encoded in the compressed URL by checking the uncompressed URL
      const originalUrl = element._buildOriginalUrl();
      expect(originalUrl).to.include('single-doc-uid');
    });
  });

  // ---------------------------------------------------------------------------
  // _buildOriginalUrl — server info
  // ---------------------------------------------------------------------------
  suite('_buildOriginalUrl — server info', () => {
    test('URL contains a server/host segment after the direct-download scheme', () => {
      element.documents = [{ uid: '00000000-0000-0000-0000-000000000001' }];
      const url = element._buildOriginalUrl();
      // Format: nxdrive://direct-download/<scheme>/<host>/.../<uid>
      // After stripping the nxdrive://direct-download/ prefix there should be at least 2 more segments
      const path = url.replace('nxdrive://direct-download/', '');
      const segments = path.split('/');
      expect(segments.length).to.be.at.least(2);
    });
  });
});

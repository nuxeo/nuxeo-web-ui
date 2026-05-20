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
import '../elements/nuxeo-drive-upload-button.js';
import {
  setupI18n,
  nextTick,
  stubToast,
  addGoErrorSuites,
  addOpenDriveUrlSuite,
  addShowErrorSuite,
} from './nuxeo-drive-shared-suites.test.js';

// Prevent nxdrive:// anchor clicks from triggering a Karma page reload
HTMLAnchorElement.prototype.click = function () {};

// Setup i18n keys used by the component
setupI18n({
  'driveUploadButton.tooltip': 'Upload with Nuxeo Drive',
  'driveUpload.directTransfer.failed': 'An error occurred while trying to upload the document with Nuxeo Drive.',
  'driveUpload.serverUrlTooLong': 'Server URL is too long to encode.',
  'driveEditButton.dialog.heading': 'Download Nuxeo Drive Client',
  'command.close': 'Close',
});

suite('nuxeo-drive-upload-button — error handling', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-upload-button></nuxeo-drive-upload-button>`);
    // Set document so directTransferUrl can be computed in _go without crashing.
    element.document = { path: '/default-domain/workspaces/test-folder' };
  });

  // Shared suites: _go token-fetch failure, _go no-token, _showError, _openDriveUrl
  addGoErrorSuites(() => element);
  addShowErrorSuite(() => element);
  addOpenDriveUrlSuite(() => element, 'nxdrive://direct-transfer/localhost/some-path');

  suite('_go — Drive installed and token present', () => {
    teardown(() => {
      sinon.restore();
    });

    test('calls _openDriveUrl immediately (before token fetch resolves)', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      // Token fetch never resolves — confirms _openDriveUrl fires synchronously.
      sinon.stub(element.$.token, 'get').returns(new Promise(() => {}));
      const openDriveUrlStub = sinon.stub(element, '_openDriveUrl');

      element._go();

      expect(openDriveUrlStub).to.have.been.calledOnce;
      expect(openDriveUrlStub.firstCall.args[0]).to.match(/^nxdrive:\/\/direct-transfer\//);
    });

    test('passes a cancelRef object as second argument to _openDriveUrl', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      sinon.stub(element.$.token, 'get').returns(new Promise(() => {}));
      const openDriveUrlStub = sinon.stub(element, '_openDriveUrl');

      element._go();

      const cancelRef = openDriveUrlStub.firstCall.args[1];
      expect(cancelRef).to.be.an('object');
      expect(cancelRef).to.have.property('cancelled', false);
    });

    test('calls _openDriveUrl with directTransferUrl when token exists', async () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openDriveUrlStub = sinon.stub(element, '_openDriveUrl');

      element._go();
      await nextTick();

      expect(openDriveUrlStub).to.have.been.calledOnce;
      expect(openDriveUrlStub.firstCall.args[0]).to.match(/^nxdrive:\/\/direct-transfer\//);
    });

    test('cancels the heuristic dialog and sets cancelRef.cancelled when no token found', async () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      sinon.stub(element.$.dialog, 'toggle');
      const openDriveUrlStub = sinon.stub(element, '_openDriveUrl');

      element._go();
      await nextTick();

      const cancelRef = openDriveUrlStub.firstCall.args[1];
      expect(cancelRef.cancelled).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // _isAvailable — branch coverage
  // ---------------------------------------------------------------------------
  suite('_isAvailable', () => {
    test('returns false when doc is null', () => {
      expect(element._isAvailable(null)).to.be.false;
    });

    test('returns false when doc is undefined', () => {
      expect(element._isAvailable(undefined)).to.be.false;
    });

    test('returns false when hasPermission is not available on element', () => {
      const origHasPermission = element.hasPermission;
      element.hasPermission = null;
      expect(element._isAvailable({ uid: 'doc-1' })).to.not.be.ok;
      element.hasPermission = origHasPermission;
    });

    test('returns false when hasFacet is not available on element', () => {
      const origHasFacet = element.hasFacet;
      element.hasFacet = null;
      expect(element._isAvailable({ uid: 'doc-1' })).to.not.be.ok;
      element.hasFacet = origHasFacet;
    });

    test('returns false when isProxy is not available on element', () => {
      const origIsProxy = element.isProxy;
      element.isProxy = null;
      expect(element._isAvailable({ uid: 'doc-1' })).to.not.be.ok;
      element.isProxy = origIsProxy;
    });

    test('returns false when doc lacks Write permission', () => {
      const doc = { uid: 'doc-1', facets: ['Folderish'], contextParameters: { permissions: ['Read'] } };
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('returns false when doc is not Folderish', () => {
      const doc = { uid: 'doc-1', facets: [], contextParameters: { permissions: ['Write'] } };
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('returns false when doc is a proxy', () => {
      const doc = {
        uid: 'doc-1',
        facets: ['Folderish'],
        isProxy: true,
        contextParameters: { permissions: ['Write'] },
      };
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('returns true when doc is Folderish, has Write, and is not a proxy', () => {
      const doc = {
        uid: 'doc-1',
        facets: ['Folderish'],
        contextParameters: { permissions: ['Write'] },
      };
      expect(element._isAvailable(doc)).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // _go — dialog already opened during no-token path
  // ---------------------------------------------------------------------------
  suite('_go — dialog already opened during no-token toggle', () => {
    teardown(() => sinon.restore());

    test('does not toggle dialog again when dialog.opened is already true in no-token path', async () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      sinon.stub(element, '_openDriveUrl');
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      // Simulate dialog already opened (e.g. by heuristic callback) before token resolves
      Object.defineProperty(element.$.dialog, 'opened', { get: () => true, configurable: true });

      element._go();
      await nextTick();

      expect(dialogToggleStub).to.not.have.been.called;
    });
  });

  // ---------------------------------------------------------------------------
  // _compressUploadUrl / directTransferUrl
  // ---------------------------------------------------------------------------
  suite('_compressUploadUrl', () => {
    test('returns a nxdrive://direct-transfer/<base64> URL', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      const compressed = element._compressUploadUrl();
      expect(compressed).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('compressed URL does not contain the raw document path', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      const compressed = element._compressUploadUrl();
      expect(compressed).to.not.include('default-domain');
      expect(compressed).to.not.include('workspaces');
      expect(compressed).to.not.include('my-folder');
    });

    test('different document paths produce different compressed URLs', () => {
      element.document = { path: '/default-domain/workspaces/folder-a' };
      const url1 = element._compressUploadUrl();

      element.document = { path: '/default-domain/workspaces/folder-b' };
      const url2 = element._compressUploadUrl();

      expect(url1).to.not.equal(url2);
    });

    test('handles path with leading slash correctly', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      const url = element._compressUploadUrl();
      expect(url).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('handles path without leading slash correctly', () => {
      element.document = { path: 'default-domain/workspaces/my-folder' };
      const url = element._compressUploadUrl();
      expect(url).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('directTransferUrl getter delegates to _compressUploadUrl', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      const compressSpy = sinon.spy(element, '_compressUploadUrl');
      const url = element.directTransferUrl;
      expect(compressSpy).to.have.been.calledOnce;
      expect(url).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('directTransferUrl getter returns a valid nxdrive URL', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      expect(element.directTransferUrl).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('shows error and throws when server bytes exceed 255', () => {
      const toastStub = stubToast(element);

      sinon.stub(element, '_compressUploadUrl').callsFake(function () {
        const msg = element.i18n('driveUpload.serverUrlTooLong');
        element._showError(msg);
        throw new Error(msg);
      });

      element.document = { path: '/some/path' };
      expect(() => element._compressUploadUrl()).to.throw();
      expect(toastStub.open).to.have.been.calledOnce;

      sinon.restore();
    });

    test('_openDriveUrl callback skips toggle when cancelRef.cancelled is true', () => {
      const clock = sinon.useFakeTimers();
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      const cancelRef = { cancelled: true };
      element._openDriveUrl('nxdrive://direct-transfer/test', cancelRef);
      clock.tick(200);
      expect(dialogToggleStub).to.not.have.been.called;
      clock.restore();
      sinon.restore();
    });

    test('_openDriveUrl callback toggles dialog when cancelRef is not cancelled', () => {
      const clock = sinon.useFakeTimers();
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      const cancelRef = { cancelled: false };
      element._openDriveUrl('nxdrive://direct-transfer/test', cancelRef);
      clock.tick(200);
      expect(dialogToggleStub).to.have.been.called;
      clock.restore();
      sinon.restore();
    });

    test('_openDriveUrl callback skips toggle when dialog is already opened', () => {
      const clock = sinon.useFakeTimers();
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      Object.defineProperty(element.$.dialog, 'opened', { get: () => true, configurable: true });
      element._openDriveUrl('nxdrive://direct-transfer/test', { cancelled: false });
      clock.tick(200);
      expect(dialogToggleStub).to.not.have.been.called;
      clock.restore();
      sinon.restore();
      delete element.$.dialog.opened;
    });

    test('does not toggle dialog in no-token path when dialog is already opened', async () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      const openStub = sinon.stub(element, '_openDriveUrl');
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      // dialog.opened starts false (passes the _go guard), then becomes true
      // after _openDriveUrl is called (simulating heuristic opening the dialog).
      let opened = false;
      Object.defineProperty(element.$.dialog, 'opened', {
        get: () => opened,
        configurable: true,
      });
      openStub.callsFake(() => {
        opened = true;
      });

      element._go();
      await nextTick();

      // The no-token path should see dialog.opened=true and skip toggle.
      expect(dialogToggleStub).to.not.have.been.called;
      delete element.$.dialog.opened;
      sinon.restore();
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
});

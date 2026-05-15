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

// Setup i18n keys used by the component
window.nuxeo = window.nuxeo || {};
window.nuxeo.I18n = window.nuxeo.I18n || {};
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['driveUploadButton.tooltip'] = 'Transfer with Nuxeo Drive';
window.nuxeo.I18n.en['driveUpload.directTransfer.failed'] =
  'An error occurred while trying to transfer the document with Nuxeo Drive.';
window.nuxeo.I18n.en['driveUpload.serverUrlTooLong'] =
  'The server URL is too long to generate a Nuxeo Drive transfer link.';
window.nuxeo.I18n.en['driveEditButton.dialog.heading'] = 'Download Nuxeo Drive Client';
window.nuxeo.I18n.en['command.close'] = 'Close';

suite('nuxeo-drive-upload-button', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-upload-button></nuxeo-drive-upload-button>`);
  });

  // ---------------------------------------------------------------------------
  // _isAvailable
  // ---------------------------------------------------------------------------
  suite('_isAvailable', () => {
    test('returns false when document is null', () => {
      element.document = null;
      expect(element._isAvailable(null)).to.be.false;
    });

    test('returns false when document is undefined', () => {
      expect(element._isAvailable(undefined)).to.be.false;
    });

    test('returns true when document has Write permission, Folderish facet, and is not a proxy', () => {
      // Stub the behavior helpers
      sinon.stub(element, 'hasPermission').returns(true);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'isProxy').returns(false);
      const doc = { type: 'Folder', path: '/default-domain/ws' };
      expect(element._isAvailable(doc)).to.be.true;
    });

    test('returns false when document lacks Write permission', () => {
      sinon.stub(element, 'hasPermission').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'isProxy').returns(false);
      const doc = { type: 'Folder', path: '/default-domain/ws' };
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('returns false when document does not have Folderish facet', () => {
      sinon.stub(element, 'hasPermission').returns(true);
      sinon.stub(element, 'hasFacet').returns(false);
      sinon.stub(element, 'isProxy').returns(false);
      const doc = { type: 'File', path: '/default-domain/ws/file.txt' };
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('returns false when document is a proxy', () => {
      sinon.stub(element, 'hasPermission').returns(true);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'isProxy').returns(true);
      const doc = { type: 'Folder', path: '/default-domain/ws' };
      expect(element._isAvailable(doc)).to.be.false;
    });

    teardown(() => {
      sinon.restore();
    });
  });

  // ---------------------------------------------------------------------------
  // _compressDirectTransferUrl
  // ---------------------------------------------------------------------------
  suite('_compressDirectTransferUrl', () => {
    test('returns a nxdrive://direct-transfer/<base64> URL', () => {
      const compressed = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/localhost:8080/nuxeo/default-domain/workspaces/my-folder',
      );
      expect(compressed).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('compressed URL does not contain the raw document path', () => {
      const compressed = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/localhost:8080/nuxeo/default-domain/workspaces/my-folder',
      );
      expect(compressed).to.not.include('my-folder');
    });

    test('document paths with spaces are encoded without breaking the URL', () => {
      const compressed = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/localhost:8080/nuxeo/default-domain/workspaces/my folder with spaces',
      );
      expect(compressed).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('different document paths produce different compressed URLs', () => {
      const url1 = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/localhost:8080/nuxeo/default-domain/workspaces/folder-one',
      );
      const url2 = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/localhost:8080/nuxeo/default-domain/workspaces/folder-two',
      );
      expect(url1).to.not.equal(url2);
    });

    test('different servers produce different compressed URLs', () => {
      const url1 = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/server-one/nuxeo/default-domain/workspaces/folder',
      );
      const url2 = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/server-two/nuxeo/default-domain/workspaces/folder',
      );
      expect(url1).to.not.equal(url2);
    });

    test('https scheme produces a different token than http', () => {
      const httpUrl = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/http/localhost:8080/nuxeo/default-domain/workspaces/folder',
      );
      const httpsUrl = element._compressDirectTransferUrl(
        'nxdrive://direct-transfer/https/localhost:8080/nuxeo/default-domain/workspaces/folder',
      );
      expect(httpUrl).to.not.equal(httpsUrl);
    });

    test('directTransferUrl getter returns a valid compressed nxdrive URL', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      expect(element.directTransferUrl).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
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

  // ---------------------------------------------------------------------------
  // _go — guard conditions
  // ---------------------------------------------------------------------------
  suite('_go', () => {
    let toastStub;

    setup(() => {
      toastStub = { toggle: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);
      element.document = { path: '/default-domain/workspaces/my-folder' };
    });

    teardown(() => {
      sinon.restore();
    });

    test('calls window.open with directTransferUrl when a valid Drive token exists', async () => {
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openStub = sinon.stub(window, 'open');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(openStub).to.have.been.calledOnce;
      const calledUrl = openStub.firstCall.args[0];
      expect(calledUrl).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
      expect(openStub.firstCall.args[1]).to.equal('_top');
    });

    test('opens Drive install dialog when no Drive token is found', async () => {
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dialogToggleStub).to.have.been.calledOnce;
      expect(toastStub.toggle).to.not.have.been.called;
    });

    test('toggles toast when token.get rejects', async () => {
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.toggle).to.have.been.calledOnce;
    });

    test('directTransferUrl encodes a path with spaces into a URL-safe base64 string', async () => {
      element.document = { path: '/default-domain/workspaces/document with spaces' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openStub = sinon.stub(window, 'open');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(openStub).to.have.been.calledOnce;
      const calledUrl = openStub.firstCall.args[0];
      // Must be URL-safe base64 — no raw spaces
      expect(calledUrl).to.not.include(' ');
      expect(calledUrl).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });
  });
});

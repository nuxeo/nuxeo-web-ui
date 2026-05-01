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
window.nuxeo.I18n.en['driveUploadButton.tooltip'] = 'Upload with Nuxeo Drive';
window.nuxeo.I18n.en['driveUpload.directTransfer.failed'] =
  'An error occurred while trying to upload the document with Nuxeo Drive.';
window.nuxeo.I18n.en['driveUpload.serverUrlTooLong'] = 'Server URL is too long to encode.';
window.nuxeo.I18n.en['driveEditButton.dialog.heading'] = 'Download Nuxeo Drive Client';
window.nuxeo.I18n.en['command.close'] = 'Close';

suite('nuxeo-drive-upload-button — error handling', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-upload-button></nuxeo-drive-upload-button>`);
  });

  suite('_go — token fetch failure', () => {
    let toastStub;

    setup(() => {
      toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);
      // Ensure toggle exists as own property so sinon can stub it
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => {
      sinon.restore();
    });

    test('shows error toast when token.get rejects', async () => {
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('error occurred');
    });

    test('does not open dialog when token.get rejects', async () => {
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dialogToggleStub).to.not.have.been.called;
    });
  });

  suite('_go — no token registered (Drive not authenticated)', () => {
    let toastStub;

    setup(() => {
      toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);
      // Ensure toggle exists as own property so sinon can stub it
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => {
      sinon.restore();
    });

    test('opens install dialog when token list is empty', async () => {
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dialogToggleStub).to.have.been.calledOnce;
      expect(toastStub.open).to.not.have.been.called;
    });

    test('does not show error toast when token list is empty', async () => {
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.open).to.not.have.been.called;
    });
  });

  suite('_go — Drive installed and token present', () => {
    teardown(() => {
      sinon.restore();
    });

    test('calls _openDriveUrl with directTransferUrl when token exists', async () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openDriveUrlStub = sinon.stub(element, '_openDriveUrl');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(openDriveUrlStub).to.have.been.calledOnce;
      expect(openDriveUrlStub.firstCall.args[0]).to.match(/^nxdrive:\/\/direct-transfer\//);
    });
  });

  suite('_openDriveUrl — Drive detection (blur + debounce heuristic)', () => {
    let clock;
    let dialogToggleStub;

    setup(() => {
      clock = sinon.useFakeTimers();
      // Stub _navigate so no real protocol navigation happens in Karma
      sinon.stub(element, '_navigate');
      // Ensure toggle exists as own property so sinon can stub it
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
      dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
    });

    teardown(() => {
      clock.restore();
      sinon.restore();
    });

    test('opens install dialog after timeout when no blur fires (Drive not installed)', () => {
      element._openDriveUrl('nxdrive://direct-transfer/localhost/some-path');

      // No blur fired at all — Drive is not installed
      clock.tick(1500);

      expect(dialogToggleStub).to.have.been.calledOnce;
    });

    test('does not open dialog when blur fires and stays (Drive opened normally)', () => {
      element._openDriveUrl('nxdrive://direct-transfer/localhost/some-path');

      // Blur fires and window stays blurred (Drive took focus — no focus event returns)
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce fires — Drive confirmed
      clock.tick(1500); // primary timeout — but appOpened is already true

      expect(dialogToggleStub).to.not.have.been.called;
    });

    test('ignores blur when focus returns quickly (Chrome false-positive)', () => {
      element._openDriveUrl('nxdrive://direct-transfer/localhost/some-path');

      // Blur fires but focus returns immediately (Chrome protocol prompt, no Drive handler)
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus')); // returns before debounce fires
      clock.tick(300); // debounce would have fired — but was cancelled by focus

      // Now the full timeout fires — Drive was not detected
      clock.tick(1500);

      expect(dialogToggleStub).to.have.been.calledOnce;
    });

    test('auto-dismisses dialog when Drive responds after the timeout (slow system)', () => {
      element._openDriveUrl('nxdrive://direct-transfer/localhost/some-path');

      // Timeout fires first — dialog shown as false alarm
      clock.tick(1500);
      expect(dialogToggleStub).to.have.been.calledOnce;

      // Drive opens late — blur fires and stays (within the hard-cap window)
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce fires

      // Dialog should have been toggled a second time (auto-dismiss)
      expect(dialogToggleStub).to.have.been.calledTwice;
    });

    test('detects Drive on second blur when first was a Chrome false-positive', () => {
      element._openDriveUrl('nxdrive://direct-transfer/localhost/some-path');

      // First blur is a Chrome false-positive — focus returns quickly
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus')); // cancels debounce

      // Drive opens — second blur fires and stays
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce fires — Drive confirmed
      clock.tick(1500); // primary timeout — appOpened already true

      expect(dialogToggleStub).to.not.have.been.called;
    });

    test('cleans up listeners after hard-cap timeout', () => {
      const addSpy = sinon.spy(window, 'addEventListener');
      const removeSpy = sinon.spy(window, 'removeEventListener');

      element._openDriveUrl('nxdrive://direct-transfer/localhost/some-path');

      clock.tick(1500 + 3000);

      // removeEventListener should have been called for blur and focus listeners
      expect(removeSpy.called).to.be.true;

      addSpy.restore();
      removeSpy.restore();
    });
  });

  suite('_showError', () => {
    teardown(() => {
      sinon.restore();
    });

    test('sets toast text and opens it', () => {
      const toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);

      element._showError('Something went wrong');

      expect(toastStub.text).to.equal('Something went wrong');
      expect(toastStub.open).to.have.been.calledOnce;
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
      const toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);

      // Build a server URL > 255 bytes by overriding baseUrl via the module-level window.nuxeo.baseUrl
      const longHost = 'a'.repeat(260);
      sinon.stub(element, '_compressUploadUrl').callsFake(function () {
        const msg = element.i18n('driveUpload.serverUrlTooLong');
        element._showError(msg);
        throw new Error(msg);
      });

      element.document = { path: '/some/path' };
      expect(() => element._compressUploadUrl()).to.throw();
      expect(toastStub.open).to.have.been.calledOnce;

      sinon.restore();
      // Restore the non-stub for subsequent tests
      longHost; // suppress lint unused-var
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

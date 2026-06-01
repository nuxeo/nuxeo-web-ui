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
import { base64UrlSafeEncode } from '../elements/nuxeo-drive-utils.js';
import {
  setupI18n,
  stubToast,
  addShowErrorSuite,
  addToggleInstallSuite,
  addGoSuite,
} from './nuxeo-drive-test-helpers.test.js';

// Setup i18n keys used by the component
setupI18n({
  'driveUploadButton.tooltip': 'Upload with Nuxeo Drive',
  'driveUpload.directTransfer.failed': 'An error occurred while trying to upload the document with Nuxeo Drive.',
  'driveUpload.serverUrlTooLong': 'Server URL is too long to encode.',
  'driveButton.dialog.heading': 'Nuxeo Drive',
  'driveButton.dialog.description': 'Use Nuxeo Drive to work with your documents directly from your desktop.',
  'command.close': 'Close',
});

suite('nuxeo-drive-upload-button', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-upload-button></nuxeo-drive-upload-button>`);
    element.document = { path: '/default-domain/workspaces/test-folder' };
  });

  // Shared suites
  addShowErrorSuite(() => element);
  addToggleInstallSuite(() => element);
  addGoSuite(() => element);

  // ---------------------------------------------------------------------------
  // _isAvailable
  // ---------------------------------------------------------------------------
  suite('_isAvailable', () => {
    test('returns false when doc is null', () => {
      expect(element._isAvailable(null)).to.be.false;
    });

    test('returns false when doc is undefined', () => {
      expect(element._isAvailable(undefined)).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // _go — error path
  // ---------------------------------------------------------------------------
  suite('_go — error handling', () => {
    teardown(() => sinon.restore());

    test('shows error when _compressUploadUrl throws', () => {
      const toastStub = stubToast(element);
      sinon.stub(element, '_compressUploadUrl').throws(new Error('compression failed'));
      element._go();
      expect(toastStub.text).to.equal('compression failed');
      expect(toastStub.open).to.have.been.calledOnce;
    });
  });

  // ---------------------------------------------------------------------------
  // _compressUploadUrl / directTransferUrl
  // ---------------------------------------------------------------------------
  suite('_compressUploadUrl', () => {
    test('returns a nxdrive://direct-transfer/<base64> URL', () => {
      const compressed = element._compressUploadUrl();
      expect(compressed).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('compressed URL does not contain the raw document path', () => {
      const compressed = element._compressUploadUrl();
      expect(compressed).to.not.include('default-domain');
      expect(compressed).to.not.include('workspaces');
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
      const compressSpy = sinon.spy(element, '_compressUploadUrl');
      const url = element.directTransferUrl;
      expect(compressSpy).to.have.been.calledOnce;
      expect(url).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
      sinon.restore();
    });

    test('shows error and throws when server bytes exceed 255', () => {
      const toastStub = stubToast(element);
      const origEncode = TextEncoder.prototype.encode;
      let callCount = 0;
      sinon.stub(TextEncoder.prototype, 'encode').callsFake(function (str) {
        callCount++;
        if (callCount === 1) {
          return new Uint8Array(256);
        }
        return origEncode.call(this, str);
      });

      element.document = { path: '/some/path' };
      expect(() => element._compressUploadUrl()).to.throw();
      expect(toastStub.open).to.have.been.calledOnce;

      sinon.restore();
    });
  });

  // ---------------------------------------------------------------------------
  // base64UrlSafeEncode
  // ---------------------------------------------------------------------------
  suite('base64UrlSafeEncode', () => {
    test('output contains no standard base64 padding (=)', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const result = base64UrlSafeEncode(bytes);
      expect(result).to.not.include('=');
    });

    test('output contains no + characters (URL-safe)', () => {
      const bytes = new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 200));
      const result = base64UrlSafeEncode(bytes);
      expect(result).to.not.include('+');
    });

    test('output contains no / characters (URL-safe)', () => {
      const bytes = new Uint8Array(Array.from({ length: 32 }, (_, i) => i + 200));
      const result = base64UrlSafeEncode(bytes);
      expect(result).to.not.include('/');
    });
  });
});

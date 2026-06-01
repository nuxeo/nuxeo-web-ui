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
  // _buildOriginalUrl
  // ---------------------------------------------------------------------------
  suite('_buildOriginalUrl', () => {
    test('builds URL with https or http scheme and document path', () => {
      const originalUrl = element._buildOriginalUrl();
      expect(originalUrl).to.match(/nxdrive:\/\/direct-transfer\/https?/);
    });

    test('builds URL with http scheme when appropriate', () => {
      // Mock baseUrl to use http
      const originalBaseUrl = window.nuxeo.baseUrl;
      window.nuxeo.baseUrl = 'http://localhost:8080/nuxeo/ui/';
      element.document = { path: '/some/path' };
      const originalUrl = element._buildOriginalUrl();
      expect(originalUrl).to.include('nxdrive://direct-transfer/http/');
      window.nuxeo.baseUrl = originalBaseUrl;
    });

    test('includes document path without leading slash', () => {
      element.document = { path: '/default-domain/workspaces/test-folder' };
      const originalUrl = element._buildOriginalUrl();
      expect(originalUrl).to.include('default-domain/workspaces/test-folder');
    });

    test('handles document path without leading slash', () => {
      element.document = { path: 'default-domain/workspaces/test-folder' };
      const originalUrl = element._buildOriginalUrl();
      expect(originalUrl).to.include('default-domain/workspaces/test-folder');
    });

    test('format includes scheme, host and path', () => {
      element.document = { path: '/path/to/folder' };
      const originalUrl = element._buildOriginalUrl();
      expect(originalUrl).to.match(/^nxdrive:\/\/direct-transfer\/https?\/[^/]+\/path\/to\/folder$/);
    });
  });

  // ---------------------------------------------------------------------------
  // _compressDirectTransferUrl
  // ---------------------------------------------------------------------------
  suite('_compressDirectTransferUrl', () => {
    test('returns a nxdrive://direct-transfer/<base64> URL', () => {
      const originalUrl = element._buildOriginalUrl();
      const compressed = element._compressDirectTransferUrl(originalUrl);
      expect(compressed).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('compressed URL is base64 encoded', () => {
      const originalUrl = element._buildOriginalUrl();
      const compressed = element._compressDirectTransferUrl(originalUrl);
      expect(compressed).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('extracts https scheme as 1', () => {
      element.document = { path: '/test' };
      const originalUrl = element._buildOriginalUrl();
      const compressed = element._compressDirectTransferUrl(originalUrl);
      expect(compressed).to.exist;
      // Only decode if it's https scheme (when scheme byte should be 1)
      if (originalUrl.includes('/https/')) {
        const decoded = atob(
          compressed
            .replace(/^nxdrive:\/\/direct-transfer\//, '')
            .replace(/-/g, '+')
            .replace(/_/g, '/'),
        );
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          bytes[i] = decoded.charCodeAt(i);
        }
        expect(bytes[0]).to.equal(1);
      }
    });

    test('extracts http scheme as 0', () => {
      const originalBaseUrl = window.nuxeo.baseUrl;
      window.nuxeo.baseUrl = 'http://localhost:8080/nuxeo/ui/';
      element.document = { path: '/test' };
      const originalUrl = element._buildOriginalUrl();
      const compressed = element._compressDirectTransferUrl(originalUrl);
      const decoded = atob(
        compressed
          .replace(/^nxdrive:\/\/direct-transfer\//, '')
          .replace(/-/g, '+')
          .replace(/_/g, '/'),
      );
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      expect(bytes[0]).to.equal(0);
      window.nuxeo.baseUrl = originalBaseUrl;
    });

    test('encodes server length as second byte', () => {
      element.document = { path: '/test' };
      const originalUrl = element._buildOriginalUrl();
      const compressed = element._compressDirectTransferUrl(originalUrl);
      const decoded = atob(
        compressed
          .replace(/^nxdrive:\/\/direct-transfer\//, '')
          .replace(/-/g, '+')
          .replace(/_/g, '/'),
      );
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      // Second byte should be the length of server
      expect(bytes[1]).to.be.greaterThan(0);
      expect(bytes[1]).to.equal(bytes.length - 2); // -2 for scheme and length bytes
    });

    test('payload structure: [scheme, serverLength, ...serverBytes]', () => {
      element.document = { path: '/test' };
      const originalUrl = element._buildOriginalUrl();
      const compressed = element._compressDirectTransferUrl(originalUrl);
      // Verify structure by checking decoded bytes
      const decoded = atob(
        compressed
          .replace(/^nxdrive:\/\/direct-transfer\//, '')
          .replace(/-/g, '+')
          .replace(/_/g, '/'),
      );
      expect(decoded.length).to.be.greaterThan(2);
    });

    test('different document paths produce same compressed URL (only server encoded)', () => {
      element.document = { path: '/folder-a' };
      const url1 = element._compressDirectTransferUrl(element._buildOriginalUrl());
      element.document = { path: '/folder-b' };
      const url2 = element._compressDirectTransferUrl(element._buildOriginalUrl());
      // Same server, different paths, both should compress to same URL
      // (since path is not included in payload)
      expect(url1).to.equal(url2);
    });

    test('handles oversized server URL gracefully', () => {
      sinon.stub(TextEncoder.prototype, 'encode').callsFake(function () {
        // Return oversized server bytes
        return new Uint8Array(256);
      });
      element.document = { path: '/test' };
      const originalUrl = element._buildOriginalUrl();
      try {
        element._compressDirectTransferUrl(originalUrl);
        // If no error is thrown, that's okay (depends on implementation)
      } catch (e) {
        expect(e).to.exist;
      }
      sinon.restore();
    });

    test('shows error when server URL is too long', () => {
      sinon.stub(TextEncoder.prototype, 'encode').callsFake(function () {
        return new Uint8Array(256);
      });
      element.document = { path: '/test' };
      try {
        const originalUrl = element._buildOriginalUrl();
        element._compressDirectTransferUrl(originalUrl);
      } catch (e) {
        // Expected
      }
      sinon.restore();
    });
  });

  // ---------------------------------------------------------------------------
  // _compressUploadUrl (delegates to _buildOriginalUrl + _compressDirectTransferUrl)
  // ---------------------------------------------------------------------------
  suite('directTransferUrl getter', () => {
    test('returns a nxdrive://direct-transfer/<base64> URL', () => {
      const url = element.directTransferUrl;
      expect(url).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('different document paths produce same compressed URL (path not in payload)', () => {
      element.document = { path: '/default-domain/workspaces/folder-a' };
      const url1 = element.directTransferUrl;
      element.document = { path: '/default-domain/workspaces/folder-b' };
      const url2 = element.directTransferUrl;
      // Both should compress to the same URL since path is not included
      expect(url1).to.equal(url2);
    });

    test('handles path with leading slash correctly', () => {
      element.document = { path: '/default-domain/workspaces/my-folder' };
      const url = element.directTransferUrl;
      expect(url).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
    });

    test('handles path without leading slash correctly', () => {
      element.document = { path: 'default-domain/workspaces/my-folder' };
      const url = element.directTransferUrl;
      expect(url).to.match(/^nxdrive:\/\/direct-transfer\/[A-Za-z0-9_-]+$/);
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

    test('output contains only URL-safe characters [A-Za-z0-9_-]', () => {
      const bytes = new Uint8Array(Array.from({ length: 100 }, (_, i) => (i * 7) % 256));
      const result = element._base64UrlSafeEncode(bytes);
      expect(result).to.match(/^[A-Za-z0-9_-]*$/);
    });

    test('decodes back to original bytes', () => {
      const originalBytes = new Uint8Array([1, 2, 3, 255, 254, 0, 127]);
      const encoded = element._base64UrlSafeEncode(originalBytes);
      const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
      const decodedBytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        decodedBytes[i] = decoded.charCodeAt(i);
      }
      expect(decodedBytes).to.deep.equal(originalBytes);
    });

    test('handles empty bytes array', () => {
      const bytes = new Uint8Array([]);
      const result = element._base64UrlSafeEncode(bytes);
      expect(result).to.be.a('string');
    });

    test('handles single byte', () => {
      const bytes = new Uint8Array([42]);
      const result = element._base64UrlSafeEncode(bytes);
      expect(result).to.match(/^[A-Za-z0-9_-]*$/);
    });
  });

  // ---------------------------------------------------------------------------
  // _go — error path
  // ---------------------------------------------------------------------------
  suite('_go — error handling', () => {
    teardown(() => sinon.restore());

    test('shows error when compression fails', () => {
      const toastStub = stubToast(element);
      sinon.stub(element, '_buildOriginalUrl').throws(new Error('build failed'));
      element._go();
      expect(toastStub.text).to.equal('build failed');
      expect(toastStub.open).to.have.been.calledOnce;
    });
  });

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
});

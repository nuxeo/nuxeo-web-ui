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
import '../elements/nuxeo-drive-edit-button.js';
import { setupI18n, nextTick, addGoErrorSuites, addShowErrorSuite } from './nuxeo-drive-test-helpers.js';

// Prevent nxdrive:// anchor clicks from triggering a Karma page reload
HTMLAnchorElement.prototype.click = function () {};

// Setup i18n keys used by the component
setupI18n({
  'driveEditButton.tooltip': 'Open with Nuxeo Drive',
  'driveEditButton.directTransfer.failed': 'An error occurred while trying to open the document with Nuxeo Drive.',
  'driveEditButton.dialog.heading': 'Download Nuxeo Drive Client',
  'command.close': 'Close',
});

suite('nuxeo-drive-edit-button — error handling', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-edit-button></nuxeo-drive-edit-button>`);
  });

  // Shared suites: _go token-fetch failure, _go no-token, _showError
  addGoErrorSuites(() => element);
  addShowErrorSuite(() => element);

  suite('_go — Drive installed and token present', () => {
    teardown(() => {
      sinon.restore();
    });

    test('opens dialog immediately and does not set _showInstall when token exists', async () => {
      element.user = { id: 'Administrator' };
      element.document = { uid: 'doc-uid-1', repository: 'default' };
      element.blob = { data: 'http://localhost/nxfile/default/doc-uid-1/file:content/test.docx', name: 'test.docx' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await nextTick();

      expect(dialogToggleStub).to.have.been.calledOnce;
      expect(element._showInstall).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // _isAvailable — branch coverage
  // ---------------------------------------------------------------------------
  suite('_isAvailable', () => {
    const baseDoc = () => {
      return {
        uid: 'doc-1',
        facets: [],
        contextParameters: { permissions: ['Write', 'Read'] },
      };
    };

    const blobWithNoAppLinks = { data: 'http://localhost/nxfile/default/doc-1/file:content/test.docx', appLinks: [] };

    test('returns false when blob is null', () => {
      expect(element._isAvailable(baseDoc(), null)).to.not.be.ok;
    });

    test('returns false when blob is undefined', () => {
      expect(element._isAvailable(baseDoc(), undefined)).to.not.be.ok;
    });

    test('returns false when blob.appLinks is non-empty', () => {
      const blobWithLinks = { ...blobWithNoAppLinks, appLinks: [{ name: 'SomeApp', url: 'someapp://open' }] };
      expect(element._isAvailable(baseDoc(), blobWithLinks)).to.be.false;
    });

    test('returns false when doc lacks Write permission', () => {
      const doc = { uid: 'doc-1', facets: [], contextParameters: { permissions: ['Read'] } };
      expect(element._isAvailable(doc, blobWithNoAppLinks)).to.be.false;
    });

    test('returns false when doc is a proxy', () => {
      const doc = {
        uid: 'doc-1',
        facets: ['Immutable', 'HiddenInNavigation'],
        isProxy: true,
        contextParameters: { permissions: ['Write'] },
      };
      expect(element._isAvailable(doc, blobWithNoAppLinks)).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // driveEditURL — null guard
  // ---------------------------------------------------------------------------
  suite('driveEditURL', () => {
    test('returns empty string when blob is not set', () => {
      element.blob = null;
      expect(element.driveEditURL).to.equal('');
    });

    test('returns empty string when blob is undefined', () => {
      element.blob = undefined;
      expect(element.driveEditURL).to.equal('');
    });
  });
});

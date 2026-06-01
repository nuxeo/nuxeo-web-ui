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
import { setupI18n, addShowErrorSuite, addToggleInstallSuite, addGoSuite } from './nuxeo-drive-test-helpers.test.js';

// Setup i18n keys used by the component
setupI18n({
  'driveEditButton.tooltip': 'Open with Nuxeo Drive',
  'driveEditButton.directTransfer.failed': 'An error occurred while trying to open the document with Nuxeo Drive.',
  'driveEditButton.dialog.heading': 'Download Nuxeo Drive Client',
  'driveButton.dialog.heading': 'Nuxeo Drive',
  'driveButton.dialog.description': 'Use Nuxeo Drive to work with your documents directly from your desktop.',
  'command.close': 'Close',
});

suite('nuxeo-drive-edit-button', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-edit-button></nuxeo-drive-edit-button>`);
    element.user = { id: 'Administrator' };
    element.document = { uid: 'doc-uid-1', repository: 'default' };
    element.blob = { data: 'http://localhost/nxfile/default/doc-uid-1/file:content/test.docx', name: 'test.docx' };
  });

  // Shared suites
  addShowErrorSuite(() => element);
  addToggleInstallSuite(() => element);
  addGoSuite(() => element);

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

    test('returns true when blob has no appLinks property at all', () => {
      const blobNoAppLinksKey = { data: 'http://localhost/nxfile/default/doc-1/file:content/test.docx' };
      expect(element._isAvailable(baseDoc(), blobNoAppLinksKey)).to.be.true;
    });

    test('returns true when all conditions are met', () => {
      expect(element._isAvailable(baseDoc(), blobWithNoAppLinks)).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // driveEditURL
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

    test('builds a valid nxdrive://edit URL from blob data', () => {
      const url = element.driveEditURL;
      expect(url).to.match(/^nxdrive:\/\/edit\//);
      expect(url).to.include('Administrator');
      expect(url).to.include('doc-uid-1');
      expect(url).to.include('default');
      expect(url).to.include('test.docx');
    });

    test('encodes the filename in the URL', () => {
      element.blob = {
        data: 'http://localhost/nxfile/default/doc-uid-1/file:content/my%20doc.docx',
        name: 'my doc.docx',
      };
      const url = element.driveEditURL;
      expect(url).to.include(encodeURIComponent('my doc.docx'));
    });
  });
});

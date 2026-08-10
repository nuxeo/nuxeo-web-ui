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
import { fixture, html, login } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-publication/nuxeo-internal-publish.js';

const fullDoc = {
  uid: 'doc-1',
  title: 'Test Doc',
  type: 'File',
  properties: {
    'uid:major_version': 1,
    'uid:minor_version': 0,
    'file:content': { name: 'test.pdf', 'mime-type': 'application/pdf' },
  },
};

const bloblessDoc = {
  uid: 'doc-2',
  title: 'Empty Note',
  type: 'Note',
  properties: {
    'uid:major_version': 1,
    'uid:minor_version': 0,
  },
};

// Folderish document with children: hasContent is true but there is no main blob.
const folderDoc = {
  uid: 'doc-3',
  title: 'A Folder',
  type: 'Folder',
  facets: ['Folderish'],
  contextParameters: { hasContent: true },
  properties: {
    'uid:major_version': 1,
    'uid:minor_version': 0,
  },
};

// Custom type whose binary lives at a non-standard xpath (not file:content).
const customBlobDoc = {
  uid: 'doc-4',
  title: 'Custom Blob Doc',
  type: 'CustomType',
  properties: {
    'uid:major_version': 1,
    'uid:minor_version': 0,
    'custom:content': { name: 'test.bin', 'mime-type': 'application/octet-stream' },
  },
};

suite('nuxeo-internal-publish', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-internal-publish></nuxeo-internal-publish>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasPermission').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default selectedRendition to none', () => {
      expect(element.selectedRendition).to.equal('none');
    });

    test('should default _isDisable to false', () => {
      expect(element._isDisable).to.be.false;
    });

    test('should default showRendition to false', () => {
      expect(element.showRendition).to.be.false;
    });
  });

  suite('_computeMultiple', () => {
    test('should return true when documents array has items', () => {
      // Set document first to avoid _input crash, then set documents
      element.document = fullDoc;
      element.documents = [fullDoc];
      expect(element._computeMultiple()).to.be.true;
    });

    test('should return false when no documents set', () => {
      expect(element._computeMultiple()).to.be.false;
    });
  });

  suite('blob-aware default rendition', () => {
    test('should preselect the configured rendition when the document has a main blob', () => {
      element.document = fullDoc;
      expect(element.selectedRendition).to.equal('default');
    });

    test('should fall back to none when the document has no main blob', () => {
      element.document = bloblessDoc;
      expect(element.selectedRendition).to.equal('none');
    });

    test('should fall back to none for a folder even when hasContent is true', () => {
      element.document = folderDoc;
      expect(element.selectedRendition).to.equal('none');
    });

    test('should fall back to none for a custom type whose blob is not at file:content', () => {
      element.document = customBlobDoc;
      expect(element.selectedRendition).to.equal('none');
    });

    test('should fall back to none for a bulk selection even if a blob-bearing document is set', () => {
      element.document = fullDoc;
      element.documents = [fullDoc, bloblessDoc];
      expect(element.selectedRendition).to.equal('none');
    });

    test('_hasMainBlob should detect file:content presence', () => {
      expect(element._hasMainBlob(fullDoc)).to.be.true;
      expect(element._hasMainBlob(bloblessDoc)).to.be.false;
      expect(element._hasMainBlob(folderDoc)).to.be.false;
      expect(element._hasMainBlob(customBlobDoc)).to.be.false;
      expect(element._hasMainBlob(undefined)).to.be.false;
    });
  });

  suite('_canPublish', () => {
    test('should return false when publishSpace is null', () => {
      element.publishSpace = null;
      expect(element._canPublish()).to.be.false;
    });

    test('should return false when publishSpace lacks AddChildren permission', () => {
      element.publishSpace = { contextParameters: { permissions: ['Read'] } };
      expect(element._canPublish()).to.be.false;
    });

    test('should return true when publishSpace has AddChildren permission', () => {
      element.publishSpace = { contextParameters: { permissions: ['AddChildren'] } };
      element.hasPermission.withArgs(sinon.match.any, 'AddChildren').returns(true);
      expect(element._canPublish()).to.be.true;
    });
  });

  suite('_cancel', () => {
    test('should fire cancel event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element._cancel();
      expect(fireSpy).to.have.been.calledWith('cancel');
    });
  });

  suite('_computeRenditionOptions', () => {
    test('should return at least 2 default options', () => {
      const options = element._computeRenditionOptions();
      expect(options).to.be.an('array');
      expect(options.length).to.be.at.least(2);
    });
  });

  suite('_targetFormatter', () => {
    test('should return escaped document title', () => {
      const doc = { title: 'My Doc' };
      const result = element._targetFormatter(doc);
      expect(result).to.be.a('string');
      expect(result).to.include('My');
    });
  });
});

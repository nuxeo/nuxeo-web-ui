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
import '../elements/nuxeo-publication/nuxeo-document-publications.js';

suite('nuxeo-document-publications', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-publications></nuxeo-document-publications>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'hasPermission').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('_hasPublications', () => {
    test('should return true when docs has items', () => {
      expect(element._hasPublications([{ uid: '1' }])).to.be.true;
    });

    test('should return false when docs is empty', () => {
      expect(element._hasPublications([])).to.be.false;
    });
  });

  suite('_canUnpublish', () => {
    test('should return true when doc has WriteVersion permission', () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      const doc = { uid: '1' };
      expect(element._canUnpublish(doc)).to.be.true;
    });

    test('should return false when doc lacks WriteVersion permission', () => {
      const doc = { uid: '1' };
      expect(element._canUnpublish(doc)).to.be.false;
    });
  });

  suite('_ellipsisDirection', () => {
    test('should return right-ellipsis by default', () => {
      element.document = { uid: '1' };
      const result = element._ellipsisDirection();
      expect(result).to.be.a('string');
    });
  });

  suite('_getPublisher', () => {
    test('should return publisher from audit documentCreated event', () => {
      const item = {
        contextParameters: {
          audit: [{ eventId: 'documentCreated', principalName: 'admin' }],
        },
      };
      expect(element._getPublisher(item)).to.equal('admin');
    });

    test('should fallback to dc:publisher', () => {
      const item = {
        contextParameters: { audit: [] },
        properties: { 'dc:publisher': 'john', 'dc:lastContributor': 'jane' },
      };
      expect(element._getPublisher(item)).to.equal('john');
    });

    test('should fallback to dc:lastContributor', () => {
      const item = {
        contextParameters: { audit: [] },
        properties: { 'dc:lastContributor': 'jane' },
      };
      expect(element._getPublisher(item)).to.equal('jane');
    });
  });

  suite('_getPublishDate', () => {
    test('should return date from audit documentCreated event', () => {
      const item = {
        contextParameters: {
          audit: [{ eventId: 'documentCreated', eventDate: '2024-01-01' }],
        },
      };
      expect(element._getPublishDate(item)).to.equal('2024-01-01');
    });

    test('should fallback to dc:created', () => {
      const item = {
        contextParameters: { audit: [] },
        properties: { 'dc:created': '2024-02-01' },
      };
      expect(element._getPublishDate(item)).to.equal('2024-02-01');
    });
  });
});

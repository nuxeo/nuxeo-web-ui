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

    test('should fallback to dc:publishDate when available', () => {
      const item = {
        contextParameters: { audit: [] },
        properties: { 'dc:publishDate': '2024-03-15', 'dc:created': '2024-01-01' },
      };
      expect(element._getPublishDate(item)).to.equal('2024-03-15');
    });

    test('should return null when item is null', () => {
      expect(element._getPublishDate(null)).to.be.null;
    });

    test('should return null when item has no contextParameters or properties', () => {
      expect(element._getPublishDate({})).to.be.null;
    });
  });

  suite('_getPublisher (additional cases)', () => {
    test('should return null for null item', () => {
      expect(element._getPublisher(null)).to.be.null;
    });

    test('should return null for item with no contextParameters or properties', () => {
      expect(element._getPublisher({})).to.be.null;
    });

    test('should skip audit event without principalName and fallback to dc:publisher', () => {
      const item = {
        contextParameters: {
          audit: [{ eventId: 'documentCreated' }],
        },
        properties: { 'dc:publisher': 'fallback-user' },
      };
      expect(element._getPublisher(item)).to.equal('fallback-user');
    });
  });

  suite('_canRepublish', () => {
    test('should return false when _src is null', () => {
      element._src = null;
      const doc = { uid: '1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };
      expect(element._canRepublish(doc)).to.be.false;
    });

    test('should return false when doc lacks WriteVersion permission', () => {
      element._src = { properties: { 'uid:major_version': 2, 'uid:minor_version': 0 } };
      const doc = { uid: '1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };
      expect(element._canRepublish(doc)).to.be.false;
    });

    test('should return true when published major version is lower than source', () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      element._src = { properties: { 'uid:major_version': 2, 'uid:minor_version': 0 } };
      const doc = { uid: '1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };
      expect(element._canRepublish(doc)).to.be.true;
    });

    test('should return true when same major but lower minor version', () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      element._src = { properties: { 'uid:major_version': 1, 'uid:minor_version': 3 } };
      const doc = { uid: '1', properties: { 'uid:major_version': 1, 'uid:minor_version': 1 } };
      expect(element._canRepublish(doc)).to.be.true;
    });

    test('should return true when same version but source is checked out', () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      element._src = { properties: { 'uid:major_version': 1, 'uid:minor_version': 0 }, isCheckedOut: true };
      const doc = { uid: '1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };
      expect(element._canRepublish(doc)).to.be.true;
    });

    test('should return false when same version and source is not checked out', () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      element._src = { properties: { 'uid:major_version': 1, 'uid:minor_version': 0 }, isCheckedOut: false };
      const doc = { uid: '1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };
      expect(element._canRepublish(doc)).to.be.false;
    });

    test('should return false when published version is higher than source', () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      element._src = { properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };
      const doc = { uid: '1', properties: { 'uid:major_version': 2, 'uid:minor_version': 0 } };
      expect(element._canRepublish(doc)).to.be.false;
    });
  });

  suite('_computeParams', () => {
    test('should return params array when _src is set', () => {
      element._src = { uid: 'doc-123' };
      const params = element._computeParams();
      expect(params).to.be.an('array');
      expect(params).to.deep.equal(['doc-123', 'doc-123']);
    });

    test('should return undefined when _src is null', () => {
      element._src = null;
      expect(element._computeParams()).to.be.undefined;
    });
  });

  suite('_observeDocument', () => {
    test('should set _src to document when visible and not a version', () => {
      element.visible = true;
      element.document = { uid: 'doc-1', isVersion: false };
      element._observeDocument();
      expect(element._src).to.deep.equal({ uid: 'doc-1', isVersion: false });
    });

    test('should set _src to null when not visible', () => {
      element.visible = false;
      element.document = { uid: 'doc-1' };
      element._observeDocument();
      expect(element._src).to.be.null;
    });

    test('should set _src to null when document is null', () => {
      element.visible = true;
      element.document = null;
      element._observeDocument();
      expect(element._src).to.be.null;
    });

    test('should execute srcDocOp when document is a version', async () => {
      element.visible = true;
      element.document = { uid: 'ver-1', isVersion: true };
      const srcDoc = { uid: 'src-1' };
      sinon.stub(element.$.srcDocOp, 'execute').resolves(srcDoc);
      element._observeDocument();
      await element.$.srcDocOp.execute.returnValues[0];
      expect(element._src).to.deep.equal(srcDoc);
      element.$.srcDocOp.execute.restore();
    });
  });

  suite('_fetchPublications', () => {
    test('should fetch when visible and _src is set', () => {
      element.visible = true;
      element._src = { uid: 'doc-1' };
      const fetchSpy = sinon.spy(element.$.table, 'fetch');
      element._fetchPublications();
      expect(fetchSpy).to.have.been.calledOnce;
      fetchSpy.restore();
    });

    test('should not fetch when not visible', () => {
      element.visible = false;
      element._src = { uid: 'doc-1' };
      const fetchSpy = sinon.spy(element.$.table, 'fetch');
      element._fetchPublications();
      expect(fetchSpy).to.not.have.been.called;
      fetchSpy.restore();
    });

    test('should not fetch when _src is null', () => {
      element.visible = true;
      element._src = null;
      const fetchSpy = sinon.spy(element.$.table, 'fetch');
      element._fetchPublications();
      expect(fetchSpy).to.not.have.been.called;
      fetchSpy.restore();
    });
  });

  suite('_hasPublications (additional cases)', () => {
    test('should return falsy for null', () => {
      expect(element._hasPublications(null)).to.not.be.ok;
    });

    test('should return falsy for undefined', () => {
      expect(element._hasPublications(undefined)).to.not.be.ok;
    });
  });

  suite('_ellipsisDirection (RTL)', () => {
    test('should return left-ellipsis for LTR', () => {
      const origDir = document.dir;
      document.dir = 'ltr';
      expect(element._ellipsisDirection()).to.equal('left-ellipsis');
      document.dir = origDir;
    });

    test('should return right-ellipsis for RTL', () => {
      const origDir = document.dir;
      document.dir = 'rtl';
      expect(element._ellipsisDirection()).to.equal('right-ellipsis');
      document.dir = origDir;
    });
  });
});

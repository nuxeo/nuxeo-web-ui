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
import { fixture, flush, html, isElementVisible, login } from '@nuxeo/testing-helpers';
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
    sinon.stub(element, 'urlFor').returns('#');
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

  suite('_checkUnpublishAll', () => {
    const publications = (count) =>
      Array.from({ length: count }, (_, i) => {
        return { uid: `${i + 1}` };
      });

    // serves the publications page by page, like the server does for the provider's offset
    const servePublications = (docs, pageSize = 40) =>
      sinon.stub(element.$.unpublishAllProvider, 'fetch').callsFake(() => {
        const { offset } = element.$.unpublishAllProvider;
        return Promise.resolve({
          entries: docs.slice(offset, offset + pageSize),
          isNextPageAvailable: offset + pageSize < docs.length,
        });
      });

    test('should allow unpublishing all when every publication has WriteVersion permission', async () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      servePublications(publications(2));
      await element._checkUnpublishAll();
      expect(element.canUnpublishAll).to.be.true;
    });

    test('should check the publications beyond the first page', async () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      const fetch = servePublications(publications(41));
      await element._checkUnpublishAll();
      expect(fetch).to.have.been.calledTwice;
      expect(element.canUnpublishAll).to.be.true;
    });

    test('should not allow unpublishing all when a publication beyond the first page is denied', async () => {
      element.hasPermission.callsFake((doc, permission) => permission === 'WriteVersion' && doc.uid !== '41');
      const fetch = servePublications(publications(41));
      await element._checkUnpublishAll();
      expect(fetch).to.have.been.calledTwice;
      expect(element.canUnpublishAll).to.be.false;
    });

    test('should not allow unpublishing all when the user can only read the publications', async () => {
      element.canUnpublishAll = true;
      const fetch = servePublications(publications(41));
      await element._checkUnpublishAll();
      expect(fetch).to.have.been.calledOnce;
      expect(element.canUnpublishAll).to.be.false;
    });

    test('should allow unpublishing all when there are no publications', async () => {
      servePublications([]);
      await element._checkUnpublishAll();
      expect(element.canUnpublishAll).to.be.true;
    });

    test('should not allow unpublishing all while the check is pending', () => {
      element.canUnpublishAll = true;
      sinon.stub(element.$.unpublishAllProvider, 'fetch').returns(new Promise(() => {}));
      element._checkUnpublishAll();
      expect(element.canUnpublishAll).to.be.false;
    });

    test('should not allow unpublishing all when the check fails', async () => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      sinon.stub(element.$.unpublishAllProvider, 'fetch').rejects(new Error('fail'));
      await element._checkUnpublishAll();
      expect(element.canUnpublishAll).to.be.false;
    });

    test('should ignore the result of an outdated check', async () => {
      const allowed = { uid: '1' };
      element.hasPermission.withArgs(allowed, 'WriteVersion').returns(true);
      let resolveOutdated;
      const fetch = sinon.stub(element.$.unpublishAllProvider, 'fetch');
      fetch.onFirstCall().returns(
        new Promise((resolve) => {
          resolveOutdated = resolve;
        }),
      );
      fetch.onSecondCall().resolves({ entries: [{ uid: '2' }], isNextPageAvailable: false });
      const outdated = element._checkUnpublishAll();
      await element._checkUnpublishAll();
      resolveOutdated({ entries: [allowed], isNextPageAvailable: true });
      await outdated;
      expect(fetch).to.have.been.calledTwice;
      expect(element.canUnpublishAll).to.be.false;
    });
  });

  suite('pending Unpublish all check', () => {
    const allowed = { entries: [{ uid: '1' }], isNextPageAvailable: false };
    let resolveCheck;

    setup(() => {
      element.hasPermission.withArgs(sinon.match.any, 'WriteVersion').returns(true);
      sinon.stub(element.$.table, 'fetch');
      sinon.stub(element.$.unpublishAllProvider, 'fetch').returns(
        new Promise((resolve) => {
          resolveCheck = resolve;
        }),
      );
      element.visible = true;
      element.document = { uid: 'doc-1', isVersion: false };
    });

    test('should allow unpublishing all once the check completes for the current document', async () => {
      resolveCheck(allowed);
      await flush();
      expect(element.canUnpublishAll).to.be.true;
    });

    test('should be ignored once the tab is hidden', async () => {
      element.visible = false;
      resolveCheck(allowed);
      await flush();
      expect(element.canUnpublishAll).to.be.false;
    });

    test('should be ignored while the source document of a version is resolved', async () => {
      sinon.stub(element.$.srcDocOp, 'execute').returns(new Promise(() => {}));
      element.document = { uid: 'ver-2', isVersion: true };
      resolveCheck(allowed);
      await flush();
      expect(element.canUnpublishAll).to.be.false;
    });
  });

  suite('Unpublish all button', () => {
    const getButton = () => element.shadowRoot.querySelector('paper-button.unpublish-all');

    test('should not be displayed when the user cannot unpublish every publication', async () => {
      element.publishedDocs = [{ uid: '1' }];
      element.canUnpublishAll = false;
      await flush();
      expect(isElementVisible(getButton())).to.be.false;
    });

    test('should be displayed and enabled when the user can unpublish every publication', async () => {
      element.publishedDocs = [{ uid: '1' }];
      element.canUnpublishAll = true;
      await flush();
      expect(isElementVisible(getButton())).to.be.true;
      expect(getButton().hasAttribute('disabled')).to.be.false;
    });

    test('should be hidden again when a new check starts', async () => {
      element.publishedDocs = [{ uid: '1' }];
      element.canUnpublishAll = true;
      await flush();
      sinon.stub(element.$.unpublishAllProvider, 'fetch').returns(new Promise(() => {}));
      element._checkUnpublishAll();
      await flush();
      expect(isElementVisible(getButton())).to.be.false;
    });

    test('should be disabled when there are no publications', async () => {
      element.publishedDocs = [];
      element.canUnpublishAll = true;
      await flush();
      expect(isElementVisible(getButton())).to.be.true;
      expect(getButton().hasAttribute('disabled')).to.be.true;
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
    test('should return query params when _src is set', () => {
      element._src = { uid: 'doc-123' };
      const params = element._computeParams();
      expect(params).to.be.an('object');
      expect(params.queryParams).to.contain('doc-123');
      expect(params.queryParams).to.contain('ecm:isProxy = 1');
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
      const checkStub = sinon.stub(element, '_checkUnpublishAll');
      element._fetchPublications();
      expect(fetchSpy).to.have.been.calledOnce;
      expect(checkStub).to.have.been.calledOnce;
      fetchSpy.restore();
    });

    test('should not fetch when not visible', () => {
      element.visible = false;
      element._src = { uid: 'doc-1' };
      const fetchSpy = sinon.spy(element.$.table, 'fetch');
      const checkStub = sinon.stub(element, '_checkUnpublishAll');
      element._fetchPublications();
      expect(fetchSpy).to.not.have.been.called;
      expect(checkStub).to.not.have.been.called;
      fetchSpy.restore();
    });

    test('should not fetch when _src is null', () => {
      element.visible = true;
      element._src = null;
      const fetchSpy = sinon.spy(element.$.table, 'fetch');
      const checkStub = sinon.stub(element, '_checkUnpublishAll');
      element._fetchPublications();
      expect(fetchSpy).to.not.have.been.called;
      expect(checkStub).to.not.have.been.called;
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

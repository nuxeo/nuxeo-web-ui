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
import '../elements/nuxeo-document-viewer/nuxeo-document-viewer.js';

suite('nuxeo-document-viewer', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-viewer></nuxeo-document-viewer>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasPermission').returns(false);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'isVersion').returns(false);
    sinon.stub(element, 'isProxy').returns(false);
    sinon.stub(element, 'isImmutable').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('_thumbnail', () => {
    test('should return thumbnail URL when available', () => {
      const doc = { uid: '1', contextParameters: { thumbnail: { url: 'http://example.com/thumb.jpg' } } };
      const result = element._thumbnail(doc);
      expect(result).to.include('http://example.com/thumb.jpg');
    });

    test('should return empty string when no thumbnail', () => {
      expect(element._thumbnail(null)).to.equal('');
    });
  });

  suite('_isDropzoneAvailable', () => {
    test('should return false when no WriteProperties permission', () => {
      const doc = { uid: '1' };
      element.hasPermission.returns(false);
      expect(element._isDropzoneAvailable(doc)).to.be.false;
    });

    test('should return false when document is trashed', () => {
      const doc = { uid: '1' };
      element.hasPermission.withArgs(doc, 'WriteProperties').returns(true);
      element.isTrashed.returns(true);
      expect(element._isDropzoneAvailable(doc)).to.be.false;
    });
  });

  // WEBUI-1820: dropping a new rendition is a document write, so it takes part in optimistic locking
  suite('optimistic locking', () => {
    setup(() => {
      element.document = {
        uid: 'doc-1',
        repository: 'default',
        changeToken: '5-2',
        properties: { 'file:content': { name: 'new.pdf' } },
      };
      sinon.stub(element, 'notify');
      sinon.stub(element, 'fire');
    });

    teardown(() => {
      element.notify.restore();
      element.fire.restore();
      if (element.$.doc.put.restore) {
        element.$.doc.put.restore();
      }
    });

    test('sends the change token of the loaded document', async () => {
      sinon.stub(element.$.doc, 'put').resolves({ uid: 'doc-1' });
      await element._valueChanged({ name: 'new.pdf' });
      expect(element.$.doc.data.changeToken).to.eql('5-2');
    });

    test('reports a conflict and reloads when the write is stale', async () => {
      sinon.stub(element.$.doc, 'put').rejects({ status: 409 });
      await element._valueChanged({ name: 'new.pdf' });
      expect(element.notify).to.have.been.calledOnce;
      expect(element.notify.firstCall.args[0].message).to.eql(element.i18n('documentUpdate.conflict'));
      expect(element.fire).to.have.been.calledWith('document-updated');
    });

    test('still rejects other failures', async () => {
      sinon.stub(element.$.doc, 'put').rejects({ status: 500 });
      let caught;
      await element._valueChanged({ name: 'new.pdf' }).catch((err) => {
        caught = err;
      });
      expect(caught).to.eql({ status: 500 });
      expect(element.notify).to.not.have.been.called;
    });
  });
});

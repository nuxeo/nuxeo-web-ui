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
import '../elements/document/nuxeo-document-form-layout.js';

suite('nuxeo-document-form-layout', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-form-layout></nuxeo-document-form-layout>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default layout to edit', () => {
      expect(element.layout).to.equal('edit');
    });

    test('should default saving to false', () => {
      expect(element.saving).to.be.false;
    });
  });

  suite('_documentChanged', () => {
    test('should reset _dirtyProperties when path is document', () => {
      element._dirtyProperties = { 'dc:title': 'old' };
      element._documentChanged({ path: 'document' });
      expect(element._dirtyProperties).to.deep.equal({});
    });

    test('should track dirty property when path is a property sub-path', () => {
      element._dirtyProperties = {};
      element.document = { type: 'File', properties: { 'dc:title': 'New Title', 'dc:description': 'Desc' } };
      element._documentChanged({ path: 'document.properties.dc:title' });
      expect(element._dirtyProperties['dc:title']).to.equal('New Title');
    });

    test('should not track when path does not match properties pattern', () => {
      element._dirtyProperties = {};
      element._documentChanged({ path: 'document.uid' });
      expect(Object.keys(element._dirtyProperties)).to.have.length(0);
    });
  });

  suite('cancel', () => {
    test('should fire document-updated', () => {
      const listener = sinon.spy();
      element.addEventListener('document-updated', listener);
      element.cancel();
      expect(listener).to.have.been.calledOnce;
    });
  });

  suite('_refresh', () => {
    test('should fire document-updated', () => {
      const listener = sinon.spy();
      element.addEventListener('document-updated', listener);
      element._refresh();
      expect(listener).to.have.been.calledOnce;
    });
  });

  suite('_save', () => {
    let innerLayout;
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    setup(() => {
      innerLayout = {
        validate: sinon.stub(),
        _getValidatableElements: sinon.stub().returns([]),
        element: { root: document.createElement('div') },
      };
      element.$.layout = { $: { layout: innerLayout }, reportValidation: sinon.stub() };
      element.$.doc = { data: null, post: sinon.stub(), put: sinon.stub() };
      element.document = { type: 'File', properties: { 'dc:title': 'Test' } };
    });

    test('should set saving to true then false on validation failure', async () => {
      innerLayout.validate.resolves(false);
      await element._save();
      expect(element.saving).to.be.false;
    });

    test('should scroll to and focus invalid field on validation failure', async () => {
      const invalidField = { invalid: true, scrollIntoView: sinon.spy(), focus: sinon.spy() };
      innerLayout.validate.resolves(false);
      innerLayout._getValidatableElements.returns([{ invalid: false }, invalidField]);
      await element._save();
      expect(invalidField.scrollIntoView).to.have.been.calledOnce;
      expect(invalidField.focus).to.have.been.calledOnce;
    });

    test('should call post when document has no uid (create)', async () => {
      innerLayout.validate.resolves(true);
      element.$.doc.post.resolves({});
      sinon.stub(element, '_refresh');
      await element._save();
      await flush();
      expect(element.$.doc.data).to.deep.equal(element.document);
      expect(element.$.doc.post).to.have.been.calledOnce;
      expect(element.$.doc.put).to.not.have.been.called;
    });

    test('should call put when document has uid (edit)', async () => {
      element.document = { uid: 'doc-1', type: 'File', properties: { 'dc:title': 'Updated' } };
      element._dirtyProperties = { 'dc:title': 'Updated' };
      innerLayout.validate.resolves(true);
      element.$.doc.put.resolves({});
      sinon.stub(element, '_refresh');
      await element._save();
      await flush();
      expect(element.$.doc.data).to.deep.equal({
        'entity-type': 'document',
        uid: 'doc-1',
        properties: { 'dc:title': 'Updated' },
      });
      expect(element.$.doc.put).to.have.been.calledOnce;
      expect(element.$.doc.post).to.not.have.been.called;
    });

    test('should call _refresh on success', async () => {
      innerLayout.validate.resolves(true);
      element.$.doc.post.resolves({});
      sinon.stub(element, '_refresh');
      await element._save();
      await flush();
      expect(element._refresh).to.have.been.calledOnce;
    });

    test('should report validation error from server', async () => {
      innerLayout.validate.resolves(true);
      const validationErr = { 'entity-type': 'validation_report', violations: [] };
      element.$.doc.post.returns(Promise.reject(validationErr));
      await element._save();
      await flush();
      expect(element.$.layout.reportValidation).to.have.been.calledWith(validationErr);
      expect(element.saving).to.be.false;
    });

    test('should notify on generic save error', async () => {
      innerLayout.validate.resolves(true);
      const genericErr = new Error('server error');
      element.$.doc.post.returns(Promise.reject(genericErr));
      sinon.stub(element, 'notify');
      sinon.stub(console, 'error');
      await element._save();
      await flush();
      expect(element.notify).to.have.been.calledOnce;
      expect(element.notify.firstCall.args[0].message).to.equal('documentEdit.saveError');
      expect(element.saving).to.be.false;
      console.error.restore();
    });

    test('should set saving to false in finally block', async () => {
      innerLayout.validate.resolves(true);
      element.$.doc.post.resolves({});
      sinon.stub(element, '_refresh');
      await element._save();
      await flush();
      expect(element.saving).to.be.false;
    });
  });
});

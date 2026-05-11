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
import '../elements/nuxeo-document-versions/nuxeo-document-create-version.js';

suite('nuxeo-document-create-version', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-create-version></nuxeo-document-create-version>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_computeHeaders', () => {
    test('should return headers with X-Versioning-Option set to versionType', () => {
      const headers = element._computeHeaders('major');
      expect(headers).to.deep.equal({ 'X-Versioning-Option': 'major' });
    });

    test('should return headers with minor version type', () => {
      const headers = element._computeHeaders('minor');
      expect(headers).to.deep.equal({ 'X-Versioning-Option': 'minor' });
    });
  });

  suite('_isAvailable', () => {
    test('should return false when document is a version', () => {
      sinon.stub(element, 'isVersion').returns(true);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(true);
      expect(element._isAvailable({})).to.be.false;
    });

    test('should return false when document is a record', () => {
      sinon.stub(element, 'isVersion').returns(false);
      sinon.stub(element, 'isRecord').returns(true);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(true);
      expect(element._isAvailable({})).to.be.false;
    });

    test('should return false when document does not have Versionable facet', () => {
      sinon.stub(element, 'isVersion').returns(false);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(false);
      sinon.stub(element, 'hasPermission').returns(true);
      expect(element._isAvailable({})).to.be.false;
    });

    test('should return false when document does not have WriteVersion permission', () => {
      sinon.stub(element, 'isVersion').returns(false);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(false);
      expect(element._isAvailable({})).to.be.false;
    });

    test('should return true when all conditions are met', () => {
      sinon.stub(element, 'isVersion').returns(false);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(true);
      expect(element._isAvailable({})).to.be.true;
    });
  });

  suite('_nextMinor', () => {
    test('should return empty string when doc is null', () => {
      expect(element._nextMinor(null)).to.equal('');
    });

    test('should return incremented minor version', () => {
      const doc = { properties: { 'uid:major_version': 1, 'uid:minor_version': 2 } };
      expect(element._nextMinor(doc)).to.equal('1.3');
    });

    test('should handle zero versions', () => {
      const doc = { properties: { 'uid:major_version': 0, 'uid:minor_version': 0 } };
      expect(element._nextMinor(doc)).to.equal('0.1');
    });
  });

  suite('_nextMajor', () => {
    test('should return empty string when doc is null', () => {
      expect(element._nextMajor(null)).to.equal('');
    });

    test('should return incremented major version', () => {
      const doc = { properties: { 'uid:major_version': 1, 'uid:minor_version': 2 } };
      expect(element._nextMajor(doc)).to.equal('2.0');
    });

    test('should handle zero versions', () => {
      const doc = { properties: { 'uid:major_version': 0, 'uid:minor_version': 0 } };
      expect(element._nextMajor(doc)).to.equal('1.0');
    });
  });

  suite('_toggleDialog', () => {
    const validDoc = { uid: 'doc1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };

    test('should open dialog when document is available', () => {
      sinon.stub(element, 'isVersion').returns(false);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(true);
      element.document = validDoc;
      const openStub = sinon.stub(element.$.dialog, 'open');
      element._toggleDialog();
      expect(openStub).to.have.been.called;
    });

    test('should not open dialog when document is not available', () => {
      sinon.stub(element, 'isVersion').returns(true);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(true);
      element.document = validDoc;
      const openStub = sinon.stub(element.$.dialog, 'open');
      element._toggleDialog();
      expect(openStub).to.not.have.been.called;
    });
  });

  suite('_create', () => {
    const validDoc = { uid: 'doc1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } };

    test('should execute operation and fire document-updated when available', async () => {
      sinon.stub(element, 'isVersion').returns(false);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(true);
      element.document = validDoc;
      element.versionType = 'major';
      const executeStub = sinon.stub(element.$.opCreateVersion, 'execute').returns(Promise.resolve());
      const fireSpy = sinon.spy(element, 'fire');
      element._create();
      await executeStub.returnValues[0];
      expect(element.$.opCreateVersion.params).to.deep.equal({ increment: 'major', saveDocument: true });
      expect(fireSpy).to.have.been.calledWith('document-updated');
    });

    test('should not execute operation when document is not available', () => {
      sinon.stub(element, 'isVersion').returns(true);
      sinon.stub(element, 'isRecord').returns(false);
      sinon.stub(element, 'hasFacet').returns(true);
      sinon.stub(element, 'hasPermission').returns(true);
      element.document = validDoc;
      const executeStub = sinon.stub(element.$.opCreateVersion, 'execute').returns(Promise.resolve());
      element._create();
      expect(executeStub).to.not.have.been.called;
    });
  });

  suite('_dialogClosed', () => {
    test('should fire dialog-closed event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element._dialogClosed();
      expect(fireSpy).to.have.been.calledWith('dialog-closed');
    });
  });

  suite('ready', () => {
    test('should set default label when label is not provided', async () => {
      const el = await fixture(html`<nuxeo-document-create-version></nuxeo-document-create-version>`);
      sinon.stub(el, 'i18n').callsFake((key) => key);
      el.label = '';
      el.ready();
      expect(el.label).to.equal('versions.create');
    });

    test('should not override label when already set', async () => {
      const el = await fixture(
        html`<nuxeo-document-create-version label="Custom Label"></nuxeo-document-create-version>`,
      );
      sinon.stub(el, 'i18n').callsFake((key) => key);
      el.ready();
      expect(el.label).to.equal('Custom Label');
    });
  });
});

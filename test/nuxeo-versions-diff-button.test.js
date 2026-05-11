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
import '../elements/diff/nuxeo-versions-diff-button.js';

suite('nuxeo-versions-diff-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-versions-diff-button></nuxeo-versions-diff-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default tooltipPosition to bottom', () => {
      expect(element.tooltipPosition).to.equal('bottom');
    });

    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_getMajor', () => {
    test('should return major version from properties', () => {
      const doc = { properties: { 'uid:major_version': 3 } };
      expect(element._getMajor(doc)).to.equal(3);
    });
  });

  suite('_getMinor', () => {
    test('should return minor version from properties', () => {
      const doc = { properties: { 'uid:minor_version': 5 } };
      expect(element._getMinor(doc)).to.equal(5);
    });
  });

  suite('_computeLabel', () => {
    test('should return diff label', () => {
      expect(element._computeLabel()).to.include('versionsDiffButton.tooltip');
    });
  });

  suite('_doDiff', () => {
    test('should fire nuxeo-diff-documents when versions >= 2', async () => {
      element.document = {
        uid: 'd1',
        isCheckedOut: false,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      const versions = {
        entries: [
          { uid: 'v1', properties: { 'uid:major_version': 0, 'uid:minor_version': 1 } },
          { uid: 'v2', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } },
        ],
      };
      const opStub = { execute: sinon.stub().resolves(versions) };
      sinon.stub(element, '$$').returns(opStub);
      const listener = sinon.spy();
      element.addEventListener('nuxeo-diff-documents', listener);
      element._doDiff();
      await opStub.execute.returnValues[0];
      expect(listener).to.have.been.calledOnce;
      expect(listener.firstCall.args[0].detail.documents).to.have.length(2);
    });

    test('should notify when fewer than 2 versions', async () => {
      element.document = {
        uid: 'd1',
        isCheckedOut: false,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      const versions = {
        entries: [{ uid: 'v1', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } }],
      };
      const opStub = { execute: sinon.stub().resolves(versions) };
      sinon.stub(element, '$$').returns(opStub);
      const notifySpy = sinon.stub(element, 'notify');
      element._doDiff();
      await opStub.execute.returnValues[0];
      expect(notifySpy).to.have.been.calledOnce;
    });

    test('should prepend checked-out document to versions', async () => {
      element.document = {
        uid: 'd1',
        isCheckedOut: true,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      const versions = {
        entries: [
          { uid: 'v1', properties: { 'uid:major_version': 0, 'uid:minor_version': 1 } },
          { uid: 'v2', properties: { 'uid:major_version': 1, 'uid:minor_version': 0 } },
        ],
      };
      const opStub = { execute: sinon.stub().resolves(versions) };
      sinon.stub(element, '$$').returns(opStub);
      const listener = sinon.spy();
      element.addEventListener('nuxeo-diff-documents', listener);
      element._doDiff();
      await opStub.execute.returnValues[0];
      const docs = listener.firstCall.args[0].detail.documents;
      expect(docs[0].uid).to.equal('d1');
    });
  });
});

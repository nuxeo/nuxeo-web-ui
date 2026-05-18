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
import '../elements/diff/nuxeo-document-diff-button.js';

suite('nuxeo-document-diff-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-diff-button></nuxeo-document-diff-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default selectedDocuments to empty array', () => {
      expect(element.selectedDocuments).to.be.an('array').that.is.empty;
    });

    test('should default tooltipPosition to bottom', () => {
      expect(element.tooltipPosition).to.equal('bottom');
    });

    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_isAvailable', () => {
    test('should return false when selectedDocuments is empty', () => {
      element.selectedDocuments = [];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when only one document selected', () => {
      element.selectedDocuments = [{ uid: '1' }];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return true when more than one document selected', () => {
      element.selectedDocuments = [{ uid: '1' }, { uid: '2' }];
      expect(element._isAvailable()).to.be.true;
    });

    test('should return falsy when selectedDocuments is null', () => {
      element.selectedDocuments = null;
      expect(element._isAvailable()).to.not.be.ok;
    });
  });

  suite('_doDiff', () => {
    test('should fire nuxeo-diff-documents with selected documents', () => {
      const fireSpy = sinon.spy(element, 'fire');
      element.selectedDocuments = [{ uid: '1' }, { uid: '2' }];
      element._doDiff();
      expect(fireSpy).to.have.been.calledWith('nuxeo-diff-documents', {
        documents: element.selectedDocuments,
      });
    });
  });

  suite('_computeLabel', () => {
    test('should return i18n key', () => {
      expect(element._computeLabel()).to.equal('documentDiffButton.tooltip');
    });
  });
});

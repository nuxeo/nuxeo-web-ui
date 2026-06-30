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
import '../elements/nuxeo-document-actions/nuxeo-document-form-button.js';

suite('nuxeo-document-form-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-form-button></nuxeo-document-form-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasPermission').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default layout to edit', () => {
      expect(element.layout).to.equal('edit');
    });

    test('should default icon to nuxeo:edit', () => {
      expect(element.icon).to.equal('nuxeo:edit');
    });

    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_isMutable', () => {
    test('should return true for normal document', () => {
      const doc = { uid: '1', type: 'File' };
      expect(element._isMutable(doc)).to.be.true;
    });

    test('should return false for Immutable document', () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.withArgs(doc, 'Immutable').returns(true);
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should return false for Root type', () => {
      const doc = { uid: '1', type: 'Root' };
      expect(element._isMutable(doc)).to.be.false;
    });

    test('should return false for trashed document', () => {
      const doc = { uid: '1', type: 'File' };
      element.isTrashed.returns(true);
      expect(element._isMutable(doc)).to.be.false;
    });
  });

  suite('_isAvailable', () => {
    test('should return true when doc has WriteProperties and is mutable', () => {
      const doc = { uid: '1', type: 'File' };
      element.hasPermission.withArgs(doc, 'WriteProperties').returns(true);
      expect(element._isAvailable(doc)).to.be.true;
    });

    test('should return false when doc lacks WriteProperties', () => {
      const doc = { uid: '1', type: 'File' };
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('should return false for Root type', () => {
      const doc = { uid: '1', type: 'Root' };
      element.hasPermission.withArgs(doc, 'WriteProperties').returns(true);
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('should return false for null document', () => {
      expect(element._isAvailable(null)).to.not.be.ok;
    });
  });

  suite('Escape key handling', () => {
    let closeDialogStub;
    let mockDialog;

    setup(() => {
      mockDialog = { opened: false, close: sinon.stub() };
      // Shadow the prototype getter on this instance so tests are fully isolated
      Object.defineProperty(element, 'dialog', {
        get: () => mockDialog,
        configurable: true,
      });
      closeDialogStub = sinon.stub(element, '_closeDialog');
    });

    test('closes dialog on Escape when dialog is open and event originates within the dialog', () => {
      mockDialog.opened = true;
      const event = { key: 'Escape', stopPropagation: sinon.stub(), composedPath: () => [mockDialog] };
      element._handleDialogKeydown(event);
      expect(closeDialogStub).to.have.been.calledOnce;
      expect(event.stopPropagation).to.have.been.calledOnce;
    });

    test('does not close dialog on Escape when event originates outside the dialog', () => {
      mockDialog.opened = true;
      const event = { key: 'Escape', stopPropagation: sinon.stub(), composedPath: () => [] };
      element._handleDialogKeydown(event);
      expect(closeDialogStub).not.to.have.been.called;
    });

    test('does not close dialog when a non-Escape key is pressed', () => {
      mockDialog.opened = true;
      const event = { key: 'Enter', stopPropagation: sinon.stub(), composedPath: () => [mockDialog] };
      element._handleDialogKeydown(event);
      expect(closeDialogStub).not.to.have.been.called;
    });

    test('does not close dialog when dialog is not open', () => {
      mockDialog.opened = false;
      const event = { key: 'Escape', stopPropagation: sinon.stub(), composedPath: () => [mockDialog] };
      element._handleDialogKeydown(event);
      expect(closeDialogStub).not.to.have.been.called;
    });
  });
});

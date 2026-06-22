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
import '../elements/nuxeo-document-create-popup/nuxeo-document-create-popup.js';

suite('nuxeo-document-create-popup', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-create-popup></nuxeo-document-create-popup>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default _showTabs to true', () => {
      expect(element._showTabs).to.be.true;
    });

    test('should default selectedTab to empty string', () => {
      expect(element.selectedTab).to.equal('');
    });

    test('should default opened to false', () => {
      expect(element.opened).to.be.false;
    });
  });

  suite('_hideTabs', () => {
    test('should set _showTabs to false', () => {
      element._showTabs = true;
      element._hideTabs();
      expect(element._showTabs).to.be.false;
    });
  });

  suite('_displayTabs', () => {
    test('should set _showTabs to true', () => {
      element._showTabs = false;
      element._displayTabs();
      expect(element._showTabs).to.be.true;
    });
  });

  suite('_close', () => {
    test('should toggle dialog and reset _showTabs when dialog is opened', () => {
      element.$.createDocDialog.opened = true;
      const toggleStub = sinon.stub(element.$.createDocDialog, 'toggle');
      element._showTabs = false;
      element._close();
      expect(toggleStub).to.have.been.called;
      expect(element._showTabs).to.be.true;
    });

    test('should do nothing when dialog is not opened', () => {
      element.$.createDocDialog.opened = false;
      const toggleStub = sinon.stub(element.$.createDocDialog, 'toggle');
      element._close();
      expect(toggleStub).to.not.have.been.called;
    });
  });

  suite('_openedChanged', () => {
    test('should set selectedTab to create when opened and selectedTab is empty', () => {
      element.selectedTab = '';
      element.opened = true;
      element._openedChanged();
      expect(element.selectedTab).to.equal('create');
    });

    test('should not override selectedTab when opened and selectedTab is already set', () => {
      element.selectedTab = 'import';
      element.opened = true;
      element._openedChanged();
      expect(element.selectedTab).to.equal('import');
    });

    test('should set selectedTab to empty string when closed', () => {
      element.selectedTab = 'create';
      element.opened = false;
      element._openedChanged();
      expect(element.selectedTab).to.equal('');
    });
  });

  suite('_importContext', () => {
    test('should return object with parent and i18n', () => {
      element.parent = { uid: 'parent1' };
      const context = element._importContext();
      expect(context).to.have.property('parent');
      expect(context.parent).to.deep.equal({ uid: 'parent1' });
      expect(context).to.have.property('i18n');
    });
  });

  suite('_fetchParent', () => {
    test('should set parentPath from defaultPath when parentPath is empty', async () => {
      element.parentPath = '';
      element.defaultPath = '/default/path';
      element.parent = { contextParameters: { subtypes: [] } };
      await element._fetchParent();
      expect(element.parentPath).to.equal('/default/path');
    });

    test('should resolve immediately when parent has contextParameters', async () => {
      element.parentPath = '/some/path';
      element.parent = { contextParameters: { subtypes: [], permissions: [] } };
      const getStub = sinon.stub(element.$.defaultDoc, 'get');
      await element._fetchParent();
      expect(getStub).to.not.have.been.called;
    });

    test('should call defaultDoc.get when parent lacks contextParameters', async () => {
      element.parentPath = '/some/path';
      element.parent = null;
      const getStub = sinon.stub(element.$.defaultDoc, 'get').returns(Promise.resolve());
      await element._fetchParent();
      expect(getStub).to.have.been.called;
    });

    test('should set _noPermission on 403 error', async () => {
      element.parentPath = '/some/path';
      element.parent = null;
      sinon.stub(element.$.defaultDoc, 'get').returns(Promise.reject({ status: 403 }));
      await element._fetchParent();
      expect(element._noPermission).to.be.true;
    });
  });

  suite('_parentPathChanged', () => {
    test('should update parentPath when valid target path and different parent', () => {
      element.parent = { path: '/old/path' };
      const getStub = sinon.stub(element.$.defaultDoc, 'get');
      element._parentPathChanged({
        detail: { isValidTargetPath: true, parentPath: '/new/path', suggesterChildren: [] },
      });
      expect(element.parentPath).to.equal('/new/path');
      expect(getStub).to.have.been.called;
    });

    test('should not update parentPath when isValidTargetPath is false', () => {
      element.parentPath = '/old/path';
      element.parent = { path: '/old/path' };
      const getStub = sinon.stub(element.$.defaultDoc, 'get');
      element._parentPathChanged({
        detail: { isValidTargetPath: false, parentPath: '/new/path', suggesterChildren: [] },
      });
      expect(element.parentPath).to.equal('/old/path');
      expect(getStub).to.not.have.been.called;
    });

    test('should not update when parentPath matches existing parent path', () => {
      element.parent = { path: '/same/path' };
      element.parentPath = '/same/path';
      const getStub = sinon.stub(element.$.defaultDoc, 'get');
      element._parentPathChanged({
        detail: { isValidTargetPath: true, parentPath: '/same/path', suggesterChildren: [] },
      });
      expect(getStub).to.not.have.been.called;
    });
  });

  suite('dialog dismissal configuration', () => {
    let dialog;

    setup(() => {
      dialog = element.$.createDocDialog;
    });

    test('should not be a modal dialog (so ESC can dismiss it)', () => {
      expect(dialog.hasAttribute('modal')).to.be.false;
      expect(dialog.modal).to.not.be.true;
    });

    test('should allow cancel on ESC key press', () => {
      expect(dialog.noCancelOnEscKey).to.not.be.true;
    });

    test('should prevent cancel on outside click', () => {
      expect(dialog.hasAttribute('no-cancel-on-outside-click')).to.be.true;
      expect(dialog.noCancelOnOutsideClick).to.be.true;
    });

    test('should render a backdrop', () => {
      expect(dialog.hasAttribute('with-backdrop')).to.be.true;
      expect(dialog.withBackdrop).to.be.true;
    });

    test('should close the dialog when ESC key is pressed', async () => {
      element.parent = { contextParameters: { subtypes: [], permissions: [] } };
      element.parentPath = '/some/path';
      dialog.open();
      await new Promise((resolve) => {
        dialog.addEventListener('iron-overlay-opened', resolve, { once: true });
      });
      expect(dialog.opened).to.be.true;

      // Simulate the ESC key handling path that iron-overlay-behavior invokes when
      // `noCancelOnEscKey` is false. With `modal`, this path is short-circuited.
      dialog._onCaptureEsc(new CustomEvent('keydown'));
      await new Promise((resolve) => {
        dialog.addEventListener('iron-overlay-closed', resolve, { once: true });
      });
      expect(dialog.opened).to.be.false;
    });
  });
});

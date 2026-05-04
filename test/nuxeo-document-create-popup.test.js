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
    sinon.stub(element, 'notify');
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

  suite('_openedChanged', () => {
    test('should set selectedTab to create when opened and no tab selected', () => {
      element.selectedTab = '';
      element.opened = true;
      element._openedChanged();
      expect(element.selectedTab).to.equal('create');
    });

    test('should keep existing selectedTab when opened', () => {
      element.selectedTab = 'import';
      element.opened = true;
      element._openedChanged();
      expect(element.selectedTab).to.equal('import');
    });

    test('should clear selectedTab when closed', () => {
      element.selectedTab = 'create';
      element.opened = false;
      element._openedChanged();
      expect(element.selectedTab).to.equal('');
    });
  });

  suite('_importContext', () => {
    test('should return parent and i18n', () => {
      const parent = { uid: '1' };
      element.parent = parent;
      const ctx = element._importContext();
      expect(ctx.parent).to.equal(parent);
      expect(ctx.i18n).to.exist;
    });
  });

  suite('_fetchParent', () => {
    test('should resolve immediately if parent has contextParameters', async () => {
      element.parent = { uid: '1', contextParameters: { permissions: ['Everything'] } };
      await element._fetchParent();
      expect(element._noPermission).to.be.false;
    });

    test('should set parentPath to defaultPath if not set', async () => {
      element.parentPath = null;
      element.defaultPath = '/default/path';
      element.parent = { uid: '1', contextParameters: {} };
      await element._fetchParent();
      expect(element.parentPath).to.equal('/default/path');
    });
  });

  suite('_parentPathChanged', () => {
    test('should not update parentPath for invalid target path', () => {
      element.parentPath = '/existing';
      element._parentPathChanged({ detail: { isValidTargetPath: false, parentPath: '/new' } });
      expect(element.parentPath).to.equal('/existing');
    });
  });
});

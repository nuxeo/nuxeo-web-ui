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
import '../elements/nuxeo-document-create-button/nuxeo-document-create-button.js';

suite('nuxeo-document-create-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-create-button></nuxeo-document-create-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default shortcutsVisible to false', () => {
      expect(element.shortcutsVisible).to.be.false;
    });
  });

  suite('_canCreateIn', () => {
    test('should return true when AddChildren permission exists', () => {
      const doc = { uid: '1', contextParameters: { permissions: ['AddChildren', 'Read'] } };
      expect(element._canCreateIn(doc)).to.be.true;
    });

    test('should return false when no AddChildren permission', () => {
      const doc = { uid: '1', contextParameters: { permissions: ['Read'] } };
      expect(element._canCreateIn(doc)).to.be.false;
    });

    test('should return false when no contextParameters', () => {
      expect(element._canCreateIn({ uid: '1' })).to.be.false;
    });

    test('should return false when null document', () => {
      expect(element._canCreateIn(null)).to.be.false;
    });
  });

  suite('_showShortcuts and _hideShortcuts', () => {
    test('should set shortcutsVisible to true', () => {
      element._showShortcuts();
      expect(element.shortcutsVisible).to.be.true;
    });

    test('should set shortcutsVisible to false', () => {
      element.shortcutsVisible = true;
      element._hideShortcuts();
      expect(element.shortcutsVisible).to.be.false;
    });
  });

  suite('_animateOpen', () => {
    test('should return open when shortcutsVisible', () => {
      element.shortcutsVisible = true;
      expect(element._animateOpen()).to.equal('open');
    });

    test('should return empty string when not visible', () => {
      element.shortcutsVisible = false;
      expect(element._animateOpen()).to.equal('');
    });
  });
});

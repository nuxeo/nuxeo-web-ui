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
import '../elements/nuxeo-document-actions/nuxeo-clipboard-toggle-button.js';

suite('nuxeo-clipboard-toggle-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-clipboard-toggle-button></nuxeo-clipboard-toggle-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasType').returns(false);
    sinon.stub(element, 'isVersion').returns(false);
    sinon.stub(element, 'isProxy').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default icon to icons:content-paste', () => {
      expect(element.icon).to.equal('icons:content-paste');
    });

    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_isAvailable', () => {
    test('should return true for a normal document', () => {
      const doc = { uid: '1', type: 'File' };
      expect(element._isAvailable(doc)).to.be.true;
    });

    test('should return false for trashed document', () => {
      const doc = { uid: '1', type: 'File' };
      element.isTrashed.returns(true);
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('should return false for Favorites type', () => {
      const doc = { uid: '1', type: 'Favorites' };
      element.hasType.withArgs(doc, 'Favorites').returns(true);
      expect(element._isAvailable(doc)).to.be.false;
    });

    test('should return false for version document', () => {
      const doc = { uid: '1', type: 'File' };
      element.isVersion.returns(true);
      expect(element._isAvailable(doc)).to.be.false;
    });

    // a published document must be able to reach the clipboard so it can be reorganised
    // within the publication area; where it may then be pasted is up to nuxeo-clipboard
    test('should return true for proxy document', () => {
      const doc = { uid: '1', type: 'File' };
      element.isProxy.returns(true);
      expect(element._isAvailable(doc)).to.be.true;
    });
  });

  suite('_computeLabel', () => {
    test('should return remove label when in clipboard', () => {
      const label = element._computeLabel(true);
      expect(label).to.include('remove');
    });

    test('should return add label when not in clipboard', () => {
      const label = element._computeLabel(false);
      expect(label).to.include('add');
    });
  });

  suite('toggle', () => {
    const makeClipboard = () => {
      return {
        add: sinon.spy(),
        remove: sinon.spy(),
        contains: sinon.stub().returns(false),
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
      };
    };

    test('should call clipboard.add when not in clipboard', () => {
      const clipboard = makeClipboard();
      element.clipboard = clipboard;
      element.document = { uid: '1' };
      element.inClipboard = false;
      element.toggle();
      expect(clipboard.add).to.have.been.calledWith(element.document);
    });

    test('should call clipboard.remove when in clipboard', () => {
      const clipboard = makeClipboard();
      clipboard.contains.returns(true);
      element.clipboard = clipboard;
      element.document = { uid: '1' };
      element.inClipboard = true;
      element.toggle();
      expect(clipboard.remove).to.have.been.calledWith(element.document);
    });
  });
});

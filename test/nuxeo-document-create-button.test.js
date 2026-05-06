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
    test('should return true when document has AddChildren permission', () => {
      const doc = { contextParameters: { permissions: ['AddChildren', 'Read'] } };
      expect(element._canCreateIn(doc)).to.be.true;
    });

    test('should return false when document does not have AddChildren permission', () => {
      const doc = { contextParameters: { permissions: ['Read'] } };
      expect(element._canCreateIn(doc)).to.be.false;
    });

    test('should return false when document is null', () => {
      expect(element._canCreateIn(null)).to.be.false;
    });

    test('should return false when contextParameters is missing', () => {
      const doc = {};
      expect(element._canCreateIn(doc)).to.be.false;
    });

    test('should return false when permissions is missing', () => {
      const doc = { contextParameters: {} };
      expect(element._canCreateIn(doc)).to.be.false;
    });
  });

  suite('_actionContext', () => {
    test('should return object with hostVisible and subtypes', () => {
      element.shortcutsVisible = true;
      element.subtypes = ['File', 'Note'];
      const context = element._actionContext();
      expect(context.hostVisible).to.be.true;
      expect(context.subtypes).to.deep.equal(['File', 'Note']);
    });

    test('should reflect shortcutsVisible as false', () => {
      element.shortcutsVisible = false;
      element.subtypes = [];
      const context = element._actionContext();
      expect(context.hostVisible).to.be.false;
      expect(context.subtypes).to.deep.equal([]);
    });
  });

  suite('_showShortcuts', () => {
    test('should set shortcutsVisible to true', () => {
      element.shortcutsVisible = false;
      element._showShortcuts();
      expect(element.shortcutsVisible).to.be.true;
    });
  });

  suite('_hideShortcuts', () => {
    test('should set shortcutsVisible to false', () => {
      element.shortcutsVisible = true;
      element._hideShortcuts();
      expect(element.shortcutsVisible).to.be.false;
    });
  });

  suite('_displayWizard', () => {
    test('should fire create-document when element is not hidden', () => {
      element.hidden = false;
      const fireSpy = sinon.spy(element, 'fire');
      const event = { preventDefault: sinon.spy(), detail: { type: 'File' } };
      element._displayWizard(event);
      expect(event.preventDefault).to.have.been.called;
      expect(fireSpy).to.have.been.calledWith('create-document', { type: 'File' });
    });

    test('should not fire create-document when element is hidden', () => {
      element.hidden = true;
      const fireSpy = sinon.spy(element, 'fire');
      const event = { preventDefault: sinon.spy(), detail: {} };
      element._displayWizard(event);
      expect(event.preventDefault).to.have.been.called;
      expect(fireSpy).to.not.have.been.called;
    });
  });

  suite('_animateOpen', () => {
    test('should return open when shortcutsVisible is true', () => {
      element.shortcutsVisible = true;
      expect(element._animateOpen()).to.equal('open');
    });

    test('should return empty string when shortcutsVisible is false', () => {
      element.shortcutsVisible = false;
      expect(element._animateOpen()).to.equal('');
    });
  });

  suite('_parentChanged', () => {
    test('should filter subtypes based on permissions and HiddenInCreation facet', () => {
      element.parent = {
        contextParameters: {
          permissions: ['AddChildren'],
          subtypes: [
            { type: 'File', facets: [] },
            { type: 'Hidden', facets: ['HiddenInCreation'] },
            { type: 'Note', facets: [] },
          ],
        },
      };
      element._parentChanged();
      expect(element.subtypes).to.deep.equal(['file', 'note']);
    });

    test('should set empty subtypes when no AddChildren permission', () => {
      element.parent = {
        contextParameters: {
          permissions: ['Read'],
          subtypes: [{ type: 'File', facets: [] }],
        },
      };
      element._parentChanged();
      expect(element.subtypes).to.deep.equal([]);
    });

    test('should call defaultDoc.get when parent lacks contextParameters', () => {
      const getStub = sinon.stub(element.$.defaultDoc, 'get');
      element.parent = { path: '/some/path' };
      element._parentChanged();
      expect(getStub).to.have.been.called;
    });

    test('should do nothing when parent is null', () => {
      const getStub = sinon.stub(element.$.defaultDoc, 'get');
      element.parent = null;
      element._parentChanged();
      expect(getStub).to.not.have.been.called;
    });
  });
});

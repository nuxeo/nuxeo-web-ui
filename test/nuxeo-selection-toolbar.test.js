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
import '../elements/nuxeo-selection/nuxeo-selection-toolbar.js';

suite('nuxeo-selection-toolbar', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-selection-toolbar></nuxeo-selection-toolbar>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default hidden to true when no items are selected', () => {
      expect(element.hidden).to.be.true;
    });

    test('should default selectAllActive to false', () => {
      expect(element.selectAllActive).to.be.false;
    });

    test('should default selectedItems to empty array', () => {
      expect(element.selectedItems).to.deep.equal([]);
    });

    test('should default _isDisplayToolbar to false', () => {
      expect(element._isDisplayToolbar).to.be.false;
    });

    test('should default lastInputKeyboard to false', () => {
      expect(element.lastInputKeyboard).to.be.false;
    });
  });

  suite('_observeSelectedItems', () => {
    test('should set hidden to true when selectedItems is empty', () => {
      element.selectedItems = [];
      element._observeSelectedItems();
      expect(element.hidden).to.be.true;
    });

    test('should set hidden to false when selectedItems has items', () => {
      element.selectedItems = [{ uid: '1' }];
      element._observeSelectedItems();
      expect(element.hidden).to.be.false;
    });

    test('should set hidden to true when selectedItems is null', () => {
      element.selectedItems = null;
      element._observeSelectedItems();
      expect(element.hidden).to.be.true;
    });
  });

  suite('_computeShortcutHint', () => {
    test('should return a string hint', () => {
      const result = element._computeShortcutHint();
      expect(result).to.be.a('string');
    });
  });

  suite('clearSelection', () => {
    test('should fire clear-selected-items event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      const e = { preventDefault: sinon.spy() };
      element.clearSelection(e);
      expect(fireSpy).to.have.been.calledWith('clear-selected-items');
      expect(e.preventDefault).to.have.been.called;
    });
  });

  suite('toogleSelectedItemsPopup', () => {
    test('should call preventDefault on event', () => {
      const e = { preventDefault: sinon.spy(), currentTarget: { focus: sinon.spy() } };
      element.toogleSelectedItemsPopup(e);
      expect(e.preventDefault).to.have.been.called;
    });

    test('should store last focused element', () => {
      const target = { focus: sinon.spy() };
      const e = { preventDefault: sinon.spy(), currentTarget: target };
      element.toogleSelectedItemsPopup(e);
      expect(element._lastFocused).to.equal(target);
    });
  });

  suite('keyboard tracking', () => {
    test('should set lastInputKeyboard to true on keydown', () => {
      element.lastInputKeyboard = false;
      element._onKeydown();
      expect(element.lastInputKeyboard).to.be.true;
    });

    test('should set lastInputKeyboard to false on mousedown', () => {
      element.lastInputKeyboard = true;
      element._onMousedown();
      expect(element.lastInputKeyboard).to.be.false;
    });

    test('should set lastInputKeyboard to false on touchstart', () => {
      element.lastInputKeyboard = true;
      element._onTouchstart();
      expect(element.lastInputKeyboard).to.be.false;
    });
  });
});

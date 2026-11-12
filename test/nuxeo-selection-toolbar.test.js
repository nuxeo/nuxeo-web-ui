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

  // WEBUI-2411: a detached toolbar must not leave listeners on `document`, otherwise it (and the whole
  // view it belongs to, through `__dataHost`) is retained in memory.
  suite('document listeners lifecycle', () => {
    let operations;

    // Replays add/remove calls in the order they happened, so a removal can only cancel an earlier
    // registration and never hides one made after it.
    const netListeners = () => {
      const active = {};
      operations.forEach(([operation, type, handler]) => {
        active[type] = active[type] || new Set();
        if (operation === 'add') {
          active[type].add(handler);
        } else {
          active[type].delete(handler);
        }
      });
      return Object.keys(active)
        .filter((type) => active[type].size > 0)
        .sort();
    };

    setup(() => {
      operations = [];
      sinon.stub(document, 'addEventListener').callsFake(function (type, handler, ...rest) {
        operations.push(['add', type, handler]);
        return EventTarget.prototype.addEventListener.call(this, type, handler, ...rest);
      });
      sinon.stub(document, 'removeEventListener').callsFake(function (type, handler, ...rest) {
        operations.push(['remove', type, handler]);
        return EventTarget.prototype.removeEventListener.call(this, type, handler, ...rest);
      });
    });

    teardown(() => {
      document.addEventListener.restore();
      document.removeEventListener.restore();
    });

    test('should remove every listener it added on document when detached', () => {
      const toolbar = document.createElement('nuxeo-selection-toolbar');
      document.body.appendChild(toolbar);
      expect(netListeners()).to.include.members(['keydown', 'mousedown', 'touchstart', 'i18n-locale-loaded']);

      toolbar.remove();

      expect(netListeners()).to.deep.equal([]);
    });

    test('should not accumulate listeners across repeated attach/detach cycles', () => {
      const toolbar = document.createElement('nuxeo-selection-toolbar');
      for (let i = 0; i < 3; i++) {
        document.body.appendChild(toolbar);
        expect(netListeners(), `cycle ${i} attached`).to.include.members(['keydown', 'mousedown', 'touchstart']);
        toolbar.remove();
        expect(netListeners(), `cycle ${i} detached`).to.deep.equal([]);
      }
    });

    test('should not react to the Ctrl/Cmd + . shortcut once detached', () => {
      // the suite-level fixture is still attached and would handle the shortcut itself
      element.remove();
      const toolbar = document.createElement('nuxeo-selection-toolbar');
      document.body.appendChild(toolbar);
      toolbar.remove();
      const evt = new KeyboardEvent('keydown', {
        key: '.',
        code: 'Period',
        ctrlKey: true,
        metaKey: true,
        cancelable: true,
      });
      document.dispatchEvent(evt);
      expect(evt.defaultPrevented).to.be.false;
    });
  });
});

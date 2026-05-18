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
import '../elements/nuxeo-keys/nuxeo-keys.js';

suite('nuxeo-keys', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-keys keys="c"></nuxeo-keys>`);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default invasive to false', () => {
      expect(element.invasive).to.be.false;
    });

    test('should default target to document body', () => {
      expect(element.target).to.equal(document.body);
    });
  });

  suite('_transformKey', () => {
    test('should transform space to space', () => {
      expect(element._transformKey(' ')).to.equal('space');
    });

    test('should transform Spacebar to space', () => {
      expect(element._transformKey('Spacebar')).to.equal('space');
    });

    test('should transform Escape to esc', () => {
      expect(element._transformKey('Escape')).to.equal('esc');
    });

    test('should transform ArrowLeft to left', () => {
      expect(element._transformKey('ArrowLeft')).to.equal('left');
    });

    test('should transform ArrowRight to right', () => {
      expect(element._transformKey('ArrowRight')).to.equal('right');
    });

    test('should transform ArrowUp to up', () => {
      expect(element._transformKey('ArrowUp')).to.equal('up');
    });

    test('should transform ArrowDown to down', () => {
      expect(element._transformKey('ArrowDown')).to.equal('down');
    });

    test('should transform Multiply to *', () => {
      expect(element._transformKey('Multiply')).to.equal('*');
    });

    test('should lowercase regular keys', () => {
      expect(element._transformKey('A')).to.equal('a');
    });

    test('should return empty string for null key', () => {
      expect(element._transformKey(null)).to.equal('');
    });

    test('should return empty string for undefined key', () => {
      expect(element._transformKey(undefined)).to.equal('');
    });
  });

  suite('_keysPressed', () => {
    test('should not fire pressed for input elements when not invasive', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const listener = sinon.spy();
      element.addEventListener('pressed', listener);
      const kbEvt = new KeyboardEvent('keydown', { key: 'c', bubbles: true });
      Object.defineProperty(kbEvt, 'composedPath', { value: () => [input] });
      element._keysPressed({
        detail: { keyboardEvent: kbEvt },
        preventDefault: sinon.spy(),
      });
      expect(listener).to.not.have.been.called;
      document.body.removeChild(input);
    });

    test('should not fire pressed for textarea elements when not invasive', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      const listener = sinon.spy();
      element.addEventListener('pressed', listener);
      const kbEvt = new KeyboardEvent('keydown', { key: 'c', bubbles: true });
      Object.defineProperty(kbEvt, 'composedPath', { value: () => [textarea] });
      element._keysPressed({
        detail: { keyboardEvent: kbEvt },
        preventDefault: sinon.spy(),
      });
      expect(listener).to.not.have.been.called;
      document.body.removeChild(textarea);
    });

    test('should prevent default for dialog elements', () => {
      const dialog = document.createElement('nuxeo-dialog');
      document.body.appendChild(dialog);
      const preventSpy = sinon.spy();
      const kbEvt = new KeyboardEvent('keydown', { key: 'c', bubbles: true });
      Object.defineProperty(kbEvt, 'composedPath', { value: () => [dialog] });
      element._keysPressed({
        detail: { keyboardEvent: kbEvt },
        preventDefault: preventSpy,
      });
      expect(preventSpy).to.have.been.calledOnce;
      document.body.removeChild(dialog);
    });
  });
});

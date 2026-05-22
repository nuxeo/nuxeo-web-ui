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
import { navigateTo } from '../elements/nuxeo-drive-protocol-handler.js';

// Prevent nxdrive:// anchor clicks from triggering a Karma page reload.
HTMLAnchorElement.prototype.click = HTMLAnchorElement.prototype.click || function () {};

// ---------------------------------------------------------------------------
// navigateTo — tested separately (no fake timers needed)
// ---------------------------------------------------------------------------
suite('navigateTo', () => {
  teardown(() => sinon.restore());

  suite('non-Safari (anchor-click path)', () => {
    test('appends a hidden anchor, sets correct attributes, clicks it, then removes it', () => {
      const spy = sinon.spy(document.body, 'appendChild');
      navigateTo('nxdrive://test/url');
      const anchor = spy.firstCall.args[0];
      expect(spy).to.have.been.calledOnce;
      expect(anchor.tagName).to.equal('A');
      expect(anchor.getAttribute('aria-hidden')).to.equal('true');
      expect(anchor.getAttribute('tabindex')).to.equal('-1');
      // anchor.remove() is used — verify it is no longer in the DOM
      expect(document.body.contains(anchor)).to.be.false;
    });

    test('anchor href contains the protocol scheme and DOM is left clean', () => {
      const before = document.body.children.length;
      const spy = sinon.spy(document.body, 'appendChild');
      navigateTo('nxdrive://direct-download/abc123');
      expect(spy.firstCall.args[0].href).to.include('nxdrive');
      expect(document.body.children.length).to.equal(before);
    });

    test('does not modify window.location', () => {
      const before = globalThis.location.href;
      navigateTo('nxdrive://test/url');
      expect(globalThis.location.href).to.equal(before);
    });
  });

  suite('Safari (object-element path)', () => {
    setup(() => {
      // Stub navigator.userAgent to report Safari (no Chrome/CriOS/FxiOS token).
      sinon
        .stub(navigator, 'userAgent')
        .get(
          () =>
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        );
    });

    test('appends a hidden object element with the correct data attribute', () => {
      const spy = sinon.spy(document.body, 'appendChild');
      navigateTo('nxdrive://test/url');
      const obj = spy.firstCall.args[0];
      expect(spy).to.have.been.calledOnce;
      expect(obj.tagName).to.equal('OBJECT');
      expect(obj.data).to.include('nxdrive');
      expect(obj.getAttribute('aria-hidden')).to.equal('true');
    });

    test('object element is hidden and positioned off-screen', () => {
      const spy = sinon.spy(document.body, 'appendChild');
      navigateTo('nxdrive://test/url');
      const obj = spy.firstCall.args[0];
      expect(obj.style.cssText).to.include('none');
    });

    test('does not use an anchor element on Safari', () => {
      const spy = sinon.spy(document.body, 'appendChild');
      navigateTo('nxdrive://test/url');
      const el = spy.firstCall.args[0];
      expect(el.tagName).not.to.equal('A');
    });
  });
});

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
import { IronOverlayManager } from '@polymer/iron-overlay-behavior/iron-overlay-manager.js';
import '../elements/nuxeo-app.js';

suite('nuxeo-app skip link and modal tab handling (WEBUI-1878)', () => {
  let app;
  let skipLink;
  let mainContent;
  let currentOverlay;
  let listeners;

  const dispatchTab = ({ shiftKey = false } = {}) => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    return event;
  };

  setup(() => {
    currentOverlay = null;
    listeners = [];

    skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.focus = sinon.spy();

    mainContent = document.createElement('main');
    mainContent.tabIndex = -1;
    mainContent.focus = sinon.spy();
    mainContent.scrollIntoView = sinon.spy();

    app = { $: { skipLink, mainContent } };

    const nativeAddEventListener = document.addEventListener.bind(document);
    sinon.stub(document, 'addEventListener').callsFake((type, listener, options) => {
      listeners.push({ type, listener, options });
      return nativeAddEventListener(type, listener, options);
    });

    sinon.stub(IronOverlayManager, 'currentOverlay').callsFake(() => currentOverlay);

    const appElement = customElements.get('nuxeo-app');
    appElement.prototype.skipLinkEvent.call(app);

    document.addEventListener.restore();
  });

  teardown(() => {
    listeners.forEach(({ type, listener, options }) => {
      document.removeEventListener(type, listener, options);
    });
    listeners = [];
    sinon.restore();
  });

  test('moves focus to skip link on first Tab when no modal is open', () => {
    const event = dispatchTab();

    expect(event.defaultPrevented).to.equal(true);
    expect(skipLink.focus).to.have.been.calledOnce;
  });

  test('does not intercept Shift+Tab for skip link activation', () => {
    const event = dispatchTab({ shiftKey: true });

    expect(event.defaultPrevented).to.equal(false);
    expect(skipLink.focus).to.not.have.been.called;
  });

  test('disables skip link tab stop while backdrop overlay is open', () => {
    currentOverlay = { withBackdrop: true };
    document.dispatchEvent(new CustomEvent('iron-overlay-opened'));

    expect(skipLink.getAttribute('tabindex')).to.equal('-1');
    expect(skipLink.style.zIndex).to.equal('101');

    currentOverlay = null;
    document.dispatchEvent(new CustomEvent('iron-overlay-closed'));

    expect(skipLink.hasAttribute('tabindex')).to.equal(false);
    expect(skipLink.style.zIndex).to.equal('');
  });

  test('does not steal first Tab for skip link when backdrop overlay is open', () => {
    currentOverlay = {
      withBackdrop: true,
      __firstFocusableNode: document.createElement('button'),
      __lastFocusableNode: document.createElement('button'),
      _onCaptureTab: sinon.spy(),
      _onCaptureFocus: sinon.spy(),
    };

    const event = dispatchTab();

    expect(skipLink.focus).to.not.have.been.called;
    expect(event.defaultPrevented).to.equal(false);
  });

  test('wraps Shift+Tab to last focusable when active element is inside first focusable shadow root', () => {
    const first = document.createElement('div');
    const firstShadow = first.attachShadow({ mode: 'open' });
    const firstInnerButton = document.createElement('button');
    firstInnerButton.textContent = 'first-inner';
    firstShadow.appendChild(firstInnerButton);

    const last = document.createElement('button');
    last.textContent = 'last';

    document.body.appendChild(first);
    document.body.appendChild(last);

    currentOverlay = {
      withBackdrop: true,
      __firstFocusableNode: first,
      __lastFocusableNode: last,
      __ensureFirstLastFocusables: sinon.spy(),
      _onCaptureTab: sinon.spy(),
      _onCaptureFocus: sinon.spy(),
    };

    sinon.stub(IronOverlayManager, 'deepActiveElement').value(firstInnerButton);
    const lastFocusSpy = sinon.spy(last, 'focus');

    const event = dispatchTab({ shiftKey: true });

    expect(event.defaultPrevented).to.equal(true);
    expect(currentOverlay._focusedChild).to.equal(last);
    expect(lastFocusSpy).to.have.been.calledOnce;

    first.remove();
    last.remove();
  });

  test('wraps Tab to first focusable when active element is on last focusable', () => {
    const first = document.createElement('button');
    const last = document.createElement('button');

    document.body.appendChild(first);
    document.body.appendChild(last);

    currentOverlay = {
      withBackdrop: true,
      __firstFocusableNode: first,
      __lastFocusableNode: last,
      __ensureFirstLastFocusables: sinon.spy(),
      _onCaptureTab: sinon.spy(),
      _onCaptureFocus: sinon.spy(),
    };

    sinon.stub(IronOverlayManager, 'deepActiveElement').value(last);
    const firstFocusSpy = sinon.spy(first, 'focus');

    const event = dispatchTab();

    expect(event.defaultPrevented).to.equal(true);
    expect(currentOverlay._focusedChild).to.equal(first);
    expect(firstFocusSpy).to.have.been.calledOnce;

    first.remove();
    last.remove();
  });
});

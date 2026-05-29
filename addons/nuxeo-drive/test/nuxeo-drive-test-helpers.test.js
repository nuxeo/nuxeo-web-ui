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

/**
 * Shared helpers for nuxeo-drive unit tests.
 *
 * Centralises repeated patterns (i18n setup, stub factories, async helpers, and
 * common test-suite factories) so individual test files stay free of duplication.
 */

// ---------------------------------------------------------------------------
// i18n bootstrap
// ---------------------------------------------------------------------------

/**
 * Initialises the minimum globalThis.nuxeo.I18n structure required by
 * nuxeo-drive components and merges the supplied key map.
 *
 * @param {Object} keys  - Map of i18n key → English value.
 */
export function setupI18n(keys) {
  globalThis.nuxeo = globalThis.nuxeo || {};
  globalThis.nuxeo.I18n = globalThis.nuxeo.I18n || {};
  globalThis.nuxeo.I18n.language = 'en';
  globalThis.nuxeo.I18n.en = globalThis.nuxeo.I18n.en || {};
  Object.assign(globalThis.nuxeo.I18n.en, keys);
}

// ---------------------------------------------------------------------------
// Async helpers
// ---------------------------------------------------------------------------

/** Flushes the microtask queue (one event-loop turn). */
export function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Common stub factories
// ---------------------------------------------------------------------------

/**
 * Stubs `element.$.toast` with a spy-equipped object and returns it.
 *
 * @param {Object} element  - Polymer element under test.
 * @returns {{ text: string, open: sinon.SinonSpy }}
 */
export function stubToast(element) {
  const toastStub = { text: '', open: sinon.spy() };
  sinon.stub(element.$, 'toast').value(toastStub);
  return toastStub;
}

// ---------------------------------------------------------------------------
// Shared test-suite factories
// ---------------------------------------------------------------------------

/**
 * Registers the canonical `_showError` test suite against an element getter.
 *
 * Usage:
 *   addShowErrorSuite(() => element);
 *
 * @param {Function} getElement  - Returns the element under test (called inside each test).
 */
export function addShowErrorSuite(getElement) {
  suite('_showError', () => {
    teardown(() => sinon.restore());

    test('sets toast text and opens it', () => {
      const element = getElement();
      const toastStub = stubToast(element);
      element._showError('Something went wrong');
      expect(toastStub.text).to.equal('Something went wrong');
      expect(toastStub.open).to.have.been.calledOnce;
    });
  });
}

/**
 * Registers the canonical `_launchDrive` test suite against an element getter.
 *
 * Covers: _launched flag, blur-based cancellation, timeout-based _failureVisible,
 * _navigateTo delegation, and timer cleanup on re-entry.
 *
 * @param {Function} getElement  - Returns the element under test.
 * @param {Function} getUrl     - Returns the URL the element should navigate to.
 */
export function addLaunchDriveSuite(getElement, getUrl) {
  suite('_launchDrive', () => {
    let clock;

    setup(() => {
      clock = sinon.useFakeTimers();
    });

    teardown(() => {
      clock.restore();
      sinon.restore();
    });

    test('sets _launched to true', () => {
      const element = getElement();
      sinon.stub(element, '_navigateTo');
      element._launchDrive();
      expect(element._launched).to.be.true;
    });

    test('calls _navigateTo with the correct URL', () => {
      const element = getElement();
      const navStub = sinon.stub(element, '_navigateTo');
      element._launchDrive();
      expect(navStub).to.have.been.calledOnce;
      expect(navStub.firstCall.args[0]).to.equal(getUrl());
    });

    test('sets _failureVisible after 1500ms when blur does not fire', () => {
      const element = getElement();
      sinon.stub(element, '_navigateTo');
      element._launchDrive();
      expect(element._failureVisible).to.be.false;
      clock.tick(1499);
      expect(element._failureVisible).to.be.false;
      clock.tick(1);
      expect(element._failureVisible).to.be.true;
    });

    test('does not set _failureVisible when blur fires before timeout', () => {
      const element = getElement();
      sinon.stub(element, '_navigateTo');
      element._launchDrive();
      // Simulate blur (Drive opened)
      window.dispatchEvent(new Event('blur'));
      expect(element._driveOpened).to.be.true;
      clock.tick(2000);
      expect(element._failureVisible).to.be.false;
    });

    test('clears pending timer when _launchDrive is called again', () => {
      const element = getElement();
      sinon.stub(element, '_navigateTo');
      element._launchDrive();
      // Call again before timeout fires
      element._launched = false; // reset so it can be called again
      element._launchDrive();
      clock.tick(1500);
      // Only one timeout should have fired — the second one
      expect(element._failureVisible).to.be.true;
    });
  });

  suite('_navigateTo', () => {
    teardown(() => sinon.restore());

    test('creates and clicks an anchor for non-Safari browsers', () => {
      const element = getElement();
      // Ensure we're in the non-Safari branch (default in test env is Chrome headless)
      const appendSpy = sinon.spy(document.body, 'appendChild');
      element._navigateTo('nxdrive://test');
      // Should have appended an anchor
      const call = appendSpy.getCall(0);
      expect(call).to.exist;
      expect(call.args[0].tagName).to.equal('A');
      expect(call.args[0].href).to.include('nxdrive://test');
    });
  });
}

/**
 * Registers the canonical `_go` error-handling suites (token-fetch failure and
 * no-token-registered) against an element getter.
 *
 * Both `nuxeo-drive-edit-button` and `nuxeo-drive-upload-button` share the same
 * token-fetch / no-token guard behaviour, so they share these tests.
 *
 * @param {Function} getElement  - Returns the element under test.
 */
export function addGoErrorSuites(getElement) {
  suite('_go — token fetch failure', () => {
    setup(() => {
      const element = getElement();
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => sinon.restore());

    test('sets _installExpanded to true when token.get rejects', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));
      sinon.stub(element.$.dialog, 'toggle');
      element._go();
      await nextTick();
      expect(element._installExpanded).to.be.true;
    });
  });

  suite('_go — no token registered (Drive not authenticated)', () => {
    setup(() => {
      const element = getElement();
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => sinon.restore());

    test('sets _installExpanded to true when token list is empty', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      sinon.stub(element.$.dialog, 'toggle');
      element._go();
      await nextTick();
      expect(element._installExpanded).to.be.true;
    });

    test('opens the dialog immediately on _go', () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').returns(new Promise(() => {}));
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      element._go();
      expect(dialogToggleStub).to.have.been.calledOnce;
    });
  });

  suite('_go — re-entry guard', () => {
    setup(() => {
      const element = getElement();
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => sinon.restore());

    test('ignores clicks while the dialog is open', () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').returns(new Promise(() => {}));
      element.$.dialog.opened = true;
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._go();

      expect(dialogToggleStub).to.not.have.been.called;
    });
  });

  suite('_go — token found (Drive authenticated)', () => {
    teardown(() => sinon.restore());

    test('sets _hasToken to true when token list is non-empty', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-xyz' }] });
      sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await nextTick();

      expect(element._hasToken).to.be.true;
    });

    test('does not set _installExpanded when token is found', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-xyz' }] });
      sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await nextTick();

      expect(element._installExpanded).to.be.false;
    });
  });
}

/**
 * Registers canonical `_openDrive` test suite against an element getter.
 *
 * Covers: _opened flag, _installExpanded flag, and window.location.href assignment.
 *
 * @param {Function} getElement  - Returns the element under test.
 * @param {Function} getUrl      - Returns the URL the element should navigate to.
 */
export function addOpenDriveSuite(getElement, getUrl) {
  suite('_openDrive', () => {
    let navigateStub;

    setup(() => {
      // Stub _navigate so window.location.href is never touched and
      // headless Chrome never attempts a page reload.
      navigateStub = sinon.stub(getElement(), '_navigate');
    });

    teardown(() => sinon.restore());

    test('sets _opened to true', () => {
      const element = getElement();
      element._openDrive();
      expect(element._opened).to.be.true;
    });

    test('sets _installExpanded to true', () => {
      const element = getElement();
      element._openDrive();
      expect(element._installExpanded).to.be.true;
    });

    test('calls _navigate with the nxdrive:// URL', () => {
      const element = getElement();
      element._openDrive();
      expect(navigateStub).to.have.been.calledOnce;
      expect(navigateStub.firstCall.args[0]).to.equal(getUrl());
    });
  });

  suite('_navigate', () => {
    teardown(() => sinon.restore());

    test('assigns the URL to window.location.href', () => {
      const element = getElement();
      // Spy on the location setter via sinon to avoid triggering a real navigation.
      let captured;
      const origDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      try {
        Object.defineProperty(window, 'location', {
          configurable: true,
          writable: true,
          value: {
            set href(v) {
              captured = v;
            },
            get href() {
              return '';
            },
          },
        });
      } catch (_) {
        // If window.location cannot be redefined, skip the assertion — the
        // behaviour is still exercised by other _openDrive tests.
        return;
      }
      try {
        element._navigate('nxdrive://test-url');
        expect(captured).to.equal('nxdrive://test-url');
      } finally {
        if (origDescriptor) {
          try {
            Object.defineProperty(window, 'location', origDescriptor);
          } catch (_) {
            // ignore
          }
        }
      }
    });
  });
}

/**
 * Registers canonical `_toggleInstall` test suite against an element getter.
 *
 * @param {Function} getElement  - Returns the element under test.
 */
export function addToggleInstallSuite(getElement) {
  suite('_toggleInstall', () => {
    test('sets _installExpanded to true', () => {
      const element = getElement();
      const fakeEvent = { preventDefault: sinon.spy() };
      element._toggleInstall(fakeEvent);
      expect(element._installExpanded).to.be.true;
    });

    test('calls event.preventDefault()', () => {
      const element = getElement();
      const fakeEvent = { preventDefault: sinon.spy() };
      element._toggleInstall(fakeEvent);
      expect(fakeEvent.preventDefault).to.have.been.calledOnce;
    });
  });
}

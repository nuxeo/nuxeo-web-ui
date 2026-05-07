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

/* global sinon, suite, setup, teardown, test, expect */

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
    let toastStub;

    setup(() => {
      const element = getElement();
      toastStub = stubToast(element);
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => sinon.restore());

    test('shows error toast when token.get rejects', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));
      element._go();
      await nextTick();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('error occurred');
    });

    test('does not open dialog when token.get rejects', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      element._go();
      await nextTick();
      expect(dialogToggleStub).to.not.have.been.called;
    });
  });

  suite('_go — no token registered (Drive not authenticated)', () => {
    let toastStub;

    setup(() => {
      const element = getElement();
      toastStub = stubToast(element);
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => sinon.restore());

    test('opens install dialog when token list is empty', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      element._go();
      await nextTick();
      expect(dialogToggleStub).to.have.been.calledOnce;
      expect(toastStub.open).to.not.have.been.called;
    });

    test('does not show error toast when token list is empty', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      sinon.stub(element.$.dialog, 'toggle');
      element._go();
      await nextTick();
      expect(toastStub.open).to.not.have.been.called;
    });
  });
}

/**
 * Registers the canonical `_openDriveUrl` wiring test against an element getter.
 *
 * Verifies that the element's `_openDriveUrl` delegates to the shared protocol
 * handler and wires the dialog toggle correctly.  The blur/debounce logic itself
 * is tested in nuxeo-drive-protocol-handler.test.js.
 *
 * @param {Function} getElement  - Returns the element under test.
 * @param {string}   sampleUrl   - A valid nxdrive:// URL for the element type.
 */
export function addOpenDriveUrlSuite(getElement, sampleUrl) {
  suite('_openDriveUrl', () => {
    teardown(() => sinon.restore());

    test('delegates to the shared openDriveUrl and passes dialog toggle as callback', () => {
      const element = getElement();
      const clock = sinon.useFakeTimers();
      try {
        element.$.dialog.toggle = element.$.dialog.toggle || function () {};
        const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
        expect(() => element._openDriveUrl(sampleUrl)).to.not.throw();
        clock.tick(1600);
        expect(dialogToggleStub).to.have.been.calledOnce;
      } finally {
        clock.restore();
      }
    });
  });
}
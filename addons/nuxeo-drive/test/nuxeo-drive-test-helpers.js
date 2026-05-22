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
      sinon.stub(element.$.dialog, 'toggle');
      element._go();
      await nextTick();
      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('error occurred');
    });
  });

  suite('_go — no token registered (Drive not authenticated)', () => {
    setup(() => {
      const element = getElement();
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => sinon.restore());

    test('sets _showInstall to true when token list is empty', async () => {
      const element = getElement();
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      sinon.stub(element.$.dialog, 'toggle');
      element._go();
      await nextTick();
      expect(element._showInstall).to.be.true;
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
}

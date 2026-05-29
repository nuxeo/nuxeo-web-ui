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

// Prevent nxdrive:// anchor clicks from triggering a Karma page reload.
// navigateAndShowFallback() creates an anchor and clicks it; this no-op
// stops the browser from actually following the custom-protocol link.
HTMLAnchorElement.prototype.click = function () {};

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

/**
 * Registers a test suite for the navigate-first `_go` method pattern.
 *
 * Covers: dialog opening, _installExpanded reset, and re-entry guard.
 *
 * @param {Function} getElement  - Returns the element under test.
 * @param {string}   goMethod   - Name of the go method (e.g. '_go' or '_download').
 */
export function addGoSuite(getElement, goMethod = '_go') {
  suite(`${goMethod} — navigate-first pattern`, () => {
    setup(() => {
      const element = getElement();
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => sinon.restore());

    test('opens the dialog', () => {
      const element = getElement();
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      element[goMethod]();
      expect(dialogToggleStub).to.have.been.calledOnce;
    });

    test('resets _installExpanded to false', () => {
      const element = getElement();
      sinon.stub(element.$.dialog, 'toggle');
      element._installExpanded = true;
      element[goMethod]();
      expect(element._installExpanded).to.be.false;
    });

    test('does not re-open the dialog when it is already open', () => {
      const element = getElement();
      element.$.dialog.opened = true;
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      element[goMethod]();
      expect(dialogToggleStub).to.not.have.been.called;
    });
  });
}

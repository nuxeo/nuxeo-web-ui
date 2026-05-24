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
 * Shared Mocha bootstrap for all unit tests (loaded first from test/load-all-tests.js).
 *
 * What this file does:
 * - Registers Chai, Sinon, and common globals (`expect`, `assert`, `should`) expected by legacy tests.
 * - In coverage runs only, runs a `suiteTeardown` hook that dynamically imports every path listed
 *   in `test/coverage-imports-data.js` (when `window.__coverage__` or `__NUXEO_COVERAGE_RUN__` is
 *   set). That forces modules never loaded by tests into the V8 report. Paths that fail to load get
 *   0% entries via `scripts/test/unit/inject-zero-coverage.js` after the run (Karma parity).
 *
 * Related files:
 * - `test/load-all-tests.js` — imports this module first, then every `*.test.js`.
 * - `scripts/test/unit/generate-coverage-imports.js` — regenerates `coverage-imports-data.js` (gitignored).
 * - `web-test-runner.config.mjs` — instruments app sources when `--coverage` is used.
 */

import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { coverageModulePaths } from './coverage-imports-data.js';

chai.config.includeStack = true;

chai.use(sinonChai);

// Globals previously provided by legacy Karma HTML test pages; many suites assume these exist.
globalThis.chai = chai;
globalThis.sinon = sinon;

// Sinon ≥ 11 rejects stubbing non-configurable accessors (common on Polymer / Nuxeo.Element:
// `i18n`, `navigateTo`, etc.). Shadow the property with a configurable own data property whose
// value is an anonymous `sinon.stub()` so existing patterns keep working:
// `sinon.stub(el, 'i18n').callsFake(fn)` and `const s = sinon.stub(el, 'navigateTo')`.
(function patchSinonStubForNonConfigurableProps() {
  const origStub = sinon.stub.bind(sinon);
  const isNonConfigurableStubError = (err) =>
    err instanceof TypeError &&
    (String(err.message).includes('non-configurable') || String(err.message).includes('non configurable'));

  sinon.stub = function stubPatched(obj, prop, ...rest) {
    if (rest.length > 0) {
      return origStub(obj, prop, ...rest);
    }
    try {
      return origStub(obj, prop);
    } catch (err) {
      if (!isNonConfigurableStubError(err) || obj == null || typeof prop !== 'string') {
        throw err;
      }
      const fake = sinon.stub();
      Object.defineProperty(obj, prop, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: fake,
      });
      const innerRestore = typeof fake.restore === 'function' ? fake.restore.bind(fake) : () => {};
      fake.restore = () => {
        try {
          delete obj[prop];
        } catch (_) {
          /* ignore */
        }
        innerRestore();
      };
      return fake;
    }
  };
})();

// Common assertion entry points used throughout the test suite.
globalThis.expect = chai.expect;
globalThis.assert = chai.assert;
globalThis.should = chai.should();

// Prevent stray async errors from killing the entire mocha run.
//
// Why: a few suites trigger fetches / Polymer observers whose async work resolves AFTER the
// triggering test has already passed (e.g. nuxeo-search-form's `visible change` test calls
// `_visibleChanged()` which fires real iron-ajax requests against /api/v1/...). When those
// requests reject as 404 / Aborted / Invalid json AFTER the test ends, the unhandled
// rejection / window error reaches mocha and the test runner, which can abort the run and
// treat it as complete. Result: the remaining tests in the offending suite (and
// every suite registered after it — selection-toolbar, suggester, tasks-list, vocabulary-
// management, workflow-*, etc.) never execute, the test count is artificially low, and
// coverage on those modules looks like 0%.
//
// The capture-phase listeners below intercept these events before mocha's listeners
// can see them. We log a short summary so genuine issues are still visible, but we stop
// propagation so the run keeps going and every registered suite gets to execute.
const _isBenignNuxeoNetworkFailure = (info) => {
  if (info == null) {
    return false;
  }
  const message = String(typeof info === 'object' && info.message != null ? info.message : info);
  const hasBenignMessage = message.includes('Invalid json') || message.includes('No message');
  if (!hasBenignMessage) {
    return false;
  }
  if (typeof info === 'object' && info.status != null) {
    return info.status === 404;
  }
  return message.includes('404');
};

const _logIgnoredAsyncFailure = (label, info) => {
  if (_isBenignNuxeoNetworkFailure(info)) {
    return;
  }
  const display = typeof info === 'object' && info.message != null ? info.message : info;
  // eslint-disable-next-line no-console
  console.warn(`[test-setup] ignoring stray ${label} after test boundary:`, display);
};

// Wrap ResizeObserver to defer notifications via requestAnimationFrame. Chrome occasionally
// dispatches "ResizeObserver loop completed with undelivered notifications" as an uncaught
// error during fixture rendering; mocha's hook runner treats that as a hook failure even
// though it is benign. Deferring callbacks one frame avoids the loop and the error.
if (typeof window.ResizeObserver === 'function') {
  const _OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class _SafeResizeObserver extends _OriginalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        if (typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (err) {
              _logIgnoredAsyncFailure('ResizeObserver', err);
            }
          });
        } else {
          try {
            callback(entries, observer);
          } catch (err) {
            _logIgnoredAsyncFailure('ResizeObserver', err);
          }
        }
      });
    }
  };
}

window.addEventListener(
  'unhandledrejection',
  (event) => {
    const reason = event.reason;
    _logIgnoredAsyncFailure('unhandledrejection', reason);
    event.stopImmediatePropagation();
    event.preventDefault();
  },
  true,
);

window.addEventListener(
  'error',
  (event) => {
    _logIgnoredAsyncFailure('error', event.error || event.message);
    event.stopImmediatePropagation();
    event.preventDefault();
  },
  true,
);

// Belt-and-braces: mocha's browser bundle installs a `window.onerror` IDL handler which is
// invoked even after `stopImmediatePropagation()` on the error event in some Chrome builds.
// Returning true here suppresses the default browser/mocha "uncaught" reporting.
const _previousOnError = window.onerror;
window.onerror = function _suppressedOnError(message, source, lineno, colno, error) {
  _logIgnoredAsyncFailure('window.onerror', error || message);
  if (typeof _previousOnError === 'function') {
    try {
      _previousOnError.call(this, message, source, lineno, colno, error);
    } catch (_) {
      /* ignore */
    }
  }
  return true;
};
const _previousOnRejection = window.onunhandledrejection;
window.onunhandledrejection = function _suppressedOnRejection(event) {
  const reason = event && event.reason;
  _logIgnoredAsyncFailure('window.onunhandledrejection', reason);
  if (typeof _previousOnRejection === 'function') {
    try {
      _previousOnRejection.call(this, event);
    } catch (_) {
      /* ignore */
    }
  }
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  return true;
};

// Restore leaked sinon fakes between every test.
//
// Why: several suites install `sinon.useFakeTimers()` / `sinon.useFakeXMLHttpRequest()` /
// `sinon.fakeServer.create()` and call `clock.restore()` (or equivalent) AFTER assertions. When
// an assertion fails, the restore line never runs and the global `setTimeout` / `Date` / `XHR`
// stay overridden. The very next test's `await login()` (or any other timer-bound async work)
// then hangs forever and mocha reports the hook as `Timeout of 3000ms exceeded`. Symptom: dozens
// of unrelated suites (vocabulary-management, suggester, tasks-list, workflow-*, …) report
// "before each hook" timeouts and contribute almost no coverage even though the suites run.
//
// This safety net runs after every test (TDD `teardown` registered at the root context) and
// disposes of any global sinon doubles that were left in place. Tests that restore correctly
// see no change; tests that leak get auto-cleaned so the next suite starts on a clean slate.
const _restoreLeakedSinonGlobals = () => {
  try {
    if (sinon.clock && typeof sinon.clock.restore === 'function') {
      sinon.clock.restore();
    }
  } catch (_) {
    /* ignore */
  }
  // Sinon ≥ 9 keeps a list of pending fakes on `sinon.timers` / `sinon.xhr`. The supported way
  // to restore everything is calling `sinon.restore()`, which only cleans up sandbox doubles.
  // Fall back to checking the most common globals.
  try {
    if (typeof setTimeout.clock !== 'undefined' && typeof setTimeout.clock.restore === 'function') {
      setTimeout.clock.restore();
    }
  } catch (_) {
    /* ignore */
  }
  try {
    if (window.XMLHttpRequest && window.XMLHttpRequest.restore) {
      window.XMLHttpRequest.restore();
    }
  } catch (_) {
    /* ignore */
  }
  try {
    sinon.restore();
  } catch (_) {
    /* ignore */
  }
};

if (typeof window.teardown === 'function') {
  window.teardown(_restoreLeakedSinonGlobals);
}

// Coverage-only: bulk-load all app element modules after every test has finished (see file header).
suiteTeardown(async function coverageMaterializationTeardown() {
  const coverageActive = typeof window.__coverage__ !== 'undefined' || globalThis.__NUXEO_COVERAGE_RUN__ === true;
  if (!coverageActive) {
    return;
  }

  if (!Array.isArray(coverageModulePaths) || coverageModulePaths.length === 0) {
    expect.fail(
      'test/coverage-imports-data.js has no paths. Run: node scripts/test/unit/generate-coverage-imports.js (or npm run update-coverage-imports).',
    );
  }

  this.timeout(0);
  const root = new URL('../', import.meta.url);
  const failures = [];

  // Istanbul (legacy Karma): skip paths already keyed in window.__coverage__ — re-importing through
  // a different instrumented URL wipes counters collected during tests.
  // Native V8 (Web Test Runner): ES module cache makes re-import a no-op for modules already loaded;
  // only modules never touched during tests are fetched here. Failures are logged and get 0% via
  // scripts/test/unit/inject-zero-coverage.js (same as Karma listing unloadable modules at 0%).
  const alreadyCovered =
    typeof window.__coverage__ !== 'undefined' ? new Set(Object.keys(window.__coverage__)) : new Set();
  const toLoad = coverageModulePaths.filter((p) => !alreadyCovered.has(p));

  await Promise.all(
    toLoad.map((p) => {
      const href = new URL(p, root).href;
      return import(href).catch((err) => {
        failures.push({ specifier: p, err });
      });
    }),
  );

  if (failures.length > 0) {
    const message = failures.map((f) => `${f.specifier}: ${f.err && f.err.message ? f.err.message : f.err}`).join('\n');
    // console.error so WTR filterBrowserLogs surfaces this in CI (warn is filtered unless WTR_VERBOSE=1).
    // eslint-disable-next-line no-console
    console.error(
      `coverage materialization: ${failures.length} of ${toLoad.length} modules failed to load (0% will be injected in lcov):\n${message}`,
    );
  }
});

/**
 * Web Test Runner configuration for Nuxeo Web UI unit tests (@web/test-runner + Mocha TDD).
 *
 * Important design choices (carried over from karma-esm):
 *
 * 1) Single test entry (`test/load-all-tests.js` only in `files`)
 *    Web Test Runner reports "1 test file" because it counts runner entry points, not Mocha suites.
 *    That file imports setup.js then every *.test.js (114 modules) in one static graph so Mocha
 *    registers all suites before the run completes. Do not glob all test files here — parallel
 *    loading can race and skip suites (the original Karma failure mode).
 *
 * 2) Coverage mode (`web-test-runner --coverage`, used by npm test)
 *    Uses Istanbul source instrumentation via rollup-plugin-istanbul (adapted with @web/dev-server-rollup's
 *    fromRollup()). This gives Karma-equivalent function-body coverage for Polymer's factory pattern.
 *    Native V8 instrumentation is disabled (`nativeInstrumentation: false`). After the run,
 *    `scripts/test/unit/inject-zero-coverage.js` adds 0% lcov records for manifest paths not loaded
 *    by any test (mirrors Karma skipFilesWithNoCoverage:false).
 *
 * Related: scripts/test/unit/generate-test-load-all.js, scripts/test/unit/generate-coverage-imports.js, test/setup.js.
 */
import { createRequire } from 'node:module';
import { chromeLauncher } from '@web/test-runner-chrome';
import { defaultReporter } from '@web/test-runner';
import { fromRollup } from '@web/dev-server-rollup';
import { nuxeoTestFallbackPlugin } from './scripts/test/unit/web-test-runner-fallback-plugin.mjs';

const require = createRequire(import.meta.url);
// Bundled Chromium matches puppeteer-core; system Chrome on CI runners often mismatches (see WEBUI-2038).
const puppeteer = require('puppeteer');

// Istanbul instrumentation via rollup-plugin-istanbul — gives Karma-equivalent function body coverage.
const rollupIstanbul = require('rollup-plugin-istanbul');
const istanbulPlugin = fromRollup(rollupIstanbul);

const chromeArgs = [
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-setuid-sandbox',
];

const verbose = process.env.WTR_VERBOSE === '1';

const coverageEnabled = process.argv.includes('--coverage');

/**
 * Wraps the default WTR reporter to suppress the built-in "Code coverage: X %" line.
 * Our inject-zero-coverage.js post-run script prints the authoritative number instead.
 */
function noCoverageSummaryReporter() {
  const inner = defaultReporter();
  return {
    ...inner,
    getTestProgress(args) {
      const lines = inner.getTestProgress(args);
      return lines.filter((line) => !/Code coverage:|coverage report at/.test(line));
    },
  };
}

/** App sources included in coverage reports (mirrors former karma coverage globs). */
const appSources = [
  'elements/**/*.js',
  'addons/**/elements/**/*.js',
  'themes/theme-config.js',
  'themes/loader.js',
  'themes/dark-theme-focus-ring.js',
];

export default {
  files: ['test/load-all-tests.js'],
  plugins: [
    nuxeoTestFallbackPlugin(),
    // Istanbul instrumentation (only when --coverage) — instruments app source files so function bodies
    // get accurate hit/miss counting (unlike V8 which inflates coverage for Polymer declarations).
    ...(coverageEnabled
      ? [
          istanbulPlugin({
            include: appSources,
            exclude: ['test/**', 'node_modules/**', '**/routing.js', 'addons/nuxeo-platform-3d/**'],
          }),
        ]
      : []),
  ],
  reporters: [noCoverageSummaryReporter()],
  nodeResolve: {
    exportConditions: ['browser', 'development', 'import', 'module', 'default'],
  },
  preserveSymlinks: true,
  concurrency: 1,
  concurrentBrowsers: 1,
  hostname: '127.0.0.1',
  testsStartTimeout: 180000,
  testsFinishTimeout: 900000,
  // Single entry imports 114 suite modules; dev-server transform + first page load can exceed 30s in CI.
  browserStartTimeout: 120000,
  coverage: coverageEnabled,
  coverageConfig: coverageEnabled
    ? {
        report: true,
        reportDir: 'coverage',
        reporters: ['html', 'lcov'],
        nativeInstrumentation: false, // Use Istanbul instrumentation (via rollup-plugin-istanbul) instead of V8
        include: appSources,
        exclude: [
          // Dev server serves Polymer .html imports as *.html.js; those paths do not exist on disk.
          '**/*.html.js',
          'addons/nuxeo-platform-3d/**',
          'elements/routing.js',
        ],
      }
    : undefined,
  // Default framework path is autorun.js (imports the test module and calls mocha.run).
  // Do not point at standalone.js — it never executes tests on its own.
  testFramework: {
    config: {
      ui: 'tdd',
      timeout: 3000,
    },
  },
  browsers: [
    chromeLauncher({
      puppeteer,
      launchOptions: {
        args: chromeArgs,
      },
    }),
  ],
  // Always collect browser logs; filterBrowserLogs decides what reaches CI output (see test/setup.js).
  browserLogs: true,
  filterBrowserLogs: (log) => {
    if (verbose) {
      return true;
    }
    // Stringify so we can match against object args (e.g. `{ message: 'No message', status: 404 }`)
    // that `String(obj)` would otherwise turn into `[object Object]`.
    const text = (log.args || [])
      .map((arg) => {
        if (arg == null) return String(arg);
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch (_) {
          return String(arg);
        }
      })
      .join(' ');
    if (text.includes('Promise outside a test')) {
      return false;
    }
    // Benign nuxeo-client 404 / 500 / abort noise from async work that resolves after a test ends.
    if (/Invalid json|No message|Not Found/.test(text) && /\b404\b/.test(text)) {
      return false;
    }
    // Object dumps like `{ status: 404 }` / `{ status: 500 }` / `{ message: 'No message', status: 404 }`
    // emitted by nuxeo-client failure handlers — no useful signal in the test output.
    if (/^\{[^{}]*"status":\s*\d{3}[^{}]*\}\s*$/.test(text.trim())) {
      return false;
    }
    // Bare `Error: Not Found` stacks from the nuxeo client's internal `_callFetch` (nuxeo.js:1901)
    // — emitted whenever a 404 rejects the request, regardless of whether status is in the message.
    if (/Error: Not Found/.test(text) && /node_modules\/nuxeo\/nuxeo\.js/.test(text)) {
      return false;
    }
    if (/AbortError\b|: Aborted\b/.test(text)) {
      return false;
    }
    // Stray TypeError / DOMException stacks from observers firing on detached fixtures or on
    // post-teardown async work. These are caught by capture-phase listeners in test/setup.js,
    // but Chromium still surfaces the stack via console — drop the well-known offenders.
    if (
      /nuxeo-tree-node\.js|nuxeo-document-task\.js|nuxeo-path-suggestion\.js|nuxeo-dropzone\.js|nuxeo-document-preview\.js|nuxeo-search-form\.js/.test(
        text,
      ) &&
      /TypeError|Cannot read properties/.test(text)
    ) {
      return false;
    }
    if (/\[name=\]' is not a valid selector/.test(text)) {
      return false;
    }
    if (/cannot resolve route: object does not have an "entity-type"/.test(text)) {
      return false;
    }
    return log.type === 'error';
  },
};

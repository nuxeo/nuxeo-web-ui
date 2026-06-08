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
 *    Uses native Chromium coverage (fast). `test/setup.js` bulk-imports uncovered modules in
 *    suiteTeardown when coverage is active. `scripts/test/unit/inject-zero-coverage.js` then adds 0%
 *    lcov records for manifest paths still missing (mirrors Karma skipFilesWithNoCoverage:false).
 *
 * Related: scripts/test/unit/generate-test-load-all.js, scripts/test/unit/generate-coverage-imports.js, test/setup.js.
 */
import { createRequire } from 'node:module';
import { chromeLauncher } from '@web/test-runner-chrome';
import { nuxeoTestFallbackPlugin } from './scripts/test/unit/web-test-runner-fallback-plugin.mjs';

const require = createRequire(import.meta.url);
// Bundled Chromium matches puppeteer-core; system Chrome on CI runners often mismatches (see WEBUI-2038).
const puppeteer = require('puppeteer');

const chromeArgs = [
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-setuid-sandbox',
];

const verbose = process.env.WTR_VERBOSE === '1';

const coverageEnabled = process.argv.includes('--coverage');

/** App sources included in coverage reports (mirrors former karma coverage globs). */
const appSources = ['elements/**/*.js', 'addons/**/elements/**/*.js'];

export default {
  files: ['test/load-all-tests.js'],
  plugins: [nuxeoTestFallbackPlugin()],
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
        reporters: ['html', 'lcov', 'text-summary'],
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
    const text = (log.args || []).map(String).join(' ');
    if (text.includes('Promise outside a test')) {
      return false;
    }
    if (/Invalid json|No message/.test(text) && text.includes('404')) {
      return false;
    }
    return log.type === 'error';
  },
};

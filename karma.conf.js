/**
 * Karma configuration for Nuxeo Web UI unit tests (@open-wc/karma-esm + Mocha).
 *
 * Important design choices:
 *
 * 1) Single test entry (`test/load-all-tests.js` only in `files`)
 *    Karma+ESM can otherwise load many test modules in parallel; Mocha may call `__karma__.loaded()`
 *    before every suite is registered, so some tests never run. The generated barrel imports
 *    `setup.js` then every `*.test.js` in one static graph. Do not add separate test file globs here.
 *
 * 2) Coverage mode (`karma start --coverage`)
 *    - Serves the element source globs defined in coverageSourceFiles as modules (not executed as scripts)
 *      so dynamic imports from `test/setup.js` can resolve.
 *    - `esm.compatibility: 'always'` runs sources through Babel so Istanbul instruments them
 *      (native ESM in Chrome can skip instrumentation otherwise).
 *    - `skipFilesWithNoCoverage: false` keeps files with zero hits visible in reports.
 *    - Bulk import of all element modules happens in `test/setup.js` `suiteTeardown`, not here.
 *
 * Related: `scripts/generate-test-load-all.js`, `scripts/generate-coverage-imports.js`, `test/setup.js`.
 */
const path = require('path');

const coverage = process.argv.find((arg) => arg.includes('coverage'));
// When instrumenting, Karma must be able to fetch any element URL that setup.js imports dynamically.
const coverageSourceFiles = coverage
  ? [
      {
        pattern: 'elements/**/*.js',
        type: 'module',
        included: false,
        watched: false,
      },
      {
        pattern: 'addons/**/elements/**/*.js',
        type: 'module',
        included: false,
        watched: false,
      },
    ]
  : [];

const reporters = coverage ? ['mocha', 'coverage-istanbul'] : ['mocha'];

let customLaunchers = {
  ChromeHeadlessNoSandbox: {
    base: 'ChromeHeadless',
    flags: ['--disable-gpu', '--no-sandbox'],
  },
};

module.exports = (config) => {
  // Single module entry (see test/load-all-tests.js) loads every suite in one graph before
  // __karma__.loaded(). Do not add separate test globs here — that reintroduces parallel races.

  config.set({
    hostname: '127.0.0.1',
    basePath: '',
    singleRun: true,
    browsers: config.browsers && config.browsers.length > 0 ? config.browsers : Object.keys(customLaunchers),
    browserDisconnectTimeout: 10 * 1000,
    browserDisconnectTolerance: 1,
    browserNoActivityTimeout: 5 * 60 * 1000,
    customLaunchers,
    middleware: ['static'],
    static: {
      path: path.join(process.cwd(), ''),
    },
    files: [
      ...coverageSourceFiles,
      {
        pattern: 'test/load-all-tests.js',
        type: 'module',
      },
    ],
    plugins: [
      // load plugin
      require.resolve('@open-wc/karma-esm'),

      // fallback: resolve any karma- plugins
      'karma-*',
    ],
    frameworks: ['esm', 'mocha', 'source-map-support'],
    esm: {
      // 'always' runs app sources through Babel so istanbul can record hits. With 'none',
      // modern browsers skip transforms and some modules (e.g. elements/performance.js) stay
      // effectively un-instrumented despite tests executing their logic.
      compatibility: coverage ? 'always' : 'none',
      // polyfills-loader hashes with crypto.createHash('md4'), which throws on Node 17+
      // (OpenSSL 3) unless NODE_OPTIONS=--openssl-legacy-provider. Unit tests use modern
      // Chrome only, so injecting the polyfills loader is unnecessary here.
      polyfillsLoader: false,
      coverage,
      // if you are using 'bare module imports' you will need this option
      nodeResolve: {
        // Dedupe all common packages to prevent duplicate registrations
        // when using symlinked packages (nuxeo-elements)
        dedupe: (importee) =>
          importee.startsWith('@polymer/') || importee.startsWith('@nuxeo/') || importee.startsWith('@webcomponents/'),
      },
      // needed for npm link or lerna support
      preserveSymlinks: true,
    },

    reporters,
    port: 9876,
    colors: true,
    browserConsoleLogOptions: {
      // Set KARMA_VERBOSE=1 to surface karma-esm "Error loading test file" in the terminal.
      level: process.env.KARMA_VERBOSE === '1' ? 'log' : 'error',
    },
    logLevel: config.LOG_WARN,
    /** Some errors come in JSON format with a message property. */
    formatError(error) {
      try {
        if (typeof error !== 'string') {
          return error;
        }
        const parsed = JSON.parse(error);
        if (typeof parsed !== 'object' || !parsed.message) {
          return error;
        }
        return parsed.message;
      } catch (_) {
        return error;
      }
    },

    coverageIstanbulReporter: {
      reports: ['html', 'lcovonly', 'text-summary'],
      dir: path.join(__dirname, 'coverage'),
      combineBrowserReports: true,
      skipFilesWithNoCoverage: false,
    },

    client: {
      useCoverage: Boolean(coverage),
      mocha: {
        reporter: 'html',
        ui: 'tdd',
        timeout: 3000,
        ...(config.grep ? { grep: config.grep } : {}),
      },
    },
  });
};

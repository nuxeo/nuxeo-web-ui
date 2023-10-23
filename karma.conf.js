const path = require('path');

const coverage = process.argv.find((arg) => arg.includes('coverage'));

const reporters = coverage ? ['mocha', 'coverage-istanbul'] : ['mocha'];

let customLaunchers = {
  ChromeHeadlessNoSandbox: {
    base: 'ChromeHeadless',
    flags: ['--disable-gpu', '--no-sandbox'],
  },
  FirefoxHeadless: {
    base: 'Firefox',
    flags: ['-headless'],
  },
};

if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
  customLaunchers = {
    sl_latest_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 10',
      version: 'latest',
    },
    sl_latest_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'Windows 10',
      version: 'latest',
    },
    sl_latest_edge: {
      base: 'SauceLabs',
      browserName: 'microsoftedge',
      platform: 'Windows 10',
      version: 'latest',
    },
    sl_latest_safari: {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'macOS 12',
      version: 'latest',
    },
  };

  reporters.push('saucelabs');
}

module.exports = (config) => {
  const sauceLabs = {};
  if (config.record) {
    sauceLabs.recordVideo = true;
  } else if (config.sauceRunName) {
    sauceLabs.testName = config.sauceRunName;
  }

  config.set({
    sauceLabs,
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
      {
        pattern: `test/*${config.grep || '*.test.js'}`,
        type: 'module',
      },
      {
        pattern: `addons/*/test/*${config.grep || '*.test.js'}`,
        type: 'module',
      },
    ],
    plugins: [
      // load plugin
      require.resolve('@open-wc/karma-esm'),

      // fallback: resolve any karma- plugins
      'karma-*',
    ],
    frameworks: ['esm', 'mocha', 'sinon-chai', 'source-map-support'],
    esm: {
      // prevent auto loading of polyfills
      compatibility: 'none',
      coverage,
      // if you are using 'bare module imports' you will need this option
      nodeResolve: true,
      // needed for npm link or lerna support
      preserveSymlinks: true,
    },

    reporters,
    port: 9876,
    colors: true,
    browserConsoleLogOptions: {
      level: 'error',
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
      skipFilesWithNoCoverage: true,
    },

    client: {
      mocha: {
        reporter: 'html',
        ui: 'tdd',
        timeout: 3000,
      },
      chai: {
        includeStack: true,
      },
    },
  });
};

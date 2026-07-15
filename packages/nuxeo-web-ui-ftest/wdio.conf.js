import { fileURLToPath } from 'url';
import path from 'path';
import chai from 'chai';

import http from 'http';
import https from 'https';
import htmlReporter from 'multiple-cucumber-html-reporter';
import CompatService from './wdio-compat-plugin.js';
import ShadowService from './wdio-shadow-plugin.js';

/*
 * Workaround for node-fetch v2 "Premature close" errors on Node >= 19 (CI runs Node 22).
 * Since Node 19 the global HTTP/HTTPS agents enable keep-alive by default, so the node-fetch
 * used by the Nuxeo REST client in step hooks reuses a pooled socket the server has already
 * closed, which surfaces as `FetchError: ... Premature close`. Forcing keep-alive off makes
 * each request open a fresh socket.
 */
[http.globalAgent, https.globalAgent].forEach((agent) => {
  agent.keepAlive = false;
  agent.options.keepAlive = false;
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cucumberRequires = [path.join(__dirname, 'features/step_definitions/**/*.js')];
if (process.env.CUCUMBER_REQUIRES) {
  cucumberRequires.push(process.env.CUCUMBER_REQUIRES);
}

const reporters = ['spec'];

const _workerStartTimes = new Map();
const _featureResults = [];
let _sessionCid;

if (process.env.CUCUMBER_REPORT_PATH) {
  reporters.push([
    'cucumberjs-json',
    {
      jsonFolder: process.env.CUCUMBER_REPORT_PATH,
    },
  ]);
}

const capability = {
  // maxInstances can get overwritten per capability. So if you have an in-house Selenium
  // grid with only 5 firefox instance available you can make sure that not more than
  // 5 instance gets started at a time.
  maxInstances: 1,
  browserName: process.env.BROWSER,
  acceptInsecureCerts: true,
  // Let WebdriverIO's built-in driver manager provision the browser and its matching driver
  // (e.g. Chrome-for-Testing + chromedriver, or Firefox + geckodriver) rather than a hard-pinned
  // build. Defaults to the current stable channel; override via BROWSER_VERSION with an explicit
  // version or a channel name (e.g. 'beta'/'dev'/'canary') when a specific build is required.
  browserVersion: process.env.BROWSER_VERSION || 'stable',
  'wdio:enforceWebDriverClassic': true,
  // Prevent ChromeDriver from auto-dismissing native dialogs (window.confirm, window.alert)
  // so that tests can explicitly accept/dismiss them via alertAccept/alertDismiss.
  unhandledPromptBehavior: 'ignore',
};

const options = {};

switch (capability.browserName) {
  case 'chrome':
    options.args = [
      '--no-sandbox', // required in CI containers
      '--disable-infobars',
      '--disable-notifications',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-field-trial-config',
      '--disable-ipc-flooding-protection',
      '--disable-hang-monitor',
    ];

    if (process.env.HEADLESS === 'true') {
      options.args.push('--window-size=1920,1080');
      options.args.push('--headless=new');
      options.args.push('--disable-gpu');
      options.args.push('--disable-dev-shm-usage');
    }
    if (process.env.BROWSER_BINARY) {
      options.binary = process.env.BROWSER_BINARY;
    }
    capability['goog:chromeOptions'] = {
      ...options,
      prefs: {
        profile: {
          password_manager_leak_detection: false,
          default_content_setting_values: {
            notifications: 2,
          },
        },
      },
    };
    break;
  case 'firefox':
    options.args = [
      // '-headless',
    ];

    if (process.env.BROWSER_BINARY) {
      options.binary = process.env.BROWSER_BINARY;
    }
    capability['moz:firefoxOptions'] = options;
    break;
  case 'safari':
    capability['safari.options'] = {
      technologyPreview: false,
    };
    break;
  // no default
}

const TIMEOUT = process.env.TIMEOUT ? Number(process.env.TIMEOUT) : 40000;

// transform nuxeo-web-ui-ftest requires
import('@babel/register').then(({ default: register }) => {
  register({
    presets: [
      [
        '@babel/env',
        {
          targets: {
            node: 'current',
          },
        },
      ],
    ],
    ignore: [/node_modules\/(?!@nuxeo\/nuxeo-web-ui-ftest)/],
    plugins: [['transform-rename-import', { original: '^cucumber$', replacement: '@cucumber/cucumber' }]],
  });
});

export const config = {
  //
  // ====================
  // Runner Configuration
  // ====================
  //
  // WebdriverIO allows it to run your tests in arbitrary locations (e.g. locally or
  // on a remote machine).
  runner: 'local',
  specs: [path.join(process.cwd(), './features/*.feature')],
  // check http://webdriver.io/guide/testrunner/debugging.html for more info on debugging with wdio
  debug: process.env.DEBUG,
  execArgv: process.env.DEBUG ? ['--inspect'] : [],

  //
  // ============
  // Capabilities
  // ============
  // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
  // time. Depending on the number of capabilities, WebdriverIO launches several test
  // sessions. Within your capabilities you can overwrite the spec and exclude options in
  // order to group specific specs to a specific capability.
  //
  // First, you can define how many instances should be started at the same time. Let's
  // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
  // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
  // files and you set maxInstances to 10, all spec files will get tested at the same time
  // and 30 processes will get spawned. The property handles how many capabilities
  // from the same test should run tests.
  //
  maxInstances: 1,
  //
  // If you have trouble getting all important capabilities together, check out the
  // Sauce Labs platform configurator - a great tool to configure your capabilities:
  // https://docs.saucelabs.com/reference/platforms-configurator
  //
  capabilities: [capability],
  //
  // ===================
  // Test Configurations
  // ===================
  // Define all options that are relevant for the WebdriverIO instance here
  //
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: 'error',
  //
  // Saves a screenshot to a given path if a command fails.
  // screenshotPath: '',
  //
  // Set a base URL in order to shorten url command calls. If your url parameter starts
  // with "/", then the base url gets prepended.
  baseUrl: process.env.NUXEO_WEB_UI_URL || process.env.NUXEO_URL || 'http://localhost:8080/nuxeo/',
  //
  // Default timeout for all waitFor* commands.
  waitforTimeout: TIMEOUT,

  waitforInterval: 250,
  //
  // Default timeout in milliseconds for request
  // if Selenium Grid doesn't send response
  connectionRetryTimeout: 90000,
  //
  // Default request retries count
  connectionRetryCount: 3,

  bail: process.env.BAIL ? Number(process.env.BAIL) : 0,
  //
  // The number of times to retry the entire spec file when it fails as a whole.
  // This handles transient ChromeDriver/Chrome crashes (e.g. UND_ERR_CLOSED) that kill
  // the worker process — each retry gets a fresh browser session.
  specFileRetries: 1,
  // Run retried spec files after all others have completed, giving the system
  // time to recover from resource pressure that may have caused the crash.
  specFileRetriesDeferred: true,
  //
  // Initialize the browser instance with a WebdriverIO plugin. The object should have the
  // plugin name as key and the desired plugin options as properties. Make sure you have
  // the plugin installed before running any tests. The following plugins are currently
  // available:
  // WebdriverCSS: https://github.com/webdriverio/webdrivercss
  // WebdriverRTC: https://github.com/webdriverio/webdriverrtc
  // Browserevent: https://github.com/webdriverio/browserevent
  plugins: {},
  //
  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  services: [[CompatService], [ShadowService]],

  //
  // Framework you want to run your specs with.
  // The following are supported: Mocha, Jasmine, and Cucumber
  // see also: http://webdriver.io/guide/testrunner/frameworks.html
  //
  // Make sure you have the wdio adapter package for the specific framework installed
  // before running any tests.
  framework: 'cucumber',
  //
  // Test reporter for stdout.
  reporters,

  //
  // If you are using Cucumber you need to specify the location of your step definitions.
  cucumberOpts: {
    // <string[]> (file/dir) require files before executing features
    require: cucumberRequires,
    // <boolean> show full backtrace for errors
    backtrace: true,
    // <string[]> ("extension:module") require files with the given EXTENSION after requiring MODULE (repeatable)
    requireModule: ['@babel/register'],
    // <boolean> invoke formatters without executing steps
    dryRun: false,
    failAmbiguousDefinitions: true,
    // <boolean> abort the run on first failure
    failFast: !process.env.RUN_ALL,
    // <string[]> (type[:path]) specify the output format, optionally supply PATH
    // to redirect formatter output (repeatable)
    format: ['pretty'],
    // <boolean> hide step definition snippets for pending steps
    snippets: true,
    // <boolean> hide source uris
    source: true,
    // <string[]> (name) specify the profile to use
    profile: [],
    // <boolean> fail if there are any undefined or pending steps
    strict: true,
    // <string> (expression) only execute the features or scenarios with tags matching the expression
    tagExpression: process.env.TAG_EXPRESSION,
    // <number> timeout for step definitions
    timeout: process.env.DEBUG ? 24 * 60 * 60 * 1000 : TIMEOUT + 500,
    // <boolean> Enable this config to treat undefined definitions as warnings.
    ignoreUndefinedDefinitions: false,
  },
  //
  // =====
  // Hooks
  // =====
  // WebdriverIO provides several hooks you can use to interfere with the test process in order to enhance
  // it and to build services around it. You can either apply a single function or an array of
  // methods to it. If one of them returns with a promise, WebdriverIO will wait until that promise got
  // resolved to continue.
  //
  // Gets executed once before all workers get launched.
  onPrepare: () => {
    // eslint-disable-next-line no-console
    console.log(`Starting ftests in ${process.env.HEADLESS === 'true' ? 'HEADLESS' : 'HEADFUL'} mode`);

    // Strip file:// prefix and append timing to WDIO's PASSED/FAILED lines
    const originalWrite = process.stdout.write.bind(process.stdout);
    global._originalStdoutWrite = originalWrite;
    // eslint-disable-next-line no-control-regex
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    const statusLineRegex = /\[(\d+-\d+)\] (?:PASSED|FAILED) in .* - /;
    process.stdout.write = (chunk, ...args) => {
      if (typeof chunk === 'string') {
        chunk = chunk.replace(/file:\/\//g, '');
        const plain = chunk.replace(ansiRegex, '');
        const match = statusLineRegex.exec(plain);
        if (match && !/\(\s*[\d.]+s\s*\)/.test(plain)) {
          // Append elapsed time to WDIO's native status line
          const start = _workerStartTimes.get(match[1]);
          if (start) {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            chunk = chunk.replace(/\n$/, '') + ` \x1b[1m( ${elapsed}s )\x1b[0m\n`;
          }
        }
      }
      return originalWrite(chunk, ...args);
    };
  },
  onWorkerStart: (cid) => {
    _workerStartTimes.set(cid, Date.now());
  },
  onWorkerEnd: (cid, exitCode, specs) => {
    const start = _workerStartTimes.get(cid);
    if (start) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const specNames = specs.map((s) => s.replace(process.cwd(), '').replace(/^file:\/\//, '')).join(', ');
      _featureResults.push({ feature: specNames, status: exitCode === 0 ? 'PASSED' : 'FAILED', elapsed });
      _workerStartTimes.delete(cid);
    }
  },
  //
  // Gets executed in the worker just before the WebDriver session is created. Capture the cid so
  // the resolved browser/driver versions can be logged once (from the first worker) in `before`.
  beforeSession: (cfg, capabilities, specs, cid) => {
    _sessionCid = cid;
  },
  //
  // Gets executed before test execution begins. At this point you can access all global
  // variables, such as `browser`. It is the perfect place to define custom commands.
  before: async () => {
    /**
     * Log the resolved browser and driver versions once (first worker) for CI traceability.
     * Provisioning is delegated to WebdriverIO's driver manager, so this line is the authoritative
     * record of which build actually ran (e.g. when `browserVersion` resolves the 'stable' channel).
     */
    if (_sessionCid === '0-0') {
      try {
        const caps = browser.capabilities || {};
        const driverVersion =
          (caps.chrome && caps.chrome.chromedriverVersion) || caps['moz:geckodriverVersion'] || 'unknown';
        // eslint-disable-next-line no-console
        console.log(
          `Using ${caps.browserName || process.env.BROWSER} ${caps.browserVersion || 'unknown'} ` +
            `(driver ${String(driverVersion).split(' ')[0]})`,
        );
      } catch (e) {
        // best-effort version logging; never block the run
      }
    }

    /**
     * Prevent UND_ERR_CLOSED errors from crashing the worker process.
     * When ChromeDriver's TCP connection drops (Chrome crash, resource pressure),
     * undici reports UND_ERR_CLOSED which is NOT in WDIO's retryable error codes.
     * Without this handler, the unhandled rejection kills the Node.js worker,
     * preventing cucumber reports and screenshots from being saved.
     */
    process.on('unhandledRejection', (reason) => {
      if (
        reason &&
        (reason.code === 'UND_ERR_CLOSED' || (reason.message && reason.message.includes('UND_ERR_CLOSED')))
      ) {
        console.error('[WDIO Worker] Browser connection lost (UND_ERR_CLOSED) — scenario will fail gracefully');
        return;
      }
      // Let other unhandled rejections crash as normal
      throw reason;
    });

    /*
     * Increase window size to avoid hidden buttons
     */
    try {
      await browser.maximizeWindow();
    } catch (e) {
      console.error('Failed to maximize.');
    }

    /**
     * Setup the Chai assertion framework
     */
    global.expect = chai.expect;
    global.assert = chai.assert;
    global.should = chai.should();
    global.driver = global.browser;
  },
  //
  // Hook that gets executed before the suite starts
  // beforeSuite: function (suite) {
  // },
  //
  // Hook that gets executed _before_ a hook within the suite starts (e.g. runs before calling
  // beforeEach in Mocha)
  // beforeHook: function () {
  // },
  //
  // Hook that gets executed _after_ a hook within the suite starts (e.g. runs after calling
  // afterEach in Mocha)
  // afterHook: function () {
  // },
  //
  // Function to be executed before a test (in Mocha/Jasmine) or a step (in Cucumber) starts.
  // beforeTest: function (test) {
  // },
  //
  // Runs before a WebdriverIO command gets executed.
  // beforeCommand: function (commandName, args) {
  // },
  //
  // Runs after a WebdriverIO command gets executed
  // afterCommand: function (commandName, args, result, error) {
  // },
  //
  // Function to be executed after a test (in Mocha/Jasmine) or a step (in Cucumber) starts.
  // afterTest: function (test) {
  // },
  //
  // Hook that gets executed after the suite has ended
  // afterSuite: function (suite) {
  // },
  //
  // Gets executed after all tests are done. You still have access to all global variables from
  // the test.
  // after: function (result, capabilities, specs) {
  // },
  //
  // Gets executed after all workers got shut down and the process is about to exit. It is not
  // possible to defer the end of the process using a promise.
  onComplete: async () => {
    // Restore original stdout.write patched in onPrepare
    if (global._originalStdoutWrite) {
      process.stdout.write = global._originalStdoutWrite;
    }
    if (_featureResults.length > 0) {
      const divider = '='.repeat(80);
      const header = `\x1b[1m${'Feature'.padEnd(50)} ${'Status'.padEnd(10)} Time\x1b[0m`;
      const totalTime = _featureResults.reduce((sum, r) => sum + parseFloat(r.elapsed), 0).toFixed(1);
      const passed = _featureResults.filter((r) => r.status === 'PASSED').length;
      const failed = _featureResults.filter((r) => r.status === 'FAILED').length;
      // eslint-disable-next-line no-console
      console.log(`\n${divider}`);
      // eslint-disable-next-line no-console
      console.log('\x1b[1m  FEATURE TIMING SUMMARY\x1b[0m');
      // eslint-disable-next-line no-console
      console.log(`${divider}`);
      // eslint-disable-next-line no-console
      console.log(header);
      // eslint-disable-next-line no-console
      console.log('-'.repeat(80));
      _featureResults
        .sort((a, b) => parseFloat(b.elapsed) - parseFloat(a.elapsed))
        .forEach((r) => {
          const statusColor = r.status === 'PASSED' ? '\x1b[32m' : '\x1b[31m';
          const timeStr = `${r.elapsed}s`;
          // eslint-disable-next-line no-console
          console.log(
            `${r.feature.padEnd(50)} ${statusColor}${r.status}\x1b[0m${' '.repeat(10 - r.status.length)} \x1b[1m${timeStr}\x1b[0m`,
          );
        });
      // eslint-disable-next-line no-console
      console.log('-'.repeat(80));
      // eslint-disable-next-line no-console
      console.log(
        `\x1b[1mTotal: ${_featureResults.length} features | \x1b[32m${passed} passed\x1b[0m\x1b[1m | \x1b[31m${failed} failed\x1b[0m\x1b[1m | ${totalTime}s\x1b[0m`,
      );
      // eslint-disable-next-line no-console
      console.log(`${divider}\n`);
    }
    if (process.env.CUCUMBER_REPORT_PATH) {
      // Generate the report when it all tests are done
      htmlReporter.generate({
        // Required
        // This part needs to be the same path where you store the JSON files
        // default = '.tmp/json/'
        jsonDir: process.env.CUCUMBER_REPORT_PATH,
        reportPath: `${process.env.CUCUMBER_REPORT_PATH}/html`,
        // for more options see https://github.com/wswebcreation/multiple-cucumber-html-reporter#options
      });
    }
  },
};

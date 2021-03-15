const chai = require('chai');
const path = require('path');
const processor = require('./scripts/specs-processor.js');
const CompatService = require('./wdio-compat-plugin');
const ShadowService = require('./wdio-shadow-plugin');

const reporters = ['spec'];
if (process.env.JUNIT_REPORT_PATH) {
  reporters.push('junit');
}
// if (process.env.CUCUMBER_REPORT_PATH) {
//   reporters.push('multiple-cucumber-html');
// }

const plugins = {};
// plugins[path.join(__dirname, 'wdio-shadow-plugin')] = {};
// plugins[path.join(__dirname, 'wdio-compat-plugin')] = {};

const capability = {
  // maxInstances can get overwritten per capability. So if you have an in-house Selenium
  // grid with only 5 firefox instance available you can make sure that not more than
  // 5 instance gets started at a time.
  maxInstances: 1,
  browserName: process.env.BROWSER,
  // javascriptEnabled: true,
  // acceptSslCerts: true,
  acceptInsecureCerts: true,
};

const options = {};

switch (capability.browserName) {
  case 'chrome':
    
    options.args = ['--no-sandbox'];
    options.w3c = false;
    
    if (process.env.HEADLESS) {
      options.args.push('--window-size=1920,1080');
      options.args.push('--single-process');
      options.args.push('--headless');
      options.args.push('--disable-gpu');
      options.args.push('--disable-dev-shm-usage');
    }
    if (process.env.BROWSER_BINARY) {
      capability.chromeOptions.binary = process.env.BROWSER_BINARY;
    }
    capability['goog:chromeOptions'] = options;
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

const TIMEOUT = process.env.TIMEOUT ? Number(process.env.TIMEOUT) : 20000;

// Allow overriding driver version
const drivers = {};
drivers[process.env.BROWSER] = {};
if (process.env.DRIVER_VERSION) {
  drivers[process.env.BROWSER].version = process.env.DRIVER_VERSION;
}

// transform nuxeo-web-ui-ftest requires
require('babel-register')({
  ignore: /node_modules\/(?!@nuxeo\/nuxeo-web-ui-ftest)/,
});


exports.config = {

  //
  // ====================
  // Runner Configuration
  // ====================
  //
  // WebdriverIO allows it to run your tests in arbitrary locations (e.g. locally or
  // on a remote machine).
  runner: 'local',

  // check http://webdriver.io/guide/testrunner/debugging.html for more info on debugging with wdio
  debug: process.env.DEBUG,
  execArgv: process.env.DEBUG ? ['--inspect'] : [],
  //
  // ==================
  // Specify Test Files
  // ==================
  // Define which test specs should run. The pattern is relative to the directory
  // from which `wdio` was called. Notice that, if you are calling `wdio` from an
  // NPM script (see https://docs.npmjs.com/cli/run-script) then the current working
  // directory is where your package.json resides, so `wdio` will be called from there.
  //
  
  specs: ['./features/*.feature'], // processor(process.argv),
  // Patterns to exclude.
  exclude: [
    // 'path/to/excluded/files'
  ],
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
  // By default WebdriverIO commands are executed in a synchronous way using
  // the wdio-sync package. If you still want to run your tests in an async way
  // e.g. using promises you can set the sync option to false.
  sync: true,
  //
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: 'trace',
  //
  // Enables colors for log output.
  coloredLogs: true,
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
  // Initialize the browser instance with a WebdriverIO plugin. The object should have the
  // plugin name as key and the desired plugin options as properties. Make sure you have
  // the plugin installed before running any tests. The following plugins are currently
  // available:
  // WebdriverCSS: https://github.com/webdriverio/webdrivercss
  // WebdriverRTC: https://github.com/webdriverio/webdriverrtc
  // Browserevent: https://github.com/webdriverio/browserevent
  plugins,
  //
  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  services: [
    'selenium-standalone',
    [CompatService],
    [ShadowService],
  ],

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

  reporterOptions: {
    junit: {
      outputDir: process.env.JUNIT_REPORT_PATH,
      outputFileFormat: {
        single: () => 'TEST-report.xml',
      },
    },
    htmlReporter: {
      jsonFolder: process.env.CUCUMBER_REPORT_PATH,
      reportFolder: `${process.env.CUCUMBER_REPORT_PATH}/html`,
    },
  },
  //
  // If you are using Cucumber you need to specify the location of your step definitions.
  cucumberOpts: {
    // <string[]> (file/dir) require files before executing features
    require: [path.join(__dirname, 'features/step_definitions/**/*.js')],
    // <boolean> show full backtrace for errors
    backtrace: true,
    // <string[]> ("extension:module") require files with the given EXTENSION after requiring MODULE (repeatable)
    requireModule: ['@babel/register'],
    // <boolean> invoke formatters without executing steps
    dryRun: false,
    failAmbiguousDefinitions: true,
    // <boolean> abort the run on first failure
    failFast: !process.env.RUN_ALL,
    // <string[]> (type[:path]) specify the output format, optionally supply PATH to redirect formatter output (repeatable)
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
  // onPrepare: () => {
  // },
  //
  // Gets executed before test execution begins. At this point you can access all global
  // variables, such as `browser`. It is the perfect place to define custom commands.
  before: () => {
    /*
     * Increase window size to avoid hidden buttons
     */
    try {
      browser.maximizeWindow();
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
  // onComplete: () => {
  // },
};

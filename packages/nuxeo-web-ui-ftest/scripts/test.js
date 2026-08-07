#!/usr/bin/env node

/*
 * supported cli arguments:
 *   --cucumberReport: path to file containing the report that will be used by cucumber-html-report;
 *                     by default set to ./target/cucumber-reports/report.json
 *   --features: an array of paths from which to load feature files from;
 *               by default set to ./features/*.feature
 *   --junitReport: path to file containing the junit report generated from the cucumber report;
 *                  by default set to ./target/surefire-reports/TEST-report.xml
 *   --nuxeoUrl: the url of the nuxeo platform server instance to test, fall back on --url or http://localhost:8080
 *   --url: the url of the nuxeo ui instance to test
 *   --report: generate cucumber and junit reports
 *   --screenshots: save screenshots on error
 *   --screenshotPath: path to to which the screenshots will be saved;
 *                     by default set to ./target/screenshots
 *   --stepDefinitions: an array of paths from which to load step definitions from;
 *                      by default set to ./features/step_definitions if the path exists
 *   --tags: only scenarios containing these tags will be ran
 *   --watch: watch for changes in tests and rerun them
 *   --wdioConfig: pass a custom wdio config file
 *   --debug: allow node inspector to be attached
 *   --browser: the browser to be used (defaults to chrome)
 *   --browserVersion: the browser version/channel to provision (e.g. 'stable' or '135.0.7049.114');
 *                     falls back on the BROWSER_VERSION env var or 'stable'
 *   --runAll: do not apply fail fast premise which means that a scenario failure won't trigger feature failure
 *   --bail:  amount of tests that can fail before stopping the runner
 *            by default set to 0, which means don't bail, run all tests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
const { Launcher: CliLauncher } = await import('@wdio/cli');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = minimist(process.argv.slice(2));

const defaultDef = './features/step_definitions';

const args = [argv.wdioConfig ? argv.wdioConfig : path.join(__dirname, '../wdio.conf.js')];
args.push(`--spec=${argv.features || './features/*.feature'}`);

if (argv.url) {
  process.env.NUXEO_WEB_UI_URL = argv.url;
  process.env.NUXEO_URL = argv.url;
}

if (argv.nuxeoUrl) {
  process.env.NUXEO_URL = argv.nuxeoUrl;
}

if (argv.report) {
  process.env.CUCUMBER_REPORT_PATH = argv.cucumberReport ? argv.cucumberReport : './target/cucumber-reports';
  process.env.JUNIT_REPORT_PATH = argv.junitReport ? argv.junitReport : './target/surefire-reports';
}

if (argv.screenshots) {
  process.env.SCREENSHOTS_PATH = argv.screenshotPath ? argv.screenshotPath : './target/screenshots';
}

let def = '';
if (argv.stepDefinitions) {
  def = argv.stepDefinitions;
} else if (fs.existsSync(defaultDef)) {
  def = defaultDef;
}
if (def) {
  process.env.CUCUMBER_REQUIRES = `${def}/**/*.js`;
}

if (argv.watch) {
  args.push('--watch');
}

if (process.env.HEADLESS === undefined) {
  process.env.HEADLESS = argv.headless ? 'true' : 'false';
}

if (argv.tags) {
  args.push(`--cucumberOpts.tagExpression=${argv.tags}`);
  process.env.TAG_EXPRESSION = argv.tags;
}

if (argv.debug) {
  process.env.DEBUG = true;
}

if (argv.runAll) {
  process.env.RUN_ALL = true;
}

if (argv.bail) {
  process.env.BAIL = argv.bail;
}

process.env.BROWSER = argv.browser || process.env.BROWSER || 'chrome';

if (argv.browserVersion) {
  process.env.BROWSER_VERSION = argv.browserVersion;
}

process.env.FORCE_COLOR = true;

// Browser and matching driver provisioning is delegated to WebdriverIO's built-in driver
// manager (see `browserVersion` in wdio.conf.js), so no manual Chrome/ChromeDriver version
// resolution is required here.
const wdio = new CliLauncher(args[0]);
wdio.run().then(
  (code) => {
    process.exit(code);
  },
  (error) => {
    console.error('Launcher failed to start the test', error.stacktrace);
    process.exit(1);
  },
);

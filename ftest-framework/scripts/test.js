#!/usr/bin/env node

'use strict';

/*
 * supported cli arguments:
 *   --cucumberReport: path to file containing the report that will be used by cucumber-html-report;
 *                     by default set to ./target/cucumber-reports/report.json
 *   --features: an array of paths from which to load feature files from;
 *               by default set to ./test/features/*.feature
 *   --junitReport: path to file containing the junit report generated from the cucumber report;
 *                  by default set to ./target/surefire-reports/TEST-report.xml
 *   --nuxeoUrl: the url of the nuxeo instance to test
 *   --report: generate cucumber and junit reports
 *   --screenshots: save screenshots on error
 *   --screenshotPath: path to to which the screenshots will be saved;
 *                     by default set to ./target/screenshots
 *   --stepDefinitions: an array of paths from which to load step definitions from;
 *                      by default set to ./test/features/step_definitions if the path exists
 *   --tags: only scenarios containing these tags will be ran
 *   --watch: watch for changes in tests and rerun them
 *   --wdioConfig: pass a custom wdio config file
 */

const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const wdioBin = path.resolve('./node_modules/.bin/wdio');
const argv = require('minimist')(process.argv.slice(2));
const defaultDef = `./test/features/step_definitions`;

let args = [argv['wdioConfig'] ? argv['wdioConfig'] : path.join(__dirname, '../wdio.conf.js')];

if (argv['features']) {
  args.push(`--specs=${argv['features']}`);
}

if (argv['nuxeoUrl']) {
  process.env.NUXEO_URL = argv['nuxeoUrl'];
}

if (argv['report']) {
  process.env.CUCUMBER_REPORT_PATH = argv['cucumberReport'] ? argv['cucumberReport']
                                                            : `./target/cucumber-reports/report.json`;
  process.env.JUNIT_REPORT_PATH = argv['junitReport'] ? argv['junitReport']
                                                      : `./target/surefire-reports/TEST-report.xml`;
}

if (argv['screenshots']) {
  process.env.SCREENSHOTS_PATH = argv['screenshotPath'] ? argv['screenshotPath'] : `./target/screenshots`;
}

let def = '';
if (argv['stepDefinitions']) {
  def = argv['stepDefinitions'];
}
else if (fs.existsSync(defaultDef)) {
  def = defaultDef;
}
if (def) {
  args.push(`--cucumberOpts.require=${def},./node_modules/nuxeo-web-ui-ftest-framework/test/features/step_definitions`);
}


if (argv['watch']) {
  args.push('--watch');
}

if (argv['tags']) {
  args.push(`--cucumberOpts.tags=${argv['tags']}`);
}

const wdio = spawn(wdioBin, args);

wdio.stdout.pipe(process.stdout);
wdio.stderr.pipe(process.stderr);

wdio.on('close', (code) => {
  process.exit(code);
});

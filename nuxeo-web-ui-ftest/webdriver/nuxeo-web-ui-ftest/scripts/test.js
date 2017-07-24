#!/usr/bin/env node

'use strict';

/*
 * supported cli arguments:
 *   --cucumberReport: path to file containing the report that will be used by cucumber-html-report;
 *                     absence will result in no report being generated
 *   --features: an array of paths from which to load feature files from;
 *               by default set to ./test/features/*.feature
 *   --junitReport: path to file containing the junit report generated from the cucumber report;
 *                  absence will result in no report being generated
 *   --nuxeoUrl: the url of the nuxeo instance to test
 *   --stepDefinitions: an array of paths from which to load step definitions from
 *   --tags: only scenarios containing these tags will be ran
 *   --watch: watch for changes in tests and rerun them
 *   --wdioConfig: pass a custom wdio config file
 */

const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const wdioBin = path.resolve('./node_modules/.bin/wdio');
const argv = require('minimist')(process.argv.slice(2));

let args = [argv['wdioConfig'] ? argv['wdioConfig'] : path.join(__dirname, '../wdio.conf.js')];

if (argv['cucumberReport']) {
  process.env.CUCUMBER_REPORT_PATH = argv['cucumberReport'];
}

if (argv['features']) {
  args.push(`--specs=${argv['features']}`);
}

if (argv['junitReport']) {
  process.env.JUNIT_REPORT_PATH = argv['junitReport'];
}


if (argv['nuxeoUrl']) {
  process.env.NUXEO_URL = argv['nuxeoUrl'];
}

if (argv['stepDefinitions']) {
  args.push(`--cucumberOpts.require=${argv['stepDefinitions']},./node_modules/nuxeo-web-ui-ftest/test/features/step_definitions`);
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

#!/usr/bin/env node

'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const spawn = require('child_process').spawn;
const chimpBin = path.resolve(path.join(process.cwd(), '/node_modules/.bin/chimp'));

const jUnitReporter = require('cucumber-junit');
const jsonReport = `./target/cucumber-reports/report.json`;
const junitReport = `./target/surefire-reports/TEST-report.xml`;

const args = [
  '--chai',
  '--screenshotsOnError=true',
  `--screenshotsPath=${screenshots}`,
  `--jsonOutput=${jsonReport}`,
  '--path=test/features',
  '--webdriverio.saveScreenshotsToDisk=true',
  '--webdriverio.baseUrl=http://localhost:8080/nuxeo',
];

function writeJUnitReport(file) {
  mkdirp.sync(path.dirname(file));
  fs.writeFileSync(file, jUnitReporter(fs.readFileSync(jsonReport)));
}

const chimp = spawn(chimpBin, args);

chimp.stdout.pipe(process.stdout);
chimp.stderr.pipe(process.stderr);

chimp.on('close', (code) => {
  writeJUnitReport(junitReport);
  process.exit(code);
});

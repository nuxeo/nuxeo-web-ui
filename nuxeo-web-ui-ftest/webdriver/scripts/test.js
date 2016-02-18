#!/usr/bin/env node

"use strict";

const fs = require('fs'),
      path = require('path'),
      spawn = require('child_process').spawn,
      chimpBin = path.resolve(process.cwd() + '/node_modules/.bin/chimp');

const HtmlReporter = require('cucumber-html-report'),
      JUnitReporter = require('cucumber-junit'),
      reportsFolder = './reports',
      jsonReport = `${reportsFolder}/report.json`,
      junitReport = `${reportsFolder}/report.xml`,
      htmlReporter = new HtmlReporter({
        source: jsonReport,
        dest: reportsFolder,
        name: 'report.html'
      });

let writeHtmlReport = () => htmlReporter.createReport();
let writeJUnitReport = () => fs.writeFileSync(junitReport, JUnitReporter(fs.readFileSync(jsonReport)));

let args = [
  "--chai",
  "--screenshotsOnError=true",
  "--saveScreenshotsToDisk=true",
  `--jsonOutput=${jsonReport}`,
  "--path=test/features",
  "--baseUrl=http://localhost:8080/nuxeo"
];

var chimp = spawn(chimpBin, args);

chimp.stdout.pipe(process.stdout);
chimp.stderr.pipe(process.stderr);

chimp.on('close', (code) => {
  writeHtmlReport();
  writeJUnitReport();

  process.exit(code);
});
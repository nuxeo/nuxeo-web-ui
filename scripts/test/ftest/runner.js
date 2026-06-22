const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const args = require('minimist')(process.argv.slice(2));
const { removeSync } = require('fs-extra');

// read .env file and assign to process.env
require('dotenv').config();

const FTEST = path.join(__dirname, '../../../ftest');
const CUCUMBER_REPORT_DIR = path.join(FTEST, 'target/cucumber-reports');

function runFunctionalTests(project, dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`The directory "${dir}" doesn't exist, no tests will run for "${project}".`);
    return;
  }
  console.info(`Starting Functional Tests for "${project}" on "${dir}" location.`);
  const ftestArgs = [...process.argv.slice(2), '--cucumberReport', CUCUMBER_REPORT_DIR];
  const run = spawnSync('nuxeo-web-ui-ftest', ftestArgs, { cwd: dir, stdio: 'inherit' });
  if (run.error || run.status !== 0) {
    if (run.error) {
      console.error(`Failed to spawn the Functional Tests process for "${project}": ${run.error.message}`);
    } else {
      console.error(`An error was returned by the process running the Functional Tests for "${project}".`);
    }
    // `spawnSync` returns `status === null` when the child was terminated by a signal or
    // never started (e.g. ENOENT). Fall back to a non-zero code so CI still fails loudly.
    process.exit(run.status ?? 1);
  }
}

if (fs.existsSync(CUCUMBER_REPORT_DIR)) {
  removeSync(CUCUMBER_REPORT_DIR);
}

if (!args.skipWebUi) {
  runFunctionalTests('WebUI', FTEST);
}
(process.env.NUXEO_PACKAGES || '')
  .split(/[\s,]+/)
  .filter(Boolean)
  .forEach((addon) => runFunctionalTests(addon, path.join(__dirname, `../../../addons/${addon}/ftest`)));

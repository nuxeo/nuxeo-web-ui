const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const args = require('minimist')(process.argv.slice(2));

const FTEST = path.join(__dirname, '../ftest');

function runFunctionalTests(project, dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`The directory "${dir}" doesn't exist, no tests will run for "${project}".`);
    return;
  }
  console.info(`Starting Functional Tests for "${project}" on "${dir}" location.`);
  const ftestArgs = [...process.argv, '--cucumberReport', path.join(FTEST, 'target/cucumber-reports')];
  const run = spawnSync('nuxeo-web-ui-ftest', ftestArgs, { cwd: dir, stdio: 'inherit' });
  if (run.status !== 0) {
    console.error(`An error was returned by the process running the Functional Tests for "${project}".`);
    process.exit(run.status);
  }
}

if (!args.skipWebUi) {
  runFunctionalTests('WebUI', FTEST);
}
(process.env.NUXEO_PACKAGES || '')
  .split(/[\s,]+/)
  .filter(Boolean)
  .forEach((addon) => runFunctionalTests(addon, path.join(__dirname, `../addons/${addon}/ftest`)));

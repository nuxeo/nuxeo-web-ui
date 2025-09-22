const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const args = require('minimist')(process.argv.slice(2));
const { removeSync } = require('fs-extra');

// read .env file and assign to process.env
require('dotenv').config();

const FTEST = path.join(__dirname, '../ftest');

function getBatchSpecs(allSpecs, batch, totalBatches) {
  if (!batch || !totalBatches) return allSpecs; // default: run all
  const perBatch = Math.ceil(allSpecs.length / totalBatches);
  const start = (batch - 1) * perBatch;
  const end = Math.min(start + perBatch, allSpecs.length);
  return allSpecs.slice(start, end);
}

function runFunctionalTests(project, dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`The directory "${dir}" doesn't exist, no tests will run for "${project}".`);
    return;
  }
  console.info(`Starting Functional Tests for "${project}" on "${dir}" location.`);

  // Find all .feature files
  const featuresDir = path.join(dir, 'features');
  const allSpecs = fs
    .readdirSync(featuresDir)
    .filter((f) => f.endsWith('.feature'))
    .map((f) => path.join(featuresDir, f));

  // Batch them if requested
  const batchSpecs = getBatchSpecs(allSpecs, args.batch, args.totalBatches);
  console.info(`Running ${batchSpecs.length} specs in batch ${args.batch || 'all'}...`);

  const env = {
    ...process.env,
    SPECS: batchSpecs.join(','),
  };

  // Forward only known args (remove batch args)
  const forwardedArgs = process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--batch') && !a.startsWith('--totalBatches'));

  const run = spawnSync('nuxeo-web-ui-ftest', forwardedArgs, { cwd: dir, stdio: 'inherit', env });
  if (run.status !== 0) {
    console.error(`An error was returned by the process running the Functional Tests for "${project}".`);
    process.exit(run.status);
  }
}

if (fs.existsSync(path.join(FTEST, 'target/cucumber-reports')) && process.env.CUCUMBER_REPORT_PATH) {
  removeSync(process.env.CUCUMBER_REPORT_PATH);
}

if (!args.skipWebUi) {
  runFunctionalTests('WebUI', FTEST);
}
(process.env.NUXEO_PACKAGES || '')
  .split(/[\s,]+/)
  .filter(Boolean)
  .forEach((addon) => runFunctionalTests(addon, path.join(__dirname, `../addons/${addon}/ftest`)));

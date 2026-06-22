#!/usr/bin/env node
/**
 * Build script: writes `test/load-all-tests.js` (gitignored; regenerate when you add/remove test files).
 *
 * Web Test Runner uses this file as the only test entry. It statically imports
 * `./setup.js` then every `*.test.js` under `test/` and under each addon's `test/` folder. That gives one module
 * graph so Mocha registers all suites before the run completes. Loading many test entry patterns
 * in parallel can race and skip suites (e.g. fewer tests reported than exist).
 *
 * Run: `npm run update-test-load-all` (also runs at the start of `npm test`).
 *
 * After adding a new `something.test.js`, run this script (or `npm test`) so the import appears here.
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = path.join(__dirname, '../../..');
const outFile = path.join(root, 'test', 'load-all-tests.js');

// Match all unit tests; keep patterns aligned with where *.test.js files live in this repo.
const patterns = ['test/**/*.test.js', 'addons/*/test/**/*.test.js'];

const seen = new Set();
for (const pattern of patterns) {
  for (const file of glob.sync(pattern, { cwd: root, nodir: true })) {
    seen.add(file.replace(/\\/g, '/'));
  }
}

const relFromTestDir = (posixPath) => {
  if (posixPath.startsWith('test/')) {
    return `./${posixPath.slice('test/'.length)}`;
  }
  if (posixPath.startsWith('addons/')) {
    return `../${posixPath}`;
  }
  throw new Error(`Unexpected test path: ${posixPath}`);
};

const lines = Array.from(seen)
  .sort()
  .map((p) => `import '${relFromTestDir(p)}';`);

const banner = `/**
 * AUTO-GENERATED — do not edit. Regenerate: npm run update-test-load-all (runs in npm test).
 *
 * Sole Web Test Runner entry (web-test-runner.config.mjs lists only this file).
 * Web Test Runner progress shows "1/1 test files"; pass/fail lines are individual Mocha tests.
 * This module imports setup.js then every suite *.test.js in one static graph — see
 * scripts/test/unit/generate-test-load-all.js and web-test-runner.config.mjs.
 */

import './setup.js';
`;

const content = `${banner}${lines.join('\n')}\n`;

fs.writeFileSync(outFile, content, 'utf8');
// eslint-disable-next-line no-console
console.log(
  'generate-test-load-all: %d suite imports → test/load-all-tests.js (WTR reports 1 runner file)',
  lines.length,
);

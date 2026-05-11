#!/usr/bin/env node
/**
 * Build script: writes `test/load-all-tests.js` (gitignored; regenerate when you add/remove test files).
 *
 * Purpose:
 * Karma is configured with this file as the only test `files` entry. It statically imports
 * `./setup.js` then every `*.test.js` under `test/` and under each addon's `test/` folder. That gives one module
 * graph so Mocha registers all suites before Karma signals ready. Loading many test entry patterns
 * in parallel can race and skip suites (e.g. fewer tests reported than exist).
 *
 * Run: `npm run update-test-load-all` (also runs at the start of `npm test`).
 *
 * After adding a new `something.test.js`, run this script (or `npm test`) so the import appears here.
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = path.join(__dirname, '..');
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
 * Sole Karma test entry: imports shared bootstrap then every unit test module in one static graph.
 * See scripts/generate-test-load-all.js and the file header in karma.conf.js for why this exists.
 */

import './setup.js';
`;

const content = `${banner}${lines.join('\n')}\n`;

fs.writeFileSync(outFile, content, 'utf8');
// eslint-disable-next-line no-console
console.log('generate-test-load-all: wrote %d imports to test/load-all-tests.js', lines.length);

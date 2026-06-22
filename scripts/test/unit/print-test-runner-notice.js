#!/usr/bin/env node
/**
 * Prints a short explanation before Web Test Runner starts.
 * WTR progress shows "1/1 test files" even though hundreds of Mocha tests run — this clarifies that.
 */
const glob = require('glob');
const path = require('path');

const root = path.join(__dirname, '../../..');
const patterns = ['test/**/*.test.js', 'addons/*/test/**/*.test.js'];
const suiteFiles = new Set();

for (const pattern of patterns) {
  for (const file of glob.sync(pattern, { cwd: root, nodir: true })) {
    suiteFiles.add(file.replace(/\\/g, '/'));
  }
}

// eslint-disable-next-line no-console
console.log('');
// eslint-disable-next-line no-console
console.log('Unit tests — @web/test-runner + Mocha (TDD)');
// eslint-disable-next-line no-console
console.log('  Runner entry : test/load-all-tests.js  →  Web Test Runner reports 1 test file');
// eslint-disable-next-line no-console
console.log(`  Suite modules: ${suiteFiles.size} *.test.js files imported in one static graph`);
// eslint-disable-next-line no-console
console.log('  Pass/fail    : counts individual Mocha tests (suites × cases), not runner files');
// eslint-disable-next-line no-console
console.log('  Config       : web-test-runner.config.mjs');
// eslint-disable-next-line no-console
console.log('');

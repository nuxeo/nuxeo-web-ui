#!/usr/bin/env node
/**
 * Build script: writes `test/coverage-imports-data.js` (gitignored).
 *
 * Purpose:
 * Istanbul only knows about JavaScript that was loaded in the browser. Many UI modules are never
 * imported by any unit test; without a manifest + bulk import they disappear from coverage reports
 * and percentages look inflated. This script globs all app element sources and emits a sorted list
 * of project-relative paths. `test/setup.js` imports every path in a coverage-only `suiteTeardown`.
 *
 * Scope:
 * - Included: all `.js` files under `elements/` and under each addon's `elements/` tree (see `patterns` below).
 * - Excluded: paths in `EXCLUDE_PREFIXES` / `EXCLUDE_EXACT` that cannot be safely loaded in Karma
 *   (e.g. routing bootstrap, problematic addon trees). Not included: webpack bundles, `scripts/`,
 *   `packages/`, or addon code outside those element directories.
 *
 * Run: `npm run update-coverage-imports` (also runs at the start of `npm test`).
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = path.join(__dirname, '../../..');
const outFile = path.join(root, 'test', 'coverage-imports-data.js');

const patterns = ['elements/**/*.js', 'addons/**/elements/**/*.js'];

// Omit modules that break bulk import in the test runner ESM pipeline; extend when new failures appear.
// - nuxeo-platform-3d: glTF scripts are not valid ESM named exports under the test runner.
// - routing.js: runs Page.js route setup at import time and requires a full Nuxeo.UI app shell.
const EXCLUDE_PREFIXES = ['addons/nuxeo-platform-3d/'];
const EXCLUDE_EXACT = new Set(['elements/routing.js']);

const excludePredicate = (posixPath) =>
  EXCLUDE_PREFIXES.some((prefix) => posixPath.startsWith(prefix)) || EXCLUDE_EXACT.has(posixPath);

const seen = new Set();
for (const pattern of patterns) {
  for (const file of glob.sync(pattern, { cwd: root, nodir: true })) {
    const p = file.replace(/\\/g, '/');
    if (excludePredicate(p)) continue;
    seen.add(p);
  }
}

// Strings like "elements/foo.js" so consumers can do `new URL(path, projectRoot)` (see test/setup.js).
const relImports = Array.from(seen).sort();

if (relImports.length === 0) {
  // eslint-disable-next-line no-console
  console.error(
    'generate-coverage-imports: matched 0 modules. Expected elements/**/*.js under',
    root,
    '— check CI working directory, sparse checkout, and that this package root includes the elements/ tree.',
  );
  process.exit(1);
}

const banner = `/**
 * AUTO-GENERATED — do not edit. Regenerate: npm run update-coverage-imports (runs in npm test).
 *
 * Exports \`coverageModulePaths\`: every app element module path under elements/ and each addon's
 * elements/ tree (minus excludes in generate-coverage-imports.js). Used only for Istanbul:
 * test/setup.js imports these URLs after all tests in coverage mode so reports include files that
 * no unit test loads (they appear as 0% coverage instead of being missing).
 */
`;

const content = `${banner}export const coverageModulePaths = ${JSON.stringify(relImports, null, 2)};
`;

fs.writeFileSync(outFile, content, 'utf8');
// eslint-disable-next-line no-console
console.log('generate-coverage-imports: wrote %d module paths to test/coverage-imports-data.js', relImports.length);

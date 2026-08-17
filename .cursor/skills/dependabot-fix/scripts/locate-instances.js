#!/usr/bin/env node
/*
 * Locate every resolved instance of a package in a lockfile, and every manifest
 * that declares it (and with what range). Serves Step 2.1 (locate) and the
 * same-manifest / cross-manifest multi-instance scans in Step 2.4.
 *
 * Usage: node locate-instances.js <path-to-package-lock.json> <pkg>
 *
 * Output:
 *   "<manifest> requires <pkg>@<range>"   — one per declaring manifest
 *   "<node-path> => <version> [(dev)]"    — one per RESOLVED instance
 *
 * Instance match is exact ("node_modules/<pkg>" or "*\/node_modules/<pkg>") so a
 * bare suffix match never catches a different package whose name merely ends the
 * same way (e.g. "@types/minimatch" when the target is "minimatch"). Lists EVERY
 * matching instance, not just the first — a lockfile commonly holds a safe
 * top-level copy AND a vulnerable nested one.
 */
const fs = require('fs');
const path = require('path');
const [file, pkg] = process.argv.slice(2);
if (!file || !pkg) {
  console.error('Usage: locate-instances.js <path-to-package-lock.json> <pkg>');
  process.exit(2);
}
let l;
try {
  l = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
} catch (e) {
  console.error('ERROR: cannot read/parse ' + file + ' — ' + e.message);
  process.exit(2);
}
// Reads the v2+/v3 `packages` map. A legacy v1 lockfile (npm 6-era) has no
// `packages` (deps live under `dependencies`), so this would silently find
// nothing — a false "not present". Refuse instead. (All in-scope repo lockfiles
// are v3; this only fires on an old branch or a stray v1 file.)
if (!l.packages) {
  console.error(
    'ERROR: ' +
      file +
      ' has no "packages" field (lockfileVersion ' +
      (l.lockfileVersion || '1/unknown') +
      '). Legacy v1 lockfile — this script cannot read it and would report nothing found. ' +
      'Re-generate with npm 7+ (`npm install --package-lock-only`) or inspect by hand.',
  );
  process.exit(2);
}
for (const [k, v] of Object.entries(l.packages || {})) {
  const d = {
    ...(v.dependencies || {}),
    ...(v.devDependencies || {}),
    ...(v.peerDependencies || {}),
    ...(v.optionalDependencies || {}),
  };
  if (d[pkg]) console.log((k || '<root>') + ' requires ' + pkg + '@' + d[pkg]);
  if (k === 'node_modules/' + pkg || k.endsWith('/node_modules/' + pkg)) {
    console.log(k + ' => ' + v.version + (v.dev ? ' (dev)' : ''));
  }
}

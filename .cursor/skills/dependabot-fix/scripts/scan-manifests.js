#!/usr/bin/env node
/*
 * Cross-manifest duplicate scan (nuxeo-web-ui, Step 2.4): find every resolved
 * instance of a package in every tracked package-lock.json EXCEPT the ticket's
 * own manifest. The 4 nuxeo-web-ui manifests are scanned independently by
 * Dependabot, so the same package can be separately vulnerable in another one.
 *
 * Usage: node scan-manifests.js <ticket-manifest-lockfile> <pkg>
 *   ticket-manifest-lockfile = the lockfile path EXACTLY as the alert's
 *     .dependency.manifest_path reports it (no leading ./), so this scan doesn't
 *     re-flag your own manifest as a duplicate.
 *
 * The manifest list is derived from `git ls-files` (never hardcoded), so a newly
 * added sub-project is never silently skipped. Lists EVERY matching instance per
 * manifest, not just the first — a lockfile can hold a safe top-level copy AND a
 * vulnerable nested one.
 *
 * Portable: pure Node + git — no bash, runs on macOS/Linux/Windows alike.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const [ticketManifest, pkg] = process.argv.slice(2);
if (!ticketManifest || !pkg) {
  console.error('Usage: scan-manifests.js <ticket-manifest-lockfile> <pkg>');
  process.exit(2);
}

const res = spawnSync('git', ['ls-files', '*package-lock.json'], { encoding: 'utf8' });
// A failed `git ls-files` (not a git repo, git missing, etc.) must NOT be mistaken
// for "no other manifests" — that would be a false "clear" result. Fail loudly.
if (res.error) {
  console.error(
    'ERROR: could not run git (' + res.error.message + '). Run this from inside the repo, with git on PATH.',
  );
  process.exit(2);
}
if (res.status !== 0) {
  console.error('ERROR: `git ls-files` exited ' + res.status + ' — are you inside the repo?\n' + (res.stderr || ''));
  process.exit(2);
}
const files = (res.stdout || '')
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !f.includes('node_modules'))
  .filter((f) => f !== ticketManifest);

if (!files.length) {
  console.log('Cross-manifest scan: no other tracked package-lock.json manifests found.');
  process.exit(0);
}

let anyHit = false;
const skipped = []; // manifests we could NOT scan (parse failure or legacy v1)
for (const f of files) {
  let l;
  try {
    l = JSON.parse(fs.readFileSync(path.resolve(f), 'utf8'));
  } catch (e) {
    // A lockfile that can't be read/parsed (corruption, partial checkout, merge
    // conflict markers) must NOT be silently skipped — that could turn a real hit
    // into a false "not present anywhere else". Record it and fail at the end.
    skipped.push({ f, msg: 'unparseable — ' + e.message });
    continue;
  }
  // A legacy v1 lockfile (npm 6-era) has no `packages` map — a v2+ query finds
  // nothing, which here would be a false "not present elsewhere". Treat it as
  // unscannable rather than clear. (All in-scope repo lockfiles are v3.)
  if (!l.packages) {
    skipped.push({
      f,
      msg:
        'legacy v1 lockfile (lockfileVersion ' +
        (l.lockfileVersion || '1/unknown') +
        ') — no "packages" map; re-generate with npm 7+ or check by hand',
    });
    continue;
  }
  const hits = Object.entries(l.packages).filter(
    ([k, v]) => v.version && (k === 'node_modules/' + pkg || k.endsWith('/node_modules/' + pkg)),
  );
  if (hits.length) {
    anyHit = true;
    console.log('== ' + f + ' ==');
    hits.forEach(([k, v]) => console.log('  ' + v.version + '  ' + k));
  }
}

if (skipped.length) {
  console.error(
    '\nWARNING: scan is INCOMPLETE — ' +
      skipped.length +
      ' manifest(s) could NOT be scanned:\n' +
      skipped.map((u) => '  ' + u.f + ' — ' + u.msg).join('\n') +
      '\nCheck these by hand before trusting the result below.',
  );
}

if (!anyHit) {
  const caveat = skipped.length ? ' (among the manifests that could be scanned)' : '';
  console.log('Cross-manifest scan: ' + pkg + ' not present in any other tracked manifest' + caveat + '.');
}

// Exit non-zero if any manifest was skipped, so a caller never reads an
// incomplete scan as a clean "all clear".
if (skipped.length) process.exit(2);

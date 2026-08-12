#!/usr/bin/env node
/*
 * npm audit flagged-instance (node) diff for a package: base vs fix. Queries the
 * same GitHub Advisory DB that backs Dependabot, so it uses authoritative ranges
 * and covers every advisory for the package. Quote the before/after diff into the
 * PR body + Jira comment (Step 4.1).
 *
 * Usage: node audit-diff.js <manifest-dir> <pkg>
 *   e.g. node audit-diff.js . brace-expansion
 *        node audit-diff.js plugin/a11y brace-expansion
 *
 * PRECONDITION — MUST run BEFORE Step 5's commit, while the fix is still an
 * UNCOMMITTED change in the tracked working tree. It stashes that change to
 * capture the "before" (base) state, then restores it for "after". On a clean
 * tree `git stash` would be a no-op and the diff would falsely read "no change",
 * so this refuses to run unless there are uncommitted tracked changes.
 *
 * Portable: pure Node + git + npm — no bash, runs on macOS/Linux/Windows alike.
 */
const { spawnSync } = require('child_process');

const win = process.platform === 'win32';
const [dir, pkg] = process.argv.slice(2);
if (!dir || !pkg) {
  console.error('Usage: audit-diff.js <manifest-dir> <pkg>');
  process.exit(2);
}

function git(args, opts = {}) {
  return spawnSync('git', args, { encoding: 'utf8', ...opts });
}

// Refuse on a clean tree (ignores untracked files, same as `git diff --quiet`).
const unstagedClean = git(['diff', '--quiet']).status === 0;
const stagedClean = git(['diff', '--cached', '--quiet']).status === 0;
if (unstagedClean && stagedClean) {
  console.error(
    'ERROR: working tree is clean. Run this BEFORE committing the fix, while the lockfile change is still uncommitted.',
  );
  process.exit(2);
}

// npm audit exits non-zero *when vulnerabilities exist* (normal — read stdout
// regardless of status). But a spawn failure, empty stdout, non-JSON output, or a
// JSON `{ error }` payload means the audit never really ran — that must fail loudly,
// not be swallowed into an empty node list (a false "no vulnerabilities / no change").
function auditNodes(manifestDir, name) {
  const res = spawnSync('npm', ['audit', '--package-lock-only', '--json'], {
    cwd: manifestDir,
    encoding: 'utf8',
    shell: win, // npm is npm.cmd on Windows
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) {
    console.error('ERROR: could not run npm audit in ' + manifestDir + ' — ' + res.error.message);
    process.exit(2);
  }
  if (!res.stdout || !res.stdout.trim()) {
    console.error(
      'ERROR: npm audit produced no output in ' +
        manifestDir +
        ' (exit ' +
        res.status +
        ')' +
        (res.stderr ? ':\n' + res.stderr : '') +
        '\nCannot trust an empty audit — check network/registry auth and retry.',
    );
    process.exit(2);
  }
  let json;
  try {
    json = JSON.parse(res.stdout);
  } catch (e) {
    console.error('ERROR: npm audit output was not valid JSON in ' + manifestDir + ' — ' + e.message);
    process.exit(2);
  }
  // npm surfaces registry/other failures as a JSON `{ error: {...} }` payload.
  if (json.error) {
    const msg = json.error.summary || json.error.detail || JSON.stringify(json.error);
    console.error('ERROR: npm audit reported an error in ' + manifestDir + ' — ' + msg);
    process.exit(2);
  }
  const v = (json.vulnerabilities || {})[name];
  return (v && Array.isArray(v.nodes) ? v.nodes.slice() : []).sort();
}

let before;
// `git stash push` with no pathspec stashes ALL tracked changes repo-wide — this
// is deliberate: it produces a true, clean base for the "before" audit. Any
// unrelated in-progress edits are stashed only for the duration of that one audit
// and are restored by the `git stash pop --index` in the finally block below.
const stash = git(['stash', 'push', '--quiet', '-m', 'audit-diff-tmp']);
if (stash.status !== 0) {
  console.error('ERROR: git stash failed:\n' + (stash.stderr || ''));
  process.exit(2);
}
try {
  before = auditNodes(dir, pkg);
} finally {
  // `--index` restores the staged/unstaged split exactly as it was — without it,
  // a caller who had already `git add`-ed the lockfile would get it back unstaged.
  const pop = git(['stash', 'pop', '--index', '--quiet']);
  if (pop.status !== 0) {
    console.error(
      'ERROR: git stash pop failed — your change is still stashed, restore it with `git stash pop --index`:\n' +
        (pop.stderr || ''),
    );
    process.exit(2);
  }
}
const after = auditNodes(dir, pkg);

const setBefore = new Set(before);
const setAfter = new Set(after);
const removed = before.filter((n) => !setAfter.has(n));
const added = after.filter((n) => !setBefore.has(n));

console.log(`=== ${pkg} flagged nodes: before (base) vs after (fix) ===`);
console.log(`before: ${before.length} node(s)  →  after: ${after.length} node(s)`);
if (removed.length) {
  console.log('removed (fixed by this PR):');
  removed.forEach((n) => console.log('  - ' + n));
}
if (added.length) {
  console.log('added (NEW — investigate before proceeding):');
  added.forEach((n) => console.log('  + ' + n));
}
if (!removed.length && !added.length) console.log('no change in flagged nodes');
if (after.length) {
  console.log('still flagged (must each be documented as tracked elsewhere):');
  after.forEach((n) => console.log('  ' + n));
}

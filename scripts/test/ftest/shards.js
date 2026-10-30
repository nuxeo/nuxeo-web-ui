#!/usr/bin/env node

/*
 * Which functional-test feature runs on which CI shard, plus the guard that keeps this file and
 * ftest/features/ in sync.
 *
 * The WebdriverIO suite runs strictly serially - `maxInstances: 1` in
 * packages/nuxeo-web-ui-ftest/wdio.conf.js - and has to stay that way: every worker would share
 * the single Nuxeo server the job starts, while search.feature asserts repo-wide absolute result
 * counts and the fixture `After` hooks delete users and groups globally. So the parallelism lives
 * at job level instead: .github/workflows/ftest.yaml and .github/workflows/cross-repo.yaml each run
 * a matrix where every shard is its own runner with its own server, which makes cross-feature
 * collisions impossible by construction and needs no changes to the tests themselves.
 *
 * Usage:
 *   node scripts/test/ftest/shards.js --specs 2   # the FTEST_SPECS value for shard 2
 *   node scripts/test/ftest/shards.js --check     # fail if the manifest and ftest/features drift
 *
 * Balance: the shards below are a longest-processing-time-first packing of the per-feature wall
 * times measured on run 39052077178 (46 features, 39.4 min end to end). That puts every shard
 * between 9m47s and 9m54s - a 7 second spread. The trailing numbers are those measured seconds,
 * kept as documentation of the packing rather than as inputs to it, so nothing needs re-timing
 * until the balance visibly drifts.
 *
 * Adding a feature: append it to the shard with the smallest total. `--check` runs as part of
 * `npm run lint`, so a feature that is unassigned or assigned twice fails CI instead of silently
 * running on no shard at all.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '../../..');
const FEATURES_DIR = path.join(REPO_ROOT, 'ftest/features');

/**
 * Every workflow that dispatches a shard matrix over this manifest. All of them have to agree with
 * it: a shard the manifest defines but one of these never dispatches means that shard's features
 * simply stop running in that workflow, with every job still green.
 */
const WORKFLOWS = ['.github/workflows/ftest.yaml', '.github/workflows/cross-repo.yaml'];

const SHARDS = [
  // shard 1 - 9m47s
  [
    'search.feature', // 188.8s
    'permissions.feature', // 92.7s
    'create_doc.feature', // 67.7s
    'import_doc.feature', // 63.7s
    'ordered_folder.feature', // 48.8s
    'bulk_edit_custom_layouts.feature', // 43.9s
    'authorized_apps.feature', // 23.1s
    'grid.feature', // 20.9s
    'doc_suggestion.feature', // 14.1s
    'announcement.feature', // 12.4s
    'login-logout.feature', // 11.7s
  ],
  // shard 2 - 9m54s
  [
    'trash.feature', // 169.5s
    'versions.feature', // 100.2s
    'tasks.feature', // 91.0s
    'activity.feature', // 56.0s
    'metadata.feature', // 46.7s
    'workflows.feature', // 36.0s
    'picture.feature', // 25.4s
    'vocabularies.feature', // 22.7s
    'user_cloud.feature', // 15.4s
    'admin.feature', // 13.3s
    'history.feature', // 10.7s
    'home.feature', // 7.0s
  ],
  // shard 3 - 9m54s
  [
    'clipboard.feature', // 152.4s
    'preview.feature', // 121.7s
    'recents.feature', // 74.4s
    'edit-note.feature', // 63.8s
    'cloud.feature', // 51.6s
    'spreadsheet.feature', // 32.9s
    'group.feature', // 27.4s
    'validation.feature', // 23.0s
    'expired_doc.feature', // 16.2s
    'csv-import.feature', // 13.2s
    'favorites.feature', // 8.7s
    'personal.feature', // 8.5s
  ],
  // shard 4 - 9m47s
  [
    'publication.feature', // 146.4s
    'collections.feature', // 126.7s
    'bulk_edit.feature', // 78.4s
    'comments.feature', // 58.9s
    'browser.feature', // 52.9s
    'user.feature', // 38.1s
    'upload.feature', // 23.6s
    'datatable_editing.feature', // 21.2s
    'video.feature', // 18.2s
    'compare.feature', // 11.7s
    'audit.feature', // 10.8s
  ],
];

/**
 * The shard numbers one workflow's matrix actually dispatches.
 *
 * Read back out of the YAML rather than trusted, because the manifest having a shard the matrix
 * never dispatches is the one drift this script exists to catch: those features would simply stop
 * running, with every job still green. Both YAML list styles are accepted so that reformatting the
 * workflow cannot fail the lint on its own.
 */
function matrixShards(workflow) {
  const lines = fs.readFileSync(path.join(REPO_ROOT, workflow), 'utf8').split('\n');
  const start = lines.findIndex((line) => /^\s*shard:/.test(line));
  if (start === -1) {
    return null;
  }

  // `shard: [1, 2, 3, 4]`
  const inline = /^\s*shard:\s*\[([^\]]*)\]/.exec(lines[start]);
  let items;
  if (inline) {
    items = inline[1].split(',');
  } else {
    // `shard:` followed by one `- N` per line, until the first line that is not a list item
    items = [];
    for (let i = start + 1; i < lines.length; i++) {
      const item = /^\s*-\s*(\S+)\s*$/.exec(lines[i]);
      if (!item) {
        break;
      }
      items.push(item[1]);
    }
  }

  const shards = items.map((item) => Number(item.trim())).filter((shard) => Number.isInteger(shard) && shard > 0);
  return shards.length > 0 ? shards : null;
}

function specsFor(shard) {
  const index = Number(shard);
  if (!Number.isInteger(index) || index < 1 || index > SHARDS.length) {
    throw new Error(`Unknown ftest shard "${shard}"; the manifest defines shards 1 to ${SHARDS.length}.`);
  }
  return SHARDS[index - 1].map((feature) => `features/${feature}`).join(',');
}

function check() {
  const errors = [];

  const onDisk = fs
    .readdirSync(FEATURES_DIR)
    .filter((entry) => entry.endsWith('.feature'))
    .sort();

  const shardsByFeature = new Map();
  SHARDS.forEach((features, index) => {
    features.forEach((feature) => {
      const shards = shardsByFeature.get(feature) || [];
      shards.push(index + 1);
      shardsByFeature.set(feature, shards);
    });
  });

  onDisk
    .filter((feature) => !shardsByFeature.has(feature))
    .forEach((feature) =>
      errors.push(
        `  ${feature} is assigned to no shard, so CI would not run it at all.\n` +
          `    Add it to the shard with the smallest total in ${path.relative(REPO_ROOT, __filename)}.`,
      ),
    );

  [...shardsByFeature.entries()]
    .filter(([, shards]) => shards.length > 1)
    .forEach(([feature, shards]) =>
      errors.push(`  ${feature} is assigned to shards ${shards.join(', ')}; it must appear exactly once.`),
    );

  [...shardsByFeature.keys()]
    .filter((feature) => !onDisk.includes(feature))
    .sort()
    .forEach((feature) =>
      errors.push(`  ${feature} is assigned to a shard but does not exist in ftest/features/; remove it.`),
    );

  const expected = SHARDS.map((_, index) => index + 1);
  WORKFLOWS.forEach((workflow) => {
    const dispatched = matrixShards(workflow);
    if (!dispatched) {
      errors.push(
        `  Could not read the \`shard:\` matrix list from ${workflow}, so the manifest\n` +
          '    could not be checked against the shards CI actually runs. Check both by hand.',
      );
      return;
    }
    const missing = expected.filter((shard) => !dispatched.includes(shard));
    const extra = dispatched.filter((shard) => !expected.includes(shard));
    if (missing.length > 0) {
      errors.push(
        `  Shard(s) ${missing.join(', ')} exist in the manifest but are not in the \`shard:\` matrix in\n` +
          `    ${workflow}, so their features would never run there.`,
      );
    }
    if (extra.length > 0) {
      errors.push(
        `  The \`shard:\` matrix in ${workflow} dispatches shard(s) ${extra.join(', ')}, which\n` +
          '    the manifest does not define; those jobs would fail to resolve a spec list.',
      );
    }
  });

  if (errors.length > 0) {
    console.error('The ftest shard manifest and ftest/features/ have drifted apart:\n');
    console.error(errors.join('\n'));
    console.error('\n↑↑ fix the above so every feature file runs on exactly one shard ↑↑');
    process.exit(1);
  }

  const counts = SHARDS.map((features, index) => `shard ${index + 1}: ${features.length}`).join(', ');
  console.info(`ftest shards OK — ${onDisk.length} feature files, each on exactly one shard (${counts}).`);
}

const [mode, value] = process.argv.slice(2);

switch (mode) {
  case '--check':
    check();
    break;
  case '--specs':
    console.log(specsFor(value));
    break;
  default:
    console.error('Usage: node scripts/test/ftest/shards.js (--check | --specs <shard>)');
    process.exit(2);
}

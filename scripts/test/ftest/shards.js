#!/usr/bin/env node

/*
 * Which functional-test feature runs on which CI shard, plus the guard that keeps this file and
 * ftest/features/ in sync.
 *
 * The WebdriverIO suite runs strictly serially - `maxInstances: 1` in
 * packages/nuxeo-web-ui-ftest/wdio.conf.js - and has to stay that way: every worker would share
 * the single Nuxeo server the job starts, while search.feature asserts repo-wide absolute result
 * counts and the fixture `After` hooks delete users and groups globally. So the parallelism lives
 * at job level instead: .github/workflows/ftest.yaml runs a matrix where each shard is its own
 * runner with its own server, which makes cross-feature collisions impossible by construction and
 * needs no changes to the tests themselves.
 *
 * Usage:
 *   node scripts/test/ftest/shards.js --specs 2   # the FTEST_SPECS value for shard 2
 *   node scripts/test/ftest/shards.js --check     # fail if the manifest and ftest/features drift
 *   node scripts/test/ftest/shards.js --place     # put any unassigned feature on a shard
 *
 * Balance: the shards below are a longest-processing-time-first packing of the per-feature wall
 * times measured on run 39052077178 (46 features, 39.4 min end to end). That puts every shard
 * between 9m47s and 9m54s - a 7 second spread. The trailing numbers are those measured seconds,
 * kept as documentation of the packing rather than as inputs to it, so nothing needs re-timing
 * until the balance visibly drifts.
 *
 * Adding a feature: nothing to do by hand. `--place` runs as part of `npm run format`, appends any
 * feature that is on disk but on no shard to the shard with the smallest total, and rewrites this
 * file. It has no measurement for a new feature, so it writes the median of the measured ones and
 * marks it `~Ns (est.)` - the estimate is what keeps successive additions spreading over shards
 * instead of all landing on whichever one was lightest first. Re-time and replace it if the
 * feature turns out to be an outlier.
 *
 * `--check` runs as part of `npm run lint` and only ever reports, so the two modes divide the way
 * prettier's do: lint reports, format repairs. Two drifts `--place` deliberately leaves to the
 * guard - a feature on two shards, and an entry whose file is gone - because both are anomalies
 * rather than routine omissions, and either mechanical "fix" would drop coverage quietly where the
 * guard drops it loudly.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '../../..');
const FEATURES_DIR = path.join(REPO_ROOT, 'ftest/features');
const WORKFLOW = path.join(REPO_ROOT, '.github/workflows/ftest.yaml');

const SHARDS = [
  // shard 1 - 9m48s
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
 * The shard numbers the workflow matrix actually dispatches.
 *
 * Read back out of the YAML rather than trusted, because the manifest having a shard the matrix
 * never dispatches is the one drift this script exists to catch: those features would simply stop
 * running, with every job still green. Both YAML list styles are accepted so that reformatting the
 * workflow cannot fail the lint on its own.
 */
function matrixShards() {
  const lines = fs.readFileSync(WORKFLOW, 'utf8').split('\n');
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
          '    Run `npm run format` to append it to the shard with the smallest total.',
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

  const dispatched = matrixShards();
  if (!dispatched) {
    errors.push(
      '  Could not read the `shard:` matrix list from .github/workflows/ftest.yaml, so the manifest\n' +
        '    could not be checked against the shards CI actually runs. Check both by hand.',
    );
  } else {
    const expected = SHARDS.map((_, index) => index + 1);
    const missing = expected.filter((shard) => !dispatched.includes(shard));
    const extra = dispatched.filter((shard) => !expected.includes(shard));
    if (missing.length > 0) {
      errors.push(
        `  Shard(s) ${missing.join(', ')} exist in the manifest but are not in the \`shard:\` matrix in\n` +
          '    .github/workflows/ftest.yaml, so their features would never run.',
      );
    }
    if (extra.length > 0) {
      errors.push(
        `  The \`shard:\` matrix in .github/workflows/ftest.yaml dispatches shard(s) ${extra.join(', ')}, which\n` +
          '    the manifest does not define; those jobs would fail to resolve a spec list.',
      );
    }
  }

  if (errors.length > 0) {
    console.error('The ftest shard manifest and ftest/features/ have drifted apart:\n');
    console.error(errors.join('\n'));
    console.error('\n↑↑ fix the above so every feature file runs on exactly one shard ↑↑');
    process.exit(1);
  }

  const counts = SHARDS.map((features, index) => `shard ${index + 1}: ${features.length}`).join(', ');
  console.info(`ftest shards OK — ${onDisk.length} feature files, each on exactly one shard (${counts}).`);
}

/*
 * Everything below is `--place`, the mechanical half of `--check`.
 *
 * It edits this file's own SHARDS block line by line instead of regenerating it from the parsed
 * data, because the `// shard N` headers and the per-feature seconds are the record of how the
 * packing was arrived at, and a round-trip through a data structure would flatten them away. The
 * line parse is verified against the SHARDS constant above before anything is written, so a
 * restructured file makes `--place` decline rather than mangle it.
 */

const SHARD_HEADER = /^(\s*)\/\/ shard (\d+) -/;
const SHARD_ENTRY = /^(\s*)'([^']+\.feature)',\s*\/\/\s*(~?)\s*([\d.]+)s/;
const SHARD_CLOSE = /^\s*\],?\s*$/;

/* Only reachable if every measurement in the manifest has been replaced by an estimate. */
const FALLBACK_ESTIMATE_SECONDS = 30;

function parseShardBlocks(lines) {
  const first = lines.findIndex((line) => /^const SHARDS = \[/.test(line));
  const last = first === -1 ? -1 : lines.findIndex((line, index) => index > first && /^\];/.test(line));
  if (first === -1 || last === -1) {
    return null;
  }

  const blocks = [];
  let block = null;
  for (let index = first + 1; index < last; index++) {
    const header = SHARD_HEADER.exec(lines[index]);
    const entry = block && !header ? SHARD_ENTRY.exec(lines[index]) : null;
    if (header) {
      block = { number: Number(header[2]), indent: header[1], entryIndent: null, header: index, close: null };
      block.entries = [];
      block.added = 0;
      blocks.push(block);
    } else if (entry) {
      block.entryIndent = block.entryIndent === null ? entry[1] : block.entryIndent;
      block.entries.push({ feature: entry[2], seconds: Number(entry[4]), estimated: entry[3] === '~' });
    } else if (block && SHARD_CLOSE.test(lines[index])) {
      block.close = index;
      block = null;
    }
  }
  return blocks;
}

/** True only if the line parse reproduces SHARDS exactly, which is the licence to rewrite the file. */
function blocksMatchManifest(blocks) {
  return (
    blocks !== null &&
    blocks.length === SHARDS.length &&
    blocks.every(
      (block, index) =>
        block.number === index + 1 &&
        block.close !== null &&
        block.entries.length === SHARDS[index].length &&
        block.entries.every((entry, position) => entry.feature === SHARDS[index][position]),
    )
  );
}

function totalOf(block) {
  return block.entries.reduce((sum, entry) => sum + entry.seconds, 0);
}

function formatTotal(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}m${String(whole % 60).padStart(2, '0')}s`;
}

/*
 * What a feature nobody has timed is worth. Zero would be the honest answer and the wrong one: a
 * shard whose total never grows wins every later comparison, so every future addition would pile
 * onto the same runner. The median of the measured features is the cheapest estimate that leaves a
 * shard which has taken one addition less attractive than its neighbours.
 */
function estimatedSeconds(blocks) {
  const measured = blocks
    .flatMap((block) => block.entries)
    .filter((entry) => !entry.estimated)
    .map((entry) => entry.seconds)
    .sort((a, b) => a - b);
  if (measured.length === 0) {
    return FALLBACK_ESTIMATE_SECONDS;
  }
  const middle = Math.floor(measured.length / 2);
  const median = measured.length % 2 === 0 ? (measured[middle - 1] + measured[middle]) / 2 : measured[middle];
  return Math.round(median * 10) / 10;
}

/*
 * Headers are recomputed, not left as they were: appending to a shard without touching its total
 * leaves a number that is quietly wrong, and those four numbers are what the next person reads to
 * pick a shard. How many estimates the total now includes is spelled out, so a header carrying a
 * guess cannot be mistaken for four measurements.
 */
function headerFor(block) {
  const estimates = block.entries.filter((entry) => entry.estimated).length;
  const note = estimates === 0 ? '' : ` (incl. ${estimates} estimated feature${estimates === 1 ? '' : 's'})`;
  return `${block.indent}// shard ${block.number} - ${formatTotal(totalOf(block))}${note}`;
}

/** The two drifts `--place` reports but will not repair; see the file header for why. */
function reportUnfixable(blocks) {
  const shardsByFeature = new Map();
  blocks.forEach((block) =>
    block.entries.forEach((entry) => {
      const shards = shardsByFeature.get(entry.feature) || [];
      shards.push(block.number);
      shardsByFeature.set(entry.feature, shards);
    }),
  );

  const notes = [
    ...[...shardsByFeature.entries()]
      .filter(([, shards]) => shards.length > 1)
      .map(
        ([feature, shards]) =>
          `  ${feature} is assigned to shards ${shards.join(', ')}; which one is the mistake is not arithmetic.`,
      ),
    ...[...shardsByFeature.keys()]
      .filter((feature) => !fs.existsSync(path.join(FEATURES_DIR, feature)))
      .sort()
      .map(
        (feature) =>
          `  ${feature} is assigned to a shard but is not on disk; dropping the entry is how a mistyped\n` +
          '    rename would take a feature out of CI without anything failing.',
      ),
  ];

  if (notes.length > 0) {
    console.info('ftest shards: left for `npm run lint` to report rather than repaired here:');
    console.info(notes.join('\n'));
  }
}

function place() {
  const lines = fs.readFileSync(__filename, 'utf8').split('\n');
  const blocks = parseShardBlocks(lines);

  if (!blocksMatchManifest(blocks)) {
    /*
     * Not fatal on purpose. This is the first step of `npm run format`, which has to keep working,
     * and `--check` still fails the lint on anything unassigned - so declining here costs someone a
     * manual edit, never a feature that silently stops running.
     */
    console.warn(
      `ftest shards: could not line-parse the manifest in ${path.relative(REPO_ROOT, __filename)}, so nothing\n` +
        '  was placed. Assign any new feature by hand; `npm run lint` will say if one is missing.',
    );
    return;
  }

  reportUnfixable(blocks);

  const assigned = new Set(blocks.flatMap((block) => block.entries.map((entry) => entry.feature)));
  const unplaced = fs
    .readdirSync(FEATURES_DIR)
    .filter((entry) => entry.endsWith('.feature'))
    .filter((feature) => !assigned.has(feature))
    .sort();
  if (unplaced.length === 0) {
    return;
  }

  const estimate = estimatedSeconds(blocks);
  unplaced.forEach((feature) => {
    /*
     * Recomputed after each placement, so several new features at once spread over several shards
     * instead of stacking on whichever one happened to be lightest to begin with. `reduce` with no
     * seed keeps the earlier block on a tie, which makes the choice depend only on the manifest.
     */
    const target = blocks.reduce((lightest, block) => (totalOf(block) < totalOf(lightest) ? block : lightest));
    target.entries.push({ feature, seconds: estimate, estimated: true });
    target.added += 1;
    console.info(
      `ftest shards: placed ${feature} on shard ${target.number} at an estimated ${estimate}s, ` +
        `taking that shard to ${formatTotal(totalOf(target))}.`,
    );
  });

  /* Bottom-up, so splicing one block cannot move the line numbers of the blocks above it. */
  const rewritten = lines.slice();
  [...blocks]
    .reverse()
    .filter((block) => block.added > 0)
    .forEach((block) => {
      const appended = block.entries
        .slice(block.entries.length - block.added)
        .map((entry) => `${block.entryIndent || `${block.indent}  `}'${entry.feature}', // ~${entry.seconds}s (est.)`);
      rewritten.splice(block.close, 0, ...appended);
      rewritten[block.header] = headerFor(block);
    });

  fs.writeFileSync(__filename, rewritten.join('\n'));
}

const [mode, value] = process.argv.slice(2);

switch (mode) {
  case '--check':
    check();
    break;
  case '--place':
    place();
    break;
  case '--specs':
    console.log(specsFor(value));
    break;
  default:
    console.error('Usage: node scripts/test/ftest/shards.js (--check | --place | --specs <shard>)');
    process.exit(2);
}

/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved.
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
 * Checks that the Designer catalog generator can read every Web UI and Nuxeo Elements file it depends on.
 *
 * The generator runs polymer-analyzer 3.2.4, whose parser rejects newer syntax such as `?.`, `??` or
 * `catch {}`. A file it cannot parse is silently dropped, together with the elements it defines and the
 * ones only reachable through it, and Studio Designer then reports "The element '...' does not exist"
 * (WEBUI-1922, WEBUI-2418). ESLint guards our own sources; this check also covers the published
 * @nuxeo/* packages in node_modules and anything ESLint cannot see.
 *
 * It analyzes the same entry points as the generator, with the same analyzer, and fails when:
 *   - a file cannot be parsed or loaded (warning codes `parse-error` and `could-not-load`), or
 *   - an element or behavior that was lost this way before is no longer found.
 *
 * Usage: node src/check-sources.js [web-ui-root]   (defaults to the repository this package lives in)
 */
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { Analyzer, Analysis, FsUrlLoader, PackageUrlResolver } = require('polymer-analyzer');

const catalogPackages = require('../data/applications/nuxeo/2023.0/catalog-packages.json');

const SYNTAX_WARNINGS = new Set(['parse-error', 'could-not-load']);

// Third-party code that is known not to parse and has no impact on the catalog. Matched on the file that
// failed: for `could-not-load` that is the imported file, not the importer.
const ALLOWED_FAILURES = [
  {
    file: /^node_modules\/marked\//,
    reason: "third-party 'marked' library imported by marked-element, which is still found",
  },
];

// Elements and behaviors that went missing from the catalog in WEBUI-1922 / WEBUI-2418.
const EXPECTED_ELEMENTS = [
  'nuxeo-announcement-banner',
  'nuxeo-announcement-management',
  'nuxeo-app',
  'nuxeo-audit-search',
  'nuxeo-csv-export-button',
  'nuxeo-document-activity',
  'nuxeo-document-create-shortcuts',
  'nuxeo-document-form-button',
  'nuxeo-document-grid-thumbnail',
  'nuxeo-document-info-bar',
  'nuxeo-document-list-item',
  'nuxeo-document-page',
  'nuxeo-expired-session',
  'nuxeo-internal-publish',
  'nuxeo-menu-icon',
  'nuxeo-menu-item',
  'nuxeo-mobile-banner',
  'nuxeo-note-editor',
  'nuxeo-offline-banner',
  'nuxeo-progress-indicator',
  'nuxeo-resize-handle',
  'nuxeo-results',
  'nuxeo-search-form',
  'nuxeo-sort-select',
  'nuxeo-tasks-list',
  'nuxeo-vocabulary-management',
  'paper-badge',
  'paper-drawer-panel',
];

const EXPECTED_BEHAVIORS = [
  'DocumentCreationBehavior',
  'Nuxeo.AnonymousBehavior',
  'Nuxeo.AppDrawerResizeBehavior',
  'Nuxeo.ChartDataBehavior',
  'Nuxeo.CreateButtonCollisionBehavior',
  'Nuxeo.InactivityBehavior',
  'Nuxeo.RecycledThumbnailBehavior',
  'Nuxeo.ScrollRestoreBehavior',
  'TooltipA11yBehavior',
];

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '..'));
const { sourcePaths } = catalogPackages.packages.find((pkg) => pkg.isApplication);

const info = (message) => process.stdout.write(`${message}\n`);

// Forward slashes on every OS, so paths match ALLOWED_FAILURES and read the same in CI and locally.
const toRepoPath = (url) => path.relative(root, fileURLToPath(url)).split(path.sep).join('/');

// A `could-not-load` warning is reported on the import statement of the importing file. Find the import it
// belongs to, so the file that actually failed to parse can be named.
function failedFile(warning, imports) {
  const { file, start } = warning.sourceRange;
  if (warning.code === 'could-not-load') {
    const imp = imports.find(
      (i) =>
        i.sourceRange?.file === file && i.sourceRange.start.line <= start.line && i.sourceRange.end.line >= start.line,
    );
    if (imp && imp.url) {
      return { file: toRepoPath(imp.url), importer: toRepoPath(file) };
    }
  }
  return { file: toRepoPath(file), importer: null };
}

async function main() {
  const missingEntries = sourcePaths.filter((p) => !fs.existsSync(path.join(root, p)));
  if (missingEntries.length) {
    throw new Error(`Catalog entry points not found under ${root}: ${missingEntries.join(', ')}`);
  }
  if (!fs.existsSync(path.join(root, 'node_modules', '@nuxeo', 'nuxeo-ui-elements'))) {
    throw new Error(`${root}/node_modules is not installed. Run npm ci in the Web UI root first.`);
  }

  // Same set-up as src/utils/analyze.js, which the catalog generator uses.
  Analysis.isExternal = () => false;
  const analyzer = new Analyzer({
    urlLoader: new FsUrlLoader(root),
    urlResolver: new PackageUrlResolver({ componentDir: 'node_modules', packageDir: root }),
    moduleResolution: 'node',
  });

  const started = Date.now();
  const analysis = await analyzer.analyze(sourcePaths);
  const imports = [...analysis.getFeatures({ kind: 'import', externalPackages: true })];

  // One entry per failing file: the analyzer warns once per importer when a file is imported from several places.
  const failures = new Map();
  const allowed = new Map();
  analysis
    .getWarnings()
    .filter((w) => SYNTAX_WARNINGS.has(w.code))
    .forEach((warning) => {
      const { file, importer } = failedFile(warning, imports);
      const rule = ALLOWED_FAILURES.find((a) => a.file.test(file));
      const target = rule ? allowed : failures;
      if (!target.has(file)) {
        target.set(file, { file, code: warning.code, message: warning.message.split('\n')[0], importers: [] });
      }
      if (rule) {
        target.get(file).reason = rule.reason;
      }
      if (importer && !target.get(file).importers.includes(importer)) {
        target.get(file).importers.push(importer);
      }
    });

  const elements = new Set([...analysis.getFeatures({ kind: 'element' })].map((e) => e.tagName).filter(Boolean));
  const behaviors = new Set([...analysis.getFeatures({ kind: 'behavior' })].map((b) => b.name));
  const missingElements = EXPECTED_ELEMENTS.filter((tag) => !elements.has(tag));
  const missingBehaviors = EXPECTED_BEHAVIORS.filter((name) => !behaviors.has(name));

  info(`Analyzed ${sourcePaths.length} catalog entry points in ${Date.now() - started} ms:`);
  info(`  ${elements.size} elements, ${behaviors.size} behaviors`);
  allowed.forEach((a) => info(`  allowed: ${a.file} (${a.reason})`));

  if (!failures.size && !missingElements.length && !missingBehaviors.length) {
    info('OK: every file parses and every expected element and behavior is found.');
    return 0;
  }

  if (failures.size) {
    console.error(`\nFiles polymer-analyzer cannot read (${failures.size}):`);
    failures.forEach((f) => {
      console.error(`  ${f.file}`);
      if (f.importers.length) {
        console.error(`    imported by ${f.importers.join(', ')}`);
      }
      console.error(`    ${f.code}: ${f.message}`);
    });
  }
  if (missingElements.length) {
    console.error(`\nExpected elements not found: ${missingElements.join(', ')}`);
  }
  if (missingBehaviors.length) {
    console.error(`\nExpected behaviors not found: ${missingBehaviors.join(', ')}`);
  }
  console.error(
    '\nThe Designer catalog would lose these files and the elements they define (WEBUI-2418). Rewrite syntax ' +
      'such as ?., ?? or catch {} with explicit guards (see AGENTS.md). If the file is in a @nuxeo package, ' +
      'fix it in nuxeo-elements and update package-lock.json to a version that contains the fix.',
  );
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err.stack || err);
    process.exitCode = 2;
  });

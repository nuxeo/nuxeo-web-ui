#!/usr/bin/env node
/**
 * Post-process Web Test Runner lcov output to match legacy Karma coverage scope.
 *
 * Native V8 coverage only includes modules executed in the browser. Karma + Istanbul also
 * listed every path from coverage-imports-data.js (including modules that fail to load),
 * typically at 0% — that keeps the overall percentage honest (~60% vs ~91% executed-only).
 *
 * Run automatically after `web-test-runner --coverage` (see npm test).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../../..');
const lcovFile = path.join(root, 'coverage', 'lcov.info');
const manifestFile = path.join(root, 'test', 'coverage-imports-data.js');

function loadManifestPaths() {
  const source = fs.readFileSync(manifestFile, 'utf8');
  const match = source.match(/export const coverageModulePaths = (\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error(`Could not parse coverageModulePaths from ${manifestFile}`);
  }
  return JSON.parse(match[1]);
}

function normalizeLcovPath(sfLine) {
  const raw = sfLine.slice(3).trim().replace(/\\/g, '/');
  if (path.isAbsolute(raw)) {
    return path.relative(root, raw).replace(/\\/g, '/');
  }
  return raw;
}

function readExistingLcovPaths(lcov) {
  const covered = new Set();
  for (const line of lcov.split('\n')) {
    if (line.startsWith('SF:')) {
      covered.add(normalizeLcovPath(line));
    }
  }
  return covered;
}

function buildZeroRecord(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    // eslint-disable-next-line no-console
    console.warn('inject-zero-coverage: source missing on disk, skipping %s', relativePath);
    return null;
  }

  const lines = fs.readFileSync(absolutePath, 'utf8').split('\n');
  const parts = [`SF:${relativePath}`];
  for (let i = 0; i < lines.length; i += 1) {
    parts.push(`DA:${i + 1},0`);
  }
  parts.push(`LF:${lines.length}`);
  parts.push('LH:0');
  parts.push('FNF:0');
  parts.push('FNH:0');
  parts.push('BRF:0');
  parts.push('BRH:0');
  parts.push('end_of_record');
  return parts.join('\n');
}

function summarizeLcov(lcov) {
  let lf = 0;
  let lh = 0;
  for (const line of lcov.split('\n')) {
    if (line.startsWith('LF:')) {
      lf += Number(line.slice(3));
    } else if (line.startsWith('LH:')) {
      lh += Number(line.slice(3));
    }
  }
  const pct = lf > 0 ? (100 * lh) / lf : 0;
  return { lf, lh, pct };
}

function main() {
  if (!fs.existsSync(lcovFile)) {
    throw new Error(`Missing ${lcovFile}. Run web-test-runner --coverage first.`);
  }

  const manifestPaths = loadManifestPaths();
  const lcov = fs.readFileSync(lcovFile, 'utf8');
  const covered = readExistingLcovPaths(lcov);
  const missing = manifestPaths.filter((p) => !covered.has(p));

  if (missing.length === 0) {
    const { pct } = summarizeLcov(lcov);
    // eslint-disable-next-line no-console
    console.log(`inject-zero-coverage: manifest fully represented (${covered.size} files, ${pct.toFixed(2)}% lines)`);
    return;
  }

  const before = summarizeLcov(lcov);
  const records = missing.map((relativePath) => buildZeroRecord(relativePath)).filter(Boolean);

  const updated = `${lcov.trim()}\n${records.join('\n')}\n`;
  fs.writeFileSync(lcovFile, updated, 'utf8');

  const after = summarizeLcov(updated);
  // eslint-disable-next-line no-console
  console.log(
    `inject-zero-coverage: added ${records.length} zero-coverage records ` +
      `(${covered.size} → ${covered.size + records.length} files, ` +
      `${before.pct.toFixed(2)}% → ${after.pct.toFixed(2)}% lines)`,
  );
}

main();

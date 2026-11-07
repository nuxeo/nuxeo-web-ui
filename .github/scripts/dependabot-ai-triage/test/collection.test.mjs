import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLockfile, analyzeManifest, resolveDependency, vulnerableParents } from '../lib/lockfile.mjs';
import { combinedRange, fingerprint, normalizeAlert, reconcile } from '../lib/reconcile.mjs';
import { compareVersions, digest, highestSeverity, inAdvisoryRange, quarterExpired, textOf } from '../lib/util.mjs';
import { extractJson } from '../plan.mjs';
import { mentions, npmSummary, toTicket } from '../collect.mjs';
import { nextLink } from '../lib/clients.mjs';
import { EL, WEB, liveAlerts, registerTickets } from './fixtures.mjs';

const lock = {
  lockfileVersion: 3,
  packages: {
    '': { name: 'root', devDependencies: { glob: '^7.0.0', webpack: '^5.0.0' }, overrides: { minimatch: '^3.1.4' } },
    'node_modules/minimatch': { version: '3.1.2', dev: true },
    'node_modules/glob': { version: '7.2.3', dev: true, dependencies: { minimatch: '^3.1.1' } },
    'node_modules/webpack': { version: '5.0.0', dev: true, dependencies: { watchpack: '^2.0.0' } },
    'node_modules/watchpack': { version: '2.4.0', dev: true, dependencies: { glob: '^10.0.0' } },
    'node_modules/watchpack/node_modules/glob': { version: '10.3.0', dev: true, dependencies: { minimatch: '^9.0.1' } },
    'node_modules/watchpack/node_modules/minimatch': { version: '9.0.3', dev: true },
    'node_modules/@scope/tool': { version: '1.0.0', dependencies: { minimatch: '^10.0.0' } },
    'node_modules/@scope/tool/node_modules/minimatch': { version: '10.0.1' },
    ui: { name: '@nuxeo/ui', dependencies: { moment: '^2.30.1' } },
    'node_modules/@nuxeo/ui': { resolved: 'ui', link: true },
    'node_modules/moment': { version: '2.30.1' },
  },
};

test('resolves nested, scoped and workspace dependencies like Node does', () => {
  assert.equal(resolveDependency(lock.packages, 'node_modules/glob', 'minimatch'), 'node_modules/minimatch');
  assert.equal(
    resolveDependency(lock.packages, 'node_modules/watchpack/node_modules/glob', 'minimatch'),
    'node_modules/watchpack/node_modules/minimatch',
  );
  assert.equal(
    resolveDependency(lock.packages, 'node_modules/@scope/tool', 'minimatch'),
    'node_modules/@scope/tool/node_modules/minimatch',
  );
  assert.equal(resolveDependency(lock.packages, 'ui', 'moment'), 'node_modules/moment');
  assert.equal(resolveDependency(lock.packages, '', 'absent'), null);
});

test('lockfile analysis reports every resolved instance, its range status and dependents', () => {
  const analysis = analyzeLockfile({ lock, name: 'minimatch', vulnerableRange: '< 3.1.3 || >= 9.0.0, < 9.0.7' });
  assert.equal(analysis.instances.length, 3);
  const byPath = Object.fromEntries(analysis.instances.map((instance) => [instance.path, instance]));
  assert.equal(byPath['node_modules/minimatch'].vulnerable, true);
  assert.equal(byPath['node_modules/watchpack/node_modules/minimatch'].vulnerable, true);
  assert.equal(byPath['node_modules/@scope/tool/node_modules/minimatch'].vulnerable, false);
  assert.deepEqual(
    byPath['node_modules/minimatch'].dependents.map((dependent) => `${dependent.name}@${dependent.range}`),
    ['glob@^3.1.1'],
  );
  assert.equal(analysis.vulnerableInstances, 2);
  assert.deepEqual(analysis.overrides, [{ path: 'minimatch', value: '^3.1.4' }]);
  assert.deepEqual(vulnerableParents(analysis).sort(), ['glob']);
});

test('workspace dependents and package.json manifests are reported', () => {
  const moment = analyzeLockfile({ lock, name: 'moment', vulnerableRange: '< 2.31.0' });
  assert.deepEqual(
    moment.instances[0].dependents.map((dependent) => dependent.name),
    ['@nuxeo/ui'],
  );
  const manifest = analyzeManifest({
    manifest: { name: '@nuxeo/ui', dependencies: { moment: '^2.30.1' } },
    name: 'moment',
  });
  assert.deepEqual(manifest.declarations, [{ field: 'dependencies', spec: '^2.30.1' }]);
  assert.equal(analyzeLockfile({ lock: { dependencies: {} }, name: 'x' }).supported, false);
});

test('advisory ranges and versions compare like semver', () => {
  assert.equal(inAdvisoryRange('9.0.6', '>= 9.0.0, < 9.0.7'), true);
  assert.equal(inAdvisoryRange('9.0.7', '>= 9.0.0, < 9.0.7'), false);
  assert.equal(inAdvisoryRange('2.30.1', '< 2.31.0'), true);
  assert.equal(inAdvisoryRange('1.0.0', '= 1.0.0'), true);
  assert.equal(inAdvisoryRange('not-a-version', '< 1.0.0'), null);
  assert.equal(compareVersions('1.0.0-beta.2', '1.0.0'), -1);
  assert.equal(compareVersions('1.0.0-beta.10', '1.0.0-beta.2'), 1);
  assert.equal(highestSeverity(['low', 'critical', 'medium']), 'critical');
  assert.equal(quarterExpired('2026-Q4', new Date('2026-12-31T23:59:59Z')), false);
  assert.equal(quarterExpired('2026-Q4', new Date('2027-01-01T00:00:00Z')), true);
  assert.equal(quarterExpired('bogus', new Date()), true);
  assert.equal(digest({ b: 1, a: [2, { d: 3, c: 4 }] }), digest({ a: [2, { c: 4, d: 3 }], b: 1 }));
  assert.equal(
    textOf({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] }),
    'a\n',
  );
});

test('normalizes GitHub alerts and keeps the current severity', () => {
  const alert = normalizeAlert(WEB, {
    number: 1,
    html_url: 'https://github.com/x',
    state: 'open',
    dependency: { package: { name: 'qs', ecosystem: 'npm' }, manifest_path: 'package-lock.json', scope: 'runtime' },
    security_advisory: { ghsa_id: 'GHSA-1', severity: 'medium', identifiers: [{ type: 'CVE', value: 'CVE-1' }] },
    security_vulnerability: {
      severity: 'high',
      vulnerable_version_range: '< 6.16.1',
      first_patched_version: { identifier: '6.16.1' },
    },
  });
  assert.equal(alert.severity, 'high');
  assert.equal(alert.cve, 'CVE-1');
  assert.equal(alert.firstPatched, '6.16.1');
});

test('reconcile: recorded ownership covers alerts exactly; only unrecorded alerts reach the planner', () => {
  const alerts = liveAlerts();
  const tickets = registerTickets({ withOwnership: true, fingerprintOf: fingerprint });
  const result = reconcile({ alerts, tickets, previousState: null });
  assert.equal(result.covered.length, 23);
  assert.deepEqual(result.unowned, [`${EL}#299`]);
  assert.equal(result.changed.length, 0);
  assert.equal(result.firstReconciliation, true);
});

test('reconcile: severity increases, changed fingerprints, closed owners and duplicates are surfaced', () => {
  const alerts = liveAlerts();
  const tickets = registerTickets({ withOwnership: true, fingerprintOf: fingerprint });
  alerts.find((alert) => alert.number === 643).severity = 'high';
  alerts.find((alert) => alert.number === 607).firstPatched = '5.0.0';
  tickets.find((ticket) => ticket.key === 'WEBUI-2384').statusCategory = 'done';
  const elements = tickets.find((ticket) => ticket.key === 'ELEMENTS-2144');
  tickets.find((ticket) => ticket.key === 'ELEMENTS-2124').ownership.alerts[296] = elements.ownership.alerts[296];
  const result = reconcile({ alerts, tickets, previousState: { pendingUnowned: [] } });
  assert.deepEqual(result.severityRaises, [
    { ticket: 'WEBUI-2431', from: 'medium', to: 'high', alerts: [`${WEB}#643`] },
  ]);
  assert.deepEqual(result.changed.map((item) => item.id).sort(), [`${WEB}#607`, `${WEB}#643`].sort());
  assert.deepEqual(result.closedMismatches, [{ id: `${WEB}#542`, tickets: ['WEBUI-2384'] }]);
  assert.deepEqual(result.ambiguous[0].tickets.sort(), ['ELEMENTS-2124', 'ELEMENTS-2144']);
});

test('reconcile: unowned alerts are split into new and carried over', () => {
  const alerts = liveAlerts();
  const result = reconcile({ alerts, tickets: [], previousState: { pendingUnowned: [`${EL}#299`] } });
  assert.equal(result.newlyUnowned.length, 23);
  assert.deepEqual(result.carriedUnowned, [`${EL}#299`]);
  assert.equal(result.firstReconciliation, false);
});

test('reconcile: owned alerts that closed on GitHub are listed for state lookup', () => {
  const alerts = liveAlerts().filter((alert) => alert.number !== 299);
  const tickets = registerTickets({ withOwnership: true, fingerprintOf: fingerprint });
  tickets[0].ownership.alerts[100] = { fingerprint: 'x' };
  const result = reconcile({ alerts, tickets, previousState: null });
  assert.deepEqual(result.ownedNotOpen, [{ id: `${WEB}#100`, tickets: ['WEBUI-2431'] }]);
});

test('planner reply parsing tolerates fences and rejects non-JSON', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Here:\n{"a":{"b":2}}'), { a: { b: 2 } });
  assert.throws(() => extractJson('no json here'));
});

test('GitHub Link pagination is followed only through rel="next"', () => {
  const header = '<https://api.github.com/x?after=b>; rel="next", <https://api.github.com/x?before=a>; rel="prev"';
  assert.equal(nextLink(header), 'https://api.github.com/x?after=b');
  assert.equal(nextLink('<https://api.github.com/x?before=a>; rel="prev"'), null);
  assert.equal(nextLink(null), null);
});

test('candidate matching uses package word boundaries and advisory identifiers, not substrings', () => {
  const alert = {
    package: 'glob',
    ghsa: 'GHSA-3g3m-2fjr-6pw4',
    cve: null,
    url: 'https://github.com/a/b/security/dependabot/1',
  };
  const ticket = (summary, description = '') => {
    return { summary, description };
  };
  assert.equal(mentions(ticket('Refresh glob in ftest'), alert), true);
  assert.equal(mentions(ticket('Fix minimatch globparts amplification'), alert), false);
  assert.equal(mentions(ticket('Other', 'Covers GHSA-3G3M-2FJR-6PW4'), alert), true);
  assert.equal(mentions(ticket('Refresh @types/glob typings'), alert), false);
});

test('Jira issues map to tickets with status category, severity and ownership', () => {
  const config = {
    holdStatus: 'On Hold',
    severityField: 'customfield_12201',
    severityOf: (id) => ({ 15790: 'medium' })[id] ?? null,
  };
  const ticket = toTicket(
    {
      key: 'WEBUI-2430',
      fields: {
        summary: 'moment',
        status: { name: 'On Hold', statusCategory: { key: 'new' } },
        customfield_12201: { id: '15790' },
        parent: { key: 'NXENG-987' },
        issuelinks: [{ type: { inward: 'is blocked by', outward: 'blocks' }, inwardIssue: { key: 'ELEMENTS-2124' } }],
      },
      properties: { 'dependabot-ai-triage-ownership': { repository: WEB, alerts: { 517: {} } } },
    },
    config,
  );
  assert.equal(ticket.onHold, true);
  assert.equal(ticket.severity, 'medium');
  assert.deepEqual(ticket.links, [{ type: 'is blocked by', key: 'ELEMENTS-2124', status: undefined }]);
  assert.deepEqual(Object.keys(ticket.ownership.alerts), ['517']);
});

test('npm facts report the lowest fixed release per vulnerable major using every advisory range', () => {
  const packument = {
    'dist-tags': { latest: '10.0.3' },
    versions: { '3.1.2': {}, '3.1.4': {}, '9.0.5': {}, '9.0.7': {}, '10.0.3': {}, '11.0.0-rc.1': {}, '5.0.0': {} },
  };
  const alert = {
    firstPatched: '3.1.4',
    advisoryRanges: [
      { range: '< 3.1.4', firstPatched: '3.1.4' },
      { range: '>= 9.0.0, < 9.0.7', firstPatched: '9.0.7' },
      { range: '>= 5.0.0, < 6.0.0', firstPatched: null },
    ],
  };
  const instances = [
    { version: '3.1.2', vulnerable: true },
    { version: '9.0.5', vulnerable: true },
    { version: '5.0.0', vulnerable: true },
    { version: '10.0.3', vulnerable: false },
  ];
  const summary = npmSummary(packument, alert, instances);
  assert.equal(summary.firstPatchedPublished, true);
  assert.equal(summary.latestIsVulnerable, false);
  assert.deepEqual(summary.lowestFixPerVulnerableMajor, { 3: '3.1.4', 9: '9.0.7', 5: null });
});

test('advisories with one range per major mark every affected instance', () => {
  const alert = normalizeAlert(WEB, {
    number: 2,
    dependency: { package: { name: 'minimatch', ecosystem: 'npm' }, manifest_path: 'package-lock.json' },
    security_advisory: {
      ghsa_id: 'GHSA-2',
      severity: 'medium',
      vulnerabilities: [
        {
          package: { name: 'minimatch' },
          vulnerable_version_range: '< 3.1.3',
          first_patched_version: { identifier: '3.1.3' },
        },
        {
          package: { name: 'minimatch' },
          vulnerable_version_range: '>= 9.0.0, < 9.0.7',
          first_patched_version: { identifier: '9.0.7' },
        },
      ],
    },
    security_vulnerability: { vulnerable_version_range: '< 3.1.3', first_patched_version: { identifier: '3.1.3' } },
  });
  const analysis = analyzeLockfile({ lock, name: 'minimatch', vulnerableRange: combinedRange(alert) });
  assert.equal(analysis.vulnerableInstances, 2);
  assert.equal(alert.anyPatchPublished, true);
});

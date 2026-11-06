import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessLock,
  card,
  changedSince,
  description,
  groupFindings,
  highest,
  matchFinding,
  normalize,
  textOf,
} from './core.mjs';

const repo = 'nuxeo/nuxeo-web-ui';
const finding = (extra = {}) => {
  return {
    id: `${repo}#123`,
    repository: repo,
    project: 'WEBUI',
    severityField: 'customfield_12201',
    url: `https://github.com/${repo}/security/dependabot/123`,
    number: 123,
    package: 'example',
    ecosystem: 'npm',
    manifest: 'package-lock.json',
    severity: 'medium',
    ghsa: 'GHSA-example',
    cve: 'CVE-example',
    range: '>=1.0.0 <1.2.0',
    patched: '1.2.0',
    branchEvidence: { 'develop-2023': { blocked: false }, 'develop-2025': { blocked: false } },
    ...extra,
  };
};
const issue = (f, extra = {}) => {
  return {
    key: 'WEBUI-1',
    fields: {
      description: `### Findings\n${f.url} ${f.ghsa} ${f.package} ${f.manifest}`,
      status: { name: 'Open', statusCategory: { key: 'new' } },
      customfield_12201: { value: 'Medium' },
      ...extra,
    },
  };
};
const lock = () => {
  return {
    packages: { '': { dependencies: { example: '^1.0.0' } }, 'node_modules/example': { version: '1.1.0' } },
  };
};
const config = { timezone: 'Asia/Kolkata', jiraSite: 'https://hyland.atlassian.net', epic: 'NXENG-987' };
const report = () => {
  return {
    id: 'test',
    started: '2026-11-06T07:30:00Z',
    alerts: [],
    covered: [],
    failures: [],
    review: [],
    newFindings: [],
    groups: [],
    blockers: [],
  };
};

test('Critical always dominates grouped severity', () => {
  assert.equal(highest(['low', 'critical', 'high']), 'critical');
  const groups = groupFindings([finding(), finding({ number: 124, severity: 'critical' })]);
  assert.equal(groups[0].severity, 'critical');
});
test('same CVE/package never groups across repositories', () => {
  assert.equal(groupFindings([finding(), finding({ repository: 'nuxeo/nuxeo-elements' })]).length, 2);
});
test('unrelated dependencies are separate even at identical severity', () => {
  assert.equal(groupFindings([finding(), finding({ package: 'other' })]).length, 2);
});
test('no-patch and actionable findings are kept separate', () => {
  const blocked = finding({ patched: null, branchEvidence: { a: { blocked: true, reason: 'No patch' } } });
  assert.equal(groupFindings([finding(), blocked]).length, 2);
});
test('absence of a patch does not infer a nonexistent upgrade', () => {
  assert.equal(assessLock(finding({ patched: null }), lock(), {}, {}).noPatch, true);
});
test('exact pins block routine lockfile refresh despite published patch', () => {
  const tree = lock();
  tree.packages[''].dependencies.example = '1.1.0';
  assert.equal(assessLock(finding(), tree, { engines: { node: '>=22.13' } }, {}).blocked, true);
});
test('in-range patch is a candidate, never claims compatibility tests passed', () => {
  const result = assessLock(finding(), lock(), { engines: { node: '>=22.13' } }, { engines: { node: '>=20' } });
  assert.equal(result.blocked, false);
  assert.match(result.reason, /tests still required/);
});
test('engine floor incompatible with declared support blocks upgrade', () => {
  assert.equal(
    assessLock(finding(), lock(), { engines: { node: '>=18' } }, { engines: { node: '>=22' } }).blocked,
    true,
  );
});
test('all nested affected instances must be examined', () => {
  const tree = lock();
  tree.packages['node_modules/parent'] = { dependencies: { example: '1.1.0' } };
  tree.packages['node_modules/parent/node_modules/example'] = { version: '1.1.0' };
  assert.equal(assessLock(finding(), tree, {}, {}).blocked, true);
});
test('related/out-of-scope ticket references do not establish coverage', () => {
  const f = finding();
  const other = issue(f, {
    description: `### Summary\nDifferent work\n### Related work\n${f.url} ${f.ghsa} ${f.package} ${f.manifest}`,
  });
  assert.equal(matchFinding(f, [other]).kind, 'new');
});
test('alert 123 is not matched to alert 1234', () => {
  const f = finding();
  const other = issue(f, { description: `${f.url}4 ${f.ghsa} ${f.package} ${f.manifest}` });
  assert.equal(matchFinding(f, [other]).kind, 'ambiguous');
});
test('closed ticket with open alert is reported for review', () => {
  const f = finding();
  assert.equal(matchFinding(f, [issue(f, { status: { statusCategory: { key: 'done' } } })]).kind, 'closed');
});
test('lower ticket severity is an update proposal, never covered', () => {
  const f = finding({ severity: 'critical' });
  assert.equal(matchFinding(f, [issue(f)]).kind, 'update');
});
test('scan-start overlap includes findings raised after a prior run', () => {
  const f = finding({ fingerprint: 'unchanged', created: '2026-11-05T10:01:00Z', updated: '2026-11-05T10:01:00Z' });
  assert.equal(changedSince(f, '2026-11-05T10:00:00Z', 24, { [f.id]: 'unchanged' }), true);
});
test('material fingerprint changes override age filtering', () => {
  const f = finding({ fingerprint: 'changed', created: '2025-01-01T00:00:00Z', updated: '2025-01-01T00:00:00Z' });
  assert.equal(changedSince(f, '2026-11-05T10:00:00Z', 24, { [f.id]: 'old' }), true);
});
test('incomplete scans never claim no new findings or use success humor', () => {
  const r = report();
  r.failures.push('Jira unavailable');
  const output = JSON.stringify(card(r, config, 'preview'));
  assert.match(output, /Scan incomplete/);
  assert.doesNotMatch(output, /No new untriaged Dependabot findings were identified|bugs took the day off/);
});
test('ambiguous scans distinguish uncertain coverage from a clean scan', () => {
  const r = report();
  r.review.push('Ambiguous match');
  const output = JSON.stringify(card(r, config, 'preview'));
  assert.doesNotMatch(output, /No new untriaged Dependabot findings were identified/);
});
test('real zero-findings message uses approved wording', () => {
  assert.match(
    JSON.stringify(card(report(), config, 'preview')),
    /No new untriaged Dependabot findings were identified/,
  );
});
test('ticket description preserves each individual severity and alert link', () => {
  const groups = groupFindings([finding(), finding({ severity: 'low', number: 124 })]);
  const output = textOf(description(groups[0], config));
  assert.match(output, /medium/);
  assert.match(output, /low/);
  assert.match(output, /security\/dependabot\/123/);
});
test('alert fingerprints include material advisory changes', () => {
  const raw = {
    number: 1,
    html_url: 'https://github.com/a/b/security/dependabot/1',
    created_at: '2026-01-01T00:00:00Z',
    dependency: { package: { name: 'example', ecosystem: 'npm' }, manifest_path: 'package-lock.json' },
    security_advisory: { severity: 'low', ghsa_id: 'GHSA-test', summary: 'test' },
    security_vulnerability: { vulnerable_version_range: '<1.2.0', first_patched_version: null },
  };
  const before = normalize(repo, raw);
  raw.security_advisory.severity = 'critical';
  assert.notEqual(before.fingerprint, normalize(repo, raw).fingerprint);
});

// Execute the actual CLI phases with a network fixture; no real credentials or services are used.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function fixtureRun(failure) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dependabot-triage-test-'));
  const hook = path.join(folder, 'fetch.mjs');
  fs.writeFileSync(
    hook,
    `
    globalThis.fetch = async (url, options = {}) => {
      const value = String(url);
      if (value.includes('/issue/NXENG-987')) return Response.json({ fields: { issuetype: { name: 'Epic' }, status: { statusCategory: { key: 'new' } } } });
      if (value.endsWith('/search/jql') && options.method === 'POST') return Response.json({ issues: [], isLast: true });
      if (value.includes('/dependabot/alerts?')) return ${failure ? 'new Response("fixture failure", { status: 503 })' : 'Response.json([])'};
      throw new Error('Unexpected fixture request; external network disabled');
    };
  `,
  );
  const script = fileURLToPath(new URL('./run.mjs', import.meta.url));
  const env = {
    ...process.env,
    TRIAGE_MODE: 'preview',
    TRIAGE_STATE_DIR: folder,
    GH_TOKEN: 'fixture-only',
    JIRA_EMAIL: 'fixture@example.invalid',
    JIRA_API_TOKEN: 'fixture-only',
    SECURITY_EPIC: 'NXENG-987',
    SECURITY_EPIC_QUARTER: '2026-Q4',
  };
  const phase = (name, overrides = {}) =>
    spawnSync(process.execPath, ['--import', hook, script, name], { env: { ...env, ...overrides }, encoding: 'utf8' });
  return { folder, phase };
}
test('CLI preview runs scan/apply/finish without writes or automatic checkpoint advancement', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    assert.equal(phase('scan').status, 0);
    assert.equal(phase('apply').status, 0);
    assert.equal(phase('finish').status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.ok(saved.checkpoints.preview);
    assert.equal(saved.checkpoints.automatic, undefined);
    assert.equal(saved.active, null);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test('CLI source failure produces incomplete report and never saves a successful checkpoint', () => {
  const { folder, phase } = fixtureRun(true);
  try {
    assert.equal(phase('scan').status, 0);
    assert.equal(phase('finish').status, 1);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.deepEqual(saved.checkpoints, {});
    const output = fs.readFileSync(path.join(folder, 'report.md'), 'utf8');
    assert.match(output, /INCOMPLETE/);
    const payload = fs.readFileSync(path.join(folder, 'teams-payload.json'), 'utf8');
    assert.doesNotMatch(payload, /No new untriaged Dependabot findings were identified/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test('one-time gate skips future dates and dates already completed', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    const output = path.join(folder, 'output');
    const overrides = {
      SCHEDULE_TRIGGER: '30 * * * *',
      GITHUB_OUTPUT: output,
      TRIAGE_ONE_TIME_AT: '2099-01-01T00:00:00Z',
    };
    assert.equal(phase('gate', overrides).status, 0);
    assert.match(fs.readFileSync(output, 'utf8'), /run=false/);
    fs.writeFileSync(
      path.join(folder, 'state.json'),
      JSON.stringify({ version: 1, checkpoints: {}, receipts: {}, oneTimeCompleted: '2025-01-01T00:00:00Z' }),
    );
    assert.equal(phase('gate', { ...overrides, TRIAGE_ONE_TIME_AT: '2025-01-01T00:00:00Z' }).status, 0);
    assert.equal(fs.readFileSync(output, 'utf8').split('run=false').length, 3);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test('related advisories with different patch minimums share one compatible remediation group', () => {
  const groups = groupFindings([finding(), finding({ patched: '1.3.0', range: '>=1.0.0 <1.3.0' })]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].findings.length, 2);
});

test('automatic apply refuses partial source results before any Jira write', () => {
  const { folder, phase } = fixtureRun(true);
  try {
    const automatic = {
      TRIAGE_MODE: 'automatic',
      ALLOW_AUTOMATIC: 'true',
      GITHUB_REF_NAME: 'develop-2023',
      DEFAULT_BRANCH: 'develop-2023',
    };
    assert.equal(phase('scan', automatic).status, 0);
    const filename = path.join(folder, 'report.json');
    const partial = JSON.parse(fs.readFileSync(filename));
    partial.groups = [{ key: 'must-not-be-created' }];
    fs.writeFileSync(filename, JSON.stringify(partial));
    assert.equal(phase('apply', automatic).status, 0);
    const saved = JSON.parse(fs.readFileSync(filename));
    assert.equal(saved.failures.length, 1);
    assert.doesNotMatch(saved.failures.join(' '), /Jira processing/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test('state restore paginates past unrelated CI artifacts before declaring no checkpoint', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    fs.writeFileSync(
      path.join(folder, 'fetch.mjs'),
      `
      globalThis.fetch = async (url) => {
        const page = new URL(url).searchParams.get('page');
        if (page === '1') return Response.json({ artifacts: Array.from({length: 100}, () => ({name: 'other-ci-artifact'})) });
        if (page === '2') return new Response('', {status: 503});
        throw new Error('Unexpected page');
      };
    `,
    );
    const result = phase('restore', { GITHUB_REPOSITORY: repo, DEFAULT_BRANCH: 'develop-2023' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /HTTP 503/);
    assert.doesNotMatch(result.stdout, /No retained state/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('automatic summary does not call an unprocessed proposal a created ticket', () => {
  const value = report();
  value.groups = [{ package: 'never-created-package', severity: 'medium', summary: 'Pending', blocked: false }];
  value.failures = ['Jira unavailable'];
  const output = JSON.stringify(card(value, config, 'automatic'));
  assert.doesNotMatch(output, /never-created-package/);
  assert.doesNotMatch(output, /Tickets created/);
});

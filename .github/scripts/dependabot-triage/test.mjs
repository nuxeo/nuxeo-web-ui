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
    SECURITY_EPIC_QUARTER: (() => {
      const date = new Date().toLocaleDateString('en-CA', { timeZone: config.timezone });
      return `${date.slice(0, 4)}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`;
    })(),
  };
  const phase = (name, overrides = {}) =>
    spawnSync(process.execPath, ['--import', hook, script, name], { env: { ...env, ...overrides }, encoding: 'utf8' });
  return { folder, phase, hook };
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
test('different patch targets remain separate until a common compatible target is verified', () => {
  const groups = groupFindings([finding(), finding({ patched: '1.3.0', range: '>=1.0.0 <1.3.0' })]);
  assert.equal(groups.length, 2);
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

const automatic = {
  TRIAGE_MODE: 'automatic',
  ALLOW_AUTOMATIC: 'true',
  GITHUB_REF_NAME: 'develop-2023',
  DEFAULT_BRANCH: 'develop-2023',
};
function seed(folder, name, value) {
  fs.writeFileSync(path.join(folder, name), JSON.stringify(value));
}
test('ADF Out of scope heading excludes an explicitly unowned alert', () => {
  const f = finding();
  const ticket = issue(f, {
    description: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Other remediation' }] },
        { type: 'heading', content: [{ type: 'text', text: 'Out of scope' }] },
        { type: 'paragraph', content: [{ type: 'text', text: `${f.url} ${f.ghsa} ${f.package} ${f.manifest}` }] },
      ],
    },
  });
  assert.equal(matchFinding(f, [ticket]).kind, 'new');
});
test('installed peer contracts can block an otherwise in-range patch', () => {
  const tree = lock();
  tree.packages['node_modules/plugin'] = { peerDependencies: { example: '<1.2.0' } };
  assert.equal(assessLock(finding(), tree, {}, {}).blocked, true);
});
test('notification completion does not discard an unresolved Jira create intent', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    seed(folder, 'state.json', {
      version: 1,
      checkpoints: {},
      fingerprints: {},
      receipts: {},
      active: {
        mode: 'automatic',
        attempt: 'old-1',
        originRun: 'old',
        plannedKeys: ['pending-create'],
        notification: { status: 'confirmed' },
      },
    });
    assert.equal(phase('scan', automatic).status, 0);
    let state = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.equal(state.createIntents['pending-create'].attempt, 'old-1');
    assert.equal(phase('apply', automatic).status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.match(saved.failures.join(' '), /Uncertain prior create/);
    state = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.ok(state.createIntents['pending-create']);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
for (const resolution of ['delivered', 'not-delivered']) {
  test(`delivery recovery (${resolution}) uses the original snapshot without scanning new content`, () => {
    const { folder, phase, hook } = fixtureRun(false);
    try {
      const original = report();
      original.id = 'original-notification';
      const payload = { originalPayload: true };
      seed(folder, 'state.json', {
        version: 1,
        checkpoints: {},
        fingerprints: {},
        receipts: {},
        active: {
          id: original.id,
          started: original.started,
          mode: 'automatic',
          attempt: 'old-1',
          notification: { status: 'reserved', attempt: 'old-1', snapshot: original, payload },
        },
      });
      fs.writeFileSync(
        hook,
        `
        import fs from 'node:fs';
        globalThis.fetch = async (url, options) => {
          if (String(url) !== 'https://example.invalid/webhook') throw new Error('No source scan is allowed during recovery');
          fs.writeFileSync(${JSON.stringify(path.join(folder, 'sent.json'))}, options.body);
          return new Response(null, {status: 204});
        };
      `,
      );
      const env = {
        ...automatic,
        DELIVERY_RESOLUTION: resolution,
        DELIVERY_MESSAGE_URL: 'https://teams.microsoft.com/message/original',
        DEPENDABOT_TEAMS_WEBHOOK_URL: 'https://example.invalid/webhook',
      };
      assert.equal(phase('scan', env).status, 0);
      assert.equal(phase('apply', env).status, 0);
      assert.equal(phase('prepare-notification', env).status, 0);
      assert.equal(phase('notify', env).status, 0);
      assert.equal(phase('finish', env).status, 0);
      const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
      assert.equal(saved.checkpoints.automatic, original.started);
      assert.equal(saved.active, null);
      assert.equal(fs.existsSync(path.join(folder, 'sent.json')), resolution === 'not-delivered');
      if (resolution === 'not-delivered')
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder, 'sent.json'))), payload);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
}
test('fresh human-owned alert coverage stops a create after scan', () => {
  const { folder, phase, hook } = fixtureRun(false);
  try {
    const f = finding();
    const group = groupFindings([f])[0];
    const value = report();
    value.groups = [group];
    value.alerts = [f];
    value.newFindings = [f];
    seed(folder, 'report.json', value);
    seed(folder, 'state.json', {
      version: 1,
      checkpoints: {},
      receipts: {},
      active: {},
      createIntents: { [group.key]: { attempt: 'local-1' } },
    });
    fs.writeFileSync(
      hook,
      `
      globalThis.fetch = async (url, options) => {
        if (!String(url).endsWith('/search/jql')) throw new Error('No Jira writes are permitted');
        const jql = JSON.parse(options.body).jql;
        return Response.json({ issues: jql.includes('GHSA-example') ? [${JSON.stringify(issue(f))}] : [], isLast: true });
      };
    `,
    );
    assert.equal(phase('apply', automatic).status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.match(saved.failures.join(' '), /Fresh alert\/advisory coverage/);
    assert.equal(saved.groups[0].action, undefined);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
function blockerFixture(patched, status) {
  const fixture = fixtureRun(false);
  const { folder, hook } = fixture;
  const f = finding({ patched });
  const ticket = issue(f, {
    status: { name: status, statusCategory: { key: 'indeterminate' } },
    description: `${issue(f).fields.description}\n### Blocker and recheck criteria\nOld blocker`,
  });
  const raw = {
    number: f.number,
    html_url: f.url,
    created_at: '2026-01-01T00:00:00Z',
    dependency: { package: { name: f.package, ecosystem: 'npm' }, manifest_path: f.manifest },
    security_advisory: { severity: f.severity, ghsa_id: f.ghsa, summary: 'fixture' },
    security_vulnerability: {
      vulnerable_version_range: f.range,
      first_patched_version: patched ? { identifier: patched } : null,
    },
  };
  fs.writeFileSync(
    hook,
    `
    import fs from 'node:fs';
    const historyPath = ${JSON.stringify(path.join(folder, 'writes.json'))};
    const writes = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath)) : [];
    globalThis.fetch = async (url, options = {}) => {
      const value = String(url);
      if (value.includes('/issue/NXENG-987')) return Response.json({ fields: { issuetype: { name: 'Epic' }, status: { statusCategory: { key: 'new' } } } });
      if (value.endsWith('/search/jql')) return Response.json({ issues: [${JSON.stringify(ticket)}], isLast: true });
      if (value.includes('/dependabot/alerts?')) return Response.json(value.includes('nuxeo-web-ui') ? [${JSON.stringify(raw)}] : []);
      if (value.includes('/contents/')) return Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(value.includes('package-lock.json') ? ${JSON.stringify(lock())} : {})).toString('base64') });
      if (value.startsWith('https://registry.npmjs.org/')) return Response.json({});
      if (value.includes('/issue/WEBUI-1?')) return Response.json({fields: {status: {name: ${JSON.stringify(status)}}}});
      if (value.endsWith('/comment?startAt=0&maxResults=100')) return Response.json({ total: writes.length, comments: writes.map((w, i) => ({id: String(i), body: w.body})) });
      if (value.endsWith('/comment') && options.method === 'POST') {
        writes.push(JSON.parse(options.body)); fs.writeFileSync(historyPath, JSON.stringify(writes)); return Response.json({id: '1'});
      }
      throw new Error('Unexpected request / no transition allowed: ' + value);
    };
  `,
  );
  return fixture;
}
test('resumed ticket with historical blocker heading is not moved back On Hold', () => {
  const { folder, phase } = blockerFixture('1.2.0', 'In Progress');
  try {
    assert.equal(phase('scan', automatic).status, 0);
    const value = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(value.failures, []);
    assert.equal(value.blockers.length, 0);
    assert.match(value.review.join(' '), /no longer established ticket-wide/);
    assert.equal(phase('apply', automatic).status, 0);
    assert.equal(fs.existsSync(path.join(folder, 'writes.json')), false);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test('already held blocker repairs its missing comment exactly once', () => {
  const { folder, phase } = blockerFixture(null, 'On Hold');
  try {
    assert.equal(phase('scan', automatic).status, 0);
    assert.equal(phase('apply', automatic).status, 0);
    let value = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(value.failures, []);
    assert.equal(phase('apply', automatic).status, 0);
    value = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(value.failures, []);
    const writes = JSON.parse(fs.readFileSync(path.join(folder, 'writes.json')));
    assert.equal(writes.length, 1);
    assert.match(textOf(writes[0].body), /Triage hold key: WEBUI-1/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('accepted delivery interrupted before checkpoint resumes the original successful cycle', () => {
  const { folder, phase, hook } = fixtureRun(false);
  try {
    const original = report();
    const notification = { status: 'confirmed', snapshot: original, payload: { original: true } };
    seed(folder, 'state.json', {
      version: 1,
      checkpoints: {},
      fingerprints: {},
      receipts: {},
      active: {
        mode: 'automatic',
        attempt: 'old-1',
        notification,
      },
    });
    fs.writeFileSync(hook, `globalThis.fetch = async () => { throw new Error('No fresh scan or send allowed'); };`);
    const env = { ...automatic, GITHUB_RUN_ID: 'resumed', GITHUB_RUN_ATTEMPT: '2' };
    for (const name of ['scan', 'apply', 'prepare-notification', 'notify', 'finish'])
      assert.equal(phase(name, env).status, 0, name);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.equal(saved.checkpoints.automatic, original.started);
    assert.ok(saved.completedRuns['automatic:resumed']);
    for (const name of ['scan', 'apply', 'prepare-notification', 'notify', 'finish'])
      assert.equal(phase(name, { ...env, GITHUB_RUN_ATTEMPT: '3' }).status, 0, name);
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'state.json'))).active, null);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

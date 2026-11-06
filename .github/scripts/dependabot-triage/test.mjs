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
  const artifactInit = path.join(folder, 'artifact-init.mjs');
  fs.writeFileSync(
    artifactInit,
    `import {register} from 'node:module'; register(new URL('./artifact-loader.mjs', import.meta.url));`,
  );
  fs.writeFileSync(
    path.join(folder, 'artifact-loader.mjs'),
    `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === '@actions/artifact') return {url: new URL('./artifact-stub.mjs', import.meta.url).href, shortCircuit: true};
      return nextResolve(specifier, context);
    }
  `,
  );
  fs.writeFileSync(
    path.join(folder, 'artifact-stub.mjs'),
    `
    import fs from 'node:fs';
    const history = ${JSON.stringify(path.join(folder, 'durable-journal.json'))};
    export class DefaultArtifactClient {
      async uploadArtifact(name, files) {
        if (process.env.FIXTURE_FAIL_UPLOAD === 'true') throw new Error('Fixture journal upload failed');
        const snapshots = fs.existsSync(history) ? JSON.parse(fs.readFileSync(history)) : [];
        snapshots.push(JSON.parse(fs.readFileSync(files[0])));
        fs.writeFileSync(history, JSON.stringify(snapshots));
        return {id: snapshots.length};
      }
    }
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
    spawnSync(process.execPath, ['--import', artifactInit, '--import', hook, script, name], {
      env: { ...env, ...overrides },
      encoding: 'utf8',
    });
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
        if (String(url).endsWith('/actions/workflows/dependabot-triage.yaml')) return Response.json({id:42,path:'.github/workflows/dependabot-triage.yaml'});
        const page = new URL(url).searchParams.get('page');
        if (page === '1') return Response.json({ workflow_runs: Array.from({length: 100}, () => ({path: 'other-workflow'})) });
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
      createIntents: {},
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

test('no-patch classifications require a vulnerable, interpretable resolved instance', () => {
  const f = finding({ patched: null });
  assert.equal(assessLock(f, { packages: {} }, {}, {}).review, true);
  assert.equal(assessLock(f, {}, {}, {}).review, true);
  assert.equal(assessLock({ ...f, range: 'not-semver' }, lock(), {}, {}).review, true);
  assert.equal(assessLock(f, { packages: { 'node_modules/example': { version: 'file:local' } } }, {}, {}).review, true);
  assert.equal(assessLock(f, lock(), {}, {}).noPatch, true);
});
test('direct and nested manifest overrides route effective-constraint decisions to review', () => {
  assert.equal(assessLock(finding(), lock(), { overrides: { example: '1.1.0' } }, {}).review, true);
  assert.equal(assessLock(finding(), lock(), { overrides: { plugin: { example: '^1.2.0' } } }, {}).review, true);
  const tree = lock();
  tree.packages['node_modules/plugin'] = { dependencies: { example: '^1.0.0' } };
  assert.equal(assessLock(finding(), tree, { overrides: { plugin: '2.0.0' } }, {}).review, true);
});
test('unauthorized automatic scans leave no cycle and do not block subsequent previews', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    assert.equal(phase('scan', { ...automatic, ALLOW_AUTOMATIC: 'false' }).status, 1);
    assert.equal(fs.existsSync(path.join(folder, 'state.json')), false);
    assert.equal(phase('scan').status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.equal(saved.active.mode, 'preview');
    assert.deepEqual(saved.createIntents, {});
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
function createFixture() {
  const fixture = fixtureRun(false);
  const { folder, hook } = fixture;
  const first = groupFindings([finding()])[0];
  const second = groupFindings([finding({ package: 'other-package' })])[0];
  const value = report();
  value.groups = [first, second];
  value.alerts = [...first.findings, ...second.findings];
  seed(folder, 'report.json', value);
  seed(folder, 'state.json', {
    version: 1,
    checkpoints: {},
    fingerprints: {},
    receipts: {},
    active: { mode: 'automatic' },
    createIntents: {},
  });
  fs.writeFileSync(
    hook,
    `
    import fs from 'node:fs';
    const remotePath=${JSON.stringify(path.join(folder, 'remote.json'))};
    const historyPath=${JSON.stringify(path.join(folder, 'durable-journal.json'))};
    const remote=fs.existsSync(remotePath)?JSON.parse(fs.readFileSync(remotePath)):[];
    globalThis.fetch=async(url,options={})=>{
      const value=String(url);
      if(value.includes('/issue/NXENG-987')) return Response.json({fields:{issuetype:{name:'Epic'},status:{statusCategory:{key:'new'}}}});
      if(value.includes('/dependabot/alerts?')) return Response.json([]);
      if(value.endsWith('/search/jql')) {
        const jql=JSON.parse(options.body).jql;
        return Response.json({issues:remote.filter(i=>jql.includes(i.marker)),isLast:true});
      }
      if(value.endsWith('/issue')&&options.method==='POST'){
        if(process.env.FIXTURE_JIRA_STATUS) return new Response('',{status:Number(process.env.FIXTURE_JIRA_STATUS)});
        const body=JSON.parse(options.body);
        const key=body.fields.labels.find(l=>l.startsWith('cve-triage-'));
        const durable=JSON.parse(fs.readFileSync(historyPath)).at(-1);
        if(!durable.createIntents[key]||Object.keys(durable.createIntents).length!==1) throw new Error('POST must have exactly its own durable reservation');
        remote.push({key:'WEBUI-99',marker:key,fields:{...body.fields,status:{name:'Open',statusCategory:{key:'new'}}}});
        fs.writeFileSync(remotePath,JSON.stringify(remote));
        throw new Error('Simulated response loss after successful create');
      }
      throw new Error('Unexpected fixture request: '+value);
    };
  `,
  );
  return { ...fixture, first, second };
}
test('only an actually attempted POST is reserved, and a lost create result recovers into the next notification', () => {
  const { folder, phase, first, second } = createFixture();
  try {
    assert.equal(phase('apply', automatic).status, 0);
    let saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.ok(saved.createIntents[first.key]);
    assert.equal(saved.createIntents[second.key], undefined);
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'remote.json'))).length, 1);
    assert.equal(phase('scan', automatic).status, 0);
    assert.equal(phase('apply', automatic).status, 0);
    saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(saved.failures, []);
    assert.equal(saved.carriedActions[0].ticket, 'WEBUI-99');
    const payload = fs.readFileSync(path.join(folder, 'teams-payload.json'), 'utf8');
    assert.match(payload, /Recovered Jira actions/);
    assert.doesNotMatch(payload, /No new untriaged Dependabot findings were identified|bugs took the day off/);
    assert.match(payload, /WEBUI-99/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'remote.json'))).length, 1);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test('completed replay snapshots are bounded without pruning unresolved journals', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    const value = report();
    seed(folder, 'report.json', value);
    const notification = { status: 'confirmed', snapshot: value, payload: { message: 'delivered' } };
    const completedRuns = Object.fromEntries(Array.from({ length: 25 }, (_, i) => ['automatic:' + i, notification]));
    seed(folder, 'state.json', {
      version: 1,
      checkpoints: {},
      receipts: {},
      completedRuns,
      fingerprints: {},
      createIntents: { uncertain: { status: 'reserved' } },
      active: { mode: 'automatic', notification },
    });
    assert.equal(phase('finish', { ...automatic, GITHUB_RUN_ID: 'last', TRIAGE_RUN_NUMBER: '26' }).status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.ok(Object.keys(saved.completedRuns).length <= 20);
    assert.ok(Buffer.byteLength(JSON.stringify(saved.completedRuns)) <= 2 * 1024 * 1024);
    assert.ok(saved.createIntents.uncertain);
    assert.equal(phase('scan', { ...automatic, GITHUB_RUN_ID: 'expired', TRIAGE_RUN_NUMBER: '1' }).status, 1);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('patched artifact archiver can pack and read the state journal locally', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line import-x/no-extraneous-dependencies -- Test the SDK's transitive glob override.
  const archiver = require('archiver');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-zip-'));
  try {
    seed(folder, 'state.json', { checkpoint: 'test-only' });
    const archive = archiver('zip');
    const chunks = [];
    const finished = new Promise((resolve, reject) => {
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', resolve);
      archive.on('error', reject);
    });
    archive.glob('state.json', { cwd: folder });
    await archive.finalize();
    await finished;
    fs.writeFileSync(path.join(folder, 'journal.zip'), Buffer.concat(chunks));
    const { execFileSync } = await import('node:child_process');
    const contents = execFileSync('unzip', ['-p', path.join(folder, 'journal.zip'), 'state.json'], {
      encoding: 'utf8',
    });
    assert.deepEqual(JSON.parse(contents), { checkpoint: 'test-only' });
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('failed pre-POST journal upload does not strand an unattempted create', () => {
  const { folder, phase } = createFixture();
  try {
    assert.equal(phase('apply', { ...automatic, FIXTURE_FAIL_UPLOAD: 'true' }).status, 0);
    const state = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.deepEqual(state.createIntents, {});
    assert.equal(fs.existsSync(path.join(folder, 'remote.json')), false);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('GitHub comma-separated npm comparator ranges remain actionable and support no-patch evidence', () => {
  const raw = {
    number: 1,
    html_url: 'https://github.com/nuxeo/nuxeo-web-ui/security/dependabot/1',
    dependency: { package: { name: 'example', ecosystem: 'npm' }, manifest_path: 'package-lock.json' },
    security_advisory: { severity: 'medium', ghsa_id: 'GHSA-test' },
    security_vulnerability: {
      vulnerable_version_range: '>= 1.0.0, < 1.2.0',
      first_patched_version: { identifier: '1.2.0' },
    },
  };
  const f = normalize(repo, raw);
  assert.equal(assessLock(f, lock(), {}, {}).blocked, false);
  assert.equal(assessLock({ ...f, patched: null }, lock(), {}, {}).noPatch, true);
});
for (const status of [400, 401, 403, 422, 500]) {
  test(`Jira HTTP ${status} ${status < 500 ? 'releases a rejected' : 'preserves an uncertain'} create reservation`, () => {
    const { folder, phase } = createFixture();
    try {
      assert.equal(phase('apply', { ...automatic, FIXTURE_JIRA_STATUS: String(status) }).status, 0);
      const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
      assert.equal(Object.keys(saved.createIntents).length, status < 500 ? 0 : 1);
      assert.equal(fs.existsSync(path.join(folder, 'remote.json')), false);
      const snapshots = JSON.parse(fs.readFileSync(path.join(folder, 'durable-journal.json')));
      assert.equal(Object.keys(snapshots.at(-1).createIntents).length, status < 500 ? 0 : 1);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
}
for (const attack of ['fork', 'workflow', 'event']) {
  test(`state restore rejects ${attack} provenance and continues to trusted older artifacts`, async () => {
    const { folder, phase, hook } = fixtureRun(false);
    try {
      seed(folder, 'state.json', { version: 1, checkpoints: {}, receipts: {}, trusted: true });
      const { execFileSync } = await import('node:child_process');
      execFileSync('zip', ['-q', path.join(folder, 'prior.zip'), 'state.json'], { cwd: folder });
      fs.rmSync(path.join(folder, 'state.json'));
      const zipped = fs.readFileSync(path.join(folder, 'prior.zip')).toString('base64');
      const run = {
        repository: { full_name: repo },
        head_repository: { full_name: repo },
        workflow_id: 42,
        path: '.github/workflows/dependabot-triage.yaml',
        updated_at: '2026-11-06T01:00:00Z',
        event: 'schedule',
        head_branch: 'develop-2023',
      };
      const forged = structuredClone(run);
      if (attack === 'fork') forged.head_repository.full_name = 'attacker/nuxeo-web-ui';
      if (attack === 'workflow') forged.workflow_id = 99;
      if (attack === 'event') forged.event = 'pull_request';
      fs.writeFileSync(
        hook,
        `
        globalThis.fetch=async(url)=>{
          const value=String(url);
          if(value.endsWith('/actions/workflows/dependabot-triage.yaml')) return Response.json({id:42,path:'.github/workflows/dependabot-triage.yaml'});
          if(value.includes('/actions/workflows/42/runs?')) {
            const page=new URL(value).searchParams.get('page');
            return Response.json({workflow_runs:page==='1'?Array.from({length:100},()=>({...${JSON.stringify(forged)},id:1})):[{...${JSON.stringify(run)},id:2}]});
          }
          if(value.includes('/actions/runs/2/artifacts?')) return Response.json({artifacts:[{id:200,name:'dependabot-triage-state-trusted',created_at:'2026-11-06T00:59:00Z',archive_download_url:'https://example.invalid/trusted'}]});
          if(value==='https://example.invalid/trusted') return new Response(Buffer.from('${zipped}','base64'));
          throw new Error('Untrusted artifact must never be downloaded');
        };
      `,
      );
      const result = phase('restore', { GITHUB_REPOSITORY: repo, DEFAULT_BRANCH: 'develop-2023' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'state.json'))).trusted, true);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
}

test('first hosted run starts cleanly when this workflow has no trusted default-branch history', () => {
  const { folder, phase, hook } = fixtureRun(false);
  try {
    fs.writeFileSync(
      hook,
      `globalThis.fetch=async(url)=>{
      if(String(url).endsWith('/actions/workflows/dependabot-triage.yaml')) return Response.json({id:42,path:'.github/workflows/dependabot-triage.yaml'});
      if(String(url).includes('/actions/workflows/42/runs?')) return Response.json({workflow_runs:[]});
      throw new Error('Repository-wide artifact access is not needed for a cold start');
    };`,
    );
    const result = phase('restore', { GITHUB_REPOSITORY: repo, DEFAULT_BRANCH: 'develop-2023' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No retained state/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('restore chooses a recently rerun old workflow over a newer-created run with stale state', async () => {
  const { folder, phase, hook } = fixtureRun(false);
  try {
    seed(folder, 'state.json', { version: 1, checkpoints: {}, receipts: {}, recoveredFromOldRerun: true });
    const { execFileSync } = await import('node:child_process');
    execFileSync('zip', ['-q', path.join(folder, 'prior.zip'), 'state.json'], { cwd: folder });
    fs.rmSync(path.join(folder, 'state.json'));
    const zipped = fs.readFileSync(path.join(folder, 'prior.zip')).toString('base64');
    const run = {
      repository: { full_name: repo },
      head_repository: { full_name: repo },
      workflow_id: 42,
      path: '.github/workflows/dependabot-triage.yaml',
      event: 'workflow_dispatch',
      head_branch: 'develop-2023',
    };
    fs.writeFileSync(
      hook,
      `globalThis.fetch=async(url)=>{
      const value=String(url);
      if(value.endsWith('/actions/workflows/dependabot-triage.yaml')) return Response.json({id:42,path:'.github/workflows/dependabot-triage.yaml'});
      if(value.includes('/actions/workflows/42/runs?')) return Response.json({workflow_runs:[{...${JSON.stringify(run)},id:20,updated_at:'2026-11-05T00:01:00Z'},{...${JSON.stringify(run)},id:10,updated_at:'2026-11-06T00:01:00Z'}]});
      if(value.includes('/actions/runs/10/artifacts?')) return Response.json({artifacts:[{id:200,name:'dependabot-triage-state-new',created_at:'2026-11-06T00:00:00Z',archive_download_url:'https://example.invalid/new'}]});
      if(value==='https://example.invalid/new') return new Response(Buffer.from('${zipped}','base64'));
      throw new Error('Stale run should be skipped after finding the newer durable journal');
    };`,
    );
    const result = phase('restore', { GITHUB_REPOSITORY: repo, DEFAULT_BRANCH: 'develop-2023' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'state.json'))).recoveredFromOldRerun, true);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessLock,
  automaticAuthorized,
  card,
  changedSince,
  description,
  groupFindings,
  relatedRemediation,
  highest,
  hash,
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
test('exact pins require parent work without implying an external blocker', () => {
  const tree = lock();
  tree.packages[''].dependencies.example = '1.1.0';
  assert.equal(assessLock(finding(), tree, { engines: { node: '>=22.13' } }, {}).needsParentUpgrade, true);
});
test('in-range patch is a candidate, never claims compatibility tests passed', () => {
  const result = assessLock(finding(), lock(), { engines: { node: '>=22.13' } }, { engines: { node: '>=20' } });
  assert.equal(result.blocked, false);
  assert.match(result.reason, /tests still required/);
});
test('engine floor uncertainty requires review instead of automatic On Hold', () => {
  assert.equal(
    assessLock(finding(), lock(), { engines: { node: '>=18' } }, { engines: { node: '>=22' } }).review,
    true,
  );
});
test('all nested affected instances must be examined', () => {
  const tree = lock();
  tree.packages['node_modules/parent'] = { dependencies: { example: '1.1.0' } };
  tree.packages['node_modules/parent/node_modules/example'] = { version: '1.1.0' };
  assert.equal(assessLock(finding(), tree, {}, {}).needsParentUpgrade, true);
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
  assert.match(output, /Pending actions — not completed/);
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
  assert.equal(assessLock(finding(), tree, {}, {}).needsParentUpgrade, true);
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
    assert.match(value.existingReviews.join(' '), /does not confirm a ticket-wide blocker/);
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
  assert.notEqual(assessLock(finding(), lock(), { overrides: { plugin: { example: '^1.2.0' } } }, {}).review, true);
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

for (const unsafe of [false, true]) {
  test(`Dependabot cursor pagination ${unsafe ? 'rejects foreign links' : 'follows API cursors across short pages'}`, () => {
    const { folder, phase, hook } = fixtureRun(false);
    try {
      const findings = [
        finding(),
        finding({ id: repo + '#124', number: 124, url: `https://github.com/${repo}/security/dependabot/124` }),
      ];
      const tickets = findings.map((f, i) => {
        return { ...issue(f), key: 'WEBUI-' + (i + 1) };
      });
      const raw = findings.map((f) => {
        return {
          number: f.number,
          html_url: f.url,
          created_at: '2026-01-01T00:00:00Z',
          dependency: { package: { name: f.package, ecosystem: 'npm' }, manifest_path: f.manifest },
          security_advisory: { severity: f.severity, ghsa_id: f.ghsa },
          security_vulnerability: {
            vulnerable_version_range: '>= 1.0.0, < 1.2.0',
            first_patched_version: { identifier: f.patched },
          },
        };
      });
      fs.writeFileSync(
        hook,
        `globalThis.fetch=async(url,options={})=>{
        const value=String(url);
        if(value.includes('/issue/NXENG-987')) return Response.json({fields:{issuetype:{name:'Epic'},status:{statusCategory:{key:'new'}}}});
        if(value.endsWith('/search/jql')) return Response.json({issues:${JSON.stringify(tickets)},isLast:true});
        if(value.includes('/dependabot/alerts?')) {
          const params=new URL(value).searchParams;
          if(params.has('page')) throw new Error('Page-number pagination is rejected by GitHub');
          if(!value.includes('nuxeo-web-ui')) return Response.json([]);
          if(params.get('after')==='cursor=one') return Response.json([${JSON.stringify(raw[1])}]);
          return Response.json([${JSON.stringify(raw[0])}],{headers:{link:'<https://${unsafe ? 'example.invalid' : 'api.github.com'}/repositories/46934532/dependabot/alerts?after=cursor%3Done>; rel="next"'}});
        }
        throw new Error('Unexpected request');
      };`,
      );
      assert.equal(phase('scan').status, 0);
      const value = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
      if (unsafe) assert.match(value.failures.join(' '), /Unsafe Dependabot pagination/);
      else {
        assert.deepEqual(value.failures, []);
        assert.equal(value.alerts.length, 2);
        assert.equal(value.covered.length, 2);
      }
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
}

test('pre-merge automatic approval requires the exact commit, a manual event and write approval', () => {
  const approved = 'a'.repeat(40);
  const context = {
    ...automatic,
    GITHUB_REF_NAME: 'codex/premerge-test',
    GITHUB_SHA: approved,
    APPROVED_PREMERGE_SHA: approved,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  };
  assert.equal(automaticAuthorized(context), true);
  for (const override of [
    { ALLOW_AUTOMATIC: 'false' },
    { GITHUB_SHA: 'b'.repeat(40) },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_EVENT_NAME: 'schedule' },
    { APPROVED_PREMERGE_SHA: '' },
    { APPROVED_PREMERGE_SHA: 'not-a-commit' },
  ])
    assert.equal(automaticAuthorized({ ...context, ...override }), false);
  assert.equal(automaticAuthorized(automatic), true);
  assert.equal(automaticAuthorized({ ALLOW_AUTOMATIC: 'true' }), false);
});
test('approved pre-merge commit can run the actual CLI scan without default-branch spoofing', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    const approved = 'a'.repeat(40);
    const result = phase('scan', {
      ...automatic,
      GITHUB_REF_NAME: 'codex/premerge-test',
      GITHUB_SHA: approved,
      APPROVED_PREMERGE_SHA: approved,
      GITHUB_EVENT_NAME: 'workflow_dispatch',
    });
    assert.equal(result.status, 0, result.stderr);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(saved.failures, []);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

for (const approve of [true, false]) {
  test(`pre-merge state provenance ${approve ? 'accepts only the approved' : 'rejects an unapproved'} manual commit`, async () => {
    const { folder, phase, hook } = fixtureRun(false);
    try {
      seed(folder, 'state.json', { version: 1, checkpoints: {}, receipts: {}, premergeJournal: true });
      const { execFileSync } = await import('node:child_process');
      execFileSync('zip', ['-q', path.join(folder, 'prior.zip'), 'state.json'], { cwd: folder });
      fs.rmSync(path.join(folder, 'state.json'));
      const zipped = fs.readFileSync(path.join(folder, 'prior.zip')).toString('base64');
      const sha = 'a'.repeat(40);
      const run = {
        id: 10,
        repository: { full_name: repo },
        head_repository: { full_name: repo },
        workflow_id: 42,
        path: '.github/workflows/dependabot-triage.yaml',
        event: 'workflow_dispatch',
        head_branch: 'codex/test',
        head_sha: sha,
        updated_at: '2026-11-06T00:01:00Z',
      };
      fs.writeFileSync(
        hook,
        `globalThis.fetch=async(url)=>{
        const value=String(url);
        if(value.endsWith('/actions/workflows/dependabot-triage.yaml')) return Response.json({id:42,path:'.github/workflows/dependabot-triage.yaml'});
        if(value.includes('/actions/workflows/42/runs?')) return Response.json({workflow_runs:[${JSON.stringify(run)}]});
        if(value.includes('/actions/runs/10/artifacts?')) return Response.json({artifacts:[{id:1,name:'dependabot-triage-state-premerge',created_at:'2026-11-06T00:00:00Z',archive_download_url:'https://example.invalid/state'}]});
        if(value==='https://example.invalid/state') return new Response(Buffer.from('${zipped}','base64'));
        throw new Error('Unexpected request');
      };`,
      );
      const result = phase('restore', {
        GITHUB_REPOSITORY: repo,
        DEFAULT_BRANCH: 'develop-2023',
        APPROVED_PREMERGE_SHA: approve ? sha : 'b'.repeat(40),
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.existsSync(path.join(folder, 'state.json')), approve);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
}

function auditedMinimatch(extra = {}) {
  return finding({
    package: 'minimatch',
    range: '>=7.0.0 <11.0.1',
    patched: '11.0.1',
    manifest: 'packages/nuxeo-web-ui-ftest/package-lock.json',
    ...extra,
  });
}
function auditedTree() {
  return {
    packages: {
      '': { dependencies: { glob: '^10.5.0', 'readdir-glob': '^3.0.0' } },
      'node_modules/glob': { version: '10.5.0', dependencies: { minimatch: '^9.0.4' } },
      'node_modules/minimatch': { version: '9.0.9' },
      'node_modules/readdir-glob': { version: '3.0.0', dependencies: { minimatch: '^10.2.2' } },
      'node_modules/readdir-glob/node_modules/minimatch': { version: '10.2.6' },
    },
  };
}
test('audit regression: both ftest minimatch instances survive a rejecting first parent range', () => {
  const result = assessLock(
    auditedMinimatch(),
    auditedTree(),
    { engines: { node: '>=22.13' } },
    { engines: { node: '18 || 20 || >=22' } },
  );
  assert.equal(result.evidence.length, 2);
  assert.deepEqual(
    result.evidence.map((e) => e.installed),
    ['9.0.9', '10.2.6'],
  );
  assert.equal(result.blocked, false);
  assert.equal(result.needsParentUpgrade, true);
  assert.equal(result.remediation, 'parent_upgrade');
});
test('no-patch findings retain every resolved dependency path', () => {
  const result = assessLock(auditedMinimatch({ patched: null }), auditedTree(), {}, {});
  assert.equal(result.blocked, true);
  assert.equal(result.evidence.length, 2);
});
test('audit regression: replace-only minimatch override does not affect vulnerable glob paths', () => {
  const tree = auditedTree();
  tree.packages[''].dependencies.replace = '1.0.0';
  tree.packages['node_modules/replace'] = { version: '1.0.0', dependencies: { minimatch: '^3.1.4' } };
  tree.packages['node_modules/replace/node_modules/minimatch'] = { version: '3.1.5' };
  const result = assessLock(auditedMinimatch(), tree, { overrides: { replace: { minimatch: '^3.1.4' } } }, {});
  assert.notEqual(result.review, true);
  assert.ok(result.evidence.every((e) => e.overrides.length === 0));
});
test('path-specific overrides affect only their matching vulnerable instances', () => {
  const result = assessLock(auditedMinimatch(), auditedTree(), { overrides: { glob: { minimatch: '11.0.1' } } }, {});
  assert.equal(result.review, true);
  assert.equal(result.evidence[0].overrides[0].selector, 'glob → minimatch');
  assert.equal(result.evidence[1].overrides.length, 0);
});
test('unrelated sibling overrides do not affect a parent’s vulnerable dependency', () => {
  const result = assessLock(auditedMinimatch(), auditedTree(), { overrides: { glob: { minipass: '7.0.0' } } }, {});
  assert.notEqual(result.review, true);
});
test('existing glob remediation is a reuse proposal for new minimatch work in the same manifest', () => {
  const f = auditedMinimatch();
  f.branchEvidence = { a: assessLock(f, auditedTree(), {}, {}) };
  const existing = issue(f, {
    description: `Repository: ${repo}\n### Findings\n| Package | Manifest | Alert |\n| glob | ${f.manifest} | https://github.com/${repo}/security/dependabot/639 |\n### Remediation\nUpgrade glob to 14.0.4.`,
  });
  const related = relatedRemediation(f, [existing]);
  assert.equal(related[0].kind, 'shared_parent');
  assert.deepEqual(related[0].parents, ['glob']);
  assert.equal(relatedRemediation({ ...f, manifest: 'package-lock.json' }, [existing]).length, 0);
  assert.equal(relatedRemediation(f, [{ ...existing, key: 'ELEMENTS-1' }]).length, 0);
});
test('ADF parent remediation rows are matched without confusing root and nested manifests', () => {
  const f = auditedMinimatch();
  f.branchEvidence = { a: assessLock(f, auditedTree(), {}, {}) };
  const paragraph = (value) => {
    return { type: 'paragraph', content: [{ type: 'text', text: value }] };
  };
  const existing = issue(f, {
    description: {
      type: 'doc',
      content: [
        paragraph(`Repository: ${repo}`),
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: ['glob', f.manifest].map((t) => {
                return { type: 'tableCell', content: [paragraph(t)] };
              }),
            },
          ],
        },
      ],
    },
  });
  assert.equal(relatedRemediation(f, [existing])[0].kind, 'shared_parent');
});
test('root manifest coverage is not inferred from a child lockfile path', () => {
  const f = finding();
  const existing = issue(f, { description: `${f.url} ${f.ghsa} ${f.package} plugin/a11y/package-lock.json` });
  assert.equal(matchFinding(f, [existing]).kind, 'ambiguous');
});
test('Teams summary separates new actions and hides unrelated existing blockers', () => {
  const value = report();
  const a = finding(),
    b = finding({ id: repo + '#124', number: 124 }),
    c = finding({ id: repo + '#125', number: 125 });
  value.alerts = [a, b, c];
  value.newFindings = [a, b, c];
  value.review = ['Alert 125 requires scope review'];
  value.groups = [
    {
      key: 'new',
      ticket: 'WEBUI-2431',
      action: 'created',
      severity: 'medium',
      package: 'minimatch',
      repository: repo,
      summary: 'Update minimatch',
      findings: [a, b],
      blocked: true,
      holdConfirmed: true,
    },
  ];
  value.blockers = [
    { ticket: 'WEBUI-2429', severity: 'low', blocker: 'old' },
    { ticket: 'WEBUI-2430', severity: 'medium', blocker: 'old' },
    { ticket: 'ELEMENTS-2145', severity: 'low', blocker: 'old' },
  ];
  const output = JSON.stringify(card(value, config, 'automatic'));
  assert.match(output, /1 created · 0 updated · 1 alert needs review/);
  assert.match(output, /WEBUI-2431/);
  assert.doesNotMatch(output, /WEBUI-2429|WEBUI-2430|ELEMENTS-2145|ColumnSet|tableCell/);
});
test('only existing blockers linked to new untriaged alerts appear in Teams', () => {
  const value = report();
  const f = finding();
  value.newFindings = [f];
  value.blockers = [
    { ticket: 'WEBUI-10', severity: 'medium', blocker: 'same upstream blocker', newFindingIds: [f.id] },
    { ticket: 'WEBUI-11', severity: 'low', blocker: 'unrelated', newFindingIds: ['different'] },
  ];
  const output = JSON.stringify(card(value, config, 'preview'));
  assert.match(output, /Existing blockers affecting new alerts/);
  assert.match(output, /WEBUI-10/);
  assert.doesNotMatch(output, /WEBUI-11/);
});
test('zero-finding Teams summary does not revive existing blocker audit notes', () => {
  const value = report();
  value.blockers = [{ ticket: 'WEBUI-old', severity: 'low' }];
  value.existingReviews = ['WEBUI-old remains held'];
  const output = JSON.stringify(card(value, config, 'automatic'));
  assert.match(output, /No new untriaged Dependabot findings were identified/);
  assert.doesNotMatch(output, /WEBUI-old/);
});
test('compact Teams card remains size-bounded for a large review backlog', () => {
  const value = report();
  const f = finding();
  value.newFindings = [f];
  value.updates = Array.from({ length: 1000 }, (_, i) => {
    return {
      ticket: 'WEBUI-' + i,
      severity: 'medium',
      reason: 'x'.repeat(2000),
      findings: [f],
    };
  });
  value.review = Array.from({ length: 1000 }, () => 'x'.repeat(2000));
  assert.ok(Buffer.byteLength(JSON.stringify(card(value, config, 'preview'))) < 25000);
});

for (const noPatch of [false, true]) {
  test(`CLI report ${noPatch ? 'links a confirmed missing-patch blocker for a new alert' : 'proposes existing scope without surfacing unrelated blockers'}`, () => {
    const { folder, phase, hook } = fixtureRun(false);
    try {
      const f = finding(
        noPatch ? { package: 'example', range: '>=1.0.0 <1.2.0', patched: null, severity: 'critical' } : {},
      );
      const old = finding({
        id: repo + '#200',
        number: 200,
        url: `https://github.com/${repo}/security/dependabot/200`,
        package: 'other',
        patched: null,
        range: '>=1.0.0 <1.2.0',
        severity: 'low',
      });
      const candidate = issue(f, {
        description: `Repository: ${repo}\n### Findings\nhttps://github.com/${repo}/security/dependabot/999 GHSA-previous example plugin/a11y/package-lock.json\n${noPatch ? 'No patched release available.' : ''}`,
      });
      const unrelated = {
        ...issue(old),
        key: 'WEBUI-222',
        fields: {
          ...issue(old).fields,
          status: { name: 'On Hold', statusCategory: { key: 'new' } },
          customfield_12201: { value: 'Low' },
        },
      };
      const values = [f, old].map((a) => {
        return {
          number: a.number,
          html_url: a.url,
          created_at: '2026-01-01T00:00:00Z',
          dependency: { package: { name: a.package, ecosystem: 'npm' }, manifest_path: a.manifest },
          security_advisory: { severity: a.severity, ghsa_id: a.ghsa },
          security_vulnerability: {
            vulnerable_version_range: a.range,
            first_patched_version: a.patched ? { identifier: a.patched } : null,
          },
        };
      });
      const tree = {
        packages: {
          '': { dependencies: { example: '1.1.0', other: '^1.0.0' } },
          'node_modules/example': { version: '1.1.0' },
          'node_modules/other': { version: '1.1.0' },
        },
      };
      fs.writeFileSync(
        hook,
        `globalThis.fetch=async(url,options={})=>{
        const value=String(url);
        if(value.includes('/issue/NXENG-987')) return Response.json({fields:{issuetype:{name:'Epic'},status:{statusCategory:{key:'new'}}}});
        if(value.endsWith('/search/jql')) return Response.json({issues:${JSON.stringify([candidate, unrelated])},isLast:true});
        if(value.includes('/dependabot/alerts?')) return Response.json(value.includes('nuxeo-web-ui')?${JSON.stringify(values)}:[]);
        if(value.includes('/contents/')) return Response.json({encoding:'base64',content:Buffer.from(JSON.stringify(value.includes('package-lock.json')?${JSON.stringify(tree)}:{})).toString('base64')});
        if(value.startsWith('https://registry.npmjs.org/')) return Response.json({});
        throw new Error('No mutation is permitted in the preview fixture');
      };`,
      );
      const result = phase('scan');
      assert.equal(result.status, 0, result.stderr);
      const value = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
      assert.deepEqual(value.failures, []);
      assert.equal(value.alerts.length, 2);
      assert.equal(value.covered.length, 1);
      assert.equal(value.newFindings.length, 1);
      assert.equal(value.groups.length, 0);
      assert.equal(value.updates[0].ticket, 'WEBUI-1');
      assert.equal(value.updates[0].severity, noPatch ? 'critical' : 'medium');
      const payload = fs.readFileSync(path.join(folder, 'teams-payload.json'), 'utf8');
      if (!noPatch) assert.match(payload, /Existing work to update/);
      assert.doesNotMatch(payload, /WEBUI-222/);
      if (noPatch) {
        assert.match(payload, /Existing blockers affecting new alerts/);
        assert.match(payload, /1 Critical/);
      } else assert.doesNotMatch(payload, /Existing blockers affecting new alerts/);
      assert.equal(phase('apply').status, 0);
      assert.equal(phase('finish').status, 0);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
}

test('multiple severity corrections consolidate to one existing-ticket proposal with Critical preserved', () => {
  const { folder, phase, hook } = fixtureRun(false);
  try {
    const findings = [
      finding({ severity: 'high', ghsa: 'GHSA-high' }),
      finding({
        id: repo + '#124',
        number: 124,
        url: `https://github.com/${repo}/security/dependabot/124`,
        severity: 'critical',
        ghsa: 'GHSA-critical',
      }),
    ];
    const ticket = issue(findings[0], {
      customfield_12201: { value: 'Low' },
      description: findings.map((f) => `${f.url} ${f.package} ${f.ghsa} ${f.manifest}`).join('\n'),
    });
    const raw = findings.map((f) => {
      return {
        number: f.number,
        html_url: f.url,
        dependency: { package: { name: f.package, ecosystem: 'npm' }, manifest_path: f.manifest },
        security_advisory: { severity: f.severity, ghsa_id: f.ghsa },
        security_vulnerability: { vulnerable_version_range: f.range, first_patched_version: { identifier: f.patched } },
      };
    });
    fs.writeFileSync(
      hook,
      `globalThis.fetch=async(url)=>{
      const value=String(url);
      if(value.includes('/issue/NXENG-987'))return Response.json({fields:{issuetype:{name:'Epic'},status:{statusCategory:{key:'new'}}}});
      if(value.endsWith('/search/jql'))return Response.json({issues:[${JSON.stringify(ticket)}],isLast:true});
      if(value.includes('/dependabot/alerts?'))return Response.json(value.includes('nuxeo-web-ui')?${JSON.stringify(raw)}:[]);
      if(value.includes('/contents/'))return Response.json({encoding:'base64',content:Buffer.from(JSON.stringify(value.includes('package-lock.json')?${JSON.stringify(lock())}:{})).toString('base64')});
      if(value.startsWith('https://registry.npmjs.org/'))return Response.json({});
      throw new Error('No writes allowed');
    };`,
    );
    assert.equal(phase('scan').status, 0);
    const value = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(value.failures, []);
    assert.equal(value.updates.length, 1);
    assert.equal(value.updates[0].severity, 'critical');
    assert.equal(value.updates[0].findings.length, 2);
    assert.ok(
      value.updates[0].findings.every((f) => Object.values(f.branchEvidence).every((b) => b.evidence.length === 1)),
    );
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('recovered ticket actions are not counted as tickets created in the current run', () => {
  const value = report();
  value.carriedActions = [
    {
      ticket: 'WEBUI-9',
      key: 'old',
      action: 'created',
      severity: 'medium',
      summary: 'Recovered minimatch work',
      findings: [finding()],
    },
  ];
  const output = JSON.stringify(card(value, config, 'automatic'));
  assert.match(output, /0 created · 0 updated/);
  assert.match(output, /1 recovered from earlier runs/);
  assert.match(output, /Recovered actions from earlier runs/);
});

test('coverage requires alert, advisory, package and manifest in the same finding row', () => {
  const f = finding();
  const other = finding({ number: 124, url: f.url.replace('123', '124'), ghsa: 'GHSA-other' });
  const ticket = issue(f, {
    description: `### Findings\n| ${f.url} | ${other.ghsa} | example | package-lock.json |\n| ${other.url} | ${f.ghsa} | example | package-lock.json |\n`,
  });
  assert.equal(matchFinding(f, [ticket]).kind, 'ambiguous');
  ticket.fields.description = `### Findings\n${f.url} ${other.ghsa} example package-lock.json\n${other.url} ${f.ghsa} example package-lock.json`;
  assert.equal(matchFinding(f, [ticket]).kind, 'ambiguous');
  ticket.fields.description = `### Findings\n| ${f.url} | ${f.ghsa} | example | package-lock.json |\n| ${other.url} | ${other.ghsa} | example | package-lock.json |\n`;
  assert.equal(matchFinding(f, [ticket]).kind, 'covered');
});

function updateFixture({ severity = 'Medium', historical = false } = {}) {
  const fixture = fixtureRun(false);
  const { folder, hook } = fixture;
  const group = groupFindings([finding()])[0];
  const fullConfig = JSON.parse(fs.readFileSync(new URL('../../dependabot-triage.json', import.meta.url)));
  const old = structuredClone(group);
  old.reason = 'Previous automated assessment';
  if (historical) old.findings.push(finding({ number: 124, url: finding().url.replace('123', '124') }));
  const document = description(old, fullConfig);
  seed(folder, 'remote.json', {
    key: 'WEBUI-99',
    fields: {
      description: document,
      parent: { key: config.epic },
      customfield_12201: { id: severity === 'Critical' ? '13603' : '15790', value: severity },
      status: { name: 'Open', statusCategory: { key: 'new' } },
    },
  });
  seed(folder, 'report.json', { ...report(), alerts: [finding()], newFindings: [finding()], groups: [group] });
  seed(folder, 'state.json', {
    version: 1,
    checkpoints: {},
    fingerprints: {},
    active: { mode: 'automatic' },
    createIntents: {},
    receipts: { [group.key]: { ticket: 'WEBUI-99', descriptionHash: hash(document) } },
  });
  fs.writeFileSync(
    hook,
    `
    import fs from 'node:fs';
    const remotePath=${JSON.stringify(path.join(folder, 'remote.json'))};
    const journalPath=${JSON.stringify(path.join(folder, 'durable-journal.json'))};
    const writesPath=${JSON.stringify(path.join(folder, 'writes.json'))};
    globalThis.fetch=async(url,options={})=>{
      const value=String(url);
      const remote=JSON.parse(fs.readFileSync(remotePath));
      if(value.endsWith('/search/jql')) return Response.json({issues:[remote],isLast:true});
      if(value.includes('/issue/WEBUI-99')) {
        if(options.method==='PUT') {
          const intent=Object.values(JSON.parse(fs.readFileSync(journalPath)).at(-1).updateIntents)[0];
          if(!intent||intent.ticket!=='WEBUI-99') throw new Error('Missing durable update intent before PUT');
          const fields=JSON.parse(options.body).fields;
          Object.assign(remote.fields,fields);
          remote.fields.customfield_12201.value='Medium';
          fs.writeFileSync(remotePath,JSON.stringify(remote));
          fs.writeFileSync(writesPath,JSON.stringify((fs.existsSync(writesPath)?JSON.parse(fs.readFileSync(writesPath)):0)+1));
          if(process.env.FIXTURE_LOST_UPDATE==='true') throw new Error('Simulated lost PUT response');
          return new Response(null,{status:204});
        }
        return Response.json(remote);
      }
      throw new Error('Unexpected fixture request '+value);
    };
  `,
  );
  return { ...fixture, group };
}

test('manual severity increase survives an owned description update', () => {
  const { folder, phase } = updateFixture({ severity: 'Critical' });
  try {
    assert.equal(phase('apply', automatic).status, 0);
    assert.equal(fs.existsSync(path.join(folder, 'writes.json')), false);
    assert.match(fs.readFileSync(path.join(folder, 'report.json'), 'utf8'), /higher severity/);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(folder, 'remote.json'))).fields.customfield_12201.value,
      'Critical',
    );
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('historical finding rows remain when an alert is no longer returned by GitHub', () => {
  const { folder, phase } = updateFixture({ historical: true });
  try {
    assert.equal(phase('apply', automatic).status, 0);
    assert.equal(fs.existsSync(path.join(folder, 'writes.json')), false);
    assert.match(fs.readFileSync(path.join(folder, 'report.json'), 'utf8'), /additional retained findings/);
    assert.match(fs.readFileSync(path.join(folder, 'remote.json'), 'utf8'), /dependabot\/124/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('lost update response is reconciled and reported without another PUT', () => {
  const { folder, phase, group } = updateFixture();
  try {
    assert.equal(phase('apply', { ...automatic, FIXTURE_LOST_UPDATE: 'true' }).status, 0);
    let saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.equal(Object.values(saved.updateIntents)[0].confirmed, undefined);
    seed(folder, 'report.json', { ...report(), alerts: [finding()], newFindings: [finding()], groups: [group] });
    assert.equal(phase('apply', automatic).status, 0);
    saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(saved.failures, []);
    assert.equal(saved.carriedActions[0].action, 'updated');
    assert.equal(saved.groups[0].reconciled, true);
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'writes.json'))), 1);
    const state = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.equal(Object.values(state.updateIntents)[0].confirmed, true);
    assert.equal(Object.values(state.pendingOutcomes)[0].ticket, 'WEBUI-99');
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('confirmed update outcome survives later human edits without replaying writes', () => {
  const { folder, phase } = updateFixture();
  try {
    assert.equal(phase('apply', automatic).status, 0);
    const remote = JSON.parse(fs.readFileSync(path.join(folder, 'remote.json')));
    remote.fields.description = 'Human changed this after the confirmed update';
    seed(folder, 'remote.json', remote);
    seed(folder, 'report.json', report());
    assert.equal(phase('apply', automatic).status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(saved.failures, []);
    assert.equal(saved.carriedActions[0].action, 'updated');
    assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'writes.json'))), 1);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('confirming delivery acknowledges outcomes even when the delivered scan was incomplete', () => {
  const { folder, phase } = fixtureRun(false);
  try {
    const snapshot = { ...report(), failures: ['Earlier source failed'] };
    seed(folder, 'state.json', {
      version: 1,
      receipts: {},
      checkpoints: {},
      fingerprints: {},
      active: {
        mode: 'automatic',
        notification: {
          status: 'reserved',
          attempt: 'old-attempt',
          snapshot,
          payload: { message: 'incomplete' },
          outcomeKeys: ['created', 'updated'],
        },
      },
      pendingOutcomes: { created: { ticket: 'WEBUI-99' }, updated: { ticket: 'WEBUI-98' } },
      createIntents: { created: { ticket: 'WEBUI-99' }, uncertain: { status: 'reserved' } },
      updateIntents: { updated: { confirmed: true, ticket: 'WEBUI-98' } },
    });
    assert.equal(
      phase('scan', {
        ...automatic,
        DELIVERY_RESOLUTION: 'delivered',
        DELIVERY_MESSAGE_URL: 'https://teams.microsoft.com/l/message/example',
      }).status,
      0,
    );
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'state.json')));
    assert.deepEqual(saved.pendingOutcomes, {});
    assert.equal(saved.createIntents.created, undefined);
    assert.equal(saved.updateIntents.updated, undefined);
    assert.ok(saved.createIntents.uncertain);
    assert.deepEqual(saved.checkpoints, {});
    assert.equal(phase('finish', automatic).status, 1);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('a single alert does not permit whole-table coverage from unrelated package or manifest rows', () => {
  const f = finding();
  const ticket = issue(f, {
    description: `### Findings\n| ${f.url} | ${f.ghsa} | other-package | plugin/a11y/package-lock.json |\n| Remediation context | example | package-lock.json |\n`,
  });
  assert.equal(matchFinding(f, [ticket]).kind, 'ambiguous');
  ticket.fields.description = `### Findings\n| ${f.url} | ${f.ghsa} | other-package\n| example | package-lock.json`;
  assert.equal(matchFinding(f, [ticket]).kind, 'ambiguous');
  ticket.fields.description = `### Findings\n| ${f.url} | ${f.ghsa} | example | package-lock.json |`;
  assert.equal(matchFinding(f, [ticket]).kind, 'covered');
});

test('an exact in-scope alert reference with incomplete identifiers requires review before creation', () => {
  const f = finding();
  for (const body of [`${f.url} ${f.ghsa}`, `${f.url} example`, f.url]) {
    assert.equal(matchFinding(f, [issue(f, { description: body })]).kind, 'ambiguous');
  }
  assert.equal(matchFinding(f, [issue(f, { description: f.url + '4' })]).kind, 'new');
  assert.equal(matchFinding(f, [issue(f, { description: `### Out of scope\n${f.url}` })]).kind, 'new');
});

test('CLI automatic triage cannot create a duplicate when an exact alert link has an incomplete register', () => {
  const { folder, phase, hook } = fixtureRun(false);
  try {
    const f = finding();
    const ticket = issue(f, { description: `${f.url} ${f.ghsa}` });
    const raw = {
      number: f.number,
      html_url: f.url,
      dependency: { package: { name: f.package, ecosystem: 'npm' }, manifest_path: f.manifest },
      security_advisory: { severity: f.severity, ghsa_id: f.ghsa },
      security_vulnerability: { vulnerable_version_range: f.range, first_patched_version: { identifier: f.patched } },
    };
    fs.writeFileSync(
      hook,
      `globalThis.fetch=async(url)=>{
      const value=String(url);
      if(value.includes('/issue/NXENG-987'))return Response.json({fields:{issuetype:{name:'Epic'},status:{statusCategory:{key:'new'}}}});
      if(value.endsWith('/search/jql'))return Response.json({issues:[${JSON.stringify(ticket)}],isLast:true});
      if(value.includes('/dependabot/alerts?'))return Response.json(value.includes('nuxeo-web-ui')?[${JSON.stringify(raw)}]:[]);
      throw new Error('Unexpected write or request: '+value);
    };`,
    );
    assert.equal(phase('scan', automatic).status, 0);
    assert.equal(phase('apply', automatic).status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.deepEqual(saved.failures, []);
    assert.deepEqual(saved.groups, []);
    assert.equal(saved.reviewFindings.length, 1);
    assert.match(saved.review[0], /ambiguous coverage; review WEBUI-1/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder, 'state.json'))).createIntents, {});
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('fresh pre-create lookup catches a URL-only ticket added after the scan', () => {
  const { folder, phase, hook, first } = createFixture();
  try {
    const f = first.findings[0];
    seed(folder, 'report.json', { ...report(), alerts: [f], newFindings: [f], groups: [first] });
    const ticket = issue(f, { description: f.url });
    fs.writeFileSync(
      hook,
      `globalThis.fetch=async(url,options={})=>{
      if(String(url).endsWith('/search/jql')) {
        const jql=JSON.parse(options.body).jql;
        const includesUrl=jql.includes(${JSON.stringify(JSON.stringify(`"${f.url}"`))});
        return Response.json({issues:includesUrl?[${JSON.stringify(ticket)}]:[],isLast:true});
      }
      throw new Error('Unexpected write or request: '+String(url));
    };`,
    );
    assert.equal(phase('apply', automatic).status, 0);
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'report.json')));
    assert.match(saved.failures[0], /Fresh alert\/advisory coverage/);
    assert.equal(saved.groups[0].action, undefined);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(folder, 'state.json'))).createIntents, {});
    assert.equal(fs.existsSync(path.join(folder, 'durable-journal.json')), false);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

// Regression tests for the PR review findings: each test pins one behaviour the review asked for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Executor, apply, summarize } from '../apply.mjs';
import { npmClient } from '../lib/clients.mjs';
import { validatePlan } from '../lib/plan-validator.mjs';
import { OWNERSHIP_PROPERTY, blockerRecheck, fingerprint, reconcile } from '../lib/reconcile.mjs';
import { runReport, teamsCard } from '../lib/render.mjs';
import { ControlState, JOURNAL_PROPERTY, STATE_PROPERTY } from '../lib/state.mjs';
import { plan } from '../plan.mjs';
import { DIGEST, EL, RUN, WEB, blocked, bootstrapPlan, group, liveAlerts, registerTickets } from './fixtures.mjs';
import { FakeJira, config, createGroup, executor, newOutcome, severityId } from './support.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);

/** The real configuration with the synthetic control issue and repositories used by the in-memory Jira. */
const CONFIG_FILE = (() => {
  const real = JSON.parse(readFileSync(path.resolve(here, '../../../dependabot-ai-triage.json'), 'utf8'));
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'dat-config-')), 'config.json');
  writeFileSync(
    file,
    JSON.stringify({ ...real, controlIssue: config.controlIssue, repositories: config.repositories }),
  );
  return file;
})();

test('the executor can be built from a partial inventory so an incomplete run still reports', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, 'APP-99');
  await control.load();
  const exec = new Executor({ jira, control, config, inventory: { runId: RUN }, outcome: newOutcome() });
  assert.equal(exec.alerts.size, 0);
  assert.equal(exec.tickets.size, 0);
});

test('a create never reuses a ticket created for the same remediation by an earlier run', async () => {
  const jira = new FakeJira();
  const earlier = await executor(jira, [], { runId: 'earlier-run' });
  await earlier.exec.create(createGroup(), {});
  jira.issues.get('LIB-3000').fields.status = { name: 'Resolved', statusCategory: { key: 'done' } };
  const later = await executor(jira, []);
  const report = {};
  await later.exec.create(createGroup(), report);
  assert.equal(jira.calls.filter((call) => call.name === 'create').length, 2);
  assert.notEqual(report.ticketKey, 'LIB-3000');
  assert.equal(jira.issues.get('LIB-3000').properties[OWNERSHIP_PROPERTY].updatedBy, 'earlier-run');
});

test('ownership is recorded last: a failed hold leaves the alerts unowned so they are planned again', async () => {
  const jira = new FakeJira();
  jira.noHoldTransition = true;
  const { exec, outcome } = await executor(jira, []);
  const report = {};
  const unpatched = group(`${EL}:pkg-merge`, EL, 'create', undefined, 'low', [106], {
    ...blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-0000-0000-0007'),
  });
  await exec.create(unpatched, report);
  assert.match(outcome.failures.join(), /no transition/);
  assert.equal(jira.issues.get(report.ticketKey).properties[OWNERSHIP_PROPERTY], undefined);
});

test('ownership is recorded last: a failed scope comment leaves the extended alert unowned', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.failNext = { name: 'addComment', error: { status: 400 } };
  const { exec, outcome } = await executor(jira, tickets);
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'high', [104, 105, 107, 108], {
    updateNote: 'Adds the library alert.',
  });
  await exec.update(extend, {});
  assert.equal(outcome.failures.length, 1);
  assert.equal(jira.issues.get('LIB-44').properties[OWNERSHIP_PROPERTY], undefined);
});

test('targets are re-read before writing: closed, started or re-owned tickets are not changed', async () => {
  const cases = [
    [{ status: { name: 'Resolved', statusCategory: { key: 'done' } } }, /is now Resolved/],
    [{ status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } } }, /scope is not extended/],
  ];
  for (const [fields, message] of cases) {
    const tickets = registerTickets();
    const jira = new FakeJira(tickets);
    Object.assign(jira.issues.get('LIB-44').fields, fields);
    const { exec, outcome } = await executor(jira, tickets);
    const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'high', [104, 105, 107, 108], { updateNote: 'x' });
    await exec.update(extend, {});
    assert.match(outcome.failures.join(), message);
    assert.equal(jira.calls.filter((call) => call.name !== 'setProperty').length, 0);
  }
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('APP-31').properties[OWNERSHIP_PROPERTY] = { updatedBy: 'someone-else', alerts: {} };
  const { exec, outcome } = await executor(jira, tickets);
  await exec.update(bootstrapPlan().groups[0], {});
  assert.match(outcome.failures.join(), /ownership changed since collection/);
});

test('severity raises use the current Jira value, so a manual Critical is never lowered', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('APP-31').fields[config.severityField] = { id: severityId('critical') };
  const { exec, outcome } = await executor(jira, tickets);
  const raise = { ticket: 'APP-31', from: 'medium', to: 'high', alerts: [`${WEB}#14`] };
  outcome.severityRaises.push(raise);
  await exec.raiseCovered(raise, new Set());
  assert.equal(jira.issues.get('APP-31').fields[config.severityField].id, severityId('critical'));
  assert.equal(raise.applied, false);
});

test('a planned update that raises severity is reported as an applied raise', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const alerts = liveAlerts();
  alerts.find((alert) => alert.number === 14).severity = 'high';
  const { exec, outcome } = await executor(jira, tickets, { alerts });
  const adopt = { ...bootstrapPlan().groups[0], severity: 'high' };
  await exec.update(adopt, {});
  assert.deepEqual(outcome.severityRaises, [
    { ticket: 'APP-31', from: 'medium', to: 'high', alerts: [`${WEB}#14`], applied: true },
  ]);
});

test('issue links go through the journal and are not repeated when the run is retried', async () => {
  const jira = new FakeJira();
  const linked = { ...createGroup(), relatedTickets: ['LIB-44'] };
  await (await executor(jira, [])).exec.create(linked, {});
  await (await executor(jira, [])).exec.create(linked, {});
  assert.equal(jira.calls.filter((call) => call.name === 'link').length, 1);
  const journal = jira.issues.get('APP-99').properties[JOURNAL_PROPERTY].entries;
  assert.ok(journal.some((entry) => entry.kind === 'link' && entry.status === 'done'));
});

test('the journal never prunes uncertain or reserved entries', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, 'APP-99');
  await control.load();
  const filler = 'x'.repeat(400);
  control.journal.entries.push({ id: 'teams', kind: 'teams', status: 'uncertain', detail: filler });
  for (let i = 0; i < 80; i++) {
    control.journal.entries.push({ id: `done-${i}`, kind: 'create', status: 'done', detail: filler });
  }
  await control.persistJournal();
  assert.ok(control.journal.entries.some((entry) => entry.id === 'teams'));
  control.journal.entries = Array.from({ length: 80 }, (_, i) => {
    return { id: `u-${i}`, status: 'uncertain', detail: filler };
  });
  await assert.rejects(control.persistJournal(), /full of unresolved writes/);
});

test('closed-ticket mismatches found by reconciliation count as untriaged and carry over', () => {
  const inventory = {
    alerts: liveAlerts(),
    currentOwner: {},
    previousState: null,
    reconciliation: { closedMismatches: [{ id: `${WEB}#2`, tickets: ['APP-84'] }] },
  };
  const summary = summarize(inventory, { groups: [], needsReview: [], closedTicketMismatches: [] });
  assert.deepEqual(summary.untriaged, [`${WEB}#2`]);
  assert.deepEqual(summary.newBySeverity, { medium: 1 });
});

test('acceptance criteria must be a list of text whenever they are supplied', () => {
  const alerts = liveAlerts();
  const planned = bootstrapPlan();
  planned.groups[0].acceptanceCriteria = 'not a list';
  const result = validatePlan({
    plan: planned,
    runId: RUN,
    inventoryDigest: DIGEST,
    repositories: [
      { name: WEB, project: 'APP' },
      { name: EL, project: 'LIB' },
    ],
    epicQuarter: '2026-Q4',
    alerts,
    aiInput: alerts.map((alert) => `${alert.repository}#${alert.number}`),
    currentOwner: new Map(),
    tickets: registerTickets(),
    now: new Date('2026-11-09T07:45:00Z'),
  });
  assert.ok(result.errors.some((error) => error.code === 'group-schema' && /acceptance criteria/.test(error.message)));
});

test('blocked owners are re-assessed when the upstream ticket changes status, and at least every four weeks', () => {
  const now = new Date('2026-11-30T00:00:00Z');
  const tickets = new Map([['LIB-24', { key: 'LIB-24', status: 'Resolved' }]]);
  const ownership = {
    kind: 'blocked',
    blocker: { type: 'upstream-release-pending', upstreamRef: 'LIB-24', upstreamStatus: 'Open' },
    checkedAt: '2026-11-25T00:00:00Z',
  };
  assert.equal(blockerRecheck(ownership, tickets, now), 'upstream-status-changed');
  const unchanged = { ...ownership, blocker: { ...ownership.blocker, upstreamStatus: 'Resolved' } };
  assert.equal(blockerRecheck(unchanged, tickets, now), null);
  assert.equal(blockerRecheck({ ...unchanged, checkedAt: '2026-10-01T00:00:00Z' }, tickets, now), 'periodic-recheck');
  assert.equal(blockerRecheck({ kind: 'actionable' }, tickets, now), null);

  const alerts = liveAlerts();
  const owners = registerTickets({ withOwnership: true, fingerprintOf: fingerprint });
  const held = owners.find((ticket) => ticket.key === 'APP-30');
  Object.assign(held.ownership, { kind: 'blocked', blocker: ownership.blocker, checkedAt: ownership.checkedAt });
  const result = reconcile({ alerts, tickets: [...owners, { key: 'LIB-24', status: 'Resolved' }], now });
  assert.deepEqual(result.changed, [{ id: `${WEB}#1`, ticket: 'APP-30', reason: 'upstream-status-changed' }]);
});

test('ambiguous ownership appears in Teams and prevents the clean-week wording', () => {
  const outcome = {
    runId: RUN,
    complete: true,
    failures: [],
    newBySeverity: {},
    groups: [],
    severityRaises: [],
    needsReview: [],
    closedMismatches: [],
    ambiguous: [{ id: `${EL}#107`, tickets: ['LIB-24', 'LIB-44'] }],
    repositories: [{ name: EL }],
  };
  const text = JSON.stringify(teamsCard(outcome, { ...config, controlIssue: 'APP-99' }));
  assert.match(text, /Needs review · 1/);
  assert.match(text, /several open tickets \(LIB-24, LIB-44\)/);
  assert.doesNotMatch(text, /took the day off/);
});

test('oversized report entries are clipped and split so no comment exceeds the Jira limit', () => {
  const long = 'y'.repeat(4000);
  const groups = Array.from({ length: 5 }, (_, index) => {
    return {
      ...group(`${WEB}:g${index}`, WEB, 'create', undefined, 'low', [index + 1]),
      remediation: long,
      rationale: long,
      acceptanceCriteria: [long, long],
      action: 'proposed create',
    };
  });
  const documents = runReport(
    {
      runId: RUN,
      mode: 'preview',
      complete: true,
      planDetermined: true,
      firstReconciliation: false,
      repositories: [],
      newBySeverity: {},
      counts: { alerts: 5, uniqueAdvisories: 5, covered: 0, carried: 0, create: 5, extend: 0, adopt: 0 },
      groups,
      severityRaises: [],
      closedMismatches: [],
      needsReview: [],
      ambiguous: [],
      cleared: [],
      warnings: [],
      failures: [],
      actions: [],
      validationErrors: [],
    },
    config,
  );
  for (const document of documents) {
    assert.ok(JSON.stringify(document).length < 32000);
  }
});

test('scoped npm package names are fully encoded', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return new Response('{}', { status: 200 });
  };
  try {
    await npmClient().packument('@scope/name');
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(urls, ['https://registry.npmjs.org/@scope%2Fname']);
});

function workDir(inventory) {
  const work = mkdtempSync(path.join(tmpdir(), 'dat-test-'));
  writeFileSync(path.join(work, 'inventory.json'), JSON.stringify(inventory));
  return work;
}

function baseInventory(extra = {}) {
  return {
    schemaVersion: 1,
    runId: RUN,
    configRevision: 'c',
    mode: 'preview',
    epic: 'EPIC-1',
    epicQuarter: '2026-Q4',
    startedAt: new Date().toISOString(),
    collectedAt: new Date().toISOString(),
    failures: [],
    warnings: [],
    lockAcquired: true,
    plannerNeeded: false,
    repositories: [],
    alerts: [],
    tickets: [],
    currentOwner: {},
    aiInput: [],
    reconciliation: { covered: [], closedMismatches: [], ambiguous: [], severityRaises: [] },
    ...extra,
  };
}

async function withEnv(values, fn) {
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('preview never reconciles interrupted writes on remediation tickets; it reports them', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  await control.reserve({ id: 'old:create', kind: 'create', target: 'x', runId: 'old', recovery: { label: 'dat-x' } });
  const work = workDir(baseInventory());
  const outcome = await withEnv({ TRIAGE_WORK_DIR: work, TRIAGE_CONFIG: CONFIG_FILE }, () => apply(jira));
  process.exitCode = 0;
  const elsewhere = jira.calls.filter((call) => call.args?.key !== config.controlIssue);
  assert.deepEqual(elsewhere, []);
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find('old:create').status, 'reserved');
  assert.ok(outcome.warnings.some((warning) => warning.code === 'pending'));
  assert.ok(!jira.issues.get(config.controlIssue).properties[STATE_PROPERTY].lock);
});

test('without the private journal no Teams message is sent, so a retry cannot resend it', async () => {
  const original = globalThis.fetch;
  let posts = 0;
  globalThis.fetch = async () => {
    posts++;
    return new Response('', { status: 202 });
  };
  try {
    const work = workDir(baseInventory({ mode: 'automatic', lockAcquired: false, failures: ['Jira setup: HTTP 401'] }));
    await withEnv(
      { TRIAGE_WORK_DIR: work, TRIAGE_CONFIG: CONFIG_FILE, DEPENDABOT_TEAMS_WEBHOOK_URL: 'https://hooks.example/x' },
      () => apply(new FakeJira()),
    );
    process.exitCode = 0;
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(posts, 0);
});

test('a failed Teams delivery is recorded after the report and makes the run incomplete', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 400 });
  const jira = new FakeJira();
  try {
    const work = workDir(baseInventory({ mode: 'automatic' }));
    const outcome = await withEnv(
      { TRIAGE_WORK_DIR: work, TRIAGE_CONFIG: CONFIG_FILE, DEPENDABOT_TEAMS_WEBHOOK_URL: 'https://hooks.example/x' },
      () => apply(jira),
    );
    process.exitCode = 0;
    assert.equal(outcome.complete, false);
  } finally {
    globalThis.fetch = original;
  }
  const comments = jira.issues.get(config.controlIssue).comments.map((comment) => JSON.stringify(comment));
  assert.match(comments.at(-1), /INCOMPLETE: Teams delivery failed/);
});

test('planner parse failures never put the reply in the public log or the error file', async () => {
  const work = mkdtempSync(path.join(tmpdir(), 'dat-plan-'));
  mkdirSync(path.join(work, 'planner'));
  writeFileSync(path.join(work, 'inventory.json'), JSON.stringify({ plannerNeeded: true }));
  const fake = path.join(work, 'copilot');
  writeFileSync(fake, '#!/bin/sh\necho "{ SECRET-ALERT-DETAIL not json"\n');
  chmodSync(fake, 0o755);
  const printed = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk) => printed.push(String(chunk));
  try {
    await withEnv(
      { TRIAGE_WORK_DIR: work, TRIAGE_CONFIG: CONFIG_FILE, COPILOT_BIN: fake, COPILOT_GITHUB_TOKEN: 'x' },
      () => plan(),
    );
  } finally {
    process.stdout.write = write;
  }
  const error = readFileSync(path.join(work, 'plan-error.json'), 'utf8');
  assert.doesNotMatch(printed.join(''), /SECRET/);
  assert.doesNotMatch(error, /SECRET/);
  assert.match(error, /not a single valid JSON object/);
});

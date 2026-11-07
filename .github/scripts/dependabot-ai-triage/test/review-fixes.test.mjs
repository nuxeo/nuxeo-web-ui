// Regression tests for the PR review findings: each test pins one behaviour the review asked for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Executor, apply, postTeams, summarize } from '../apply.mjs';
import { clearedAlerts, collect, plannerTicket, selectCandidates } from '../collect.mjs';
import { anonymouslyReadable, npmClient } from '../lib/clients.mjs';
import { validatePlan } from '../lib/plan-validator.mjs';
import { OWNERSHIP_PROPERTY, blockerRecheck, fingerprint, reconcile } from '../lib/reconcile.mjs';
import { runReport, teamsCard } from '../lib/render.mjs';
import { request } from '../lib/util.mjs';
import { CARD_PROPERTY, ControlState, JOURNAL_PROPERTY, STATE_PROPERTY } from '../lib/state.mjs';
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

// Second review round.

test('an extension is refused when the target was put On Hold after collection', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('LIB-44').fields.status = { name: 'On Hold', statusCategory: { key: 'new' } };
  const { exec, outcome } = await executor(jira, tickets);
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'high', [104, 105, 107, 108], { updateNote: 'x' });
  await exec.update(extend, {});
  assert.match(outcome.failures.join(), /is now On Hold/);
  assert.equal(jira.calls.filter((call) => call.args?.key === 'LIB-44').length, 0);
});

async function teamsAttempt(jira, response, outcomeExtra = {}) {
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const outcome = {
    ...newOutcome(),
    runId: RUN,
    complete: true,
    newBySeverity: {},
    groups: [],
    needsReview: [],
    closedMismatches: [],
    repositories: [{ name: WEB }],
    ...outcomeExtra,
  };
  const original = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body));
    return response();
  };
  process.env.DEPENDABOT_TEAMS_WEBHOOK_URL = 'https://hooks.example/x';
  try {
    const delivered = await postTeams(control, outcome, config, { runId: RUN });
    return { delivered, outcome, sent };
  } finally {
    globalThis.fetch = original;
    delete process.env.DEPENDABOT_TEAMS_WEBHOOK_URL;
  }
}

test('a retry after an unknown Teams outcome is not resent and keeps the run incomplete', async () => {
  const jira = new FakeJira();
  await teamsAttempt(jira, () => {
    throw new Error('socket hang up');
  });
  const retry = await teamsAttempt(jira, () => new Response('', { status: 202 }));
  assert.equal(retry.delivered, false);
  assert.equal(retry.sent.length, 0);
  assert.match(retry.outcome.failures.join(), /unresolved \(uncertain\); not resent/);
});

test('a retry after a failed Teams send resends the original card, not one rebuilt from the retry', async () => {
  const jira = new FakeJira();
  const created = [{ ...createGroup(), ticketKey: 'LIB-3000', action: 'created' }];
  const first = await teamsAttempt(jira, () => new Response('', { status: 429 }), {
    groups: created,
    newBySeverity: { medium: 1 },
  });
  assert.equal(first.delivered, false);
  const retry = await teamsAttempt(jira, () => new Response('', { status: 202 }));
  assert.equal(retry.delivered, true);
  assert.deepEqual(retry.sent[0], first.sent[0]);
  assert.match(JSON.stringify(retry.sent[0]), /LIB-3000/);
});

test('a re-planned blocked owner brings its upstream ticket and blocker metadata to the planner', () => {
  const upstream = { key: 'LIB-24', project: 'LIB', summary: 'x', description: '', statusCategory: 'done' };
  const owner = {
    key: 'APP-30',
    project: 'APP',
    summary: 'y',
    description: '',
    statusCategory: 'new',
    ownership: {
      repository: WEB,
      kind: 'blocked',
      alerts: { 1: {} },
      blocker: { type: 'upstream-release-pending', upstreamRef: 'LIB-24', upstreamStatus: 'Open' },
    },
  };
  const alert = liveAlerts().find((item) => item.repository === WEB && item.number === 1);
  const candidates = selectCandidates([upstream, owner], [alert], { [`${WEB}#1`]: 'APP-30' }, config);
  assert.deepEqual(candidates.map((ticket) => ticket.key).sort(), ['APP-30', 'LIB-24']);
  assert.equal(plannerTicket(owner, []).recordedOwnership.blocker.upstreamRef, 'LIB-24');
});

test('every closed owned alert is looked up in bounded batches, skipping ones already reported', async () => {
  let active = 0;
  let peak = 0;
  const looked = [];
  const github = {
    async alert(repository, number) {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });
      active--;
      looked.push(number);
      return { state: 'fixed' };
    },
  };
  const owned = Array.from({ length: 130 }, (_, index) => {
    return { id: `${WEB}#${index + 1}`, tickets: ['APP-1'] };
  });
  const cleared = await clearedAlerts(github, owned, [], [`${WEB}#1`]);
  assert.equal(cleared.length, 129);
  assert.ok(!looked.includes(1) && looked.includes(130));
  assert.ok(peak <= 10);
});

test('malformed identifiers and optional text are rejected by the validator without throwing', () => {
  const args = (planned) => {
    const alerts = liveAlerts();
    return {
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
    };
  };
  const cases = [
    (planned) => {
      planned.groups[0].remediationId = [`${WEB}:upgrade`];
    },
    (planned) => {
      planned.groups[0].ticket = ['APP-31'];
    },
    (planned) => {
      planned.groups[0].updateNote = { text: 'not text' };
    },
  ];
  for (const change of cases) {
    const planned = bootstrapPlan();
    change(planned);
    const result = validatePlan(args(planned));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === 'group-schema'));
  }
});

test('Teams lists a ticket once when its update also raised severity, and says On Hold only when it is', () => {
  const updated = { ...createGroup(), operation: 'extend', ticketKey: 'LIB-44', action: 'extended', severity: 'high' };
  const raise = { ticket: 'LIB-44', from: 'medium', to: 'high', alerts: [], applied: true };
  const notHeld = {
    ...group(`${EL}:pkg-merge`, EL, 'create', undefined, 'low', [106], {
      ...blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-0000-0000-0007'),
    }),
    ticketKey: 'LIB-3001',
    action: 'created',
    blockerChanged: true,
    heldVerified: false,
    onHold: false,
  };
  const outcome = {
    runId: RUN,
    complete: false,
    failures: ['hold LIB-3001: no transition'],
    newBySeverity: { low: 1 },
    groups: [updated, notHeld],
    severityRaises: [raise],
    needsReview: [],
    closedMismatches: [],
    repositories: [{ name: EL }],
  };
  const text = JSON.stringify(teamsCard(outcome, { ...config, controlIssue: 'APP-99' }));
  assert.match(text, /Tickets updated · 1/);
  assert.equal((text.match(/LIB-44\]/g) ?? []).length, 1);
  assert.match(text, /LIB-3001\]\([^)]*\) · Low · Blocked, not On Hold/);
});

test('an unreadable response to a write is an uncertain outcome', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('not json', { status: 201 });
  try {
    await assert.rejects(
      request({ service: 'Jira', url: 'https://jira.example/x', method: 'POST', body: {}, label: 'comment create' }),
      (error) => error.uncertain === true && !/not json/.test(error.message),
    );
  } finally {
    globalThis.fetch = original;
  }
});

// Third review round (inline threads and the "previously missed" findings from the review summary).

test('each run keeps its own Teams card; a retry without its stored card is not rebuilt or resent', async () => {
  const jira = new FakeJira();
  const created = [{ ...createGroup(), ticketKey: 'LIB-3000', action: 'created' }];
  await teamsAttempt(jira, () => new Response('', { status: 429 }), { groups: created, newBySeverity: { medium: 1 } });
  const otherRun = new ControlState(jira, config.controlIssue);
  await otherRun.storeCard('another-run', { other: true });
  assert.ok(await otherRun.storedCard(RUN));
  delete jira.issues.get(config.controlIssue).properties[`${CARD_PROPERTY}-${RUN}`];
  const retry = await teamsAttempt(jira, () => new Response('', { status: 202 }));
  assert.equal(retry.delivered, false);
  assert.equal(retry.sent.length, 0);
  assert.match(retry.outcome.failures.join(), /no longer stored; not rebuilt or resent/);
});

test('a delivered card is removed once its delivery is recorded', async () => {
  const jira = new FakeJira();
  const sent = await teamsAttempt(jira, () => new Response('', { status: 202 }));
  assert.equal(sent.delivered, true);
  assert.equal(jira.issues.get(config.controlIssue).properties[`${CARD_PROPERTY}-${RUN}`], undefined);
});

test('only confirmed closures count as cleared alerts', async () => {
  const states = { 1: 'fixed', 2: 'open', 3: 'dismissed', 4: 'auto_dismissed' };
  const github = {
    async alert(repository, number) {
      return { state: states[number] };
    },
  };
  const owned = [1, 2, 3, 4].map((number) => {
    return { id: `${WEB}#${number}`, tickets: ['APP-1'] };
  });
  const cleared = await clearedAlerts(github, owned, []);
  assert.deepEqual(
    cleared.map((item) => item.id),
    [`${WEB}#1`, `${WEB}#3`, `${WEB}#4`],
  );
});

test('a change whose journal entry cannot be saved stops further writes and is never replayed', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const { exec, outcome, control } = await executor(jira, tickets);
  const settle = control.settle.bind(control);
  control.settle = async () => {
    throw new Error('HTTP 429');
  };
  await exec.update(bootstrapPlan().groups[0], {});
  control.settle = settle;
  assert.equal(exec.stopped, true);
  assert.match(outcome.failures.join(), /was applied but its journal entry was not saved/);
  const labelAdds = jira.calls.filter((call) => call.name === 'addLabel').length;
  // A retry of the run settles the still-reserved entry as uncertain and does not repeat the change.
  const retry = await executor(jira, tickets);
  await retry.exec.recover();
  await retry.exec.update(bootstrapPlan().groups[0], {});
  assert.equal(jira.calls.filter((call) => call.name === 'addLabel').length, labelAdds);
  assert.match(retry.outcome.failures.join(), /unknown outcome from an earlier attempt; not repeated/);
});

test('a covered severity raise is skipped when the ticket closed or changed owner after collection', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('APP-31').fields.status = { name: 'Resolved', statusCategory: { key: 'done' } };
  const { exec, outcome } = await executor(jira, tickets);
  const raise = { ticket: 'APP-31', from: 'medium', to: 'high', alerts: [`${WEB}#14`] };
  await exec.raiseCovered(raise, new Set());
  assert.equal(raise.applied, false);
  assert.equal(jira.calls.filter((call) => call.name === 'edit').length, 0);
  assert.match(outcome.failures.join(), /is now Resolved/);
});

test('planner-found closed-ticket mismatches already reported are not announced again', async () => {
  const jira = new FakeJira();
  const work = mkdtempSync(path.join(tmpdir(), 'dat-mismatch-'));
  const alerts = liveAlerts().filter((alert) => alert.repository === WEB && alert.number === 2);
  const inventory = baseInventory({
    alerts,
    plannerNeeded: true,
    aiInput: [`${WEB}#2`],
    inventoryDigest: DIGEST,
    tickets: [{ key: 'APP-84', project: 'APP', status: 'Resolved', statusCategory: 'done', onHold: false }],
    previousState: { lastSuccess: {}, pendingUnowned: [`${WEB}#2`], reportedMismatches: [`${WEB}#2`] },
  });
  writeFileSync(path.join(work, 'inventory.json'), JSON.stringify(inventory));
  writeFileSync(
    path.join(work, 'plan.json'),
    JSON.stringify({
      schemaVersion: 1,
      runId: RUN,
      inventoryDigest: DIGEST,
      groups: [],
      needsReview: [],
      closedTicketMismatches: [{ repository: WEB, alert: 2, ticket: 'APP-84' }],
    }),
  );
  const outcome = await withEnv({ TRIAGE_WORK_DIR: work, TRIAGE_CONFIG: CONFIG_FILE }, () => apply(jira));
  process.exitCode = 0;
  assert.deepEqual(
    outcome.closedMismatches.map((item) => item.isNew),
    [false],
  );
});

test('Teams bookkeeping errors still save state and release the lock', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  await control.saveState({ lock: { runId: RUN, acquiredAt: new Date().toISOString() } });
  const setProperty = jira.setProperty.bind(jira);
  jira.setProperty = async (key, name, value) => {
    if (name.startsWith(CARD_PROPERTY)) {
      throw new Error('HTTP 503');
    }
    return setProperty(key, name, value);
  };
  const work = workDir(baseInventory({ mode: 'automatic' }));
  const outcome = await withEnv(
    { TRIAGE_WORK_DIR: work, TRIAGE_CONFIG: CONFIG_FILE, DEPENDABOT_TEAMS_WEBHOOK_URL: 'https://hooks.example/x' },
    () => apply(jira),
  );
  process.exitCode = 0;
  assert.equal(outcome.complete, false);
  assert.match(outcome.failures.join(), /Teams notification bookkeeping/);
  const state = jira.issues.get(config.controlIssue).properties[STATE_PROPERTY];
  assert.ok(!state.lock);
  assert.ok(state.lastFailure);
});

test('report items need a configured repository string and an integer alert number', () => {
  const alerts = liveAlerts();
  const planned = bootstrapPlan();
  planned.groups.pop();
  planned.needsReview.push({ repository: [EL], alert: 108, candidateTicket: 'none', missingEvidence: 'x' });
  planned.closedTicketMismatches.push({ repository: EL, alert: '108', ticket: 'LIB-27' });
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
    tickets: [...registerTickets(), { key: 'LIB-27', statusCategory: 'done' }],
    now: new Date('2026-11-09T07:45:00Z'),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === 'review-schema'));
  assert.ok(result.errors.some((error) => error.code === 'mismatch-schema'));
});

test('completed Teams delivery records survive journal pruning for the 30-day re-run window', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const filler = 'x'.repeat(400);
  const recent = new Date().toISOString();
  const old = new Date(Date.now() - 40 * 864e5).toISOString();
  control.journal.entries.push(
    { id: 'old:teams', kind: 'teams', status: 'done', settledAt: old, detail: filler },
    { id: 'recent:teams', kind: 'teams', status: 'done', settledAt: recent, detail: filler },
  );
  for (let i = 0; i < 80; i++) {
    control.journal.entries.push({
      id: `done-${i}`,
      kind: 'create',
      status: 'done',
      settledAt: recent,
      detail: filler,
    });
  }
  await control.persistJournal();
  const ids = control.journal.entries.map((entry) => entry.id);
  assert.ok(ids.includes('recent:teams'));
  assert.ok(!ids.includes('old:teams'));
});

// Independent review: automatic holds and control-issue privacy.

function holdArgs(tickets, groupChange) {
  const alerts = liveAlerts();
  const planned = bootstrapPlan();
  groupChange(planned.groups);
  return {
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
    tickets,
    now: new Date('2026-11-09T07:45:00Z'),
  };
}

test('the planner cannot put a started ticket, or one owning actionable work, On Hold', () => {
  const makeBlocked = (groups) => {
    Object.assign(groups[0], blocked('upstream-release-pending', 'LIB-24'));
  };
  const started = registerTickets().map((ticket) =>
    ticket.key === 'APP-31' ? { ...ticket, status: 'In Progress', statusCategory: 'indeterminate' } : ticket,
  );
  const codes = (args) => validatePlan(args).errors.map((error) => error.code);
  assert.ok(codes(holdArgs(started, makeBlocked)).includes('hold-started-ticket'));
  const actionable = registerTickets().map((ticket) =>
    ticket.key === 'APP-31' ? { ...ticket, ownership: { kind: 'actionable', alerts: {} } } : ticket,
  );
  assert.ok(codes(holdArgs(actionable, makeBlocked)).includes('hold-actionable-ticket'));
  // A not-started ticket with no recorded actionable work may still be put On Hold.
  assert.deepEqual(codes(holdArgs(registerTickets(), makeBlocked)), []);
});

test('a ticket started after validation is not put On Hold, and its ownership is not recorded', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const { exec, outcome } = await executor(jira, tickets);
  const adopt = { ...bootstrapPlan().groups[0], ...blocked('upstream-release-pending', 'LIB-24') };
  const addLabel = jira.addLabel.bind(jira);
  jira.addLabel = async (key, label) => {
    await addLabel(key, label);
    jira.issues.get(key).fields.status = { name: 'In Progress', statusCategory: { key: 'indeterminate' } };
  };
  await exec.update(adopt, {});
  assert.equal(jira.calls.filter((call) => call.name === 'transition').length, 0);
  assert.match(outcome.failures.join(), /not put On Hold automatically/);
  assert.equal(jira.issues.get('APP-31').properties[OWNERSHIP_PROPERTY], undefined);
});

async function collectWith({ level, publicReadable }) {
  const work = mkdtempSync(path.join(tmpdir(), 'dat-collect-'));
  const option = (value, id) => {
    return { value, id };
  };
  const jira = {
    async issue() {
      return { fields: { security: { id: level }, labels: ['dependabot-ai-triage-control'] } };
    },
    async createFields() {
      return [
        {
          fieldId: 'customfield_12201',
          allowedValues: [
            option('Critical', '13603'),
            option('High', '15789'),
            option('Medium', '15790'),
            option('Low', '15791'),
          ],
        },
        { fieldId: 'components', allowedValues: [{ name: 'Web UI' }, { name: 'CI/CD' }] },
      ];
    },
    properties: new Map(),
    async property(key, name) {
      return this.properties.get(name) ?? null;
    },
    async setProperty(key, name, value) {
      this.properties.set(name, structuredClone(value));
    },
  };
  const github = {
    async branchSha() {
      throw new Error('stop after setup');
    },
  };
  return withEnv({ TRIAGE_WORK_DIR: work, TRIAGE_RUN_ID: RUN, TRIAGE_CONFIG: CONFIG_FILE }, () =>
    collect({ jira, github, npm: {}, probe: async () => publicReadable }),
  );
}

test('the control issue must carry the configured security level and must not be readable anonymously', async () => {
  const wrongLevel = await collectWith({ level: '99999', publicReadable: false });
  assert.equal(wrongLevel.lockAcquired, false);
  assert.match(wrongLevel.failures.join(), /must have security level 11176/);
  const exposed = await collectWith({ level: '11176', publicReadable: true });
  assert.equal(exposed.lockAcquired, false);
  assert.match(exposed.failures.join(), /readable without signing in/);
  const restricted = await collectWith({ level: '11176', publicReadable: false });
  assert.equal(restricted.lockAcquired, true);
});

test('the anonymous probe treats 401/403/404 as private and a readable issue as public', async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, expected] of [
      [404, false],
      [401, false],
      [200, true],
    ]) {
      globalThis.fetch = async (url, init) => {
        assert.equal(init.headers.Authorization, undefined);
        return new Response(status === 200 ? '{}' : '', { status });
      };
      assert.equal(await anonymouslyReadable('https://jira.example', 'APP-99'), expected);
    }
  } finally {
    globalThis.fetch = original;
  }
});

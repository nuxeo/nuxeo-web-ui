// Regression tests for the PR review findings: each test pins one behaviour the review asked for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Executor, actionMarker, apply, postTeams, runPending, summarize } from '../apply.mjs';
import {
  branchEvidence,
  clearedAlerts,
  collect,
  npmSummary,
  plannerTicket,
  selectCandidates,
  ticketQueries,
} from '../collect.mjs';
import { anonymouslyReadable, npmClient } from '../lib/clients.mjs';
import { validatePlan } from '../lib/plan-validator.mjs';
import { OWNED_LABEL, OWNERSHIP_PROPERTY, blockerRecheck, fingerprint, reconcile } from '../lib/reconcile.mjs';
import { runReport, teamsCard } from '../lib/render.mjs';
import { request } from '../lib/util.mjs';
import {
  CARD_PROPERTY,
  ControlState,
  JOURNAL_PROPERTY,
  STATE_PROPERTY,
  addCleared,
  isClearedReported,
  shardCleared,
} from '../lib/state.mjs';
import { analyzeLockfile, parseDeclaration } from '../lib/lockfile.mjs';
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
  const cleared = await clearedAlerts(github, owned, [], (id) => id === `${WEB}#1`);
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
  // A retry of the run reconciles the still-reserved entry from Jira first; nothing non-idempotent is repeated.
  const retry = await executor(jira, tickets);
  await retry.exec.recover();
  assert.ok(retry.outcome.warnings.some((warning) => warning.code === 'recovered'));
  await retry.exec.update(bootstrapPlan().groups[0], {});
  assert.equal(jira.calls.filter((call) => call.name === 'addLabel').length, labelAdds);
  assert.equal(jira.issues.get('APP-31').comments.length, 0);
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

test('related tickets must come from the Jira read of this run and the configured projects', () => {
  const alerts = liveAlerts();
  const withRelated = (keys) => {
    const planned = bootstrapPlan();
    planned.groups.at(-1).relatedTickets = keys;
    return validatePlan({
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
      tickets: [...registerTickets(), { key: 'OTHER-5', project: 'OTHER', statusCategory: 'new' }],
      now: new Date('2026-11-09T07:45:00Z'),
    });
  };
  const codes = (result) => result.errors.map((error) => error.code);
  assert.deepEqual(codes(withRelated(['APP-31', 'LIB-44'])), []);
  assert.ok(codes(withRelated(['LIB-9999'])).includes('unknown-related-ticket'));
  assert.ok(codes(withRelated(['OTHER-5'])).includes('unknown-related-ticket'));
});

// Review round on 72fcbf68f / e18a3b08b.

test('a retry whose plan changed does not reuse completed actions for different inputs', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const first = await executor(jira, tickets);
  await first.exec.create(createGroup(), {});
  const changed = { ...createGroup(), alerts: [108, 107], severity: 'high' };
  const retry = await executor(jira, tickets);
  const report = {};
  await retry.exec.create(changed, report);
  assert.match(retry.outcome.failures.join(), /planned differently by an earlier attempt/);
  assert.equal(report.ticketKey, undefined);
  assert.equal(jira.calls.filter((call) => call.name === 'create').length, 1);
});

test('creation stops when ownership or a matching ticket appeared during planning', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('LIB-44').fields.labels.push(OWNED_LABEL);
  jira.issues.get('LIB-44').properties[OWNERSHIP_PROPERTY] = { repository: EL, alerts: { 108: {} } };
  const { exec, outcome } = await executor(jira, tickets);
  await exec.create(createGroup(), {});
  assert.match(outcome.failures.join(), /LIB-44 recorded ownership of these alerts after collection/);
  assert.equal(jira.calls.filter((call) => call.name === 'create').length, 0);

  const fresh = new FakeJira(tickets);
  fresh.issues.set('LIB-500', {
    key: 'LIB-500',
    fields: { labels: [], status: { name: 'Open', statusCategory: { key: 'new' } }, updated: 'now' },
    properties: {},
    comments: [],
  });
  fresh.recentlyUpdated = ['LIB-500'];
  const second = await executor(fresh, tickets);
  await second.exec.create(createGroup(), {});
  assert.match(second.outcome.failures.join(), /LIB-500 changed after collection/);
  assert.equal(fresh.calls.filter((call) => call.name === 'create').length, 0);
});

test('tickets found by identifier or package search stay candidates even when only a comment mentions them', () => {
  const alert = liveAlerts().find((item) => item.repository === EL && item.number === 108);
  const commentOnly = {
    key: 'LIB-7',
    project: 'LIB',
    summary: 'Old upgrade',
    description: '',
    statusCategory: 'done',
    matchedBy: [alert.ghsa],
  };
  const byPackage = { ...commentOnly, key: 'LIB-8', matchedBy: [`package:${alert.package}`] };
  const unrelated = { ...commentOnly, key: 'LIB-9', matchedBy: [] };
  const keys = selectCandidates([commentOnly, byPackage, unrelated], [alert], {}, config).map((ticket) => ticket.key);
  assert.deepEqual(keys.sort(), ['LIB-7', 'LIB-8']);
  const queries = ticketQueries({ ...config, epic: 'EPIC-1' }, [alert]);
  assert.ok(queries.some((query) => /summary ~ "\\"pkg-match\\""/.test(query.jql)));
  assert.ok(queries.some((query) => query.matches.includes(alert.ghsa)));
});

test('npm alias declarations are resolved for dependents and direct declarations', () => {
  const lock = {
    lockfileVersion: 3,
    packages: {
      '': { name: 'root', devDependencies: { 'width-cjs': 'npm:pkg-width@^4.2.0' } },
      'node_modules/@acme/cli': { version: '8.0.2', dependencies: { 'width-cjs': 'npm:pkg-width@^4.2.0' } },
      'node_modules/width-cjs': { name: 'pkg-width', version: '4.2.3' },
    },
  };
  const analysis = analyzeLockfile({ lock, name: 'pkg-width', vulnerableRange: '< 5.0.0' });
  assert.equal(analysis.instances.length, 1);
  const dependents = analysis.instances[0].dependents.map((item) => `${item.name}:${item.range}:${item.alias}`);
  assert.deepEqual(dependents.sort(), ['(root project):^4.2.0:width-cjs', '@acme/cli:^4.2.0:width-cjs']);
  assert.deepEqual(analysis.directDeclaration, [
    { field: 'devDependencies', spec: 'npm:pkg-width@^4.2.0', alias: 'width-cjs' },
  ]);
  assert.deepEqual(parseDeclaration('x', 'npm:@scope/name@^1.0.0'), {
    name: '@scope/name',
    range: '^1.0.0',
    alias: 'x',
  });
});

test('a failed link keeps ownership unrecorded and is retried by a later run', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.failNext = { name: 'link', error: { status: 400 } };
  const { exec, outcome } = await executor(jira, tickets);
  const report = {};
  await exec.create({ ...createGroup(), relatedTickets: ['LIB-44'] }, report);
  assert.match(outcome.failures.join(), /link/);
  assert.equal(jira.issues.get(report.ticketKey).properties[OWNERSHIP_PROPERTY], undefined);
  assert.deepEqual(exec.pendingWrites, [
    { id: `${RUN}:${report.ticketKey}:link:LIB-44`, from: report.ticketKey, to: 'LIB-44' },
  ]);
  const later = await executor(jira, tickets, { runId: 'later-run' });
  const remaining = await later.exec.replayPending(exec.pendingWrites);
  assert.deepEqual(remaining, []);
  assert.equal(jira.calls.filter((call) => call.name === 'link').length, 2);
});

test('the run state refuses to exceed the Jira property limit', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  await assert.rejects(control.saveState({ big: 'x'.repeat(30000) }), /property size limit/);
});

test('a closed-ticket mismatch must name a ticket of the alert repository project', () => {
  const alerts = liveAlerts();
  const planned = bootstrapPlan();
  planned.groups.pop();
  planned.closedTicketMismatches.push({ repository: EL, alert: 108, ticket: 'APP-77' });
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
    tickets: [...registerTickets(), { key: 'APP-77', statusCategory: 'done' }],
    now: new Date('2026-11-09T07:45:00Z'),
  });
  assert.ok(result.errors.some((error) => error.code === 'mismatch-schema'));
});

test('a non-string upstream reference is rejected', () => {
  const alerts = liveAlerts();
  const planned = bootstrapPlan();
  const held = planned.groups.find((item) => item.ticket === 'APP-30');
  held.blocker.upstreamRef = ['LIB-24'];
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
  assert.ok(result.errors.some((error) => error.code === 'blocker-missing'));
});

test('a create with an unknown outcome is settled by later recovery through its label', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  await control.reserve({ id: 'old:create', kind: 'create', target: 'x', runId: 'old', recovery: { label: 'dat-u' } });
  await control.settle('old:create', 'uncertain', {});
  assert.equal(control.pending().length, 1);
  jira.issues.set('LIB-600', {
    key: 'LIB-600',
    fields: { labels: ['dat-u'], status: { name: 'Open', statusCategory: { key: 'new' } } },
    properties: {},
    comments: [],
  });
  const { exec } = await executor(jira, []);
  await exec.recover();
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find('old:create').status, 'done');
  assert.equal(reloaded.pending().length, 0);
});

// Review round on 7ec1d7d97 / f69e6bf18.

test('a link with an unknown outcome is not queued for replay; recovery reconciles it from the issue links', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const { exec, control } = await executor(jira, tickets);
  const realLink = jira.link.bind(jira);
  jira.link = async (...args) => {
    await realLink(...args);
    const error = new Error('timeout');
    error.uncertain = true;
    throw error;
  };
  const report = {};
  await exec.create({ ...createGroup(), relatedTickets: ['LIB-44'] }, report);
  assert.deepEqual(exec.pendingWrites, []);
  const id = `${RUN}:${report.ticketKey}:link:LIB-44`;
  assert.equal(control.find(id).status, 'uncertain');
  jira.link = realLink;
  jira.issues.get(report.ticketKey).fields.issuelinks = [{ outwardIssue: { key: 'LIB-44' } }];
  const later = await executor(jira, tickets, { runId: 'later-run' });
  await later.exec.recover();
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find(id).status, 'done');
  assert.equal(jira.calls.filter((call) => call.name === 'link').length, 1);
});

test('replayed links keep their original journal id', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const { exec, control } = await executor(jira, tickets);
  const id = 'earlier:LIB-3000:link:LIB-44';
  jira.issues.set('LIB-3000', { key: 'LIB-3000', fields: { labels: [] }, properties: {}, comments: [] });
  const remaining = await exec.replayPending([{ id, from: 'LIB-3000', to: 'LIB-44' }]);
  assert.deepEqual(remaining, []);
  assert.equal(control.find(id).status, 'done');
});

test('uncertain scope writes from earlier runs are reconciled from comments before new writes', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  for (const [id, key] of [
    ['old:a', 'APP-31'],
    ['old:b', 'APP-28'],
  ]) {
    const recovery = { key, markers: [actionMarker(id, 'scope')] };
    await control.reserve({ id, kind: 'extend', target: key, runId: 'old', recovery });
    await control.settle(id, 'uncertain', {});
  }
  const text = `Run old (ref ${actionMarker('old:a', 'scope')}).`;
  jira.issues.get('APP-31').comments.push({ type: 'doc', content: [{ type: 'text', text }] });
  const { exec } = await executor(jira, tickets);
  await exec.recover();
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find('old:a').status, 'done');
  assert.equal(reloaded.find('old:b').status, 'not-applied');
  assert.equal(reloaded.pending().length, 0);
});

test('closure history keeps exact membership: an older alert closing later is still reported', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const ids = Array.from({ length: 20000 }, (_, index) => `${WEB}#${index * 2 + 3}`);
  await control.saveCleared(ids);
  const record = await control.loadCleared();
  for (const value of Object.values(jira.issues.get(config.controlIssue).properties)) {
    assert.ok(JSON.stringify(value).length <= 28000);
  }
  assert.equal(isClearedReported(record, `${WEB}#3`), true);
  assert.equal(isClearedReported(record, `${WEB}#40001`), true);
  assert.equal(isClearedReported(record, `${WEB}#2`), false);
  assert.equal(isClearedReported(record, `${WEB}#4`), false);
  await control.saveCleared([`${WEB}#4`]);
  assert.equal(isClearedReported(await control.loadCleared(), `${WEB}#4`), true);
});

test('an update stops when another open ticket took one of the added alerts during planning', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('LIB-24').fields.labels.push(OWNED_LABEL);
  jira.issues.get('LIB-24').properties[OWNERSHIP_PROPERTY] = { repository: EL, alerts: { 108: {} } };
  const { exec, outcome } = await executor(jira, tickets);
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'high', [104, 105, 107, 108], { updateNote: 'x' });
  await exec.update(extend, {});
  assert.match(outcome.failures.join(), /LIB-24 now owns some of these alerts/);
  assert.equal(jira.calls.filter((call) => call.args?.key === 'LIB-44').length, 0);
});

test('a collected candidate edited during planning defers creation, but edits by this run do not', async () => {
  const tickets = registerTickets().map((ticket) => {
    return { ...ticket, updated: 'before' };
  });
  const jira = new FakeJira(tickets);
  jira.issues.get('LIB-44').fields.updated = 'during-planning';
  jira.recentlyUpdated = ['LIB-44'];
  const { exec, outcome } = await executor(jira, tickets);
  await exec.create(createGroup(), {});
  assert.match(outcome.failures.join(), /LIB-44 changed after collection/);

  const own = new FakeJira(tickets);
  own.issues.get('LIB-44').fields.updated = 'during-run';
  own.recentlyUpdated = ['LIB-44'];
  const run = await executor(own, tickets);
  run.exec.touched.add('LIB-44');
  await run.exec.create(createGroup(), {});
  assert.deepEqual(run.outcome.failures, []);
});

test('closure ranges merge exactly and split across properties by size', () => {
  const record = addCleared({ repositories: {} }, [`${WEB}#5`, `${WEB}#6`, `${WEB}#8`, `${WEB}#7`, `${EL}#1`]);
  assert.deepEqual(record.repositories[WEB], [[5, 8]]);
  const many = addCleared(
    { repositories: {} },
    Array.from({ length: 6000 }, (_, index) => `${WEB}#${index * 2}`),
  );
  const shards = shardCleared(many, 5000);
  assert.ok(shards.length > 1);
  assert.ok(shards.every((shard) => JSON.stringify(shard).length <= 5000));
  assert.equal(shards.flatMap((shard) => shard.repositories[WEB] ?? []).length, 6000);
});

// Review round on c146376ac / 5cac15ad5.

test('a published fix found on npm rejects "no upstream patch" even without a GitHub patched version', () => {
  const packument = { 'dist-tags': { latest: '2.0.0' }, versions: { '1.4.0': {}, '1.9.9': {}, '2.0.0': {} } };
  const alert = { firstPatched: null, advisoryRanges: [{ range: '< 2.0.0', firstPatched: null }] };
  const summary = npmSummary(packument, alert, [{ version: '1.4.0', vulnerable: true }]);
  assert.equal(summary.fixAboveInstalled, '2.0.0');
  const none = npmSummary(
    { 'dist-tags': { latest: '4.3.1' }, versions: { '4.2.0': {}, '4.3.1': {} } },
    { firstPatched: null, advisoryRanges: [{ range: '>= 4.2.0, <= 4.3.1', firstPatched: null }] },
    [{ version: '4.3.1', vulnerable: true }],
  );
  assert.equal(none.fixAboveInstalled, null);

  const alerts = liveAlerts();
  alerts.find((item) => item.repository === WEB && item.number === 9).registryFix = '5.0.0';
  const result = validatePlan({
    plan: bootstrapPlan(),
    runId: RUN,
    inventoryDigest: DIGEST,
    repositories: [
      { name: WEB, project: 'APP' },
      { name: EL, project: 'LIB' },
    ],
    epicQuarter: '2026-Q4',
    alerts,
    aiInput: alerts.map((item) => `${item.repository}#${item.number}`),
    currentOwner: new Map(),
    tickets: registerTickets(),
    now: new Date('2026-11-09T07:45:00Z'),
  });
  assert.ok(result.errors.some((error) => error.code === 'invalid-blocker'));
});

test('a link that recovery confirms missing is queued under its original id and blocks ownership', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.set('LIB-700', { key: 'LIB-700', fields: { labels: [], issuelinks: [] }, properties: {}, comments: [] });
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const id = 'old:LIB-700:link:LIB-44';
  await control.reserve({ id, kind: 'link', target: 'x', runId: 'old', recovery: { from: 'LIB-700', to: 'LIB-44' } });
  await control.settle(id, 'uncertain', {});
  const { exec, outcome } = await executor(jira, tickets);
  await exec.recover();
  assert.deepEqual(exec.pendingWrites, [{ id, from: 'LIB-700', to: 'LIB-44' }]);
  exec.blockedTickets.add('LIB-700');
  const done = await exec.finish(createGroup(), { key: 'LIB-700', onHold: false, ownership: null }, [], {});
  assert.equal(done, false);
  assert.match(outcome.failures.join(), /ownership waits until its pending links and comments are written/);
  assert.equal(jira.issues.get('LIB-700').properties[OWNERSHIP_PROPERTY], undefined);
});

test('an interrupted closure-history save keeps the previous generation readable', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  await control.saveCleared([`${WEB}#1`, `${WEB}#5`]);
  const setProperty = jira.setProperty.bind(jira);
  jira.setProperty = async (key, name, value) => {
    if (name.startsWith('dependabot-ai-triage-cleared-2-')) {
      throw new Error('HTTP 503');
    }
    return setProperty(key, name, value);
  };
  await assert.rejects(control.saveCleared([`${WEB}#3`]));
  const record = await control.loadCleared();
  assert.equal(isClearedReported(record, `${WEB}#1`), true);
  assert.equal(isClearedReported(record, `${WEB}#5`), true);
  jira.setProperty = setProperty;
  await control.saveCleared([`${WEB}#3`]);
  const next = await control.loadCleared();
  assert.equal(isClearedReported(next, `${WEB}#3`), true);
  const names = Object.keys(jira.issues.get(config.controlIssue).properties);
  assert.ok(!names.includes('dependabot-ai-triage-cleared-1-0'));
});

test('the On Hold reason is its own step: if it fails, ownership is not recorded', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.failNext = { name: 'addComment', error: { status: 400 } };
  const { exec, outcome } = await executor(jira, tickets);
  const report = {};
  const unpatched = group(`${EL}:pkg-merge`, EL, 'create', undefined, 'low', [106], {
    ...blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-0000-0000-0007'),
  });
  await exec.create(unpatched, report);
  assert.equal(jira.issues.get(report.ticketKey).fields.status.name, 'On Hold');
  assert.match(outcome.failures.join(), /hold-comment/);
  assert.equal(jira.issues.get(report.ticketKey).properties[OWNERSHIP_PROPERTY], undefined);
});

test('the live candidate recheck also searches summaries for the affected package', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const { exec } = await executor(jira, tickets);
  await exec.create(createGroup(), {});
  assert.ok(jira.searches.some((jql) => /updated >= -\d+m/.test(jql) && /summary ~ "\\"pkg-match\\""/.test(jql)));
});

test('recovery reads the whole comment history, not only the latest page', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.recentComments = async () => [];
  const marker = actionMarker('old:x', 'scope');
  jira.allComments = async () => [{ body: { type: 'doc', content: [{ type: 'text', text: `ref ${marker}` }] } }];
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const recovery = { key: 'APP-31', markers: [marker] };
  await control.reserve({ id: 'old:x', kind: 'extend', target: 'APP-31', runId: 'old', recovery });
  const { exec } = await executor(jira, tickets);
  await exec.recover();
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find('old:x').status, 'done');
});

// Review round on fe2048e0d / 1b6803e0a.

test('scope recovery requires the comment of that exact action, not any comment from the same run', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const earlier = 'run-1:APP-31:extend:aaa';
  const later = 'run-1:APP-31:extend:bbb';
  const text = `Run run-1 (ref ${actionMarker(earlier, 'scope')}).`;
  jira.issues.get('APP-31').comments.push({ type: 'doc', content: [{ type: 'text', text }] });
  const recovery = { key: 'APP-31', markers: [actionMarker(later, 'scope'), actionMarker(later, 'severity')] };
  await control.reserve({ id: later, kind: 'extend', target: 'APP-31', runId: 'run-1', recovery });
  await control.settle(later, 'uncertain', {});
  const { exec } = await executor(jira, tickets);
  await exec.recover();
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find(later).status, 'not-applied');
});

test('an extension writes its marker in every comment it posts', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const { exec, control } = await executor(jira, tickets);
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'critical', [104, 105, 107], { updateNote: 'x' });
  await exec.update(extend, {});
  const steps = control.journal.entries.filter((item) => item.recovery?.markers);
  assert.deepEqual(steps.map((item) => item.kind).sort(), ['scope-comment', 'severity-comment']);
  const texts = jira.issues.get('LIB-44').comments.map((comment) => JSON.stringify(comment));
  for (const marker of steps.flatMap((item) => item.recovery.markers)) {
    assert.ok(texts.some((text) => text.includes(marker)));
  }
});

test('a hold whose reason comment failed is completed by the next attempt before ownership', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.failNext = { name: 'addComment', error: { status: 400 } };
  const unpatched = group(`${EL}:pkg-merge`, EL, 'create', undefined, 'low', [106], {
    ...blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-0000-0000-0007'),
  });
  const first = await executor(jira, tickets);
  const report = {};
  await first.exec.create(unpatched, report);
  const key = report.ticketKey;
  assert.equal(jira.issues.get(key).fields.status.name, 'On Hold');
  const retry = await executor(jira, tickets);
  const done = await retry.exec.finish(unpatched, { key, onHold: true, ownership: null }, [], {});
  assert.equal(done, true);
  assert.ok(jira.issues.get(key).comments.some((comment) => JSON.stringify(comment).includes('Reason for On Hold')));
  assert.ok(jira.issues.get(key).properties[OWNERSHIP_PROPERTY]);
});

test('a fix in one vulnerable major is kept when another installed major has none', () => {
  const packument = { 'dist-tags': { latest: '3.0.0' }, versions: { '2.1.0': {}, '2.1.1': {}, '3.0.0': {} } };
  const alert = {
    firstPatched: null,
    advisoryRanges: [{ range: '< 2.1.1', firstPatched: null }, { range: '>= 3.0.0' }],
  };
  const instances = [
    { version: '2.1.0', vulnerable: true },
    { version: '3.0.0', vulnerable: true },
  ];
  const summary = npmSummary(packument, alert, instances);
  assert.equal(summary.fixAboveInstalled, null);
  assert.equal(summary.fixInSomeVulnerableMajor, '2.1.1');
});

test('no upgrade is inferred when neither an installed version nor a patched release is known', () => {
  const packument = { 'dist-tags': { latest: '2.0.0' }, versions: { '1.0.0': {}, '2.0.0': {} } };
  const alert = { firstPatched: null, advisoryRanges: [{ range: '>= 2.0.0', firstPatched: null }] };
  assert.equal(npmSummary(packument, alert, []).fixAboveInstalled, null);
});

// Review round on 8c6fd0baf / 3a005c9e6.

test('a retry posts only the missing severity comment and never repeats the scope comment', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const addComment = jira.addComment.bind(jira);
  let failSeverity = true;
  jira.addComment = async (key, body) => {
    if (failSeverity && JSON.stringify(body).includes('severity raised')) {
      failSeverity = false;
      throw Object.assign(new Error('addComment failed'), { status: 400 });
    }
    return addComment(key, body);
  };
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'critical', [104, 105, 107], { updateNote: 'x' });
  const first = await executor(jira, tickets);
  await first.exec.update(extend, {});
  assert.equal(jira.issues.get('LIB-44').properties[OWNERSHIP_PROPERTY], undefined);
  assert.deepEqual(
    first.exec.pendingWrites.map((item) => item.kind),
    ['severity-comment'],
  );
  const retry = await executor(jira, tickets);
  await retry.exec.update(extend, {});
  const texts = jira.issues.get('LIB-44').comments.map((comment) => JSON.stringify(comment));
  assert.equal(texts.filter((text) => text.includes('scope extended') || text.includes('finding update')).length, 1);
  assert.equal(texts.filter((text) => text.includes('severity raised')).length, 1);
  assert.ok(jira.issues.get('LIB-44').properties[OWNERSHIP_PROPERTY]);
});

test('a confirmed severity raise from an interrupted run still gets its explaining comment', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('LIB-44').fields[config.severityField] = { id: severityId('critical') };
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const id = 'old:LIB-44:extend:sig';
  const raise = { from: 'high', to: 'critical', alerts: ['#104'] };
  await control.reserve({
    id,
    kind: 'extend',
    target: 'LIB-44',
    runId: 'old',
    recovery: { key: 'LIB-44', raiseTo: 'critical', raise },
  });
  await control.settle(id, 'uncertain', {});
  const { exec } = await executor(jira, tickets);
  await exec.recover();
  assert.deepEqual(exec.pendingWrites, [
    { id: `${id}:severity-comment`, kind: 'severity-comment', key: 'LIB-44', raise },
  ]);
  assert.deepEqual(await exec.replayPending(exec.pendingWrites), []);
  const marker = actionMarker(`${id}:severity-comment`, 'severity');
  assert.ok(jira.issues.get('LIB-44').comments.some((comment) => JSON.stringify(comment).includes(marker)));
});

// Review round on 1fa926ca5 / 6cea961ed.

test('queued writes skipped after an uncertain replay stay queued', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  for (const key of ['LIB-700', 'LIB-701']) {
    jira.issues.set(key, { key, fields: { labels: [], issuelinks: [] }, properties: {}, comments: [] });
  }
  jira.failNext = { name: 'link', error: { uncertain: true } };
  const { exec } = await executor(jira, tickets);
  const queued = [
    { id: 'old:LIB-700:link:LIB-44', from: 'LIB-700', to: 'LIB-44' },
    { id: 'old:LIB-701:link:LIB-44', from: 'LIB-701', to: 'LIB-44' },
  ];
  const remaining = await exec.replayPending(queued);
  assert.deepEqual(
    remaining.map((item) => item.id),
    queued.map((item) => item.id),
  );
});

test('the severity explanation is written even when the scope comment fails', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const addComment = jira.addComment.bind(jira);
  jira.addComment = async (key, body) => {
    if (JSON.stringify(body).includes('scope extended') || JSON.stringify(body).includes('finding update')) {
      throw Object.assign(new Error('addComment failed'), { status: 400 });
    }
    return addComment(key, body);
  };
  const { exec } = await executor(jira, tickets);
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'critical', [104, 105, 107], { updateNote: 'x' });
  await exec.update(extend, {});
  const texts = jira.issues.get('LIB-44').comments.map((comment) => JSON.stringify(comment));
  assert.equal(texts.filter((text) => text.includes('severity raised')).length, 1);
  assert.equal(jira.issues.get('LIB-44').properties[OWNERSHIP_PROPERTY], undefined);
});

test('ownership recovery requires the exact write, not an earlier write of the same run', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('LIB-44').properties[OWNERSHIP_PROPERTY] = {
    updatedBy: 'run-1',
    writeId: 'run-1:LIB-44:ownership:a',
  };
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const id = 'run-1:LIB-44:ownership:b';
  await control.reserve({ id, kind: 'ownership', target: 'LIB-44', runId: 'run-1', recovery: { key: 'LIB-44' } });
  await control.settle(id, 'uncertain', {});
  const { exec } = await executor(jira, tickets);
  await exec.recover();
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find(id).status, 'not-applied');
});

test('an uncertain raise on a ticket without Defect Severity is recovered as not applied', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('LIB-44').fields[config.severityField] = null;
  jira.issues.get('LIB-44').fields.labels.push(OWNED_LABEL);
  const control = new ControlState(jira, config.controlIssue);
  await control.load();
  const id = 'old:LIB-44:adopt:sig';
  const recovery = { key: 'LIB-44', raiseTo: 'high', raise: { from: null, to: 'high', alerts: [] } };
  await control.reserve({ id, kind: 'adopt', target: 'LIB-44', runId: 'old', recovery });
  await control.settle(id, 'uncertain', {});
  const { exec } = await executor(jira, tickets);
  await exec.recover();
  const reloaded = new ControlState(jira, config.controlIssue);
  await reloaded.load();
  assert.equal(reloaded.find(id).status, 'not-applied');
  assert.deepEqual(exec.pendingWrites, []);
});

test('a workspace package.json alert is analysed from the root lockfile', async () => {
  const files = {
    'package.json': { workspaces: ['ui'], overrides: { 'pkg-a': '1.3.0' }, engines: { node: '>=22' } },
    'ui/package.json': { name: 'ui', dependencies: { 'pkg-a': '^1.0.0' } },
    'package-lock.json': {
      lockfileVersion: 3,
      packages: {
        '': { workspaces: ['ui'] },
        ui: { name: 'ui', dependencies: { 'pkg-a': '^1.0.0' } },
        'node_modules/pkg-a': { version: '1.2.0' },
      },
    },
  };
  const readJson = async (sha, file) => files[file] ?? null;
  const alert = { package: 'pkg-a', manifest: 'ui/package.json', advisoryRanges: [{ range: '< 1.3.0' }] };
  const evidence = await branchEvidence(readJson, alert, 'sha');
  assert.equal(evidence.kind, 'lockfile');
  assert.equal(evidence.lockfile, 'package-lock.json');
  assert.equal(evidence.instances[0].version, '1.2.0');
  assert.equal(evidence.declarations[0].spec, '^1.0.0');
  assert.deepEqual(evidence.engines, { node: '>=22' });
  assert.ok(evidence.overrides.length > 0);
  delete files['package-lock.json'].packages.ui;
  assert.equal((await branchEvidence(readJson, alert, 'sha')).kind, 'manifest');
});

test('a large Teams card is trimmed to its byte budget and points to the full report', () => {
  const groups = Array.from({ length: 15 }, (_, index) => {
    return {
      ...group(`${EL}:big-${index}`, EL, 'create', undefined, 'high', [index]),
      action: 'created',
      ticketKey: `LIB-${index}`,
      teamsLine: '€'.repeat(2000),
    };
  });
  const card = teamsCard(
    {
      runId: RUN,
      complete: true,
      failures: [],
      newBySeverity: { high: 15 },
      groups,
      severityRaises: [],
      needsReview: [],
      closedMismatches: [],
      repositories: [{ name: WEB }, { name: EL }],
    },
    { ...config, controlIssue: 'APP-99' },
  );
  assert.ok(Buffer.byteLength(JSON.stringify(card), 'utf8') <= 24000);
  assert.match(JSON.stringify(card), /more line\(s\) are in the \[full report\]/);
  assert.match(JSON.stringify(card), /Run ID/);
});

test('writes queued before a later group throws are still saved', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const { exec, control, outcome } = await executor(jira, tickets);
  exec.execute = async () => {
    exec.pendingWrites.push({ id: 'run:LIB-700:link:LIB-44', from: 'LIB-700', to: 'LIB-44' });
    throw new Error('boom');
  };
  await assert.rejects(runPending(exec, control, outcome, bootstrapPlan()), /boom/);
  const saved = await jira.property(config.controlIssue, 'dependabot-ai-triage-state');
  assert.deepEqual(
    saved.pendingWrites.map((item) => item.id),
    ['run:LIB-700:link:LIB-44'],
  );
});

test('a retry whose journal record was pruned does not post its comment twice', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'high', [104, 105, 107], { updateNote: 'x' });
  const first = await executor(jira, tickets);
  first.exec.finish = async () => false;
  await first.exec.update(extend, {});
  const comments = jira.issues.get('LIB-44').comments.length;
  const pruned = await executor(jira, tickets);
  pruned.control.journal.entries = [];
  pruned.exec.finish = async () => false;
  await pruned.exec.update(extend, {});
  assert.equal(jira.issues.get('LIB-44').comments.length, comments);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { postTeams, summarize } from '../apply.mjs';
import { OWNED_LABEL, OWNERSHIP_PROPERTY } from '../lib/reconcile.mjs';
import { attentionText, reportNeeded, runReport, teamsCard, ticketDescription } from '../lib/render.mjs';
import { ControlState, JOURNAL_PROPERTY } from '../lib/state.mjs';
import { RUN, EL, WEB, blocked, bootstrapPlan, group, liveAlerts, registerTickets } from './fixtures.mjs';
import { FakeJira, config, createGroup, executor, newOutcome, severityId } from './support.mjs';

test('create: builds the ticket itself, records ownership and verifies severity and epic', async () => {
  const jira = new FakeJira();
  const { exec, outcome } = await executor(jira, []);
  const report = {};
  await exec.create(createGroup(), report);
  assert.deepEqual(outcome.failures, []);
  const created = jira.calls.find((call) => call.name === 'create').args;
  assert.equal(created.project.key, 'LIB');
  assert.equal(created.parent.key, 'EPIC-1');
  assert.equal(created[config.severityField].id, '15790');
  assert.ok(created.labels.includes(OWNED_LABEL) && created.labels.includes('2026_Q4'));
  assert.ok(created.summary.startsWith('[Security]'));
  const property = jira.issues.get(report.ticketKey).properties[OWNERSHIP_PROPERTY];
  assert.deepEqual(Object.keys(property.alerts), ['108']);
  assert.equal(report.action, 'created');
});

test('re-running the same run does not create a second ticket', async () => {
  const jira = new FakeJira();
  const first = await executor(jira, []);
  await first.exec.create(createGroup(), {});
  const second = await executor(jira, []);
  const report = {};
  await second.exec.create(createGroup(), report);
  assert.equal(jira.calls.filter((call) => call.name === 'create').length, 1);
  assert.equal(second.outcome.actions[0].status, 'already-done');
  assert.ok(report.ticketKey);
});

test('an uncertain create stops further writes and is reconciled by label on the next attempt', async () => {
  const jira = new FakeJira();
  const first = await executor(jira, []);
  // The create reaches Jira but the response is lost.
  const realCreate = jira.create.bind(jira);
  jira.create = async (fields) => {
    await realCreate(fields);
    const error = new Error('timeout');
    error.uncertain = true;
    throw error;
  };
  await first.exec.create(createGroup(), {});
  assert.equal(first.exec.stopped, true);
  assert.match(first.outcome.failures[0], /timeout/);
  jira.create = realCreate;
  const second = await executor(jira, []);
  const report = {};
  await second.exec.create(createGroup(), report);
  assert.equal(jira.calls.filter((call) => call.name === 'create').length, 1);
  assert.ok(jira.issues.get(report.ticketKey).properties[OWNERSHIP_PROPERTY]);
});

test('recover(): a reservation left by a killed run is resolved before new writes', async () => {
  const jira = new FakeJira();
  const first = await executor(jira, []);
  await first.control.reserve({
    id: 'old:create',
    kind: 'create',
    target: 'x',
    runId: 'old',
    recovery: { label: 'dat-abc', ownership: { updatedBy: 'old', alerts: {} } },
  });
  await first.control.reserve({ id: 'old:teams', kind: 'teams', target: 'webhook', runId: 'old' });
  jira.issues.set('LIB-9', {
    key: 'LIB-9',
    fields: { labels: ['dat-abc'], status: { name: 'Open' } },
    properties: {},
    comments: [],
  });
  const second = await executor(jira, []);
  await second.exec.recover();
  const journal = jira.issues.get('APP-99').properties[JOURNAL_PROPERTY].entries;
  assert.equal(journal.find((entry) => entry.id === 'old:create').status, 'done');
  assert.equal(journal.find((entry) => entry.id === 'old:teams').status, 'uncertain');
  // Recovery only settles the journal: the recovered ticket is adopted through the normal plan next time.
  assert.equal(jira.issues.get('LIB-9').properties[OWNERSHIP_PROPERTY], undefined);
  assert.ok(second.outcome.warnings.some((warning) => warning.code === 'uncertain'));
  assert.ok(second.outcome.warnings.some((warning) => warning.code === 'recovered'));
});

test('adopt records ownership without editing the description and never lowers severity', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('APP-31').fields[config.severityField] = { id: severityId('high') };
  tickets.find((ticket) => ticket.key === 'APP-31').severity = 'high';
  const { exec, outcome } = await executor(jira, tickets);
  const adopt = bootstrapPlan().groups[0];
  await exec.update(adopt, {});
  assert.deepEqual(outcome.failures, []);
  assert.equal(jira.calls.filter((call) => call.name === 'edit').length, 0);
  assert.equal(jira.issues.get('APP-31').fields[config.severityField].id, severityId('high'));
  assert.ok(jira.issues.get('APP-31').fields.labels.includes(OWNED_LABEL));
});

test('extend raises severity to the highest finding, comments, and keeps existing ownership', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const owner = tickets.find((ticket) => ticket.key === 'LIB-24');
  owner.ownership = { repository: EL, alerts: { 101: { recordedAt: 'then' }, 102: {}, 103: {} } };
  jira.issues.get('LIB-24').properties[OWNERSHIP_PROPERTY] = structuredClone(owner.ownership);
  const alerts = liveAlerts();
  alerts.find((alert) => alert.number === 108).severity = 'high';
  const { exec, outcome } = await executor(jira, tickets, { alerts });
  const extend = group(`${EL}:pkg-time`, EL, 'extend', 'LIB-24', 'high', [101, 102, 103, 108], {
    updateNote: 'Adds pkg-match.',
  });
  await exec.update(extend, {});
  assert.deepEqual(outcome.failures, []);
  assert.equal(jira.issues.get('LIB-24').fields[config.severityField].id, severityId('high'));
  const property = jira.issues.get('LIB-24').properties[OWNERSHIP_PROPERTY];
  assert.deepEqual(Object.keys(property.alerts).sort(), ['101', '102', '103', '108']);
  assert.equal(property.alerts[101].recordedAt, 'then');
  assert.equal(jira.issues.get('LIB-24').comments.length, 2);
});

test('blocked groups are moved On Hold through a discovered transition and verified', async () => {
  const jira = new FakeJira();
  const { exec } = await executor(jira, []);
  const report = {};
  const unpatched = group(
    `${EL}:pkg-merge`,
    EL,
    'create',
    undefined,
    'low',
    [106],
    blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-0000-0000-0007'),
  );
  await exec.create(unpatched, report);
  assert.equal(jira.issues.get(report.ticketKey).fields.status.name, 'On Hold');
  assert.equal(report.heldVerified, true);
  assert.equal(report.blockerChanged, true);

  const noHold = new FakeJira();
  noHold.noHoldTransition = true;
  const second = await executor(noHold, []);
  const failed = {};
  await second.exec.create(unpatched, failed);
  assert.equal(failed.heldVerified, false);
  assert.match(second.outcome.failures.join(), /no transition to "On Hold"/);
});

test('Teams is sent at most once per run and an uncertain send is not repeated', async () => {
  const jira = new FakeJira();
  const control = new ControlState(jira, 'APP-99');
  await control.load();
  const outcome = {
    ...newOutcome(),
    complete: true,
    newBySeverity: {},
    groups: [],
    severityRaises: [],
    needsReview: [],
    closedMismatches: [],
    repositories: [{ name: WEB }],
    runId: RUN,
  };
  process.env.DEPENDABOT_TEAMS_WEBHOOK_URL = 'https://hooks.example/webhook';
  const original = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => {
    sends++;
    return new Response('', { status: 202 });
  };
  try {
    assert.equal(await postTeams(control, outcome, config, { runId: RUN }), true);
    assert.equal(await postTeams(control, outcome, config, { runId: RUN }), true);
    assert.equal(sends, 1);
    globalThis.fetch = async () => {
      throw new Error('socket hang up');
    };
    const other = { runId: 'run-2' };
    assert.equal(await postTeams(control, outcome, config, other), false);
    globalThis.fetch = async () => {
      sends++;
      return new Response('', { status: 202 });
    };
    assert.equal(await postTeams(control, outcome, config, other), false);
    assert.equal(sends, 1);
  } finally {
    globalThis.fetch = original;
    delete process.env.DEPENDABOT_TEAMS_WEBHOOK_URL;
  }
});

test('summarize separates untriaged findings from adopted coverage', () => {
  const inventory = { alerts: liveAlerts(), currentOwner: {}, previousState: null };
  const summary = summarize(inventory, bootstrapPlan());
  assert.deepEqual(summary.untriaged, [`${EL}#108`]);
  assert.deepEqual(summary.newBySeverity, { medium: 1 });
  assert.equal(summary.firstReconciliation, true);
  const later = summarize(
    { ...inventory, previousState: { lastSuccess: {}, pendingUnowned: [`${EL}#108`] } },
    bootstrapPlan(),
  );
  assert.deepEqual(later.newBySeverity, {});
  assert.equal(later.carried, 1);
});

const cardText = (card) => JSON.stringify(card.attachments[0].content.body.map((block) => block.text));
const baseOutcome = (extra = {}) => {
  return {
    runId: RUN,
    complete: true,
    failures: [],
    newBySeverity: {},
    groups: [],
    severityRaises: [],
    needsReview: [],
    closedMismatches: [],
    repositories: [{ name: WEB }, { name: EL }],
    firstReconciliation: false,
    ...extra,
  };
};
const teamsConfig = { ...config, controlIssue: 'APP-99' };

test('Teams: clean run uses the agreed wording and no tables', () => {
  const card = teamsCard(baseOutcome(), teamsConfig);
  const textBlocks = cardText(card);
  assert.match(textBlocks, /No new untriaged Dependabot findings were identified\./);
  assert.match(textBlocks, /The bugs took the day off\. We checked anyway\./);
  assert.match(textBlocks, /Run ID: 19000000001/);
  assert.doesNotMatch(JSON.stringify(card), /ColumnSet|"Table"/);
});

test('Teams: incomplete run names failures and makes no clean-scan claim', () => {
  const textBlocks = cardText(
    teamsCard(
      baseOutcome({ complete: false, failures: ['acme/lib: GitHub GET alerts failed: HTTP 403'] }),
      teamsConfig,
    ),
  );
  assert.match(textBlocks, /scan incomplete/);
  assert.match(textBlocks, /HTTP 403/);
  assert.doesNotMatch(textBlocks, /took the day off|uninvited guests/);
});

test('Teams: High findings are highlighted, created tickets listed, FYI only after a verified hold', () => {
  const created = { ...createGroup(), ticketKey: 'LIB-3000', action: 'created', severity: 'high' };
  const held = {
    ...group(
      `${EL}:pkg-merge`,
      EL,
      'create',
      undefined,
      'low',
      [106],
      blocked('no-upstream-patch', 'https://github.com/advisories/x'),
    ),
    ticketKey: 'LIB-3001',
    action: 'created',
    blockerChanged: true,
    heldVerified: false,
  };
  const textBlocks = cardText(
    teamsCard(baseOutcome({ newBySeverity: { high: 1, low: 1 }, groups: [created, held] }), teamsConfig),
  );
  assert.match(textBlocks, /No new Critical findings\./);
  assert.match(textBlocks, /1 High finding needs attention\./);
  assert.doesNotMatch(textBlocks, /0 Critical and/);
  assert.match(textBlocks, /Tickets created · 2/);
  assert.match(textBlocks, /\[LIB-3000\]\(https:\/\/jira\.example\/browse\/LIB-3000\) · High · lib/);
  assert.match(textBlocks, /Blockers \/ no patch available · 1/);
  assert.doesNotMatch(textBlocks, /FYI/);
  held.heldVerified = true;
  assert.match(
    cardText(teamsCard(baseOutcome({ newBySeverity: { low: 1 }, groups: [held] }), teamsConfig)),
    /FYI: LIB-3001 was automatically put On Hold\./,
  );
});

test('Teams: the attention line names only nonzero Critical/High counts', () => {
  assert.equal(attentionText({ high: 1 }), '1 High finding needs attention.');
  assert.equal(attentionText({ critical: 1 }), '1 Critical finding needs attention.');
  assert.equal(attentionText({ critical: 2, high: 1, medium: 4 }), '2 Critical and 1 High findings need attention.');
  assert.equal(attentionText({ high: 3 }), '3 High findings need attention.');
  const card = cardText(teamsCard(baseOutcome({ newBySeverity: { critical: 1 } }), teamsConfig));
  assert.match(card, /1 Critical finding needs attention\./);
  assert.doesNotMatch(card, /No new Critical findings/);
});

test('Teams: unchanged historical blockers (adoptions) are not repeated', () => {
  const adopted = { ...bootstrapPlan().groups[2], ticketKey: 'APP-29', action: 'adopted' };
  const textBlocks = cardText(teamsCard(baseOutcome({ groups: [adopted] }), teamsConfig));
  assert.doesNotMatch(textBlocks, /Blockers/);
  assert.match(textBlocks, /No new untriaged Dependabot findings/);
});

test('ticket description lists every finding with its own severity, branches and rationale', () => {
  const alerts = liveAlerts().filter((alert) => [14, 15, 16].includes(alert.number) && alert.repository === WEB);
  alerts[0].severity = 'high';
  const doc = JSON.stringify(
    ticketDescription({
      group: group(`${WEB}:pkg-match`, WEB, 'create', undefined, 'high', [14, 15, 16]),
      alerts,
      evidence: {},
      config,
      runId: RUN,
    }),
  );
  for (const number of [14, 15, 16]) {
    assert.match(doc, new RegExp(`app#${number}`));
  }
  assert.match(doc, /High · pkg-match/);
  assert.match(doc, /Medium · pkg-match/);
  assert.match(doc, /develop-2025, develop-2023/);
  assert.match(doc, /Rationale for the regression fixture/);
});

test('an incomplete report never shows zero untriaged findings when no plan was validated', () => {
  const report = (planDetermined) =>
    JSON.stringify(
      runReport(
        {
          ...baseOutcome({ complete: false, mode: 'preview', startedAt: 'now', configRevision: 'c', planDetermined }),
          counts: { alerts: 24, uniqueAdvisories: 11, covered: 0, carried: 0, create: 0, extend: 0, adopt: 0 },
          cleared: [],
          ambiguous: [],
          warnings: [],
          actions: [],
          validationErrors: [],
          failures: ['Planner unavailable'],
        },
        config,
      ),
    );
  assert.match(report(false), /not determined \(no validated plan; 24 alert\(s\) awaiting triage\)/);
  assert.doesNotMatch(report(false), /0 Medium/);
  assert.match(report(true), /0 Medium/);
});

const reportOutcome = (extra = {}) => {
  return {
    ...baseOutcome({ mode: 'preview', planDetermined: true, firstReconciliation: true }),
    counts: { alerts: 24, uniqueAdvisories: 11, covered: 0, carried: 0, create: 1, extend: 0, adopt: 8 },
    cleared: [],
    ambiguous: [],
    warnings: [],
    actions: [],
    validationErrors: [],
    ...extra,
  };
};

test('a clean week posts no report comment; changes, problems and newly closed alerts do', () => {
  assert.equal(reportNeeded(reportOutcome({ groups: [] })), false);
  const kept = { ...bootstrapPlan().groups[0], operation: 'keep', action: 'kept' };
  assert.equal(reportNeeded(reportOutcome({ groups: [kept] })), false);
  const cleared = { id: `${WEB}#14`, state: 'fixed', tickets: ['APP-31'] };
  assert.equal(reportNeeded(reportOutcome({ cleared: [{ ...cleared, isNew: false }] })), false);
  assert.equal(reportNeeded(reportOutcome({ cleared: [{ ...cleared, isNew: true }] })), true);
  assert.equal(reportNeeded(reportOutcome({ complete: false, failures: ['x'] })), true);
  assert.equal(reportNeeded(reportOutcome({ groups: [{ ...createGroup(), action: 'proposed create' }] })), true);
});

test('the report is short: one line per adopted ticket, detail only for new or extended scope', () => {
  const groups = bootstrapPlan().groups.map((item) => {
    return { ...item, ticketKey: item.ticket, action: `proposed ${item.operation}` };
  });
  const [document] = runReport(reportOutcome({ groups, newBySeverity: { medium: 1 } }), config);
  const lines = JSON.stringify(document);
  assert.match(lines, /APP-31.*existing ticket; ownership to record · Medium · app · alerts 14, 15, 16/);
  assert.equal((lines.match(/Why: /g) ?? []).length, 1);
  assert.match(lines, /New ticket.*to create · Medium · lib · alert 108/);
  assert.doesNotMatch(lines, /Rationale for the regression fixture[^"]*APP-31/);
  assert.ok(lines.length < 6000, `report is ${lines.length} characters`);
});

test('large reports are split into several Jira comments instead of truncated', () => {
  const many = Array.from({ length: 300 }, (_, index) => {
    return { ...group(`${WEB}:g${index}`, WEB, 'create', undefined, 'low', [index]), action: 'proposed create' };
  });
  const documents = runReport(
    {
      ...baseOutcome({ groups: many, mode: 'preview', startedAt: 'now', configRevision: 'c' }),
      counts: { alerts: 1, uniqueAdvisories: 1, covered: 0, carried: 0, create: 300, extend: 0, adopt: 0 },
      cleared: [],
      ambiguous: [],
      warnings: [],
      actions: [],
      validationErrors: [],
    },
    config,
  );
  assert.ok(documents.length > 1);
  for (const document of documents) {
    assert.ok(JSON.stringify(document).length < 32000);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Executor, postTeams, summarize } from '../apply.mjs';
import { OWNED_LABEL, OWNERSHIP_PROPERTY } from '../lib/reconcile.mjs';
import { runReport, teamsCard, ticketDescription } from '../lib/render.mjs';
import { ControlState, JOURNAL_PROPERTY } from '../lib/state.mjs';
import { RUN, EL, WEB, blocked, bootstrapPlan, group, liveAlerts, registerTickets } from './fixtures.mjs';

const config = {
  jiraSite: 'https://jira.example',
  controlIssue: 'WEBUI-2435',
  issueTypeId: '10004',
  severityField: 'customfield_12201',
  severityOptions: { critical: '13603', high: '15789', medium: '15790', low: '15791' },
  holdStatus: 'On Hold',
  linkType: 'Relates',
  labels: ['Security', 'dependabot'],
  epic: 'NXENG-987',
  epicQuarter: '2026-Q4',
  timezone: 'Asia/Kolkata',
  repositories: [
    { name: WEB, project: 'WEBUI', component: 'Web UI', labels: ['WebUI'], branches: ['develop-2025', 'develop-2023'] },
    {
      name: EL,
      project: 'ELEMENTS',
      component: 'CI/CD',
      labels: ['nuxeo-elements'],
      branches: ['develop-2025', 'develop-2023'],
    },
  ],
  repositoryConfig(name) {
    return this.repositories.find((repo) => repo.name === name);
  },
};
const severityId = (severity) => config.severityOptions[severity];

/** In-memory Jira with the subset of REST behaviour the executor relies on. */
class FakeJira {
  constructor(tickets = []) {
    this.issues = new Map();
    this.calls = [];
    this.next = 3000;
    this.failNext = null;
    for (const ticket of tickets) {
      this.issues.set(ticket.key, {
        key: ticket.key,
        fields: {
          status: { name: ticket.status },
          labels: [...ticket.labels],
          [config.severityField]: { id: severityId(ticket.severity) },
          parent: { key: 'NXENG-987' },
        },
        properties: {},
        comments: [],
      });
    }
    this.issues.set('WEBUI-2435', {
      key: 'WEBUI-2435',
      fields: { status: { name: 'Open' }, labels: [] },
      properties: {},
      comments: [],
    });
  }

  record(name, args) {
    this.calls.push({ name, args });
    if (this.failNext && this.failNext.name === name) {
      const error = new Error(`${name} failed`);
      Object.assign(error, this.failNext.error);
      this.failNext = null;
      throw error;
    }
  }

  async issue(key, fields, properties = []) {
    const issue = this.issues.get(key);
    return {
      key,
      fields: issue.fields,
      properties: Object.fromEntries(properties.map((name) => [name, issue.properties[name]])),
    };
  }

  async search(jql) {
    const label = /labels = "([^"]+)"/.exec(jql)[1];
    return [...this.issues.values()]
      .filter((issue) => issue.fields.labels.includes(label))
      .map(({ key }) => {
        return { key };
      });
  }

  async create(fields) {
    this.record('create', fields);
    const key = `${fields.project.key}-${this.next++}`;
    this.issues.set(key, { key, fields: { ...fields, status: { name: 'Open' } }, properties: {}, comments: [] });
    return { key };
  }

  async property(key, name) {
    return this.issues.get(key).properties[name] || null;
  }

  async setProperty(key, name, value) {
    this.record('setProperty', { key, name });
    this.issues.get(key).properties[name] = structuredClone(value);
  }

  async edit(key, fields) {
    this.record('edit', { key, fields });
    Object.assign(this.issues.get(key).fields, fields);
  }

  async addLabel(key, label) {
    this.record('addLabel', { key, label });
    this.issues.get(key).fields.labels.push(label);
  }

  async addComment(key, body) {
    this.record('addComment', { key });
    this.issues.get(key).comments.push(body);
  }

  async transitions() {
    return this.noHoldTransition ? [] : [{ id: '91', to: { name: 'On Hold' } }];
  }

  async transition(key) {
    this.record('transition', { key });
    this.issues.get(key).fields.status = { name: 'On Hold' };
  }

  async link(type, inward, outward) {
    this.record('link', { type, inward, outward });
  }
}

function inventoryFor(tickets, overrides = {}) {
  const alerts = liveAlerts();
  return {
    runId: RUN,
    alerts,
    tickets,
    evidence: {},
    currentOwner: {},
    previousState: null,
    ...overrides,
  };
}

function newOutcome() {
  return { actions: [], failures: [], warnings: [] };
}

async function executor(jira, tickets, overrides) {
  const control = new ControlState(jira, 'WEBUI-2435');
  await control.load();
  const outcome = newOutcome();
  return {
    exec: new Executor({ jira, control, config, inventory: inventoryFor(tickets, overrides), outcome }),
    outcome,
    control,
  };
}

const createGroup = () => group(`${EL}:minimatch-globparts`, EL, 'create', undefined, 'medium', [299]);

test('create: builds the ticket itself, records ownership and verifies severity and epic', async () => {
  const jira = new FakeJira();
  const { exec, outcome } = await executor(jira, []);
  const report = {};
  await exec.create(createGroup(), report);
  assert.deepEqual(outcome.failures, []);
  const created = jira.calls.find((call) => call.name === 'create').args;
  assert.equal(created.project.key, 'ELEMENTS');
  assert.equal(created.parent.key, 'NXENG-987');
  assert.equal(created[config.severityField].id, '15790');
  assert.ok(created.labels.includes(OWNED_LABEL) && created.labels.includes('2026_Q4'));
  assert.ok(created.summary.startsWith('[Security]'));
  const property = jira.issues.get(report.ticketKey).properties[OWNERSHIP_PROPERTY];
  assert.deepEqual(Object.keys(property.alerts), ['299']);
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
  jira.issues.set('ELEMENTS-9', {
    key: 'ELEMENTS-9',
    fields: { labels: ['dat-abc'], status: { name: 'Open' } },
    properties: {},
    comments: [],
  });
  const second = await executor(jira, []);
  await second.exec.recover();
  const journal = jira.issues.get('WEBUI-2435').properties[JOURNAL_PROPERTY].entries;
  assert.equal(journal.find((entry) => entry.id === 'old:create').status, 'done');
  assert.equal(journal.find((entry) => entry.id === 'old:teams').status, 'uncertain');
  assert.ok(jira.issues.get('ELEMENTS-9').properties[OWNERSHIP_PROPERTY]);
  assert.ok(second.outcome.warnings.some((warning) => warning.code === 'uncertain'));
});

test('adopt records ownership without editing the description and never lowers severity', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  jira.issues.get('WEBUI-2431').fields[config.severityField] = { id: severityId('high') };
  tickets.find((ticket) => ticket.key === 'WEBUI-2431').severity = 'high';
  const { exec, outcome } = await executor(jira, tickets);
  const adopt = bootstrapPlan().groups[0];
  await exec.update(adopt, {});
  assert.deepEqual(outcome.failures, []);
  assert.equal(jira.calls.filter((call) => call.name === 'edit').length, 0);
  assert.equal(jira.issues.get('WEBUI-2431').fields[config.severityField].id, severityId('high'));
  assert.ok(jira.issues.get('WEBUI-2431').fields.labels.includes(OWNED_LABEL));
});

test('extend raises severity to the highest finding, comments, and keeps existing ownership', async () => {
  const tickets = registerTickets();
  const jira = new FakeJira(tickets);
  const owner = tickets.find((ticket) => ticket.key === 'ELEMENTS-2124');
  owner.ownership = { repository: EL, alerts: { 235: { recordedAt: 'then' }, 248: {}, 251: {} } };
  const alerts = liveAlerts();
  alerts.find((alert) => alert.number === 299).severity = 'high';
  const { exec, outcome } = await executor(jira, tickets, { alerts });
  const extend = group(`${EL}:moment`, EL, 'extend', 'ELEMENTS-2124', 'high', [235, 248, 251, 299], {
    updateNote: 'Adds minimatch.',
  });
  await exec.update(extend, {});
  assert.deepEqual(outcome.failures, []);
  assert.equal(jira.issues.get('ELEMENTS-2124').fields[config.severityField].id, severityId('high'));
  const property = jira.issues.get('ELEMENTS-2124').properties[OWNERSHIP_PROPERTY];
  assert.deepEqual(Object.keys(property.alerts).sort(), ['235', '248', '251', '299']);
  assert.equal(property.alerts[235].recordedAt, 'then');
  assert.equal(jira.issues.get('ELEMENTS-2124').comments.length, 2);
});

test('blocked groups are moved On Hold through a discovered transition and verified', async () => {
  const jira = new FakeJira();
  const { exec } = await executor(jira, []);
  const report = {};
  const unpatched = group(
    `${EL}:deepmerge`,
    EL,
    'create',
    undefined,
    'low',
    [295],
    blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4'),
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
  const control = new ControlState(jira, 'WEBUI-2435');
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
  assert.deepEqual(summary.untriaged, [`${EL}#299`]);
  assert.deepEqual(summary.newBySeverity, { medium: 1 });
  assert.equal(summary.firstReconciliation, true);
  const later = summarize(
    { ...inventory, previousState: { lastSuccess: {}, pendingUnowned: [`${EL}#299`] } },
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
const teamsConfig = { ...config, controlIssue: 'WEBUI-2435' };

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
      baseOutcome({ complete: false, failures: ['nuxeo/nuxeo-elements: GitHub GET alerts failed: HTTP 403'] }),
      teamsConfig,
    ),
  );
  assert.match(textBlocks, /scan incomplete/);
  assert.match(textBlocks, /HTTP 403/);
  assert.doesNotMatch(textBlocks, /took the day off|uninvited guests/);
});

test('Teams: High findings are highlighted, created tickets listed, FYI only after a verified hold', () => {
  const created = { ...createGroup(), ticketKey: 'ELEMENTS-3000', action: 'created', severity: 'high' };
  const held = {
    ...group(
      `${EL}:deepmerge`,
      EL,
      'create',
      undefined,
      'low',
      [295],
      blocked('no-upstream-patch', 'https://github.com/advisories/x'),
    ),
    ticketKey: 'ELEMENTS-3001',
    action: 'created',
    blockerChanged: true,
    heldVerified: false,
  };
  const textBlocks = cardText(
    teamsCard(baseOutcome({ newBySeverity: { high: 1, low: 1 }, groups: [created, held] }), teamsConfig),
  );
  assert.match(textBlocks, /No new Critical findings\./);
  assert.match(textBlocks, /0 Critical and 1 High finding\(s\) need attention/);
  assert.match(textBlocks, /Tickets created · 2/);
  assert.match(
    textBlocks,
    /\[ELEMENTS-3000\]\(https:\/\/jira\.example\/browse\/ELEMENTS-3000\) · High · nuxeo-elements/,
  );
  assert.match(textBlocks, /Blockers \/ no patch available · 1/);
  assert.doesNotMatch(textBlocks, /FYI/);
  held.heldVerified = true;
  assert.match(
    cardText(teamsCard(baseOutcome({ newBySeverity: { low: 1 }, groups: [held] }), teamsConfig)),
    /FYI: ELEMENTS-3001 was automatically put On Hold\./,
  );
});

test('Teams: unchanged historical blockers (adoptions) are not repeated', () => {
  const adopted = { ...bootstrapPlan().groups[2], ticketKey: 'WEBUI-2429', action: 'adopted' };
  const textBlocks = cardText(teamsCard(baseOutcome({ groups: [adopted] }), teamsConfig));
  assert.doesNotMatch(textBlocks, /Blockers/);
  assert.match(textBlocks, /No new untriaged Dependabot findings/);
});

test('ticket description lists every finding with its own severity, branches and rationale', () => {
  const alerts = liveAlerts().filter((alert) => [643, 644, 645].includes(alert.number) && alert.repository === WEB);
  alerts[0].severity = 'high';
  const doc = JSON.stringify(
    ticketDescription({
      group: group(`${WEB}:minimatch`, WEB, 'create', undefined, 'high', [643, 644, 645]),
      alerts,
      evidence: {},
      config,
      runId: RUN,
    }),
  );
  for (const number of [643, 644, 645]) {
    assert.match(doc, new RegExp(`nuxeo-web-ui#${number}`));
  }
  assert.match(doc, /High · minimatch/);
  assert.match(doc, /Medium · minimatch/);
  assert.match(doc, /develop-2025, develop-2023/);
  assert.match(doc, /Rationale for the regression fixture/);
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

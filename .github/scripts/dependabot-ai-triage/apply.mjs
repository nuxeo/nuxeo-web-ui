// Step 3: validate the AI plan, then (automatic mode only) apply it to Jira and notify Teams.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { jiraClient } from './lib/clients.mjs';
import { loadConfig } from './lib/config.mjs';
import { validatePlan } from './lib/plan-validator.mjs';
import { OWNED_LABEL, OWNERSHIP_PROPERTY, fingerprint } from './lib/reconcile.mjs';
import { extendComment, holdComment, runReport, severityComment, teamsCard, ticketDescription } from './lib/render.mjs';
import { ControlState } from './lib/state.mjs';
import { SEVERITY_RANK, alertId, isMainModule, log, mapSequential, request, shortHash } from './lib/util.mjs';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const RETRYABLE = new Set(['failed', 'not-applied']);

export function quarterLabel(quarter) {
  return quarter.replace('-', '_');
}

export function ownershipRecord({ group, alerts, previous, runId, now }) {
  const records = { ...previous?.alerts };
  for (const alert of alerts) {
    records[alert.number] = {
      fingerprint: fingerprint(alert),
      severity: alert.severity,
      ghsa: alert.ghsa,
      package: alert.package,
      recordedAt: records[alert.number]?.recordedAt ?? now,
    };
  }
  return {
    schemaVersion: 1,
    repository: group.repository,
    remediationId: group.remediationId,
    kind: group.kind,
    alerts: records,
    updatedBy: runId,
    updatedAt: now,
  };
}

/** Findings that still need triage after this plan: new tickets/extensions, review items and mismatches. */
export function summarize(inventory, plan) {
  const owned = new Set(Object.keys(inventory.currentOwner ?? {}));
  const untriaged = new Set();
  for (const group of (plan?.groups ?? []).filter(
    (item) => item.operation === 'create' || item.operation === 'extend',
  )) {
    for (const id of group.alerts
      .map((number) => alertId(group.repository, number))
      .filter((item) => !owned.has(item))) {
      untriaged.add(id);
    }
  }
  for (const item of [...(plan?.needsReview ?? []), ...(plan?.closedTicketMismatches ?? [])]) {
    untriaged.add(alertId(item.repository, item.alert));
  }
  const previous = inventory.previousState;
  const firstReconciliation = !previous?.lastSuccess;
  const carried = new Set(firstReconciliation ? [] : (previous.pendingUnowned ?? []));
  const alerts = new Map((inventory.alerts ?? []).map((alert) => [alertId(alert.repository, alert.number), alert]));
  const newBySeverity = {};
  for (const id of [...untriaged].filter((item) => !carried.has(item))) {
    const { severity } = alerts.get(id);
    newBySeverity[severity] = (newBySeverity[severity] ?? 0) + 1;
  }
  return {
    untriaged: [...untriaged],
    newBySeverity,
    carried: [...untriaged].filter((id) => carried.has(id)).length,
    firstReconciliation,
  };
}

export class Executor {
  constructor({ jira, control, config, inventory, outcome }) {
    Object.assign(this, { jira, control, config, inventory, outcome });
    this.alerts = new Map(inventory.alerts.map((alert) => [alertId(alert.repository, alert.number), alert]));
    this.tickets = new Map(inventory.tickets.map((ticket) => [ticket.key, ticket]));
    this.now = new Date().toISOString();
    this.stopped = false;
  }

  /** Returns true when the action may run now; records why it may not otherwise. */
  async prepare(id, kind, target, recovery) {
    const previous = this.control.find(id);
    if (previous?.status === 'done') {
      this.outcome.actions.push({ status: 'already-done', kind, target, detail: '' });
      return false;
    }
    // Only a create may be retried after an unknown outcome: it first searches for its own label.
    if (previous?.status === 'uncertain' && kind !== 'create') {
      this.outcome.failures.push(`${kind} ${target} has an unknown outcome from an earlier attempt; not repeated.`);
      this.stopped = true;
      return false;
    }
    if (previous) {
      previous.status = 'reserved';
      await this.control.persistJournal();
    } else {
      await this.control.reserve({ id, kind, target, runId: this.inventory.runId, recovery });
    }
    return true;
  }

  /** Reserve → act → settle. A completed action from an earlier attempt of this run is not repeated. */
  async act(id, kind, target, fn) {
    if (this.stopped) {
      return null;
    }
    if (!(await this.prepare(id, kind, target, fn.recovery))) {
      const previous = this.control.find(id);
      return previous?.status === 'done' ? previous.result : null;
    }
    try {
      const result = (await fn()) ?? {};
      await this.control.settle(id, 'done', result);
      this.outcome.actions.push({ status: 'done', kind, target: result.key ?? target, detail: result.detail ?? '' });
      return result;
    } catch (error) {
      const status = error.uncertain ? 'uncertain' : 'failed';
      await this.control.settle(id, status, { message: error.message });
      this.outcome.actions.push({ status, kind, target, detail: error.message });
      this.outcome.failures.push(`${kind} ${target}: ${error.message}`);
      // The remote outcome is unknown; reconcile on the next run instead of continuing blindly.
      this.stopped = Boolean(error.uncertain);
      return null;
    }
  }

  groupAlerts(group) {
    return group.alerts.map((number) => this.alerts.get(alertId(group.repository, number)));
  }

  async verifyIssue(key, { severity, property, epic, status }) {
    const fields = [this.config.severityField, 'parent', 'status', 'labels'];
    const issue = await this.jira.issue(key, fields, property ? [OWNERSHIP_PROPERTY] : []);
    const checks = [
      [
        'Defect Severity',
        severity && issue.fields[this.config.severityField]?.id !== this.config.severityOptions[severity],
      ],
      ['epic', epic && issue.fields.parent?.key !== epic],
      ['status', status && issue.fields.status?.name !== status],
      ['ownership property', property && issue.properties?.[OWNERSHIP_PROPERTY]?.updatedBy !== property.updatedBy],
    ];
    const problems = checks.filter(([, failed]) => failed).map(([name]) => name);
    if (problems.length) {
      throw new Error(`${key} verification failed: ${problems.join(', ')}`);
    }
  }

  async raiseSeverityIfNeeded(key, severity, ticket) {
    if (SEVERITY_RANK[severity] <= (SEVERITY_RANK[ticket?.severity] ?? 0)) {
      return false;
    }
    await this.jira.edit(key, { [this.config.severityField]: { id: this.config.severityOptions[severity] } });
    return true;
  }

  async hold(key, group) {
    const current = await this.jira.issue(key, ['status']);
    if (current.fields.status.name === this.config.holdStatus) {
      return false;
    }
    const transition = (await this.jira.transitions(key)).find((item) => item.to?.name === this.config.holdStatus);
    if (!transition) {
      throw new Error(`${key} has no transition to "${this.config.holdStatus}"`);
    }
    await this.jira.transition(key, transition.id);
    await this.verifyIssue(key, { status: this.config.holdStatus });
    await this.jira.addComment(key, holdComment({ group, runId: this.inventory.runId }));
    return true;
  }

  async holdIfBlocked(key, group, report) {
    const held = await this.act(`${this.inventory.runId}:${key}:hold`, 'hold', key, async () => {
      return { held: await this.hold(key, group) };
    });
    report.heldVerified = Boolean(held?.held);
  }

  createFields(group, alerts, label) {
    const repo = this.config.repositoryConfig(group.repository);
    const summary = group.summary.startsWith('[Security]') ? group.summary : `[Security] ${group.summary}`;
    const labels = [
      ...this.config.labels,
      ...(repo.labels ?? []),
      quarterLabel(this.config.epicQuarter),
      OWNED_LABEL,
      label,
    ];
    const priority = this.config.priorityBySeverity?.[group.severity];
    return {
      project: { key: repo.project },
      issuetype: { id: this.config.issueTypeId },
      parent: { key: this.config.epic },
      summary: summary.slice(0, 250),
      description: ticketDescription({
        group,
        alerts,
        evidence: this.inventory.evidence,
        config: this.config,
        runId: this.inventory.runId,
      }),
      labels: [...new Set(labels)],
      [this.config.severityField]: { id: this.config.severityOptions[group.severity] },
      ...(repo.component ? { components: [{ name: repo.component }] } : {}),
      ...(priority ? { priority: { name: priority } } : {}),
    };
  }

  async create(group, report) {
    const label = `dat-${shortHash(group.remediationId)}`;
    const alerts = this.groupAlerts(group);
    const ownership = ownershipRecord({ group, alerts, runId: this.inventory.runId, now: this.now });
    const run = async () => {
      // A ticket left by an interrupted attempt is reused, never duplicated.
      const existing = await this.jira.search(`labels = "${label}" ORDER BY created ASC`, ['summary']);
      const key = existing[0]?.key ?? (await this.jira.create(this.createFields(group, alerts, label))).key;
      await this.jira.setProperty(key, OWNERSHIP_PROPERTY, ownership);
      await this.verifyIssue(key, { severity: group.severity, property: ownership, epic: this.config.epic });
      return { key, detail: existing.length ? '(reused ticket from an interrupted run)' : '' };
    };
    run.recovery = { label, ownership };
    const result = await this.act(
      `${this.inventory.runId}:${group.remediationId}:create`,
      'create',
      group.remediationId,
      run,
    );
    if (!result) {
      return;
    }
    Object.assign(report, { ticketKey: result.key, action: 'created', blockerChanged: group.kind === 'blocked' });
    if (group.kind === 'blocked') {
      await this.holdIfBlocked(result.key, group, report);
    }
    await mapSequential(group.relatedTickets ?? [], async (related) => {
      try {
        await this.jira.link(this.config.linkType, result.key, related);
      } catch (error) {
        this.outcome.warnings.push({ code: 'link', message: `${result.key} → ${related}: ${error.message}` });
      }
    });
  }

  async updateTicket(group, ticket, ownership, added) {
    const key = group.ticket;
    const { runId } = this.inventory;
    await this.jira.setProperty(key, OWNERSHIP_PROPERTY, ownership);
    if (!ticket.labels?.includes(OWNED_LABEL)) {
      await this.jira.addLabel(key, OWNED_LABEL);
    }
    const raised = await this.raiseSeverityIfNeeded(key, group.severity, ticket);
    if (group.operation === 'extend' || group.updateNote) {
      await this.jira.addComment(key, extendComment({ group, added, evidence: this.inventory.evidence, runId }));
    }
    if (raised) {
      const drivers = this.groupAlerts(group)
        .filter((alert) => alert.severity === group.severity)
        .map((alert) => `#${alert.number}`);
      await this.jira.addComment(
        key,
        severityComment({ raise: { from: ticket.severity, to: group.severity, alerts: drivers }, runId }),
      );
    }
    // Only verify severity we changed: a ticket set higher by hand is never lowered.
    await this.verifyIssue(key, { property: ownership, severity: raised ? group.severity : null });
    return { key, raised };
  }

  async update(group, report) {
    const key = group.ticket;
    const ticket = this.tickets.get(key);
    const alerts = this.groupAlerts(group);
    const previous = ticket?.ownership;
    const ownership = ownershipRecord({ group, alerts, previous, runId: this.inventory.runId, now: this.now });
    const recorded = new Set(Object.keys(previous?.alerts ?? {}).map(Number));
    const added = alerts.filter((alert) => !recorded.has(alert.number));
    const id = `${this.inventory.runId}:${group.remediationId}:${group.operation}`;
    const result = await this.act(id, group.operation, key, () => this.updateTicket(group, ticket, ownership, added));
    if (!result) {
      return;
    }
    const keepAction = group.updateNote ? 'kept-updated' : 'kept';
    Object.assign(report, {
      ticketKey: key,
      action: { extend: 'extended', adopt: 'adopted', keep: keepAction }[group.operation],
      blockerChanged: group.kind === 'blocked' && (group.operation === 'extend' || Boolean(group.updateNote)),
    });
    if (group.kind === 'blocked' && !ticket.onHold) {
      await this.holdIfBlocked(key, group, report);
      report.blockerChanged = report.blockerChanged || report.heldVerified;
    }
  }

  async raiseCovered(raise, plannedTickets) {
    if (plannedTickets.has(raise.ticket)) {
      return;
    }
    const id = `${this.inventory.runId}:${raise.ticket}:severity-${raise.to}`;
    const result = await this.act(id, 'severity', raise.ticket, async () => {
      await this.jira.edit(raise.ticket, {
        [this.config.severityField]: { id: this.config.severityOptions[raise.to] },
      });
      await this.jira.addComment(raise.ticket, severityComment({ raise, runId: this.inventory.runId }));
      await this.verifyIssue(raise.ticket, { severity: raise.to });
      return { key: raise.ticket };
    });
    raise.applied = Boolean(result);
  }

  async recoverEntry(entry) {
    if (entry.kind !== 'create' || !entry.recovery) {
      await this.control.settle(entry.id, 'uncertain', {});
      const message = `${entry.kind} on ${entry.target} from run ${entry.runId} has an unknown outcome; not repeated.`;
      this.outcome.warnings.push({ code: 'uncertain', message });
      return;
    }
    const found = await this.jira.search(`labels = "${entry.recovery.label}" ORDER BY created ASC`, ['summary']);
    if (!found.length) {
      await this.control.settle(entry.id, 'not-applied', {});
      return;
    }
    await this.jira.setProperty(found[0].key, OWNERSHIP_PROPERTY, entry.recovery.ownership);
    await this.control.settle(entry.id, 'done', { key: found[0].key, recovered: true });
    this.outcome.warnings.push({
      code: 'recovered',
      message: `Recovered ${found[0].key} created by run ${entry.runId}.`,
    });
  }

  /** Reconciles reservations left by an interrupted run before anything new is written. */
  recover() {
    return mapSequential(this.control.pending(), (entry) => this.recoverEntry(entry));
  }

  async execute(plan) {
    await mapSequential(plan.groups, (group, index) =>
      group.operation === 'create'
        ? this.create(group, this.outcome.groups[index])
        : this.update(group, this.outcome.groups[index]),
    );
    const planned = new Set(plan.groups.map((group) => group.ticket).filter(Boolean));
    await mapSequential(this.outcome.severityRaises, (raise) => this.raiseCovered(raise, planned));
  }
}

const NO_JOURNAL = {
  find: () => null,
  reserve: async () => {},
  settle: async () => {},
  persistJournal: async () => {},
};

export async function postTeams(control, outcome, config, inventory) {
  const id = `${inventory.runId}:teams`;
  const previous = control.find(id);
  if (previous && !RETRYABLE.has(previous.status)) {
    const message = `Teams summary for this run is already ${previous.status}; not resent.`;
    outcome.warnings.push({ code: 'teams', message });
    return previous.status === 'done';
  }
  const url = process.env.DEPENDABOT_TEAMS_WEBHOOK_URL;
  if (!url?.startsWith('https://')) {
    outcome.failures.push('Teams webhook secret is missing or not HTTPS.');
    return false;
  }
  if (previous) {
    previous.status = 'reserved';
    await control.persistJournal();
  } else {
    await control.reserve({ id, kind: 'teams', target: 'webhook', runId: inventory.runId });
  }
  try {
    const body = teamsCard(outcome, config);
    await request({
      service: 'Teams',
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      label: 'webhook',
    });
    await control.settle(id, 'done', { acceptedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    const uncertain = error.uncertain || !error.status;
    await control.settle(id, uncertain ? 'uncertain' : 'failed', { message: error.message });
    const label = uncertain ? 'uncertain (not resent)' : 'failed';
    outcome.failures.push(`Teams delivery ${label}: ${error.message}`);
    return false;
  }
}

function emptyOutcome(inventory) {
  return {
    runId: inventory.runId,
    mode: inventory.mode,
    startedAt: inventory.startedAt,
    configRevision: inventory.configRevision,
    complete: false,
    failures: [...inventory.failures],
    warnings: inventory.warnings.map((message) => {
      return { code: 'collection', message };
    }),
    repositories: inventory.repositories ?? [],
    groups: [],
    severityRaises: [],
    closedMismatches: [],
    ambiguous: [],
    needsReview: [],
    cleared: inventory.cleared ?? [],
    actions: [],
    validationErrors: [],
    newBySeverity: {},
    counts: { alerts: 0, uniqueAdvisories: 0, covered: 0, carried: 0, create: 0, extend: 0, adopt: 0 },
    firstReconciliation: true,
  };
}

function validatedPlan(work, inventory, config, outcome) {
  const candidate = readJson(path.join(work, 'plan.json'));
  const validation = validatePlan({
    plan: candidate,
    runId: inventory.runId,
    inventoryDigest: inventory.inventoryDigest,
    repositories: config.repositories,
    epicQuarter: inventory.epic ? inventory.epicQuarter : '',
    alerts: inventory.alerts,
    aiInput: inventory.aiInput,
    currentOwner: new Map(Object.entries(inventory.currentOwner)),
    tickets: inventory.tickets,
  });
  outcome.warnings.push(...validation.warnings);
  if (validation.ok) {
    return candidate;
  }
  outcome.validationErrors = validation.errors;
  outcome.failures.push(
    `AI plan rejected by the validator (${validation.errors.length} error(s)); no changes applied.`,
  );
  return null;
}

/** Loads the plan for this run; any problem is a failure, never an empty plan. */
function loadPlan(work, inventory, config, outcome) {
  if (outcome.failures.length) {
    return null;
  }
  const ageHours = (Date.now() - Date.parse(inventory.collectedAt)) / 3.6e6;
  if (!(ageHours >= 0 && ageHours <= config.maxInventoryAgeHours)) {
    outcome.failures.push(`Inventory is ${ageHours.toFixed(1)}h old; refusing to act on a stale snapshot.`);
    return null;
  }
  if (!inventory.plannerNeeded) {
    return { groups: [], needsReview: [], closedTicketMismatches: [] };
  }
  if (existsSync(path.join(work, 'plan-error.json'))) {
    outcome.failures.push(readJson(path.join(work, 'plan-error.json')).message);
    return null;
  }
  if (!existsSync(path.join(work, 'plan.json'))) {
    outcome.failures.push('Planner produced no plan.');
    return null;
  }
  return validatedPlan(work, inventory, config, outcome);
}

function describe(outcome, inventory, plan) {
  if (!inventory.alerts) {
    return;
  }
  const summary = summarize(inventory, plan);
  const reconciliation = inventory.reconciliation ?? {};
  const reported = new Set(inventory.previousState?.reportedMismatches ?? []);
  const groups = plan?.groups ?? [];
  const byOperation = (operation) => groups.filter((group) => group.operation === operation).length;
  const planMismatches = (plan?.closedTicketMismatches ?? []).map((item) => {
    return { id: alertId(item.repository, item.alert), tickets: [item.ticket], isNew: true };
  });
  Object.assign(outcome, {
    planDetermined: Boolean(plan),
    newBySeverity: summary.newBySeverity,
    firstReconciliation: summary.firstReconciliation,
    untriaged: summary.untriaged,
    severityRaises: reconciliation.severityRaises ?? [],
    closedMismatches: [
      ...(reconciliation.closedMismatches ?? []).map((item) => {
        return { ...item, isNew: !reported.has(item.id) };
      }),
      ...planMismatches,
    ],
    ambiguous: reconciliation.ambiguous ?? [],
    needsReview: plan?.needsReview ?? [],
    groups: groups.map((group) => {
      return { ...group, ticketKey: group.ticket, action: `proposed ${group.operation}` };
    }),
    counts: {
      alerts: inventory.alerts.length,
      uniqueAdvisories: new Set(inventory.alerts.map((alert) => alert.ghsa)).size,
      covered: (reconciliation.covered ?? []).length,
      carried: summary.carried,
      create: byOperation('create'),
      extend: byOperation('extend'),
      adopt: byOperation('adopt'),
    },
  });
}

async function publishReport(jira, config, outcome) {
  try {
    await mapSequential(runReport(outcome, config), (document) => jira.addComment(config.controlIssue, document));
  } catch (error) {
    outcome.failures.push(`Report comment: ${error.message}`);
  }
}

async function saveState(control, outcome, inventory) {
  const record = {
    runId: inventory.runId,
    startedAt: inventory.startedAt,
    finishedAt: new Date().toISOString(),
    configRevision: inventory.configRevision,
  };
  await control.load();
  if (outcome.mode !== 'automatic') {
    await control.saveState({ lastPreview: { ...record, complete: outcome.complete } });
  } else if (outcome.complete) {
    // Only alerts that remain without an owner are carried over to the next run.
    const pending = new Set([
      ...outcome.needsReview.map((item) => alertId(item.repository, item.alert)),
      ...outcome.closedMismatches.map((item) => item.id),
    ]);
    await control.saveState({
      lastSuccess: record,
      pendingUnowned: (outcome.untriaged ?? []).filter((id) => pending.has(id)),
      reportedMismatches: outcome.closedMismatches.map((item) => item.id),
    });
  } else {
    await control.saveState({ lastFailure: { ...record, failures: outcome.failures.slice(0, 20) } });
  }
}

async function runWithLock({ jira, control, config, inventory, outcome, plan }) {
  await control.load();
  const executor = new Executor({ jira, control, config, inventory, outcome });
  try {
    await executor.recover();
    if (outcome.mode === 'automatic' && plan && !outcome.failures.length) {
      await executor.execute(plan);
    }
  } catch (error) {
    outcome.failures.push(`Executor: ${error.message}`);
  }
  outcome.complete = outcome.failures.length === 0;
  await publishReport(jira, config, outcome);
  if (outcome.mode === 'automatic') {
    await postTeams(control, outcome, config, inventory);
  }
  outcome.complete = outcome.failures.length === 0;
  try {
    await saveState(control, outcome, inventory);
  } finally {
    await control.releaseLock(inventory.runId);
  }
}

/** @param {object} [jiraOverride] Injected Jira client (tests and local dry runs); defaults to the real service. */
export async function apply(jiraOverride) {
  const work = process.env.TRIAGE_WORK_DIR;
  const config = loadConfig(process.env.TRIAGE_CONFIG ?? '.github/dependabot-ai-triage.json');
  const inventory = readJson(path.join(work, 'inventory.json'));
  const outcome = emptyOutcome(inventory);
  const jira =
    jiraOverride ??
    jiraClient({ site: config.jiraSite, email: process.env.JIRA_EMAIL, token: process.env.JIRA_API_TOKEN });
  const plan = loadPlan(work, inventory, config, outcome);
  describe(outcome, inventory, plan);
  if (inventory.lockAcquired) {
    await runWithLock({ jira, control: new ControlState(jira, config.controlIssue), config, inventory, outcome, plan });
  } else if (outcome.mode === 'automatic' && !inventory.lockHeld) {
    // Without the lock (or a restricted control issue) nothing may be written to Jira; Teams still hears about it.
    await postTeams(NO_JOURNAL, outcome, config, inventory);
  }
  const { counts } = outcome;
  log(
    `Run ${outcome.complete ? 'complete' : 'INCOMPLETE'} (${outcome.mode}): ${counts.alerts} alert(s), ` +
      `${counts.covered} covered, ${counts.create} to create, ${counts.extend} to extend, ${counts.adopt} to adopt, ` +
      `${outcome.failures.length} failure(s). Report: ${config.jiraSite}/browse/${config.controlIssue}`,
  );
  if (!outcome.complete) {
    process.exitCode = 1;
  }
  return outcome;
}

if (isMainModule(import.meta.url)) {
  try {
    await apply();
  } catch (error) {
    process.stderr.write(`Apply failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

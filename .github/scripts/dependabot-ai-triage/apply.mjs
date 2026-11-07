// Step 3: validate the AI plan, then (automatic mode only) apply it to Jira and notify Teams.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { jiraClient } from './lib/clients.mjs';
import { loadConfig } from './lib/config.mjs';
import { validatePlan } from './lib/plan-validator.mjs';
import { OWNED_LABEL, OWNERSHIP_PROPERTY, fingerprint } from './lib/reconcile.mjs';
import {
  extendComment,
  holdComment,
  reportNeeded,
  runReport,
  severityComment,
  teamsCard,
  ticketDescription,
} from './lib/render.mjs';
import { ControlState } from './lib/state.mjs';
import {
  SEVERITY_RANK,
  adfDoc,
  adfParagraph,
  adfText,
  alertId,
  isMainModule,
  log,
  mapSequential,
  request,
  shortHash,
} from './lib/util.mjs';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const RETRYABLE = new Set(['failed', 'not-applied']);

export function quarterLabel(quarter) {
  return quarter.replace('-', '_');
}

export function ownershipRecord({ group, alerts, previous, runId, now, upstreamStatus = null }) {
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
    // Lets the next runs notice when the upstream work a blocked ticket waits for changes status.
    blocker:
      group.kind === 'blocked'
        ? { type: group.blocker?.type, upstreamRef: group.blocker?.upstreamRef, upstreamStatus }
        : null,
    alerts: records,
    checkedAt: now,
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
  // Alerts whose only owner was closed while the alert stayed open are untriaged again.
  for (const item of inventory.reconciliation?.closedMismatches ?? []) {
    untriaged.add(item.id);
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

const JIRA_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

export class Executor {
  constructor({ jira, control, config, inventory, outcome }) {
    Object.assign(this, { jira, control, config, inventory, outcome });
    // Collection may have failed part-way; the executor must still be constructible so the run can report.
    this.alerts = new Map((inventory.alerts ?? []).map((alert) => [alertId(alert.repository, alert.number), alert]));
    this.tickets = new Map((inventory.tickets ?? []).map((ticket) => [ticket.key, ticket]));
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
    // Only a create may be retried after an unknown outcome: it first searches for its own run-scoped label.
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

  upstreamStatus(group) {
    const ref = group.blocker?.upstreamRef;
    return ref && JIRA_KEY.test(ref) ? (this.tickets.get(ref)?.status ?? null) : null;
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

  /**
   * Re-reads a planned target immediately before changing it. The plan was validated against the collected
   * snapshot; anything that moved since (closed, started, ownership changed) stops the change for this ticket.
   */
  async refreshTarget(group) {
    const key = group.ticket;
    const issue = await this.jira.issue(key, [this.config.severityField, 'status', 'labels'], [OWNERSHIP_PROPERTY]);
    const status = issue.fields.status ?? {};
    const category = status.statusCategory?.key;
    const ownership = issue.properties?.[OWNERSHIP_PROPERTY] ?? null;
    const expected = this.tickets.get(key)?.ownership?.updatedBy ?? null;
    const problems = [];
    if (category === 'done') {
      problems.push(`is now ${status.name}`);
    }
    if (group.operation === 'extend' && category !== 'new') {
      problems.push(`is now ${status.name}, so its scope is not extended`);
    }
    if (![expected, this.inventory.runId].includes(ownership?.updatedBy ?? null)) {
      problems.push('had its recorded ownership changed since collection');
    }
    if (problems.length) {
      throw new Error(`${key} ${problems.join('; ')}`);
    }
    return {
      key,
      labels: issue.fields.labels ?? [],
      severity: this.config.severityOf(issue.fields[this.config.severityField]?.id),
      onHold: status.name === this.config.holdStatus,
      ownership,
    };
  }

  recordRaise(ticket, from, to, alerts) {
    const ids = alerts.filter((alert) => alert.severity === to).map((alert) => alertId(alert.repository, alert.number));
    const existing = this.outcome.severityRaises.find((raise) => raise.ticket === ticket);
    if (existing) {
      Object.assign(existing, { to, applied: true });
    } else {
      this.outcome.severityRaises.push({ ticket, from, to, alerts: ids, applied: true });
    }
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

  /**
   * Puts blocked work On Hold, then records ownership last. If any step is interrupted, the alerts stay
   * unowned and are planned again next run (the planner then adopts the ticket), so no step is lost.
   */
  async finish(group, target, alerts, report) {
    const { runId } = this.inventory;
    if (group.kind === 'blocked' && !target.onHold) {
      const held = await this.act(`${runId}:${target.key}:hold`, 'hold', target.key, async () => {
        return { key: target.key, held: await this.hold(target.key, group) };
      });
      report.heldVerified = Boolean(held?.held);
      if (!held) {
        return false;
      }
      report.blockerChanged = report.blockerChanged || report.heldVerified;
    }
    const ownership = ownershipRecord({
      group,
      alerts,
      previous: target.ownership,
      runId,
      now: this.now,
      upstreamStatus: this.upstreamStatus(group),
    });
    const recorded = await this.act(`${runId}:${target.key}:ownership`, 'ownership', target.key, async () => {
      await this.jira.setProperty(target.key, OWNERSHIP_PROPERTY, ownership);
      await this.verifyIssue(target.key, { property: ownership });
      return { key: target.key };
    });
    return Boolean(recorded);
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
    const { runId } = this.inventory;
    // Scoped to this run: only a retry of this run (or recovery of its reservation) can find the ticket again,
    // never a ticket created for the same remediation in an earlier quarter.
    const runKey = shortHash([runId, group.remediationId]);
    const label = `dat-${runKey}`;
    const alerts = this.groupAlerts(group);
    const run = async () => {
      const existing = await this.jira.search(`labels = "${label}" ORDER BY created ASC`, ['summary']);
      const key = existing[0]?.key ?? (await this.jira.create(this.createFields(group, alerts, label))).key;
      await this.verifyIssue(key, { severity: group.severity, epic: this.config.epic });
      return { key, detail: existing.length ? '(reused the ticket from an interrupted attempt of this run)' : '' };
    };
    run.recovery = { label };
    const result = await this.act(`${runId}:${group.remediationId}:create`, 'create', group.remediationId, run);
    if (!result) {
      return;
    }
    Object.assign(report, { ticketKey: result.key, action: 'created', blockerChanged: group.kind === 'blocked' });
    await mapSequential(group.relatedTickets ?? [], (related) =>
      this.act(`${runId}:${result.key}:link:${related}`, 'link', `${result.key} → ${related}`, async () => {
        await this.jira.link(this.config.linkType, result.key, related);
        return { key: result.key };
      }),
    );
    await this.finish(group, { key: result.key, onHold: false, ownership: null }, alerts, report);
  }

  async applyScope(group, target, added) {
    const { key } = target;
    const { runId } = this.inventory;
    if (!target.labels.includes(OWNED_LABEL)) {
      await this.jira.addLabel(key, OWNED_LABEL);
    }
    const raise = SEVERITY_RANK[group.severity] > (SEVERITY_RANK[target.severity] ?? 0);
    if (raise) {
      await this.jira.edit(key, { [this.config.severityField]: { id: this.config.severityOptions[group.severity] } });
    }
    if (group.operation === 'extend' || group.updateNote) {
      await this.jira.addComment(key, extendComment({ group, added, evidence: this.inventory.evidence, runId }));
    }
    if (raise) {
      const drivers = this.groupAlerts(group)
        .filter((alert) => alert.severity === group.severity)
        .map((alert) => `#${alert.number}`);
      const comment = severityComment({ raise: { from: target.severity, to: group.severity, alerts: drivers }, runId });
      await this.jira.addComment(key, comment);
      // Only verify severity we changed: a ticket set higher by hand is never lowered.
      await this.verifyIssue(key, { severity: group.severity });
    }
    return { key, raisedFrom: raise ? (target.severity ?? 'unset') : null };
  }

  async update(group, report) {
    const { runId } = this.inventory;
    const alerts = this.groupAlerts(group);
    let target;
    try {
      target = await this.refreshTarget(group);
    } catch (error) {
      this.outcome.failures.push(`${group.operation} ${group.ticket}: ${error.message}`);
      return;
    }
    const recorded = new Set(Object.keys(target.ownership?.alerts ?? {}).map(Number));
    const added = alerts.filter((alert) => !recorded.has(alert.number));
    const id = `${runId}:${group.remediationId}:${group.operation}`;
    const scope = await this.act(id, group.operation, group.ticket, () => this.applyScope(group, target, added));
    if (!scope) {
      return;
    }
    if (scope.raisedFrom) {
      this.recordRaise(group.ticket, scope.raisedFrom, group.severity, alerts);
    }
    const keepAction = group.updateNote ? 'kept-updated' : 'kept';
    Object.assign(report, {
      ticketKey: group.ticket,
      action: { extend: 'extended', adopt: 'adopted', keep: keepAction }[group.operation],
      blockerChanged: group.kind === 'blocked' && (group.operation === 'extend' || Boolean(group.updateNote)),
    });
    await this.finish(group, target, alerts, report);
  }

  async raiseCovered(raise, plannedTickets) {
    if (plannedTickets.has(raise.ticket) || raise.applied) {
      return;
    }
    const id = `${this.inventory.runId}:${raise.ticket}:severity-${raise.to}`;
    const result = await this.act(id, 'severity', raise.ticket, async () => {
      // Decide from the current Jira value: a severity raised by hand meanwhile is never lowered.
      const current = await this.jira.issue(raise.ticket, [this.config.severityField]);
      const severity = this.config.severityOf(current.fields[this.config.severityField]?.id);
      if (SEVERITY_RANK[raise.to] <= (SEVERITY_RANK[severity] ?? 0)) {
        return { key: raise.ticket, unchanged: true };
      }
      await this.jira.edit(raise.ticket, {
        [this.config.severityField]: { id: this.config.severityOptions[raise.to] },
      });
      await this.jira.addComment(raise.ticket, severityComment({ raise, runId: this.inventory.runId }));
      await this.verifyIssue(raise.ticket, { severity: raise.to });
      return { key: raise.ticket };
    });
    raise.applied = Boolean(result) && !result.unchanged;
  }

  /** Recovery only settles the journal; it never edits remediation tickets (their alerts are simply re-planned). */
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
    await this.control.settle(entry.id, 'done', { key: found[0].key, recovered: true });
    this.outcome.warnings.push({
      code: 'recovered',
      message: `${found[0].key} was created by interrupted run ${entry.runId}; its alerts are re-planned.`,
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
  const reportedCleared = new Set(inventory.previousState?.reportedCleared ?? []);
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
    // Alerts closed on GitHub are reported once, not every week.
    cleared: outcome.cleared.map((item) => {
      return { ...item, isNew: !reportedCleared.has(item.id) };
    }),
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
  if (!reportNeeded(outcome)) {
    return;
  }
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
      reportedCleared: outcome.cleared.map((item) => item.id),
    });
  } else {
    await control.saveState({ lastFailure: { ...record, failures: outcome.failures.slice(0, 20) } });
  }
}

/** Corrects the private report when the Teams notification after it did not go out. */
async function noteDeliveryFailure(jira, config, outcome) {
  const reason = outcome.failures.at(-1) ?? 'Teams notification was not sent.';
  try {
    await jira.addComment(
      config.controlIssue,
      adfDoc([adfParagraph(adfText(`Run ${outcome.runId} is INCOMPLETE: ${reason}`))]),
    );
  } catch (error) {
    outcome.failures.push(`Report correction: ${error.message}`);
  }
}

async function runWithLock({ jira, control, config, inventory, outcome, plan }) {
  await control.load();
  const executor = new Executor({ jira, control, config, inventory, outcome });
  try {
    if (outcome.mode === 'automatic') {
      await executor.recover();
    } else if (control.pending().length) {
      // Preview never writes to remediation tickets; the next automatic run reconciles these.
      const message = `${control.pending().length} interrupted write(s) await reconciliation by the next automatic run.`;
      outcome.warnings.push({ code: 'pending', message });
    }
    if (outcome.mode === 'automatic' && plan && !outcome.failures.length) {
      await executor.execute(plan);
    }
  } catch (error) {
    outcome.failures.push(`Executor: ${error.message}`);
  }
  outcome.complete = outcome.failures.length === 0;
  await publishReport(jira, config, outcome);
  // A failed report makes the run incomplete before the Teams card is built, so it cannot claim a clean scan.
  outcome.complete = outcome.failures.length === 0;
  if (outcome.mode === 'automatic') {
    const delivered = await postTeams(control, outcome, config, inventory);
    outcome.complete = outcome.failures.length === 0;
    if (!delivered) {
      await noteDeliveryFailure(jira, config, outcome);
    }
  }
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
  } else {
    // Without the lock there is no private journal to record a delivery, so a retry could resend it: no Teams
    // message is sent and the failed workflow run is the signal.
    log('No Teams notification: the private control issue could not be used for this run.');
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

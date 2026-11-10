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
  textOf,
} from './lib/util.mjs';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const RETRYABLE = new Set(['failed', 'not-applied']);

export function quarterLabel(quarter) {
  return quarter.replace('-', '_');
}

/** Identifies one comment of one journalled action, so recovery never mistakes another comment for it. */
export function actionMarker(id, step) {
  return `dat-${shortHash([id, step])}`;
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
    // Links and severity comments that definitely failed or were confirmed missing: retried under their ids.
    this.pendingWrites = [];
    // Tickets with links or comments still to be written: their ownership is not recorded until they exist.
    this.blockedTickets = new Set();
    // Tickets this run wrote to: their own updates are not "changes since collection".
    this.touched = new Set();
  }

  /** Returns true when the action may run now; records why it may not otherwise. */
  async prepare(id, kind, target, recovery, signature) {
    const previous = this.control.find(id);
    // A retry of the same run re-plans from fresh data: a completed action is only reused for identical inputs.
    if (previous?.signature && signature && previous.signature !== signature) {
      this.outcome.failures.push(
        `${kind} ${target} was planned differently by an earlier attempt of this run; not reused.`,
      );
      return false;
    }
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
      await this.control.reserve({ id, kind, target, runId: this.inventory.runId, recovery, signature });
    }
    return true;
  }

  /** Reserve → act → settle. A completed action from an earlier attempt of this run is not repeated. */
  async act(id, kind, target, fn, signature) {
    if (this.stopped) {
      return null;
    }
    if (!(await this.prepare(id, kind, target, fn.recovery, signature))) {
      const previous = this.control.find(id);
      const reusable = previous?.status === 'done' && (!signature || previous.signature === signature);
      return reusable ? previous.result : null;
    }
    let result;
    try {
      result = (await fn()) ?? {};
    } catch (error) {
      await this.recordFailure(id, kind, target, error);
      return null;
    }
    this.outcome.actions.push({ status: 'done', kind, target: result.key ?? target, detail: result.detail ?? '' });
    if (result.key) {
      this.touched.add(result.key);
    }
    await this.acknowledge(id, kind, target, result);
    return result;
  }

  /**
   * The change was made. If its journal entry cannot be completed, nothing more is written: the entry stays
   * reserved, and the next automatic run settles it as uncertain instead of repeating the change.
   */
  async acknowledge(id, kind, target, result) {
    try {
      await this.control.settle(id, 'done', result);
    } catch (error) {
      this.stopped = true;
      this.outcome.failures.push(`${kind} ${target} was applied but its journal entry was not saved: ${error.message}`);
    }
  }

  async recordFailure(id, kind, target, error) {
    const status = error.uncertain ? 'uncertain' : 'failed';
    this.outcome.actions.push({ status, kind, target, detail: error.message });
    this.outcome.failures.push(`${kind} ${target}: ${error.message}`);
    // An unknown remote outcome is reconciled on the next run instead of continuing blindly.
    this.stopped = Boolean(error.uncertain);
    try {
      await this.control.settle(id, status, { message: error.message });
    } catch (journalError) {
      this.stopped = true;
      this.outcome.failures.push(`${kind} ${target}: journal entry not saved: ${journalError.message}`);
    }
  }

  /** Attaches what recovery needs to reconcile an interrupted write from Jira. */
  withRecovery(fn, recovery) {
    fn.recovery = recovery;
    return fn;
  }

  /** Identifies what an action was asked to do, so a retry with different inputs never reuses its result. */
  signature(group, extra = {}) {
    return shortHash({
      operation: group.operation,
      kind: group.kind,
      severity: group.severity,
      alerts: [...group.alerts].sort((a, b) => a - b),
      updateNote: group.updateNote ?? null,
      ...extra,
    });
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
      ['ownership property', property && issue.properties?.[OWNERSHIP_PROPERTY]?.writeId !== property.writeId],
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
    if (group.operation === 'extend' && group.kind === 'actionable' && status.name === this.config.holdStatus) {
      problems.push('is now On Hold, so independently actionable work is not added to it');
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
      category,
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
    // Last check at write time: work that has started since the plan was validated is never stopped automatically.
    const category = current.fields.status.statusCategory?.key;
    if (category && category !== 'new') {
      throw new Error(`${key} is now ${current.fields.status.name}; it is not put On Hold automatically`);
    }
    const transition = (await this.jira.transitions(key)).find((item) => item.to?.name === this.config.holdStatus);
    if (!transition) {
      throw new Error(`${key} has no transition to "${this.config.holdStatus}"`);
    }
    await this.jira.transition(key, transition.id);
    await this.verifyIssue(key, { status: this.config.holdStatus });
    return true;
  }

  /**
   * Puts blocked work On Hold with its reason. The reason is its own step and is resumed whenever the ticket was put
   * On Hold here, or no blocked ownership shows that an earlier run already gave it (a transition that succeeded
   * before its comment failed leaves the ticket On Hold, so the On Hold status alone does not prove the reason).
   */
  async holdWithReason(group, target, report) {
    const { runId } = this.inventory;
    const holdNow = !target.onHold;
    if (holdNow) {
      const hold = this.withRecovery(
        async () => {
          return { key: target.key, held: await this.hold(target.key, group) };
        },
        { key: target.key },
      );
      const held = await this.act(`${runId}:${target.key}:hold`, 'hold', target.key, hold);
      report.heldVerified = Boolean(held?.held);
      if (!held) {
        return false;
      }
    }
    if (holdNow || target.ownership?.kind !== 'blocked') {
      const id = `${runId}:${target.key}:hold-comment`;
      const marker = actionMarker(id, 'reason');
      const reason = this.withRecovery(
        async () => {
          await this.commentOnce(target.key, marker, holdComment({ group, runId, marker }));
          return { key: target.key };
        },
        { key: target.key, markers: [marker] },
      );
      if (!(await this.act(id, 'hold-comment', target.key, reason))) {
        return false;
      }
    }
    report.onHold = true;
    report.blockerChanged = report.blockerChanged || Boolean(report.heldVerified);
    return true;
  }

  /**
   * Puts blocked work On Hold, then records ownership last. If any step is interrupted, the alerts stay
   * unowned and are planned again next run (the planner then adopts the ticket), so no step is lost.
   */
  async finish(group, target, alerts, report) {
    const { runId } = this.inventory;
    report.onHold = target.onHold;
    if (group.kind === 'blocked' && !(await this.holdWithReason(group, target, report))) {
      return false;
    }
    if (this.blockedTickets.has(target.key)) {
      this.outcome.failures.push(`${target.key}: ownership waits until its pending links and comments are written.`);
      return false;
    }
    const signature = this.signature(group);
    const id = `${runId}:${target.key}:ownership:${signature}`;
    // `writeId` identifies this exact write: retries of one run may write different payloads to the same ticket.
    const ownership = {
      ...ownershipRecord({
        group,
        alerts,
        previous: target.ownership,
        runId,
        now: this.now,
        upstreamStatus: this.upstreamStatus(group),
      }),
      writeId: id,
    };
    const recorded = await this.act(
      id,
      'ownership',
      target.key,
      this.withRecovery(
        async () => {
          await this.jira.setProperty(target.key, OWNERSHIP_PROPERTY, ownership);
          await this.verifyIssue(target.key, { property: ownership });
          return { key: target.key };
        },
        { key: target.key },
      ),
      signature,
    );
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
      if (!existing.length) {
        await this.checkLiveCoverage(group, alerts);
      }
      const key = existing[0]?.key ?? (await this.jira.create(this.createFields(group, alerts, label))).key;
      await this.verifyIssue(key, { severity: group.severity, epic: this.config.epic });
      return { key, detail: existing.length ? '(reused the ticket from an interrupted attempt of this run)' : '' };
    };
    run.recovery = { label };
    const signature = this.signature(group);
    const id = `${runId}:${group.remediationId}:create`;
    const result = await this.act(id, 'create', group.remediationId, run, signature);
    if (!result) {
      return;
    }
    Object.assign(report, { ticketKey: result.key, action: 'created', blockerChanged: group.kind === 'blocked' });
    const linked = await mapSequential(group.relatedTickets ?? [], (related) => this.link(result.key, related));
    // Ownership waits for the links: until it is recorded the alerts are re-planned, and failed links are retried.
    if (linked.every(Boolean)) {
      await this.finish(group, { key: result.key, onHold: false, category: 'new', ownership: null }, alerts, report);
    }
  }

  /** Open tickets other than `exceptKey` whose recorded ownership now claims any of these alerts. */
  async liveOwner(group, alerts, exceptKey = null) {
    const project = this.config.repositoryConfig(group.repository).project;
    const jql = `project = ${project} AND labels = "${OWNED_LABEL}" ORDER BY key`;
    const issues = await this.jira.search(jql, ['status'], [OWNERSHIP_PROPERTY]);
    const numbers = new Set(alerts.map((alert) => alert.number));
    // A closed owner is a closed-ticket mismatch, which reconciliation reports; only open owners count.
    return issues.find((issue) => {
      const ownership = issue.properties?.[OWNERSHIP_PROPERTY];
      return (
        issue.key !== exceptKey &&
        issue.fields?.status?.statusCategory?.key !== 'done' &&
        ownership?.repository === group.repository &&
        Object.keys(ownership.alerts ?? {}).some((number) => numbers.has(Number(number)))
      );
    });
  }

  /** Tickets that match these alerts and are new, or changed since collection by someone other than this run. */
  async changedCandidates(group, alerts) {
    const project = this.config.repositoryConfig(group.repository).project;
    // Everything changed since collection started; without a start time, a wide 24-hour window is used instead.
    const elapsed = Math.ceil((Date.now() - Date.parse(this.inventory.startedAt)) / 60000) + 5;
    const minutes = Number.isFinite(elapsed) ? elapsed : 1440;
    const ids = [...new Set(alerts.flatMap((alert) => [alert.ghsa, alert.cve, alert.url]).filter(Boolean))];
    const packages = [...new Set(alerts.map((alert) => alert.package).filter(Boolean))];
    const terms = [
      ...ids.map((id) => String.raw`text ~ "\"${id}\""`),
      ...packages.map((name) => String.raw`summary ~ "\"${name}\""`),
    ];
    const jql = `project = ${project} AND updated >= -${minutes}m AND (${terms.join(' OR ')}) ORDER BY key`;
    const issues = await this.jira.search(jql, ['updated'], []);
    return issues.filter((issue) => {
      if (this.touched.has(issue.key)) {
        return false;
      }
      const collected = this.tickets.get(issue.key);
      return !collected || collected.updated !== issue.fields?.updated;
    });
  }

  /**
   * Coverage may appear while the planner runs (a ticket created, adopted or edited by someone else). Re-read it
   * right before creating, so a new ticket is never a duplicate of work recorded since collection.
   */
  async checkLiveCoverage(group, alerts) {
    const owner = await this.liveOwner(group, alerts);
    if (owner) {
      throw new Error(`${owner.key} recorded ownership of these alerts after collection; not creating a duplicate`);
    }
    const changed = await this.changedCandidates(group, alerts);
    if (changed.length) {
      const keys = changed.map((issue) => issue.key).join(', ');
      throw new Error(`${keys} changed after collection and may cover these alerts; re-planned next run`);
    }
  }

  /** Links a new ticket; a definite failure is kept and retried by later runs independently of the plan. */
  linkAction(from, to) {
    const run = async () => {
      // Checked first, so a retry whose journal record was pruned never adds the link twice.
      if (!(await this.linked(from, to))) {
        await this.jira.link(this.config.linkType, from, to);
      }
      return { key: from };
    };
    run.recovery = { from, to };
    return run;
  }

  /**
   * Links a new ticket. Only a definite failure is kept for retry, under its original journal id; an unknown
   * outcome is reconciled from the issue's links by the next run's recovery, never re-posted blindly.
   */
  async link(from, to) {
    const id = `${this.inventory.runId}:${from}:link:${to}`;
    const linked = await this.act(id, 'link', `${from} → ${to}`, this.linkAction(from, to));
    if (!linked && this.control.find(id)?.status === 'failed') {
      this.pendingWrites.push({ id, from, to });
    }
    return Boolean(linked);
  }

  /** Retries links and severity comments that definitely failed or were confirmed missing, under their own ids. */
  async replayPending(pending) {
    const remaining = [];
    await mapSequential(pending, async (item) => {
      const comment = item.kind === 'severity-comment';
      const id = item.id ?? `${this.inventory.runId}:${item.from}:link:${item.to}`;
      const done = comment
        ? await this.act(id, item.kind, item.key, this.severityCommentAction(id, item.key, item.raise))
        : await this.act(id, 'link', `${item.from} → ${item.to}`, this.linkAction(item.from, item.to));
      // Kept until its journal entry is done: a write skipped because an earlier one stopped the run stays queued.
      if (!done && this.control.find(id)?.status !== 'done') {
        remaining.push({ ...item, id });
      }
    });
    return remaining;
  }

  /** The "severity raised" comment of a severity change journalled as `id`; its marker comes from that id. */
  severityCommentAction(id, key, raise) {
    const marker = actionMarker(id, 'severity');
    return this.withRecovery(
      async () => {
        await this.commentOnce(key, marker, severityComment({ raise, runId: this.inventory.runId, marker }));
        return { key };
      },
      { key, raise, markers: [marker] },
    );
  }

  /**
   * Posts the comment explaining a severity change made by the step journalled as `id`. Its own journal step: a
   * retry posts it without repeating anything else, and a definite failure is queued so later runs still post it
   * (they see the raised severity and would otherwise never explain it).
   */
  async explainRaise(id, key, raise) {
    const commentId = `${id}:severity-comment`;
    const done = await this.act(commentId, 'severity-comment', key, this.severityCommentAction(commentId, key, raise));
    if (!done && this.control.find(commentId)?.status === 'failed') {
      this.pendingWrites.push({ id: commentId, kind: 'severity-comment', key, raise });
    }
    return Boolean(done);
  }

  /** Label and severity only; both are idempotent. Each comment is a separate journalled step. */
  async applyScope(group, target) {
    const { key } = target;
    if (!target.labels.includes(OWNED_LABEL)) {
      await this.jira.addLabel(key, OWNED_LABEL);
    }
    if (SEVERITY_RANK[group.severity] <= (SEVERITY_RANK[target.severity] ?? 0)) {
      return { key, raise: null };
    }
    await this.jira.edit(key, { [this.config.severityField]: { id: this.config.severityOptions[group.severity] } });
    // Only verify severity we changed: a ticket set higher by hand is never lowered.
    await this.verifyIssue(key, { severity: group.severity });
    const drivers = this.groupAlerts(group)
      .filter((alert) => alert.severity === group.severity)
      .map((alert) => `#${alert.number}`);
    return { key, raise: { from: target.severity ?? null, to: group.severity, alerts: drivers } };
  }

  /**
   * Writes the severity explanation first (a failure is queued, so it is never lost), then the scope comment.
   * Each is written once; false while either is still missing.
   */
  async scopeComments(group, target, id, scope, added) {
    const { runId, evidence } = this.inventory;
    const explained = !scope.raise || (await this.explainRaise(id, target.key, scope.raise));
    if (group.operation === 'extend' || group.updateNote) {
      const noteId = `${id}:scope-comment`;
      const marker = actionMarker(noteId, 'scope');
      const note = this.withRecovery(
        async () => {
          await this.commentOnce(target.key, marker, extendComment({ group, added, evidence, runId, marker }));
          return { key: target.key };
        },
        { key: target.key, markers: [marker] },
      );
      if (!(await this.act(noteId, 'scope-comment', target.key, note))) {
        return false;
      }
    }
    return explained;
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
    // Another open ticket may have taken one of the added alerts while the planner ran.
    const owner = added.length ? await this.liveOwner(group, added, group.ticket) : null;
    if (owner) {
      this.outcome.failures.push(`${group.operation} ${group.ticket}: ${owner.key} now owns some of these alerts.`);
      return;
    }
    const signature = this.signature(group, { ticket: group.ticket });
    const id = `${runId}:${group.remediationId}:${group.operation}:${signature}`;
    const raiseTo = SEVERITY_RANK[group.severity] > (SEVERITY_RANK[target.severity] ?? 0) ? group.severity : null;
    // A retry of this run reuses the recorded result, so the severity change is still explained even though Jira
    // now shows the raised value.
    const scope = await this.act(
      id,
      group.operation,
      group.ticket,
      this.withRecovery(() => this.applyScope(group, target), { key: group.ticket, raiseTo }),
      signature,
    );
    if (!scope) {
      return;
    }
    if (scope.raise) {
      this.recordRaise(group.ticket, scope.raise.from ?? 'unset', group.severity, alerts);
    }
    if (!(await this.scopeComments(group, target, id, scope, added))) {
      return;
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
    const result = await this.act(
      id,
      'severity',
      raise.ticket,
      this.withRecovery(
        async () => {
          // Same fresh checks as planned updates (closed or re-owned tickets are left alone), and the decision uses
          // the current Jira value: a severity raised by hand meanwhile is never lowered.
          const { severity } = await this.refreshTarget({
            ticket: raise.ticket,
            operation: 'raise',
            kind: 'actionable',
          });
          if (SEVERITY_RANK[raise.to] <= (SEVERITY_RANK[severity] ?? 0)) {
            return { key: raise.ticket, unchanged: true };
          }
          await this.jira.edit(raise.ticket, {
            [this.config.severityField]: { id: this.config.severityOptions[raise.to] },
          });
          await this.verifyIssue(raise.ticket, { severity: raise.to });
          return { key: raise.ticket, raise: { from: severity ?? null, to: raise.to, alerts: raise.alerts } };
        },
        {
          key: raise.ticket,
          raiseTo: raise.to,
          raise: { from: raise.from ?? null, to: raise.to, alerts: raise.alerts },
        },
      ),
    );
    raise.applied = Boolean(result) && !result.unchanged;
    if (result?.raise) {
      await this.explainRaise(id, raise.ticket, result.raise);
    }
  }

  async linked(from, to) {
    const issue = await this.jira.issue(from, ['issuelinks']);
    return (issue.fields?.issuelinks ?? []).some((link) => (link.outwardIssue ?? link.inwardIssue)?.key === to);
  }

  async hasComment(key, marker) {
    // The whole history: a step's comment may be older than the latest page.
    const comments = await this.jira.allComments(key);
    return comments.some((comment) => textOf(comment.body).includes(marker));
  }

  /**
   * Posts a step's comment unless one carrying its marker exists. Jira steps' journal records may be pruned when
   * the journal fills, so the comment itself is what keeps a retry from posting it twice.
   */
  async commentOnce(key, marker, body) {
    if (!(await this.hasComment(key, marker))) {
      await this.jira.addComment(key, body);
    }
  }

  /** Decides from Jira whether an interrupted or uncertain write happened; never repeats it to find out. */
  async reconcileEntry(entry) {
    const { recovery } = entry;
    if (entry.kind === 'create') {
      const found = await this.jira.search(`labels = "${recovery.label}" ORDER BY created ASC`, ['summary']);
      return found.length ? { status: 'done', key: found[0].key } : { status: 'not-applied' };
    }
    if (entry.kind === 'link') {
      return { status: (await this.linked(recovery.from, recovery.to)) ? 'done' : 'not-applied' };
    }
    if (entry.kind === 'hold') {
      const issue = await this.jira.issue(recovery.key, ['status']);
      return { status: issue.fields?.status?.name === this.config.holdStatus ? 'done' : 'not-applied' };
    }
    if (entry.kind === 'ownership') {
      const issue = await this.jira.issue(recovery.key, ['status'], [OWNERSHIP_PROPERTY]);
      const written = issue.properties?.[OWNERSHIP_PROPERTY]?.writeId === entry.id;
      return { status: written ? 'done' : 'not-applied' };
    }
    if (!recovery.markers) {
      return this.reconcileScope(entry);
    }
    // Comment steps: each comment carries the marker of its own step, so only that exact comment proves the write.
    const texts = (await this.jira.allComments(recovery.key)).map((comment) => textOf(comment.body));
    const commented = recovery.markers.every((marker) => texts.some((text) => text.includes(marker)));
    return { status: commented ? 'done' : 'not-applied' };
  }

  /**
   * Label and severity steps. A severity it was asked to raise is applied when Jira shows at least that value; its
   * explaining comment is then queued unless that step already ran, because later runs see no change to explain.
   */
  async reconcileScope(entry) {
    const { recovery } = entry;
    const issue = await this.jira.issue(recovery.key, ['labels', this.config.severityField]);
    if (!recovery.raiseTo) {
      return { status: (issue.fields?.labels ?? []).includes(OWNED_LABEL) ? 'done' : 'not-applied' };
    }
    const severity = this.config.severityOf(issue.fields?.[this.config.severityField]?.id);
    if ((SEVERITY_RANK[severity] ?? 0) < SEVERITY_RANK[recovery.raiseTo]) {
      return { status: 'not-applied' };
    }
    const commentId = `${entry.id}:severity-comment`;
    if (!this.control.has(commentId)) {
      const raise = recovery.raise ?? { from: null, to: recovery.raiseTo, alerts: [] };
      this.pendingWrites.push({ id: commentId, kind: 'severity-comment', key: recovery.key, raise });
    }
    return { status: 'done' };
  }

  async recoverEntry(entry) {
    if (!entry.recovery) {
      // Teams deliveries cannot be checked remotely: they stay unresolved and are never resent.
      await this.control.settle(entry.id, 'uncertain', {});
      const message = `${entry.kind} on ${entry.target} from run ${entry.runId} has an unknown outcome; not repeated.`;
      this.outcome.warnings.push({ code: 'uncertain', message });
      return;
    }
    const { status, key } = await this.reconcileEntry(entry);
    // Confirmed missing: retried under its original journal id before the plan, like any definite failure.
    if (entry.kind === 'link' && status === 'not-applied') {
      this.pendingWrites.push({ id: entry.id, from: entry.recovery.from, to: entry.recovery.to });
    }
    if (entry.kind === 'severity-comment' && status === 'not-applied') {
      const { key: target, raise } = entry.recovery;
      this.pendingWrites.push({ id: entry.id, kind: entry.kind, key: target, raise });
    }
    await this.control.settle(entry.id, status, { recovered: true, ...(key ? { key } : {}) });
    const message = `${entry.kind} on ${entry.target} from run ${entry.runId} was ${status === 'done' ? 'applied' : 'not applied'}; its alerts are re-planned.`;
    this.outcome.warnings.push({ code: 'recovered', message });
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
  if (previous?.status === 'done') {
    outcome.warnings.push({ code: 'teams', message: 'Teams summary for this run was already delivered; not resent.' });
    return true;
  }
  if (previous && !RETRYABLE.has(previous.status)) {
    // Unknown outcome: never resent automatically, and the run cannot count as complete.
    outcome.failures.push(`Teams delivery for run ${inventory.runId} is unresolved (${previous.status}); not resent.`);
    return false;
  }
  const url = process.env.DEPENDABOT_TEAMS_WEBHOOK_URL;
  if (!url?.startsWith('https://')) {
    outcome.failures.push('Teams webhook secret is missing or not HTTPS.');
    return false;
  }
  // A retry resends the card built by the run that made the changes; it is never rebuilt from the retry's (by then
  // empty) plan.
  const body = previous ? await control.storedCard(inventory.runId) : teamsCard(outcome, config);
  if (previous) {
    if (!body) {
      outcome.failures.push(`Teams card of run ${inventory.runId} is no longer stored; not rebuilt or resent.`);
      return false;
    }
    previous.status = 'reserved';
    await control.persistJournal();
  } else {
    await control.storeCard(inventory.runId, body);
    await control.reserve({ id, kind: 'teams', target: 'webhook', runId: inventory.runId });
  }
  try {
    await request({
      service: 'Teams',
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      label: 'webhook',
    });
  } catch (error) {
    const uncertain = error.uncertain || !error.status;
    await control.settle(id, uncertain ? 'uncertain' : 'failed', { message: error.message });
    const label = uncertain ? 'uncertain (not resent)' : 'failed';
    outcome.failures.push(`Teams delivery ${label}: ${error.message}`);
    return false;
  }
  try {
    await control.settle(id, 'done', { acceptedAt: new Date().toISOString() });
    await control.discardCard(inventory.runId);
  } catch (error) {
    // Delivered, but not recorded: the still-reserved entry is settled as uncertain next run, never resent.
    outcome.failures.push(`Teams summary was delivered but its journal entry was not saved: ${error.message}`);
  }
  return true;
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
    const id = alertId(item.repository, item.alert);
    return { id, tickets: [item.ticket], isNew: !reported.has(id) };
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
    // The collector already skips closures reported by earlier runs.
    cleared: outcome.cleared.map((item) => {
      return { ...item, isNew: true };
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
      reportedCleared: undefined,
    });
    if (outcome.cleared.length) {
      await control.saveCleared(outcome.cleared.map((item) => item.id));
    }
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

/** Teams delivery and its bookkeeping; any error makes the run incomplete instead of escaping. */
async function notify({ jira, control, config, inventory, outcome }) {
  let delivered = false;
  try {
    delivered = await postTeams(control, outcome, config, inventory);
  } catch (error) {
    outcome.failures.push(`Teams notification bookkeeping: ${error.message}`);
  }
  outcome.complete = outcome.failures.length === 0;
  if (!delivered) {
    await noteDeliveryFailure(jira, config, outcome);
  }
}

/** Retries writes that failed earlier, executes the plan, and keeps every write still to be made in the state. */
export async function runPending(executor, control, outcome, plan) {
  // Writes queued by earlier runs and writes that recovery just confirmed missing are retried first.
  const queued = uniqueById([...(control.state?.pendingWrites ?? []), ...executor.pendingWrites]);
  executor.pendingWrites = [];
  let remaining = queued;
  try {
    remaining = await executor.replayPending(queued);
    for (const item of remaining) {
      executor.blockedTickets.add(item.from ?? item.key);
    }
    if (plan && !outcome.failures.length) {
      await executor.execute(plan);
    }
  } finally {
    // Saved even when a later group throws, so writes queued earlier in this run are not lost.
    const pendingWrites = uniqueById([...remaining, ...executor.pendingWrites]);
    if (pendingWrites.length || control.state?.pendingWrites?.length) {
      await control.saveState({ pendingWrites });
    }
    if (pendingWrites.length) {
      outcome.failures.push(
        `${pendingWrites.length} issue link(s) or comment(s) are not written yet; retried next run.`,
      );
    }
  }
}

function uniqueById(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

async function executeLocked({ jira, control, config, inventory, outcome, plan }) {
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
    if (outcome.mode === 'automatic') {
      await runPending(executor, control, outcome, plan);
    }
  } catch (error) {
    outcome.failures.push(`Executor: ${error.message}`);
  }
  outcome.complete = outcome.failures.length === 0;
  await publishReport(jira, config, outcome);
  // A failed report makes the run incomplete before the Teams card is built, so it cannot claim a clean scan.
  outcome.complete = outcome.failures.length === 0;
}

/** Everything that needs the lock; state is saved and the lock released whatever happens before. */
async function runWithLock(context) {
  const { control, inventory, outcome } = context;
  try {
    await executeLocked(context);
    if (outcome.mode === 'automatic') {
      await notify(context);
    }
  } catch (error) {
    outcome.failures.push(`Run: ${error.message}`);
  }
  outcome.complete = outcome.failures.length === 0;
  try {
    await saveState(control, outcome, inventory);
  } catch (error) {
    outcome.failures.push(`State: ${error.message}`);
    outcome.complete = false;
  }
  try {
    await control.releaseLock(inventory.runId);
  } catch (error) {
    outcome.failures.push(`Lock release: ${error.message}`);
    outcome.complete = false;
  }
}

/** Loads, validates and describes the plan; nothing may escape before the locked section reports and unlocks. */
function preparePlan(work, inventory, config, outcome) {
  try {
    const plan = loadPlan(work, inventory, config, outcome);
    describe(outcome, inventory, plan);
    return plan;
  } catch (error) {
    outcome.failures.push(`Plan handling: ${error.message}`);
    return null;
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
  const plan = preparePlan(work, inventory, config, outcome);
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

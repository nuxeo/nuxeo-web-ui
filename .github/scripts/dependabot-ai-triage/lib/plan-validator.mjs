// Deterministic gate between the AI-generated plan and any Jira/Teams mutation.
// The plan is data only: nothing in it is executed, fetched or used as an operation beyond the
// allow-lists below. The executor builds every Jira payload itself.
import { SEVERITY_RANK, alertId, highestSeverity, quarterExpired } from './util.mjs';

export const PLAN_SCHEMA_VERSION = 1;
const OPERATIONS = new Set(['create', 'extend', 'adopt', 'keep']);
const KINDS = new Set(['actionable', 'blocked']);
// A required major upgrade or compatibility work is engineering effort, never an external blocker.
const BLOCKER_TYPES = new Set(['no-upstream-patch', 'upstream-release-pending']);
const MAX_TEXT = 4000;
const MAX_TEAMS_LINE = 300;
const REMEDIATION_ID = /^[a-z0-9-]+\/[a-z0-9-]+:[a-z0-9][a-z0-9.-]{1,80}$/;
const JIRA_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

const PLAN_KEYS = new Set([
  'schemaVersion',
  'runId',
  'inventoryDigest',
  'groups',
  'needsReview',
  'closedTicketMismatches',
]);
const GROUP_KEYS = new Set([
  'remediationId',
  'repository',
  'operation',
  'ticket',
  'severity',
  'kind',
  'alerts',
  'summary',
  'remediation',
  'rationale',
  'acceptanceCriteria',
  'teamsLine',
  'updateNote',
  'blocker',
  'relatedTickets',
]);
const BLOCKER_KEYS = new Set(['type', 'reason', 'upstreamRef', 'mitigation', 'recheck']);
const REVIEW_KEYS = new Set(['repository', 'alert', 'candidateTicket', 'missingEvidence']);
const MISMATCH_KEYS = new Set(['repository', 'alert', 'ticket']);
const REQUIRED_TEXT = {
  create: ['summary', 'remediation', 'rationale', 'teamsLine'],
  extend: ['rationale', 'updateNote', 'teamsLine'],
  adopt: ['rationale'],
  keep: ['rationale'],
};

function isText(value, limit = MAX_TEXT) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > limit) {
    return false;
  }
  // Reject NUL and other low control characters that have no place in ticket text.
  return ![...value].some((character) => character.codePointAt(0) < 9);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function unknownKeys(object, allowed) {
  return Object.keys(object ?? {}).filter((key) => !allowed.has(key));
}

function isUpstreamRef(value) {
  return JIRA_KEY.test(value) || /^https:\/\/(github\.com|www\.npmjs\.com)\/[\w./#@%-]+$/.test(value);
}

function numbers(alerts) {
  return alerts.map((alert) => alert.number).join(', ');
}

function assign(ctx, repository, number, where) {
  const id = alertId(repository, number);
  if (!ctx.aiInput.has(id)) {
    ctx.fail('unknown-alert', `${where} references ${id}, which was not given to the planner.`);
  } else if (ctx.assigned.has(id)) {
    ctx.fail('multiply-assigned', `${id} is assigned by both ${ctx.assigned.get(id)} and ${where}.`);
  } else {
    ctx.assigned.set(id, where);
  }
}

function checkIdentity(ctx) {
  const { plan, fail } = ctx;
  for (const key of unknownKeys(plan, PLAN_KEYS)) {
    fail('plan-schema', `Unknown plan field "${key}".`);
  }
  if (plan.schemaVersion !== PLAN_SCHEMA_VERSION) {
    fail('plan-schema', 'Plan schema version is missing or unsupported.');
  }
  if (plan.runId !== ctx.runId || plan.inventoryDigest !== ctx.inventoryDigest) {
    fail('plan-stale', 'Plan belongs to a different run or inventory snapshot.');
  }
  const missing = ['groups', 'needsReview', 'closedTicketMismatches'].filter((field) => !Array.isArray(plan[field]));
  for (const field of missing) {
    fail('plan-schema', `Plan field "${field}" must be an array.`);
  }
  return missing.length === 0;
}

function checkShape(ctx, group, where) {
  const { fail } = ctx;
  for (const key of unknownKeys(group, GROUP_KEYS)) {
    fail('group-schema', `${where} has unknown field "${key}".`);
  }
  const { repository, operation, severity, kind, alerts, remediationId } = group;
  if (!ctx.projectOf.has(repository)) {
    fail('group-schema', `${where} targets unconfigured repository "${repository}".`);
    return false;
  }
  if (!OPERATIONS.has(operation) || !KINDS.has(kind) || !(severity in SEVERITY_RANK)) {
    fail('group-schema', `${where} has an invalid operation, kind or severity.`);
    return false;
  }
  if (!REMEDIATION_ID.test(remediationId ?? '') || !remediationId.startsWith(`${repository}:`)) {
    fail('group-schema', `${where} needs a stable remediationId of the form "${repository}:<slug>".`);
  } else if (ctx.remediationIds.has(remediationId)) {
    fail('duplicate-remediation', `${where} reuses remediationId ${remediationId}.`);
  }
  ctx.remediationIds.add(remediationId);
  for (const field of REQUIRED_TEXT[operation].filter((name) => !isText(group[name]))) {
    fail('group-schema', `${where} needs a non-empty "${field}".`);
  }
  if (group.teamsLine !== undefined && !isText(group.teamsLine, MAX_TEAMS_LINE)) {
    fail('group-schema', `${where} teamsLine must be at most ${MAX_TEAMS_LINE} characters.`);
  }
  const criteria = group.acceptanceCriteria;
  const validCriteria = Array.isArray(criteria) && criteria.length > 0 && criteria.every((item) => isText(item));
  if ((operation === 'create' || criteria !== undefined) && !validCriteria) {
    fail('group-schema', `${where} needs acceptance criteria as a non-empty list of text.`);
  }
  const related = group.relatedTickets ?? [];
  if (!Array.isArray(related) || related.length > 5 || !related.every((key) => JIRA_KEY.test(key))) {
    fail('group-schema', `${where} relatedTickets must be at most 5 Jira keys.`);
  }
  if (!Array.isArray(alerts) || !alerts.length || !alerts.every(Number.isInteger)) {
    fail('group-schema', `${where} must list at least one alert number.`);
    return false;
  }
  return true;
}

/** Resolves group alerts, enforcing repository separation and single assignment of planner input. */
function groupAlerts(ctx, group, where) {
  const owned = [];
  for (const number of group.alerts) {
    const id = alertId(group.repository, number);
    const alert = ctx.alerts.get(id);
    if (!alert) {
      const foreign = [...ctx.projectOf.keys()].find(
        (repo) => repo !== group.repository && ctx.alerts.has(alertId(repo, number)),
      );
      ctx.fail(
        foreign ? 'cross-repository' : 'unknown-alert',
        foreign
          ? `${where} (${group.repository}) claims alert ${number}, which belongs to ${foreign}.`
          : `${where} references ${id}, which is not an open alert.`,
      );
      continue;
    }
    const owner = ctx.currentOwner.get(id);
    if (owner && owner !== group.ticket) {
      ctx.fail('ownership-conflict', `${where} claims ${id}, which is owned by ${owner}.`);
      continue;
    }
    if (ctx.aiInput.has(id)) {
      assign(ctx, group.repository, number, where);
    } else if (!owner) {
      ctx.fail('not-plannable', `${where} claims ${id}, which deterministic reconciliation already reports.`);
      continue;
    }
    owned.push(alert);
  }
  return owned;
}

function checkCreateTarget(ctx, group, owned, where) {
  if (group.ticket !== undefined) {
    ctx.fail('group-schema', `${where} creates a ticket but also names ${group.ticket}.`);
  }
  if (ctx.expired) {
    ctx.fail('epic-expired', `${where} would create a ticket under expired epic quarter ${ctx.epicQuarter}.`);
  }
  for (const alert of owned.filter((item) => ctx.currentOwner.has(alertId(group.repository, item.number)))) {
    ctx.fail('duplicate-ticket', `${where} creates a ticket for alert ${alert.number}, which is already owned.`);
  }
}

/** Returns the fresh Jira ticket targeted by an extend/adopt/keep group, or null when it is not targetable. */
function targetTicket(ctx, group, where) {
  const { ticket, repository } = group;
  const project = ctx.projectOf.get(repository);
  const current = ctx.tickets.get(ticket);
  if (!JIRA_KEY.test(ticket ?? '') || !ticket.startsWith(`${project}-`)) {
    ctx.fail('group-schema', `${where} must reference a ${project} ticket.`);
    return null;
  }
  if (!current) {
    ctx.fail('unknown-ticket', `${where} references ${ticket}, which was not in the fresh Jira read.`);
    return null;
  }
  if (current.statusCategory === 'done') {
    ctx.fail('closed-ticket', `${where} targets closed ${ticket}; report a closed-ticket mismatch instead.`);
    return null;
  }
  if (ctx.ticketsInPlan.has(ticket)) {
    ctx.fail('duplicate-ticket', `${where} targets ${ticket}, already targeted by another group.`);
  }
  ctx.ticketsInPlan.add(ticket);
  return current;
}

function checkScopeChange(ctx, group, owned, where) {
  const { operation, ticket, repository } = group;
  const listed = new Set(owned.map((alert) => alertId(repository, alert.number)));
  const retained = [...ctx.currentOwner].filter(([id, key]) => key === ticket && ctx.alerts.has(id));
  for (const [id] of retained.filter(([candidate]) => !listed.has(candidate))) {
    ctx.fail('ownership-dropped', `${where} omits ${id}, which ${ticket} already owns.`);
  }
  const added = owned.filter((alert) => !ctx.currentOwner.has(alertId(repository, alert.number)));
  if ((operation === 'extend' || operation === 'adopt') && added.length === 0) {
    ctx.fail('group-schema', `${where} ${operation}s ${ticket} without adding any unowned alert.`);
  }
  if (operation === 'keep' && added.length > 0) {
    ctx.fail('group-schema', `${where} adds alerts to ${ticket}; use extend or adopt.`);
  }
}

function checkTicketState(ctx, group, current, where) {
  const { operation, ticket } = group;
  // Scope must not change under someone who already started the work.
  if (operation === 'extend' && current.statusCategory !== 'new') {
    ctx.fail('ticket-in-progress', `${where} extends ${ticket}, which is "${current.status}"; create a linked ticket.`);
  }
  if (!current.onHold || group.kind !== 'actionable') {
    return;
  }
  if (operation === 'extend') {
    ctx.fail('held-ticket', `${where} adds independently actionable work to On Hold ${ticket}.`);
  } else {
    ctx.warn('hold-review', `${where}: ${ticket} is On Hold but the planner considers it actionable.`);
  }
}

function checkTicket(ctx, group, owned, where) {
  if (group.operation === 'create') {
    checkCreateTarget(ctx, group, owned, where);
    return;
  }
  const current = targetTicket(ctx, group, where);
  if (current) {
    checkScopeChange(ctx, group, owned, where);
    checkTicketState(ctx, group, current, where);
  }
}

// Blocked work stays separate from independently actionable work.
function checkBlocker(ctx, group, owned, where) {
  const { blocker } = group;
  if (group.kind === 'actionable') {
    if (blocker !== undefined) {
      ctx.fail('group-schema', `${where} is actionable but carries blocker details.`);
    }
    const unpatched = owned.filter((alert) => !alert.firstPatched);
    if (unpatched.length) {
      ctx.warn('actionable-without-patch', `${where} is actionable although ${numbers(unpatched)} have no patch.`);
    }
    return;
  }
  if (!isObject(blocker)) {
    ctx.fail('blocker-missing', `${where} is blocked but has no blocker details.`);
    return;
  }
  for (const key of unknownKeys(blocker, BLOCKER_KEYS)) {
    ctx.fail('group-schema', `${where} blocker has unknown field "${key}".`);
  }
  if (!BLOCKER_TYPES.has(blocker.type)) {
    ctx.fail('invalid-blocker', `${where} blocker type "${blocker.type}" is not an external blocker.`);
  }
  const complete = ['reason', 'mitigation', 'recheck'].every((field) => isText(blocker[field]));
  if (!complete || !isUpstreamRef(blocker.upstreamRef ?? '')) {
    ctx.fail('blocker-missing', `${where} needs reason, upstreamRef, mitigation and recheck criteria.`);
  }
  if (blocker.type !== 'no-upstream-patch') {
    return;
  }
  const patched = owned.filter((alert) => alert.firstPatched || alert.anyPatchPublished);
  if (patched.length) {
    ctx.fail('invalid-blocker', `${where} claims no upstream patch, but ${numbers(patched)} have patched versions.`);
  }
  if (new Set(owned.map((alert) => alert.package)).size > 1) {
    ctx.fail('blocked-grouping', `${where} groups unpatched findings from different packages.`);
  }
}

// Only text that becomes ticket scope (summary, fix, acceptance) is checked; a rationale may legitimately say
// which other ticket owns an alert, and adopt/keep text is never written to the ticket.
function checkText(ctx, group, owned, where) {
  if (group.operation !== 'create' && group.operation !== 'extend') {
    return;
  }
  const text = ['summary', 'remediation', 'updateNote', 'teamsLine']
    .map((field) => group[field] ?? '')
    .concat(group.acceptanceCriteria ?? [])
    .join('\n');
  const listed = new Set(owned.map((alert) => alert.number));
  for (const match of text.matchAll(/\balerts?\s+#?(\d{1,6})\b/gi)) {
    const number = Number(match[1]);
    if (!listed.has(number) && ctx.alerts.has(alertId(group.repository, number))) {
      ctx.warn('text-mentions-unowned-alert', `${where} text mentions alert ${number}, which it does not own.`);
    }
  }
}

function checkGroup(ctx, group, index) {
  const where =
    typeof group?.remediationId === 'string' ? `groups[${index}] (${group.remediationId})` : `groups[${index}]`;
  if (!isObject(group)) {
    ctx.fail('group-schema', `${where} is not an object.`);
    return;
  }
  if (!checkShape(ctx, group, where)) {
    return;
  }
  const owned = groupAlerts(ctx, group, where);
  if (!owned.length) {
    return;
  }
  // PD6.1: ticket severity equals the highest current GitHub severity it owns.
  const expected = highestSeverity(owned.map((alert) => alert.severity));
  if (group.severity !== expected) {
    ctx.fail('severity-mismatch', `${where} is ${group.severity} but owns ${expected} findings.`);
  }
  checkTicket(ctx, group, owned, where);
  checkBlocker(ctx, group, owned, where);
  checkText(ctx, group, owned, where);
}

function checkReports(ctx) {
  for (const [index, item] of ctx.plan.needsReview.entries()) {
    const where = `needsReview[${index}]`;
    const fine =
      isObject(item) &&
      !unknownKeys(item, REVIEW_KEYS).length &&
      isText(item.missingEvidence) &&
      isText(item.candidateTicket);
    if (!fine) {
      ctx.fail('review-schema', `${where} must name the alert, candidate ticket and the specific missing evidence.`);
    }
    assign(ctx, item?.repository, item?.alert, where);
  }
  for (const [index, item] of ctx.plan.closedTicketMismatches.entries()) {
    const where = `closedTicketMismatches[${index}]`;
    const ticket = isObject(item) ? ctx.tickets.get(item.ticket) : null;
    if (!isObject(item) || unknownKeys(item, MISMATCH_KEYS).length || ticket?.statusCategory !== 'done') {
      ctx.fail('mismatch-schema', `${where} must reference a closed ticket from the fresh Jira read.`);
    }
    assign(ctx, item?.repository, item?.alert, where);
  }
}

/**
 * @param {object} args
 * @param {object} args.plan          AI-produced plan (untrusted).
 * @param {string} args.runId
 * @param {string} args.inventoryDigest
 * @param {Array<{name: string, project: string}>} args.repositories
 * @param {string} args.epicQuarter
 * @param {Array<object>} args.alerts         All open alerts (normalized).
 * @param {Iterable<string>} args.aiInput     Alert ids given to the planner (unowned or changed).
 * @param {Map<string,string>} args.currentOwner  Open alert id -> open owning ticket key.
 * @param {Array<object>} args.tickets        { key, statusCategory: new|indeterminate|done, status, onHold }.
 * @param {Date} args.now
 */
export function validatePlan(args) {
  const errors = [];
  const warnings = [];
  const ctx = {
    plan: args.plan,
    runId: args.runId,
    inventoryDigest: args.inventoryDigest,
    epicQuarter: args.epicQuarter,
    expired: quarterExpired(args.epicQuarter, args.now ?? new Date()),
    projectOf: new Map(args.repositories.map(({ name, project }) => [name, project])),
    alerts: new Map(args.alerts.map((alert) => [alertId(alert.repository, alert.number), alert])),
    aiInput: new Set(args.aiInput),
    currentOwner: args.currentOwner,
    tickets: new Map(args.tickets.map((ticket) => [ticket.key, ticket])),
    assigned: new Map(),
    remediationIds: new Set(),
    ticketsInPlan: new Set(),
    fail: (code, message) => errors.push({ code, message }),
    warn: (code, message) => warnings.push({ code, message }),
  };
  if (!isObject(ctx.plan)) {
    ctx.fail('plan-schema', 'Plan is not a JSON object.');
    return { ok: false, errors, warnings };
  }
  if (!checkIdentity(ctx)) {
    return { ok: false, errors, warnings };
  }
  ctx.plan.groups.forEach((group, index) => checkGroup(ctx, group, index));
  checkReports(ctx);
  for (const id of ctx.aiInput) {
    if (!ctx.assigned.has(id)) {
      ctx.fail('unassigned-alert', `${id} is not owned, flagged for review or reported as a closed-ticket mismatch.`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

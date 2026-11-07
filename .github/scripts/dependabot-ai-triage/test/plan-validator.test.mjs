import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../lib/plan-validator.mjs';
import { fingerprint } from '../lib/reconcile.mjs';
import { DIGEST, EL, RUN, WEB, blocked, bootstrapPlan, group, liveAlerts, registerTickets } from './fixtures.mjs';

const repositories = [
  { name: WEB, project: 'APP' },
  { name: EL, project: 'LIB' },
];
const NOW = new Date('2026-11-09T07:45:00Z');
const id = (repository, number) => `${repository}#${number}`;

function bootstrapArgs(plan, overrides = {}) {
  const alerts = liveAlerts();
  return {
    plan,
    runId: RUN,
    inventoryDigest: DIGEST,
    repositories,
    epicQuarter: '2026-Q4',
    alerts,
    aiInput: alerts.map((alert) => id(alert.repository, alert.number)),
    currentOwner: new Map(),
    tickets: registerTickets(),
    now: NOW,
    ...overrides,
  };
}

/** Steady state: the register is recorded as ownership; only Elements 108 reaches the planner. */
function steadyArgs(plan, overrides = {}) {
  const tickets = registerTickets({ withOwnership: true, fingerprintOf: fingerprint });
  const currentOwner = new Map();
  for (const ticket of tickets) {
    for (const number of Object.keys(ticket.ownership.alerts)) {
      currentOwner.set(id(ticket.ownership.repository, Number(number)), ticket.key);
    }
  }
  return bootstrapArgs(plan, { aiInput: [id(EL, 108)], currentOwner, tickets, ...overrides });
}

const steadyPlan = (groups, extra = {}) => {
  return { ...bootstrapPlan(), groups, ...extra };
};
const codes = (result) => result.errors.map((error) => error.code);
const find = (plan, ticketOrId) =>
  plan.groups.find((item) => item.ticket === ticketOrId || item.remediationId === ticketOrId);

test('bootstrap: adopting the existing register and creating one library ticket passes', () => {
  const result = validatePlan(bootstrapArgs(bootstrapPlan()));
  assert.deepEqual(result.errors, []);
});

test('a library alert cannot be folded into an app ticket for the same package', () => {
  const plan = bootstrapPlan();
  plan.groups.pop();
  find(plan, 'APP-31').alerts.push(108);
  assert.ok(codes(validatePlan(bootstrapArgs(plan))).includes('cross-repository'));
});

test('unpatched findings in different repositories cannot share a ticket', () => {
  const plan = bootstrapPlan();
  plan.groups = plan.groups.filter((item) => item.ticket !== 'LIB-45');
  find(plan, 'APP-29').alerts.push(106);
  assert.ok(codes(validatePlan(bootstrapArgs(plan))).includes('cross-repository'));
});

test('a fixable finding cannot be put On Hold as "no patch" or because of a major upgrade', () => {
  for (const type of ['no-upstream-patch', 'major-upgrade']) {
    const plan = bootstrapPlan();
    Object.assign(find(plan, 'APP-31'), blocked(type, 'https://github.com/isaacs/pkg-match'));
    assert.ok(codes(validatePlan(bootstrapArgs(plan))).includes('invalid-blocker'), type);
  }
});

test('"no upstream patch" is rejected when another major of the package has a fix', () => {
  const alerts = liveAlerts();
  Object.assign(
    alerts.find((alert) => alert.number === 9),
    { anyPatchPublished: true },
  );
  const plan = bootstrapPlan();
  assert.ok(codes(validatePlan(bootstrapArgs(plan, { alerts }))).includes('invalid-blocker'));
});

test('blocked groups need complete blocker details; actionable groups must not carry them', () => {
  const plan = bootstrapPlan();
  delete find(plan, 'APP-30').blocker.recheck;
  assert.ok(codes(validatePlan(bootstrapArgs(plan))).includes('blocker-missing'));
  const actionable = bootstrapPlan();
  find(actionable, 'APP-84').blocker = blocked('upstream-release-pending', 'LIB-24').blocker;
  assert.ok(codes(validatePlan(bootstrapArgs(actionable))).includes('group-schema'));
});

test('unpatched findings of different packages cannot share a blocked group', () => {
  const alerts = liveAlerts();
  alerts.push({ ...alerts.find((alert) => alert.number === 9), number: 700, package: 'other-unpatched' });
  const plan = bootstrapPlan();
  find(plan, 'APP-29').alerts.push(700);
  const args = bootstrapArgs(plan, { alerts, aiInput: [...bootstrapArgs(plan).aiInput, id(WEB, 700)] });
  assert.ok(codes(validatePlan(args)).includes('blocked-grouping'));
});

test('severity must equal the highest owned GitHub severity (no downgrades)', () => {
  const plan = bootstrapPlan();
  find(plan, 'LIB-44').severity = 'medium';
  assert.ok(codes(validatePlan(bootstrapArgs(plan))).includes('severity-mismatch'));

  const alerts = liveAlerts();
  alerts.push({ ...alerts[0], number: 701, severity: 'critical', package: 'x' });
  const critical = bootstrapPlan();
  find(critical, 'APP-84').alerts.push(701);
  const args = bootstrapArgs(critical, { alerts, aiInput: [...bootstrapArgs(critical).aiInput, id(WEB, 701)] });
  assert.ok(codes(validatePlan(args)).includes('severity-mismatch'));
});

test('every planner alert is accounted for exactly once', () => {
  const missing = bootstrapPlan();
  missing.groups.pop();
  assert.ok(codes(validatePlan(bootstrapArgs(missing))).includes('unassigned-alert'));

  const twice = bootstrapPlan();
  twice.needsReview.push({ repository: EL, alert: 108, candidateTicket: 'none', missingEvidence: 'x' });
  assert.ok(codes(validatePlan(bootstrapArgs(twice))).includes('multiply-assigned'));
});

test('steady state: only the unowned alert is planned, and the plan cannot touch alerts owned by other tickets', () => {
  const create = group(`${EL}:pkg-match-globparts`, EL, 'create', undefined, 'medium', [108]);
  assert.deepEqual(validatePlan(steadyArgs(steadyPlan([create]))).errors, []);

  const stolen = group(`${EL}:pkg-match-globparts`, EL, 'create', undefined, 'medium', [108, 104]);
  assert.ok(codes(validatePlan(steadyArgs(steadyPlan([stolen])))).includes('ownership-conflict'));
});

test('extending an open, not-started ticket must keep its existing alerts', () => {
  const extend = group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'high', [104, 105, 107, 108], {
    updateNote: 'Adds pkg-match to the lockfile refresh.',
  });
  assert.deepEqual(validatePlan(steadyArgs(steadyPlan([extend]))).errors, []);

  const dropped = { ...extend, alerts: [107, 108] };
  assert.ok(codes(validatePlan(steadyArgs(steadyPlan([dropped])))).includes('ownership-dropped'));
});

test('a ticket already in progress is never extended', () => {
  const args = steadyArgs(null);
  args.tickets = args.tickets.map((ticket) =>
    ticket.key === 'LIB-44' ? { ...ticket, status: 'In Progress', statusCategory: 'indeterminate' } : ticket,
  );
  args.plan = steadyPlan([
    group(`${EL}:refresh`, EL, 'extend', 'LIB-44', 'high', [104, 105, 107, 108], { updateNote: 'x' }),
  ]);
  assert.ok(codes(validatePlan(args)).includes('ticket-in-progress'));
});

test('actionable work cannot be added to an On Hold ticket', () => {
  const extend = group(`${EL}:pkg-merge`, EL, 'extend', 'LIB-45', 'medium', [106, 108], { updateNote: 'x' });
  assert.ok(codes(validatePlan(steadyArgs(steadyPlan([extend])))).includes('held-ticket'));
});

test('a new ticket for an already-owned alert is rejected', () => {
  const plan = steadyPlan([
    group(`${EL}:pkg-match-globparts`, EL, 'create', undefined, 'medium', [108]),
    group(`${EL}:qs-again`, EL, 'create', undefined, 'medium', [105]),
  ]);
  const result = validatePlan(steadyArgs(plan));
  assert.ok(codes(result).includes('ownership-conflict'));
});

test('stale or malformed plans are rejected without throwing', () => {
  assert.ok(codes(validatePlan(bootstrapArgs(bootstrapPlan(), { runId: 'other' }))).includes('plan-stale'));
  assert.ok(codes(validatePlan(bootstrapArgs(bootstrapPlan(), { inventoryDigest: 'other' }))).includes('plan-stale'));
  for (const plan of [
    'not json',
    null,
    [],
    { ...bootstrapPlan(), groups: 'x' },
    { ...bootstrapPlan(), shell: 'rm -rf /' },
  ]) {
    assert.equal(validatePlan(bootstrapArgs(plan)).ok, false);
  }
  const extra = bootstrapPlan();
  find(extra, `${EL}:pkg-match-globparts`).url = 'https://example.invalid';
  assert.ok(codes(validatePlan(bootstrapArgs(extra))).includes('group-schema'));
});

test('an expired or missing epic quarter blocks creation but not adoption', () => {
  const now = new Date('2027-01-04T07:45:00Z');
  assert.deepEqual(codes(validatePlan(bootstrapArgs(bootstrapPlan(), { now }))), ['epic-expired']);
  assert.deepEqual(codes(validatePlan(bootstrapArgs(bootstrapPlan(), { epicQuarter: '' }))), ['epic-expired']);
  const review = bootstrapPlan();
  review.groups.pop();
  review.needsReview.push({
    repository: EL,
    alert: 108,
    candidateTicket: 'none',
    missingEvidence: 'Epic quarter expired; next epic not configured.',
  });
  assert.equal(validatePlan(bootstrapArgs(review, { now })).ok, true);
});

test('closed tickets are reported as mismatches, never targeted', () => {
  const tickets = registerTickets().map((ticket) =>
    ticket.key === 'APP-84' ? { ...ticket, status: 'Resolved', statusCategory: 'done' } : ticket,
  );
  assert.ok(codes(validatePlan(bootstrapArgs(bootstrapPlan(), { tickets }))).includes('closed-ticket'));
  const reported = bootstrapPlan();
  reported.groups = reported.groups.filter((item) => item.ticket !== 'APP-84');
  reported.closedTicketMismatches.push({ repository: WEB, alert: 2, ticket: 'APP-84' });
  assert.equal(validatePlan(bootstrapArgs(reported, { tickets })).ok, true);
});

test('ticket scope text that mentions an alert the group does not own is flagged; rationale context is not', () => {
  const flagged = (plan) =>
    validatePlan(bootstrapArgs(plan)).warnings.some((warning) => warning.code === 'text-mentions-unowned-alert');
  const scope = bootstrapPlan();
  find(scope, `${EL}:pkg-match-globparts`).remediation = 'Also clears alert 106 in the same lockfile.';
  assert.equal(flagged(scope), true);
  const context = bootstrapPlan();
  find(context, 'APP-30').rationale = 'Ftest alert 2 belongs to APP-84 and does not wait for this hold.';
  find(context, `${EL}:pkg-match-globparts`).rationale = 'Alert 106 is pkg-merge and stays in LIB-45.';
  assert.equal(flagged(context), false);
});

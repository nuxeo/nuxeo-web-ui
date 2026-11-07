import { SEVERITY_RANK, alertId, digest } from './util.mjs';

export const OWNERSHIP_PROPERTY = 'dependabot-ai-triage-ownership';
// Searchable marker on every ticket that carries an ownership property (properties are not JQL-searchable).
export const OWNED_LABEL = 'dependabot-ai-triage';

/** Every vulnerable range of the advisory for this package, as one `||` range expression. */
export function combinedRange(alert) {
  const ranges = (alert.advisoryRanges ?? []).map((item) => item.range).filter(Boolean);
  return ranges.length ? ranges.join(' || ') : alert.vulnerableRange;
}

/** Fields whose change makes an owned alert worth re-assessing by the planner. */
export function fingerprint(alert) {
  return digest({
    severity: alert.severity,
    ghsa: alert.ghsa,
    manifest: alert.manifest,
    vulnerableRange: alert.vulnerableRange,
    firstPatched: alert.firstPatched,
    advisoryRanges: alert.advisoryRanges,
  }).slice(0, 16);
}

export function normalizeAlert(repository, raw) {
  const advisory = raw.security_advisory ?? {};
  const vulnerability = raw.security_vulnerability ?? {};
  const dependency = raw.dependency ?? {};
  const cve = (advisory.identifiers ?? []).find((item) => item.type === 'CVE')?.value;
  // An advisory can list one vulnerable range per major; the alert's own range covers only the detected version.
  const ranges = (advisory.vulnerabilities ?? [])
    .filter((item) => item.package?.name === dependency.package?.name)
    .map((item) => {
      return { range: item.vulnerable_version_range, firstPatched: item.first_patched_version?.identifier ?? null };
    });
  const vulnerableRange = vulnerability.vulnerable_version_range ?? null;
  const firstPatched = vulnerability.first_patched_version?.identifier ?? null;
  return {
    repository,
    number: raw.number,
    url: raw.html_url,
    state: raw.state,
    severity: String(vulnerability.severity ?? advisory.severity ?? '').toLowerCase(),
    package: dependency.package?.name,
    ecosystem: dependency.package?.ecosystem,
    manifest: dependency.manifest_path,
    scope: dependency.scope ?? null,
    relationship: dependency.relationship ?? null,
    ghsa: advisory.ghsa_id,
    cve: cve ?? advisory.cve_id ?? null,
    summary: advisory.summary,
    vulnerableRange,
    firstPatched,
    advisoryRanges: ranges.length ? ranges : [{ range: vulnerableRange, firstPatched }],
    anyPatchPublished: Boolean(firstPatched) || ranges.some((item) => item.firstPatched),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/** alert id -> [{ ticket, record }] from the structured ownership properties only. */
function ownersByAlert(tickets) {
  const owners = new Map();
  for (const ticket of tickets.filter((item) => item.ownership?.alerts)) {
    for (const [number, record] of Object.entries(ticket.ownership.alerts)) {
      const id = alertId(ticket.ownership.repository, Number(number));
      owners.set(id, [...(owners.get(id) ?? []), { ticket, record }]);
    }
  }
  return owners;
}

function classify(alert, candidates) {
  const id = alertId(alert.repository, alert.number);
  const active = candidates.filter((owner) => owner.ticket.statusCategory !== 'done');
  if (active.length > 1) {
    return { bucket: 'ambiguous', item: { id, tickets: active.map((owner) => owner.ticket.key) } };
  }
  if (active.length === 0) {
    return candidates.length
      ? { bucket: 'closedMismatches', item: { id, tickets: candidates.map((owner) => owner.ticket.key) } }
      : { bucket: 'unowned', item: id };
  }
  const [{ ticket, record }] = active;
  const bucket = record.fingerprint === fingerprint(alert) ? 'covered' : 'changed';
  return { bucket, item: { id, ticket: ticket.key }, owner: ticket };
}

function addRaise(raises, ticket, alert) {
  if (SEVERITY_RANK[alert.severity] <= (SEVERITY_RANK[ticket.severity] ?? 0)) {
    return;
  }
  const raise = raises.get(ticket.key) ?? { ticket: ticket.key, from: ticket.severity ?? null, to: 'low', alerts: [] };
  raise.to = SEVERITY_RANK[alert.severity] > SEVERITY_RANK[raise.to] ? alert.severity : raise.to;
  raise.alerts.push(alertId(alert.repository, alert.number));
  raises.set(ticket.key, raise);
}

/**
 * Deterministic coverage: an alert is owned only through the structured ownership property that the
 * executor writes. Description text is never parsed for ownership.
 */
export function reconcile({ alerts, tickets, previousState }) {
  const owners = ownersByAlert(tickets);
  const result = { covered: [], unowned: [], changed: [], closedMismatches: [], ambiguous: [], ownedNotOpen: [] };
  const raises = new Map();
  const openIds = new Set();
  for (const alert of alerts) {
    openIds.add(alertId(alert.repository, alert.number));
    const { bucket, item, owner } = classify(alert, owners.get(alertId(alert.repository, alert.number)) ?? []);
    result[bucket].push(item);
    if (owner) {
      addRaise(raises, owner, alert);
    }
  }
  result.severityRaises = [...raises.values()];
  result.ownedNotOpen = [...owners]
    .filter(([id]) => !openIds.has(id))
    .map(([id, candidates]) => {
      return { id, tickets: candidates.map((owner) => owner.ticket.key) };
    });
  const carried = new Set(previousState?.pendingUnowned ?? []);
  result.newlyUnowned = previousState ? result.unowned.filter((id) => !carried.has(id)) : [];
  result.carriedUnowned = previousState ? result.unowned.filter((id) => carried.has(id)) : [];
  result.firstReconciliation = !previousState;
  return result;
}

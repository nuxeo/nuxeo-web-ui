// Synthetic scenario (no real alerts, packages or tickets): two repositories, a set of open alerts and an
// ownership register shaped like a typical quarter, used as regression cases for the triage rules.
export const WEB = 'acme/app';
export const EL = 'acme/lib';
export const RUN = '19000000001';
export const DIGEST = 'digest-1';

const rows = {
  [WEB]: [
    [1, 'medium', 'pkg-time', 'GHSA-0000-0000-0000', '1.0.1', 'package-lock.json'],
    [2, 'medium', 'pkg-time', 'GHSA-0000-0000-0000', '1.0.1', 'ftest/package-lock.json'],
    [3, 'low', 'pkg-uri', 'GHSA-0000-0000-0001', '1.0.1', 'package-lock.json'],
    [4, 'medium', 'pkg-uri', 'GHSA-0000-0000-0002', '1.0.1', 'package-lock.json'],
    [5, 'low', 'pkg-uri', 'GHSA-0000-0000-0003', '1.0.1', 'package-lock.json'],
    [6, 'medium', 'pkg-uri', 'GHSA-0000-0000-0004', '1.0.1', 'package-lock.json'],
    [7, 'low', 'pkg-serialize', 'GHSA-0000-0000-0005', '1.0.1', 'package-lock.json'],
    [8, 'medium', 'pkg-query', 'GHSA-0000-0000-0006', '1.0.1', 'package-lock.json'],
    [9, 'low', 'pkg-merge', 'GHSA-0000-0000-0007', null, 'package-lock.json'],
    [10, 'low', 'pkg-serialize', 'GHSA-0000-0000-0005', '1.0.1', 'ftest/package-lock.json'],
    [11, 'low', 'pkg-serialize', 'GHSA-0000-0000-0005', '1.0.1', 'a11y/package-lock.json'],
    [12, 'medium', 'pkg-files', 'GHSA-0000-0000-0008', '1.0.1', 'ftest/package-lock.json'],
    [13, 'medium', 'pkg-files', 'GHSA-0000-0000-0008', '1.0.1', 'a11y/package-lock.json'],
    [14, 'medium', 'pkg-match', 'GHSA-0000-0000-0009', '1.0.1', 'package-lock.json'],
    [15, 'medium', 'pkg-match', 'GHSA-0000-0000-0009', '1.0.1', 'ftest/package-lock.json'],
    [16, 'medium', 'pkg-match', 'GHSA-0000-0000-0009', '1.0.1', 'a11y/package-lock.json'],
  ],
  [EL]: [
    [101, 'medium', 'pkg-time', 'GHSA-0000-0000-0000', '1.0.1', 'charts/package.json'],
    [102, 'medium', 'pkg-time', 'GHSA-0000-0000-0000', '1.0.1', 'package-lock.json'],
    [103, 'medium', 'pkg-time', 'GHSA-0000-0000-0000', '1.0.1', 'ui/package.json'],
    [104, 'low', 'pkg-serialize', 'GHSA-0000-0000-0005', '1.0.1', 'package-lock.json'],
    [105, 'medium', 'pkg-query', 'GHSA-0000-0000-0006', '1.0.1', 'package-lock.json'],
    [106, 'low', 'pkg-merge', 'GHSA-0000-0000-0007', null, 'package-lock.json'],
    [107, 'high', 'pkg-redirect', 'GHSA-0000-0000-0010', '1.0.1', 'package-lock.json'],
    [108, 'medium', 'pkg-match', 'GHSA-0000-0000-0009', '1.0.1', 'package-lock.json'],
  ],
};

export function liveAlerts() {
  return Object.entries(rows).flatMap(([repository, list]) =>
    list.map(([number, severity, pkg, ghsa, firstPatched, manifest]) => {
      return {
        repository,
        number,
        url: `https://github.com/${repository}/security/dependabot/${number}`,
        severity,
        package: pkg,
        ghsa,
        firstPatched,
        manifest,
        vulnerableRange: firstPatched ? `< ${firstPatched}` : '>= 0',
      };
    }),
  );
}

// [key, repository, alerts, status, statusCategory, severity]
export const REGISTER = [
  ['APP-31', WEB, [14, 15, 16], 'Open', 'new', 'medium'],
  ['APP-28', WEB, [3, 4, 5, 6, 7, 8, 10, 11, 12, 13], 'Open', 'new', 'medium'],
  ['APP-29', WEB, [9], 'On Hold', 'new', 'low'],
  ['APP-30', WEB, [1], 'On Hold', 'new', 'medium'],
  ['APP-84', WEB, [2], 'Open', 'new', 'medium'],
  ['LIB-24', EL, [101, 102, 103], 'Open', 'new', 'medium'],
  ['LIB-44', EL, [104, 105, 107], 'Open', 'new', 'high'],
  ['LIB-45', EL, [106], 'On Hold', 'new', 'low'],
];

export function registerTickets({ withOwnership = false, fingerprintOf } = {}) {
  const alerts = new Map(liveAlerts().map((alert) => [`${alert.repository}#${alert.number}`, alert]));
  return REGISTER.map(([key, repository, numbers, status, statusCategory, severity]) => {
    return {
      key,
      project: key.split('-')[0],
      status,
      statusCategory,
      onHold: status === 'On Hold',
      severity,
      labels: ['Security', 'dependabot'],
      ownership: withOwnership
        ? {
            schemaVersion: 1,
            repository,
            remediationId: `${repository}:${key.toLowerCase()}`,
            alerts: Object.fromEntries(
              numbers.map((number) => [
                number,
                { fingerprint: fingerprintOf(alerts.get(`${repository}#${number}`)), severity: 'x' },
              ]),
            ),
          }
        : null,
    };
  });
}

export const text = (value) => `${value} for the regression fixture.`;

export function group(remediationId, repository, operation, ticket, severity, alerts, extra = {}) {
  return {
    remediationId,
    repository,
    operation,
    ...(ticket ? { ticket } : {}),
    severity,
    kind: 'actionable',
    alerts,
    summary: text('Summary'),
    remediation: text('Remediation'),
    rationale: text('Rationale'),
    acceptanceCriteria: ['Alerts close on develop-2025 and develop-2023.'],
    teamsLine: 'One-line remediation.',
    ...extra,
  };
}

export function blocked(type, upstreamRef) {
  return {
    kind: 'blocked',
    blocker: {
      type,
      reason: text('Reason'),
      upstreamRef,
      mitigation: 'none established',
      recheck: text('Recheck'),
    },
  };
}

/** The plan a correct planner should produce on the first reconciliation (no ownership recorded yet). */
export function bootstrapPlan() {
  const adopt = (key, repository, severity, alerts, extra) =>
    group(`${repository}:${key.toLowerCase()}`, repository, 'adopt', key, severity, alerts, extra);
  return {
    schemaVersion: 1,
    runId: RUN,
    inventoryDigest: DIGEST,
    groups: [
      adopt('APP-31', WEB, 'medium', [14, 15, 16]),
      adopt('APP-28', WEB, 'medium', [3, 4, 5, 6, 7, 8, 10, 11, 12, 13]),
      adopt(
        'APP-29',
        WEB,
        'low',
        [9],
        blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-0000-0000-0007'),
      ),
      adopt('APP-30', WEB, 'medium', [1], blocked('upstream-release-pending', 'LIB-24')),
      adopt('APP-84', WEB, 'medium', [2]),
      adopt('LIB-24', EL, 'medium', [101, 102, 103]),
      adopt('LIB-44', EL, 'high', [104, 105, 107]),
      adopt(
        'LIB-45',
        EL,
        'low',
        [106],
        blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-0000-0000-0007'),
      ),
      group(`${EL}:pkg-match-globparts`, EL, 'create', undefined, 'medium', [108]),
    ],
    needsReview: [],
    closedTicketMismatches: [],
  };
}

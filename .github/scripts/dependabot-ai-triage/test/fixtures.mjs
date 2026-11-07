// Live state observed on 2026-11-06/07: open alerts and the corrected NXENG-987 ownership register.
export const WEB = 'nuxeo/nuxeo-web-ui';
export const EL = 'nuxeo/nuxeo-elements';
export const RUN = '19000000001';
export const DIGEST = 'digest-1';

const rows = {
  [WEB]: [
    [517, 'medium', 'moment', 'GHSA-4p3w-j4w9-5jqw', '2.31.0', 'package-lock.json'],
    [542, 'medium', 'moment', 'GHSA-4p3w-j4w9-5jqw', '2.31.0', 'packages/nuxeo-web-ui-ftest/package-lock.json'],
    [587, 'low', 'fast-uri', 'GHSA-333x-w4r6-6crp', '3.1.9', 'package-lock.json'],
    [588, 'medium', 'fast-uri', 'GHSA-wjr9-j795-jxcr', '3.1.9', 'package-lock.json'],
    [589, 'low', 'fast-uri', 'GHSA-xhq7-xmqj-769h', '3.1.9', 'package-lock.json'],
    [590, 'medium', 'fast-uri', 'GHSA-w74x-v6f9-j3xg', '3.1.9', 'package-lock.json'],
    [591, 'low', 'serialize-javascript', 'GHSA-m5mm-p8h7-m29v', '7.1.3', 'package-lock.json'],
    [598, 'medium', 'qs', 'GHSA-6pq8-jhm2-2vcw', '6.16.1', 'package-lock.json'],
    [607, 'low', 'deepmerge', 'GHSA-gcqx-w48m-w2h4', null, 'package-lock.json'],
    [
      608,
      'low',
      'serialize-javascript',
      'GHSA-m5mm-p8h7-m29v',
      '7.1.3',
      'packages/nuxeo-web-ui-ftest/package-lock.json',
    ],
    [622, 'low', 'serialize-javascript', 'GHSA-m5mm-p8h7-m29v', '7.1.3', 'plugin/a11y/package-lock.json'],
    [639, 'medium', 'glob', 'GHSA-3g3m-2fjr-6pw4', '14.0.2', 'packages/nuxeo-web-ui-ftest/package-lock.json'],
    [641, 'medium', 'glob', 'GHSA-3g3m-2fjr-6pw4', '14.0.2', 'plugin/a11y/package-lock.json'],
    [643, 'medium', 'minimatch', 'GHSA-g3hv-75wg-m249', '11.0.1', 'package-lock.json'],
    [644, 'medium', 'minimatch', 'GHSA-g3hv-75wg-m249', '11.0.1', 'packages/nuxeo-web-ui-ftest/package-lock.json'],
    [645, 'medium', 'minimatch', 'GHSA-g3hv-75wg-m249', '11.0.1', 'plugin/a11y/package-lock.json'],
  ],
  [EL]: [
    [235, 'medium', 'moment', 'GHSA-4p3w-j4w9-5jqw', '2.31.0', 'dataviz/package.json'],
    [248, 'medium', 'moment', 'GHSA-4p3w-j4w9-5jqw', '2.31.0', 'package-lock.json'],
    [251, 'medium', 'moment', 'GHSA-4p3w-j4w9-5jqw', '2.31.0', 'ui/package.json'],
    [288, 'low', 'serialize-javascript', 'GHSA-m5mm-p8h7-m29v', '7.1.3', 'package-lock.json'],
    [291, 'medium', 'qs', 'GHSA-6pq8-jhm2-2vcw', '6.16.1', 'package-lock.json'],
    [295, 'low', 'deepmerge', 'GHSA-gcqx-w48m-w2h4', null, 'package-lock.json'],
    [296, 'high', 'follow-redirects', 'GHSA-mrwp-f3q8-3g9p', '1.16.2', 'package-lock.json'],
    [299, 'medium', 'minimatch', 'GHSA-g3hv-75wg-m249', '11.0.1', 'package-lock.json'],
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
  ['WEBUI-2431', WEB, [643, 644, 645], 'Open', 'new', 'medium'],
  ['WEBUI-2428', WEB, [587, 588, 589, 590, 591, 598, 608, 622, 639, 641], 'Open', 'new', 'medium'],
  ['WEBUI-2429', WEB, [607], 'On Hold', 'new', 'low'],
  ['WEBUI-2430', WEB, [517], 'On Hold', 'new', 'medium'],
  ['WEBUI-2384', WEB, [542], 'Open', 'new', 'medium'],
  ['ELEMENTS-2124', EL, [235, 248, 251], 'Open', 'new', 'medium'],
  ['ELEMENTS-2144', EL, [288, 291, 296], 'Open', 'new', 'high'],
  ['ELEMENTS-2145', EL, [295], 'On Hold', 'new', 'low'],
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
      adopt('WEBUI-2431', WEB, 'medium', [643, 644, 645]),
      adopt('WEBUI-2428', WEB, 'medium', [587, 588, 589, 590, 591, 598, 608, 622, 639, 641]),
      adopt(
        'WEBUI-2429',
        WEB,
        'low',
        [607],
        blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4'),
      ),
      adopt('WEBUI-2430', WEB, 'medium', [517], blocked('upstream-release-pending', 'ELEMENTS-2124')),
      adopt('WEBUI-2384', WEB, 'medium', [542]),
      adopt('ELEMENTS-2124', EL, 'medium', [235, 248, 251]),
      adopt('ELEMENTS-2144', EL, 'high', [288, 291, 296]),
      adopt(
        'ELEMENTS-2145',
        EL,
        'low',
        [295],
        blocked('no-upstream-patch', 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4'),
      ),
      group(`${EL}:minimatch-globparts`, EL, 'create', undefined, 'medium', [299]),
    ],
    needsReview: [],
    closedTicketMismatches: [],
  };
}

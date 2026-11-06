import { createHash } from 'node:crypto';
import path from 'node:path';
import semver from 'semver';

export const severityRank = { low: 0, medium: 1, high: 2, critical: 3 };
export const symbols = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };
export const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const highest = (values) => values.reduce((a, b) => (severityRank[b] > severityRank[a] ? b : a), 'low');
export const stableKey = (repo, pkg, major, blocker = false) =>
  `cve-triage-${hash([repo, pkg, major, blocker ? 'blocked' : 'upgrade']).slice(0, 24)}`;

export function normalize(repo, alert) {
  const advisory = alert.security_advisory;
  const vulnerable = alert.security_vulnerability;
  if (!(advisory.severity in severityRank)) throw new Error('Unknown GitHub severity');
  const finding = {
    id: `${repo}#${alert.number}`,
    repository: repo,
    number: alert.number,
    url: alert.html_url,
    package: alert.dependency.package.name,
    ecosystem: alert.dependency.package.ecosystem,
    manifest: alert.dependency.manifest_path,
    scope: alert.dependency.scope,
    severity: advisory.severity,
    ghsa: advisory.ghsa_id,
    cve: advisory.cve_id,
    summary: advisory.summary,
    range:
      alert.dependency.package.ecosystem === 'npm'
        ? vulnerable.vulnerable_version_range.replace(/,\s*/g, ' ')
        : vulnerable.vulnerable_version_range,
    patched: vulnerable.first_patched_version?.identifier || null,
    created: alert.created_at,
    updated: alert.updated_at || advisory.updated_at || alert.created_at,
  };
  finding.fingerprint = hash({ ...finding, created: undefined, updated: undefined });
  return finding;
}

// Preserve structural boundaries so related/out-of-scope links do not become coverage evidence.
export function textOf(node) {
  if (typeof node === 'string') return node;
  if (!node) return '';
  if (Array.isArray(node)) return node.map(textOf).join('');
  const inner = node.text || textOf(node.content);
  if (node.type === 'heading') return `\n### ${inner}\n`;
  if (node.type === 'tableRow') return `|${(node.content || []).map(textOf).join('|')}|\n`;
  const urls = (node.marks || []).filter((m) => m.type === 'link').map((m) => m.attrs.href);
  return `${inner}${urls.length ? ` (${urls.join(' ')})` : ''}${node.type === 'paragraph' ? '\n' : ''}`;
}

export function owningScope(issue) {
  const text = textOf(issue.fields.description);
  return text.split(/\n### (?:Related|Separate|Independent|Notes|Definition|Out[ -]of[ -]scope)/i)[0];
}

export function matchFinding(finding, issues) {
  const exact = [];
  const possible = [];
  const escaped = finding.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const issue of issues) {
    if (!issue.key.startsWith(`${finding.project}-`)) continue;
    const scope = owningScope(issue);
    const same = scope.includes(finding.package) && scope.includes(finding.ghsa) && scope.includes(finding.manifest);
    if (!same) continue;
    if (new RegExp(`${escaped}(?![0-9])`).test(scope)) exact.push(issue);
    else possible.push(issue);
  }
  if (exact.length === 1) {
    const ticket = exact[0];
    if (ticket.fields.status.statusCategory.key === 'done') return { kind: 'closed', ticket };
    const actual = ticket.fields[finding.severityField]?.value?.toLowerCase();
    return {
      kind: actual in severityRank && severityRank[actual] >= severityRank[finding.severity] ? 'covered' : 'update',
      ticket,
    };
  }
  return exact.length || possible.length ? { kind: 'ambiguous', tickets: [...exact, ...possible] } : { kind: 'new' };
}

export function changedSince(finding, checkpoint, overlapHours, fingerprints) {
  if (!checkpoint || fingerprints[finding.id] !== finding.fingerprint) return true;
  const start = Date.parse(checkpoint) - overlapHours * 3600000;
  return Math.max(Date.parse(finding.created), Date.parse(finding.updated)) >= start;
}

export function resolveDependency(packages, from, name) {
  let directory = from;
  for (;;) {
    const candidate = directory ? `${directory}/node_modules/${name}` : `node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!directory || directory === '.') return null;
    const next = path.posix.dirname(directory);
    directory = next === '.' ? '' : next;
  }
}

export function assessLock(finding, lock, manifest, patchMetadata) {
  if (finding.ecosystem !== 'npm')
    return { review: true, reason: 'Unsupported ecosystem; engineering review required.' };
  const range = semver.validRange(finding.range.replace(/,\s*/g, ' '));
  if (!range || !lock.packages || typeof lock.packages !== 'object')
    return { review: true, reason: 'Cannot safely interpret version range or lockfile.' };
  const instances = Object.entries(lock.packages).filter(
    ([key, value]) => key.endsWith(`/node_modules/${finding.package}`) || key === `node_modules/${finding.package}`,
  );
  if (instances.some(([, value]) => !value || !semver.valid(value.version)))
    return { review: true, reason: 'Resolved package version is unreadable; inspect the dependency path.' };
  const affected = instances.filter(([, value]) => semver.satisfies(value.version, range));
  if (!affected.length)
    return {
      blocked: false,
      review: true,
      reason: 'No vulnerable resolved instance on this branch; confirm alert branch/re-scan.',
    };
  if (!finding.patched)
    return { blocked: true, reason: 'Affected instance confirmed; GitHub lists no patched release.', noPatch: true };
  const patch = semver.valid(finding.patched);
  if (!patch) return { review: true, reason: 'Patched version cannot be interpreted safely.' };
  if (semver.satisfies(patch, range))
    return { review: true, reason: 'Listed patched version still matches advisory range; review upstream data.' };
  const overrideTouches = (name, overrides) =>
    overrides &&
    typeof overrides === 'object' &&
    Object.entries(overrides).some(
      ([key, value]) => key === name || key.startsWith(`${name}@`) || overrideTouches(name, value),
    );
  if (overrideTouches(finding.package, manifest.overrides))
    return { review: true, reason: 'Manifest overrides affect this package; validate the effective constraints.' };
  const evidence = [];
  for (const [instance, value] of affected) {
    const parents = Object.entries(lock.packages).flatMap(([parent, metadata]) =>
      ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].flatMap((field) => {
        const declared = metadata[field]?.[finding.package];
        return declared && resolveDependency(lock.packages, parent, finding.package) === instance
          ? [{ parent: parent || '(root)', declared }]
          : [];
      }),
    );
    if (parents.some((p) => overrideTouches(p.parent.split('node_modules/').pop(), manifest.overrides)))
      return { review: true, reason: 'A parent override affects this dependency path; inspect effective constraints.' };
    const constraints = parents.filter((p) => !semver.validRange(p.declared) || !semver.satisfies(patch, p.declared));
    evidence.push({ instance, installed: value.version, parents });
    if (!parents.length || constraints.length) {
      return {
        blocked: true,
        reason: `Published patch ${patch} needs parent/pin changes or a validated override.`,
        evidence,
      };
    }
  }
  const supported = manifest.engines?.node;
  const required = patchMetadata.engines?.node;
  if (required && (!supported || !semver.validRange(supported) || !semver.subset(supported, required))) {
    return {
      blocked: true,
      reason: `Patched package requires Node ${required}; declared support ${supported || 'unspecified'} needs review.`,
      evidence,
    };
  }
  return {
    blocked: false,
    target: patch,
    reason: 'Published patch fits all resolved-parent ranges and declared Node support; tests still required.',
    evidence,
  };
}

export function groupFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    const branches = Object.values(finding.branchEvidence);
    const blocked = branches.some((b) => b.blocked);
    const review = branches.some((b) => b.review);
    if (review) continue;
    // Affected version lines and target must agree: no global major override or unrelated package batching.
    const major = (semver.validRange(finding.range) ? semver.minVersion(finding.range)?.major : null) ?? 'unknown';
    const blocker = blocked ? hash(branches.filter((b) => b.blocked).map((b) => b.reason)).slice(0, 8) : '';
    const key = stableKey(
      finding.repository,
      finding.package,
      `${major}:${blocked ? blocker : finding.patched}`,
      blocked,
    );
    const id = key;
    if (!groups.has(id))
      groups.set(id, { key, repository: finding.repository, package: finding.package, blocked, findings: [] });
    groups.get(id).findings.push(finding);
  }
  return [...groups.values()].map((g) => {
    return {
      ...g,
      severity: highest(g.findings.map((f) => f.severity)),
      reason: `Same repository, dependency, affected version line and ${g.blocked ? 'shared remediation blocker' : 'compatible patch target'}.`,
      summary: `[Security] ${g.blocked ? 'Assess blocked' : 'Update'} ${g.package} (${g.findings.length} Dependabot alerts)`,
    };
  });
}

export function paragraph(text) {
  const parts = String(text)
    .split(/(https?:\/\/[^\s|]+)/g)
    .filter(Boolean);
  return {
    type: 'paragraph',
    content: parts.map((part) => {
      return {
        type: 'text',
        text: part,
        ...(part.startsWith('https://') ? { marks: [{ type: 'link', attrs: { href: part } }] } : {}),
      };
    }),
  };
}
export function adf(text) {
  return { type: 'doc', version: 1, content: text.split('\n').filter(Boolean).map(paragraph) };
}
export function description(group, config) {
  const heading = (text) => {
    return { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text }] };
  };
  const cell = (text, type = 'tableCell') => {
    return { type, content: [paragraph(text)] };
  };
  const columns = ['Alert', 'Package', 'Severity', 'CVE / GHSA', 'Manifest', 'Vulnerable → patched'];
  const rows = group.findings.map((f) => [
    f.url,
    f.package,
    f.severity,
    `${f.cve || 'No CVE'} / https://github.com/advisories/${f.ghsa}`,
    f.manifest,
    `${f.range} → ${f.patched || 'none listed'}`,
  ]);
  return {
    type: 'doc',
    version: 1,
    content: [
      heading('Summary'),
      paragraph(group.summary),
      paragraph(
        `Repository: ${group.repository}. Both supported LTS lines. GitHub severity: ${group.severity}. Priority is configured independently.`,
      ),
      paragraph(`Triage remediation key: ${group.key}`),
      heading('Findings'),
      {
        type: 'table',
        content: [
          { type: 'tableRow', content: columns.map((v) => cell(v, 'tableHeader')) },
          ...rows.map((row) => {
            return { type: 'tableRow', content: row.map((v) => cell(v)) };
          }),
        ],
      },
      heading('Grouping rationale'),
      paragraph(group.reason),
      heading(group.blocked ? 'Blocker and recheck criteria' : 'Remediation candidate'),
      ...group.findings.flatMap((f) =>
        Object.entries(f.branchEvidence).map(([branch, e]) =>
          paragraph(`${branch}: ${e.reason} Evidence: ${JSON.stringify(e.evidence || [])}`),
        ),
      ),
      paragraph(
        group.blocked
          ? 'Mitigation: none established automatically. Recheck upstream patch releases, supported parent upgrades and pin/engine constraints. Removal, replacement or overrides require engineering assessment. No risk acceptance is implied.'
          : 'Prefer the smallest in-range lockfile update clearing every advisory. This is a candidate, not proof that implementation tests passed.',
      ),
      heading('Acceptance criteria'),
      paragraph(
        'Verify every affected instance and manifest on develop-2025 and develop-2023; record lockfile and npm audit evidence.',
      ),
      paragraph(
        'Install cleanly; run formatting, lint, unit and appropriate build/Storybook/functional checks. Preserve supported Node versions and unrelated package versions.',
      ),
      paragraph(
        'For blocked work: document reachability, mitigation, upstream references and review criteria; do not close as fixed without remediation or approved risk disposition.',
      ),
      paragraph(`Epic: ${config.jiraSite}/browse/${config.epic}. Other-repository work is separate.`),
    ],
  };
}

export function card(report, config, mode) {
  const text = (value, extra = {}) => {
    return { type: 'TextBlock', text: value, wrap: true, ...extra };
  };
  const body = [
    text(
      `🛡️ Dependabot triage · ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: config.timezone }).format(new Date(report.started))} ${config.timezone}`,
      { weight: 'Bolder', size: 'Large' },
    ),
  ];
  body.push(text(`Repositories: ${(config.repositories || []).map((r) => r.name).join(' · ')}`, { isSubtle: true }));
  if (report.failures.length)
    body.push(
      text('⚠️ Scan incomplete', { weight: 'Bolder', color: 'Attention' }),
      ...report.failures.map((f) => text(f)),
    );
  else {
    const counts = Object.fromEntries(
      Object.keys(symbols).map((s) => [s, report.newFindings.filter((f) => f.severity === s).length]),
    );
    if (report.newFindings.length) {
      const zero = !counts.critical ? `No new Critical${!counts.high ? ' or High' : ''} findings. ` : '';
      body.push(
        text(
          `${zero}${Object.keys(symbols)
            .filter((s) => counts[s])
            .map((s) => `${symbols[s]} ${counts[s]} ${s}`)
            .join(' · ')}`,
          { weight: 'Bolder' },
        ),
      );
      body.push(text('🐛 Dependabot found a few uninvited guests in the dependency tree.'));
    } else if (report.carriedActions?.length) {
      body.push(
        text('📨 Recovered Jira actions awaiting notification; see the ticket table below.', { weight: 'Bolder' }),
      );
    } else if (report.review.length) {
      body.push(text('⚠️ No confirmed new findings; existing-ticket coverage needs review.', { weight: 'Bolder' }));
    } else {
      body.push(text('✅ No new untriaged Dependabot findings were identified.', { weight: 'Bolder' }));
      if (!report.review.length) body.push(text('🐛 The bugs took the day off. We checked anyway.'));
    }
  }
  if (report.carriedActions?.length)
    body.push(text('📨 Recovered Jira actions awaiting notification', { weight: 'Bolder' }));
  const urgentReview = (report.reviewFindings || []).filter((f) => ['critical', 'high'].includes(f.severity));
  if (urgentReview.length)
    body.push(
      text(
        `⚠️ Critical/High coverage needs review: ${urgentReview.map((f) => `${symbols[f.severity]} ${f.id}`).join(', ')}`,
        { weight: 'Bolder', color: 'Attention' },
      ),
    );
  const table = (title, groups) => {
    if (!groups.length) return;
    body.push(text(title, { weight: 'Bolder', separator: true }));
    const row = (values, bold = false) => {
      return {
        type: 'ColumnSet',
        columns: values.map((value, i) => {
          return {
            type: 'Column',
            width: i === 2 ? 'stretch' : 'auto',
            items: [text(value, bold ? { weight: 'Bolder' } : {})],
          };
        }),
      };
    };
    body.push(row(['Jira', 'Severity', 'Summary'], true));
    for (const g of groups.slice(0, 12))
      body.push(
        row([
          g.ticket ? `[${g.ticket}](${config.jiraSite}/browse/${g.ticket})` : 'Proposed',
          `${symbols[g.severity]} ${g.severity}`,
          `${g.action ? `${g.action}: ` : ''}${g.package}: ${g.blocker || g.summary}`,
        ]),
      );
    if (groups.length > 12) body.push(text(`${groups.length - 12} more rows are included in the full Actions report.`));
  };
  table(
    mode === 'preview' ? 'Proposed tickets / updates' : 'Tickets created / updated',
    report.groups.filter((g) => !g.blocked && (mode === 'preview' || g.action)),
  );
  table('Recovered Jira actions', report.carriedActions || []);
  table('Blockers / CVEs with no patch available', [...report.groups.filter((g) => g.blocked), ...report.blockers]);
  if (report.groups.some((g) => g.blocked) || report.blockers.length)
    body.push(
      text(
        mode === 'preview'
          ? 'FYI: blocked tickets would be placed On Hold with a reason and recheck criteria.'
          : report.failures.length
            ? 'FYI: On Hold processing may be incomplete; check the run failures.'
            : 'FYI: blocked tickets are put On Hold with a reason and recheck criteria.',
      ),
    );
  if (report.review.length)
    body.push(
      text('Needs review', { weight: 'Bolder' }),
      ...report.review.slice(0, 5).map((r) => text(r.slice(0, 900))),
    );
  body.push(
    text(
      `${mode === 'preview' ? 'PREVIEW — no Jira changes' : 'Automatic run'} · ${report.alerts.length} reviewed · ${report.covered.length} covered`,
      { isSubtle: true },
    ),
  );
  if (report.review.length > 5) body.push(text(`${report.review.length - 5} more review items in the Actions report.`));
  if (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID)
    body.push(
      text(
        `[Full triage report](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`,
      ),
    );
  body.push(
    text(`[Security epic](${config.jiraSite}/browse/${config.epic}) · Run ID: ${report.id}`, { isSubtle: true }),
  );
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          body,
        },
      },
    ],
  };
}

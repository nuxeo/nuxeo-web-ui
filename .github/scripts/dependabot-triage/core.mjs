import { createHash } from 'node:crypto';
import path from 'node:path';
import semver from 'semver';

export const severityRank = { low: 0, medium: 1, high: 2, critical: 3 };
export const symbols = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };
export const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const highest = (values) => values.reduce((a, b) => (severityRank[b] > severityRank[a] ? b : a), 'low');
export const stableKey = (repo, pkg, major, blocker = false) =>
  `cve-triage-${hash([repo, pkg, major, blocker ? 'blocked' : 'upgrade']).slice(0, 24)}`;

export function automaticAuthorized(context) {
  if (context.ALLOW_AUTOMATIC !== 'true') return false;
  const defaultBranch = Boolean(context.DEFAULT_BRANCH) && context.GITHUB_REF_NAME === context.DEFAULT_BRANCH;
  const approvedCommit =
    /^[a-f0-9]{40}$/.test(context.APPROVED_PREMERGE_SHA || '') &&
    context.GITHUB_SHA === context.APPROVED_PREMERGE_SHA &&
    context.GITHUB_EVENT_NAME === 'workflow_dispatch';
  return defaultBranch || approvedCommit;
}

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
  if (node.type === 'tableRow')
    return `|${(node.content || []).map((cell) => textOf(cell).replace(/\n/g, ' ')).join('|')}|\n`;
  const urls = (node.marks || []).filter((m) => m.type === 'link').map((m) => m.attrs.href);
  return `${inner}${urls.length ? ` (${urls.join(' ')})` : ''}${node.type === 'paragraph' ? '\n' : ''}`;
}

export function owningScope(issue) {
  const text = textOf(issue.fields.description);
  return text.split(/(?:^|\n)#{1,6} (?:Related|Separate|Independent|Notes|Definition|Out[ -]of[ -]scope)/i)[0];
}

export function storedAlertUrls(issue) {
  return [...new Set(owningScope(issue).match(/https:\/\/github\.com\/[^\s)|]+\/security\/dependabot\/\d+/g) || [])];
}
function findingBlocks(issue) {
  const scope = owningScope(issue);
  const rows = scope.match(/^\|[^\n]*\|[ \t]*(?:\n|$)/gm) || [];
  const sections = scope
    .split(/\n#{1,6} /)
    .filter(
      (section) =>
        !section.includes('|') &&
        new Set(section.match(/https:\/\/github\.com\/[^\s)|]+\/security\/dependabot\/\d+/g) || []).size === 1 &&
        new Set(section.match(/GHSA-[a-zA-Z0-9-]+/g) || []).size === 1,
    );
  const uniqueAdvisories = new Set(scope.match(/GHSA-[a-zA-Z0-9-]+/g) || []);
  if (!scope.includes('|') && storedAlertUrls(issue).length === 1 && uniqueAdvisories.size === 1) sections.push(scope);
  return [...rows, ...sections, ...scope.split('\n').filter((line) => !line.includes('|'))];
}

export function matchFinding(finding, issues) {
  const exact = [];
  const possible = [];
  const escaped = finding.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const issue of issues) {
    if (!issue.key.startsWith(`${finding.project}-`)) continue;
    const scope = owningScope(issue);
    const same = mentions(scope, finding.package) && scope.includes(finding.ghsa) && mentions(scope, finding.manifest);
    const urlMatch = new RegExp(`${escaped}(?![0-9])`);
    if (!same) {
      // An explicit in-scope alert reference prevents a new ticket even when its register is incomplete.
      if (urlMatch.test(scope)) possible.push(issue);
      continue;
    }
    const associated = findingBlocks(issue).some(
      (block) =>
        urlMatch.test(block) &&
        mentions(block, finding.package) &&
        block.includes(finding.ghsa) &&
        mentions(block, finding.manifest),
    );
    if (associated) exact.push(issue);
    else possible.push(issue);
  }
  if (exact.length === 1 && !possible.length) {
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

function packageName(location, metadata) {
  return metadata?.name || location.split('node_modules/').pop();
}

function dependencyGraph(packages) {
  const parents = new Map();
  for (const [location, metadata] of Object.entries(packages)) {
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, declared] of Object.entries(metadata?.[field] || {})) {
        const target = resolveDependency(packages, location, name);
        if (!target) continue;
        if (!parents.has(target)) parents.set(target, []);
        parents.get(target).push({
          parent: location || '(root)',
          name: location ? packageName(location, metadata) : '(root)',
          declared,
          field,
        });
      }
    }
  }
  return parents;
}

function applicableOverrides(instance, packages, parents, overrides) {
  const ancestors = (target) => {
    const found = new Set([target]);
    const queue = [target];
    for (let i = 0; i < queue.length; i++) {
      for (const edge of parents.get(queue[i]) || []) {
        if (edge.parent !== '(root)' && !found.has(edge.parent)) {
          found.add(edge.parent);
          queue.push(edge.parent);
        }
      }
    }
    return found;
  };
  const candidates = ancestors(instance);
  const matches = (selector, location, replacement) => {
    const split = selector.lastIndexOf('@');
    const name = split > 0 ? selector.slice(0, split) : selector;
    const range = split > 0 ? selector.slice(split + 1) : null;
    const metadata = packages[location];
    if (name !== packageName(location, metadata)) return false;
    if (!range) return true;
    return (
      !semver.validRange(range) ||
      semver.satisfies(metadata.version, range) ||
      (typeof replacement === 'string' &&
        semver.validRange(replacement) &&
        semver.satisfies(metadata.version, replacement))
    );
  };
  const result = [];
  const visit = (rules, scope, trail = []) => {
    if (!rules || typeof rules !== 'object') return;
    for (const [selector, replacement] of Object.entries(rules)) {
      if (selector === '.') continue;
      for (const location of scope) {
        if (!matches(selector, location, replacement)) continue;
        const chain = [...trail, selector];
        if (typeof replacement === 'string' || typeof replacement?.['.'] === 'string')
          result.push({
            path: location,
            selector: chain.join(' → '),
            value: typeof replacement === 'string' ? replacement : replacement['.'],
          });
        if (replacement && typeof replacement === 'object') {
          const descendants = [...scope].filter(
            (candidate) => candidate !== location && ancestors(candidate).has(location),
          );
          visit(replacement, descendants, chain);
        }
      }
    }
  };
  visit(overrides, [...candidates]);
  return result;
}

export function assessLock(finding, lock, manifest, patchMetadata) {
  if (finding.ecosystem !== 'npm')
    return { review: true, reason: 'Unsupported ecosystem; engineering review required.' };
  const range = typeof finding.range === 'string' && semver.validRange(finding.range.replace(/,\s*/g, ' '));
  if (!range || !lock?.packages || typeof lock.packages !== 'object')
    return { review: true, reason: 'Cannot safely interpret version range or lockfile.' };
  const instances = Object.entries(lock.packages).filter(
    ([key]) => key.endsWith(`/node_modules/${finding.package}`) || key === `node_modules/${finding.package}`,
  );
  const graph = dependencyGraph(lock.packages);
  const patch = semver.valid(finding.patched || '');
  const affected = instances.filter(
    ([, value]) => !semver.valid(value?.version) || semver.satisfies(value.version, range),
  );
  const evidence = affected.map(([instance, value]) => {
    const parents = graph.get(instance) || [];
    return {
      instance,
      installed: value?.version || 'unreadable',
      parents,
      overrides: applicableOverrides(instance, lock.packages, graph, manifest.overrides),
      requiresParentUpgrade: Boolean(
        patch && parents.some((p) => semver.validRange(p.declared) && !semver.satisfies(patch, p.declared)),
      ),
    };
  });
  if (!evidence.length)
    return {
      blocked: false,
      review: true,
      evidence,
      reason: 'No vulnerable resolved instance on this branch; confirm alert branch/re-scan.',
    };
  if (evidence.some((e) => !semver.valid(e.installed)))
    return { review: true, evidence, reason: 'Resolved package version is unreadable; inspect the dependency path.' };
  if (!finding.patched)
    return {
      blocked: true,
      noPatch: true,
      blockerKind: 'no_patch',
      evidence,
      reason: 'Affected instances confirmed; GitHub lists no patched release. Assess mitigation and recheck upstream.',
    };
  if (!patch || semver.satisfies(patch, range))
    return {
      review: true,
      evidence,
      reason: 'Patched version is unreadable or still matches the advisory range; review upstream data.',
    };
  if (evidence.some((e) => e.overrides.length))
    return {
      blocked: false,
      review: true,
      evidence,
      reason: 'An override applies to a vulnerable dependency path; validate its effective constraints.',
    };
  if (evidence.some((e) => !e.parents.length || e.parents.some((p) => !semver.validRange(p.declared))))
    return {
      review: true,
      evidence,
      reason: 'A dependency path or parent declaration requires engineering assessment.',
    };
  const supported = manifest.engines?.node;
  const required = patchMetadata.engines?.node;
  if (
    required &&
    (!semver.validRange(required) || !supported || !semver.validRange(supported) || !semver.subset(supported, required))
  )
    return {
      blocked: false,
      review: true,
      evidence,
      reason: `Patched package requires Node ${required}; declared support ${supported || 'unspecified'} needs review.`,
    };
  const needsParentUpgrade = evidence.some((e) => e.requiresParentUpgrade);
  return {
    blocked: false,
    target: patch,
    evidence,
    needsParentUpgrade,
    remediation: needsParentUpgrade ? 'parent_upgrade' : 'lockfile_refresh',
    reason: needsParentUpgrade
      ? `Published patch ${patch} requires scoped parent/pin changes or override assessment; engineering work, not a confirmed external blocker.`
      : 'Published patch fits all resolved-parent ranges and declared Node support; tests still required.',
  };
}

function mentions(value, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-zA-Z0-9_/@.-])${escaped}(?![a-zA-Z0-9_/.-])`).test(value);
}

export function relatedRemediation(finding, issues) {
  const parentNames = new Set(
    Object.values(finding.branchEvidence || {}).flatMap((b) =>
      (b.evidence || [])
        .filter((e) => e.requiresParentUpgrade)
        .flatMap((e) => e.parents.filter((p) => p.name !== '(root)').map((p) => p.name)),
    ),
  );
  return issues.flatMap((issue) => {
    if (!issue.key.startsWith(`${finding.project}-`) || issue.fields.status.statusCategory.key === 'done') return [];
    const scope = owningScope(issue);
    if (
      !scope.includes(`https://github.com/${finding.repository}/`) &&
      !scope.includes(`Repository: ${finding.repository}`)
    )
      return [];
    if (mentions(scope, finding.package))
      return [
        {
          ticket: issue.key,
          issue,
          kind: 'same_package',
          reason: `Review extending existing ${finding.package} remediation; explicit alert coverage must be added.`,
        },
      ];
    const rows = scope.match(/^\|[^\n]*\|[ \t]*(?:\n|$)/gm) || scope.split('\n');
    const shared = [...parentNames].filter((name) =>
      rows.some((row) => mentions(row, name) && mentions(row, finding.manifest)),
    );
    return shared.length
      ? [
          {
            ticket: issue.key,
            issue,
            kind: 'shared_parent',
            parents: shared,
            reason: `Shared parent upgrade (${shared.join(', ')}) in ${finding.manifest}; review extending scope and remaining dependency paths.`,
          },
        ]
      : [];
  });
}

export function groupFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    if (finding.triageReview) continue;
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
          paragraph(`${f.manifest} — ${branch}: ${e.reason} Evidence: ${JSON.stringify(e.evidence || [])}`),
        ),
      ),
      paragraph(
        group.blocked
          ? 'Mitigation: none established automatically. Recheck upstream patch releases, supported parent upgrades and pin/engine constraints. Removal, replacement or overrides require engineering assessment. No risk acceptance is implied.'
          : 'Prefer the smallest supported remediation clearing every advisory. Parent/pin upgrades may be required; validate their APIs and engines. This is an engineering candidate, not proof that implementation tests passed.',
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
      paragraph(`Epic: ${config.jiraSite}/browse/${config.epic} Other-repository work is separate.`),
    ],
  };
}

export function card(report, config, mode) {
  const text = (value, extra = {}) => {
    return { type: 'TextBlock', text: String(value), wrap: true, ...extra };
  };
  const shorten = (value, limit = 280) => {
    const clean = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
  };
  const newIds = new Set(report.newFindings.map((f) => f.id));
  const currentActions = report.groups.filter((g) => g.action);
  const currentTickets = new Set(currentActions.map((g) => g.ticket));
  const recoveredActions = (report.carriedActions || []).filter((g) => !currentTickets.has(g.ticket));
  const actions = [...currentActions, ...recoveredActions];
  const uniqueActions = [...new Map(actions.map((a) => [a.ticket || a.key, a])).values()];
  const proposals = mode === 'preview' ? report.groups.filter((g) => !g.action) : [];
  const updates = report.updates || [];
  const counts = Object.fromEntries(
    Object.keys(symbols).map((s) => [s, report.newFindings.filter((f) => f.severity === s).length]),
  );
  const newTracked = new Set(
    uniqueActions.flatMap((g) => (g.findings || []).filter((f) => newIds.has(f.id)).map((f) => f.id)),
  );
  const proposedIds = new Set(report.groups.flatMap((g) => (g.findings || []).map((f) => f.id)));
  const manualIds = new Set([
    ...report.newFindings.filter((f) => !proposedIds.has(f.id)).map((f) => f.id),
    ...(report.reviewFindings || []).map((f) => f.id),
  ]);
  const linkedBlockers = (report.blockers || []).filter((b) => b.newFindingIds?.some((id) => newIds.has(id)));
  const body = [
    text(
      `🛡️ Dependabot triage · ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: config.timezone }).format(new Date(report.started))} ${config.timezone}`,
      { weight: 'Bolder', size: 'Large' },
    ),
  ];
  body.push(text((config.repositories || []).map((r) => r.name.replace('nuxeo/', '')).join(' · '), { isSubtle: true }));
  if (report.failures.length)
    body.push(
      text('⚠️ Scan incomplete', { weight: 'Bolder', color: 'Attention' }),
      ...report.failures.slice(0, 4).map((f) => text(shorten(f, 500))),
    );
  else if (report.newFindings.length) {
    body.push(
      text(
        `${!counts.critical ? `No new Critical${!counts.high ? ' or High' : ''} findings.\n` : ''}${Object.keys(symbols)
          .filter((s) => counts[s])
          .map((s) => `${symbols[s]} ${counts[s]} ${s[0].toUpperCase() + s.slice(1)}`)
          .join(' · ')}`,
        { weight: 'Bolder' },
      ),
    );
    const advisories = new Set(report.newFindings.map((f) => f.ghsa || f.cve));
    body.push(
      text(
        `${report.newFindings.length} untriaged ${report.newFindings.length === 1 ? 'alert' : 'alerts'} · ${advisories.size} unique ${advisories.size === 1 ? 'advisory' : 'advisories'}`,
      ),
    );
    body.push(text('🐛 Dependabot found a few uninvited guests in the dependency tree.'));
  } else if (uniqueActions.length)
    body.push(text('📨 Recovered Jira actions awaiting notification', { weight: 'Bolder' }));
  else if (report.review.length) body.push(text('⚠️ Existing-ticket coverage needs review.', { weight: 'Bolder' }));
  else
    body.push(
      text('✅ No new untriaged Dependabot findings were identified.', { weight: 'Bolder' }),
      text('🐛 The bugs took the day off. We checked anyway.'),
    );
  const created = currentActions.filter((g) => g.action === 'created').length;
  const updated = currentActions.filter((g) => g.action === 'updated').length;
  const pending = mode === 'automatic' ? report.groups.filter((g) => !g.action && !g.reconciled) : [];
  body.push(
    text(
      mode === 'preview'
        ? `Preview: ${proposals.length} new ticket ${proposals.length === 1 ? 'proposal' : 'proposals'} · ${updates.length} existing ticket update ${updates.length === 1 ? 'proposal' : 'proposals'} · ${manualIds.size} ${manualIds.size === 1 ? 'alert needs' : 'alerts need'} review`
        : `Jira: ${created} created · ${updated} updated · ${manualIds.size} ${manualIds.size === 1 ? 'alert needs' : 'alerts need'} review${pending.length ? ` · ${pending.length} pending actions` : ''}${recoveredActions.length ? ` · ${recoveredActions.length} recovered from earlier runs` : ''}`,
      { weight: 'Bolder' },
    ),
  );
  const entries = (title, groups) => {
    if (!groups.length) return;
    body.push(text(`${title} (${groups.length})`, { weight: 'Bolder', separator: true }));
    for (const g of groups.slice(0, 8)) {
      const link = g.ticket ? `[${g.ticket}](${config.jiraSite}/browse/${g.ticket})` : 'Proposed new ticket';
      body.push({
        type: 'Container',
        spacing: 'Medium',
        items: [
          text(
            `${symbols[g.severity] || '•'} **${link} · ${g.isProposal ? 'required ' : ''}${g.severity ? g.severity[0].toUpperCase() + g.severity.slice(1) : 'review'}**`,
          ),
          text(shorten(g.summary || g.reason || g.blocker)),
          ...(g.findings?.length
            ? [
                text(
                  `${g.findings.length} ${g.findings.length === 1 ? 'alert' : 'alerts'} · ${(g.repository || '').replace('nuxeo/', '')}${g.holdConfirmed ? ' · On Hold' : g.blocked ? ' · No patched release' : ''}`,
                  { isSubtle: true },
                ),
              ]
            : []),
        ],
      });
    }
    if (groups.length > 8) body.push(text(`${groups.length - 8} more entries in the full report.`));
  };
  entries('Tickets created / updated', currentActions);
  entries('Recovered actions from earlier runs', recoveredActions);
  entries('Proposed new tickets', proposals);
  entries('Pending actions — not completed', pending);
  const blockerTickets = new Set(linkedBlockers.map((b) => b.ticket));
  entries(
    'Existing work to update',
    updates.filter((u) => !blockerTickets.has(u.ticket)),
  );
  entries('Existing blockers affecting new alerts', linkedBlockers);
  if (proposals.some((g) => g.blocked))
    body.push(text('FYI: proposals with a confirmed missing patch would be placed On Hold.'));
  if (report.review.length)
    body.push(
      text('Needs review', { weight: 'Bolder', separator: true }),
      ...report.review.slice(0, 5).map((r) => {
        const finding = [...report.newFindings, ...(report.reviewFindings || [])].find((f) => r.startsWith(`${f.id}:`));
        const label = finding
          ? `[${finding.repository.replace('nuxeo/', '')} #${finding.number}](${finding.url})${r.slice(finding.id.length)}`
          : r;
        return text(shorten(label, 400));
      }),
    );
  if (report.review.length > 5) body.push(text(`${report.review.length - 5} more review notes in the full report.`));
  const urgent = (report.reviewFindings || []).filter((f) => ['critical', 'high'].includes(f.severity));
  if (urgent.length)
    body.push(
      text(
        `⚠️ Critical/High coverage needs review: ${urgent
          .slice(0, 8)
          .map((f) => f.id)
          .join(', ')}`,
        { color: 'Attention', weight: 'Bolder' },
      ),
    );
  body.push(
    text(
      `${report.alerts.length} reviewed · ${report.covered.length} already covered · ${newTracked.size} newly tracked`,
      { isSubtle: true },
    ),
  );
  if (mode === 'preview') body.push(text('PREVIEW — no Jira changes or Teams posting', { isSubtle: true }));
  if (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID)
    body.push(
      text(
        `[Full report](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`,
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

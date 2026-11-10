import {
  SEVERITIES,
  adfBullets,
  adfCode,
  adfDoc,
  adfHeading,
  adfLink,
  adfParagraph,
  adfText,
  alertId,
  clip,
  jsonBytes,
  titleCase,
} from './util.mjs';

const SEVERITY_ICON = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };
const TEAMS_SECTION_LIMIT = 15;
const COMMENT_BUDGET = 28000;
// Teams webhooks reject payloads above about 28 KB, and the card is also stored in one Jira property.
const CARD_BUDGET = 24000;

const browse = (site, key) => `${site}/browse/${key}`;
const shortRepo = (name) => name.split('/')[1];

function alertLine(alert) {
  const ids = [alert.ghsa, alert.cve].filter(Boolean).join(' / ');
  const patched = alert.firstPatched ?? 'none published';
  const details = ` · ${titleCase(alert.severity)} · ${alert.package} · ${ids} · ${alert.manifest} · patched: ${patched}`;
  return [adfLink(`${shortRepo(alert.repository)}#${alert.number}`, alert.url), adfText(details)];
}

function dependentLabel(dependent) {
  const version = dependent.version ? `@${dependent.version}` : '';
  return `${dependent.name}${version} (${dependent.range})`;
}

function instanceLabel(instance) {
  const via = instance.dependents.slice(0, 2).map(dependentLabel).join(', ');
  const suffix = via ? ` ← ${via}` : '';
  return `${instance.version} at ${instance.path}${suffix}`;
}

export function instanceSummary(analysis) {
  if (!analysis) {
    return 'not collected';
  }
  if (analysis.kind === 'manifest') {
    const declared = analysis.declarations.map((item) => `${item.field}: ${item.spec}`).join(', ') || '(not declared)';
    return analysis.supported ? `declared ${declared}` : 'manifest not present on this branch';
  }
  if (!analysis.supported) {
    return analysis.reason;
  }
  const vulnerable = analysis.instances.filter((instance) => instance.vulnerable !== false);
  const shown = vulnerable.slice(0, 6).map(instanceLabel);
  const more = vulnerable.length > shown.length ? `; +${vulnerable.length - shown.length} more` : '';
  const listed = shown.join('; ') || 'none';
  return `${analysis.instances.length} resolved instance(s), ${vulnerable.length} in the vulnerable range: ${listed}${more}`;
}

function findingsSection(alerts, evidence) {
  return alerts.map((alert) => {
    const branches = Object.entries(evidence[alertId(alert.repository, alert.number)] ?? {}).map(
      ([branch, analysis]) => {
        const line = clip(`${branch}: ${instanceSummary(analysis)}`, 1500);
        return adfText(`\n${line}`);
      },
    );
    return [...alertLine(alert), ...branches];
  });
}

function blockerLines(blocker) {
  return [
    `Blocker: ${blocker.reason}`,
    `Upstream reference: ${blocker.upstreamRef}`,
    `Available mitigation: ${blocker.mitigation}`,
    `Resume / recheck when: ${blocker.recheck}`,
  ];
}

export function ticketDescription({ group, alerts, evidence, config, runId }) {
  const branches = config.repositoryConfig(group.repository).branches.join(', ');
  const severityNote =
    `Defect Severity is ${titleCase(group.severity)}: the highest current GitHub severity below. ` +
    'Each finding keeps its own severity.';
  const footer =
    `Created by Dependabot AI triage run ${runId} (remediation ${group.remediationId}). ` +
    'Alert ownership is stored in the issue property "dependabot-ai-triage-ownership"; editing this ' +
    'description does not change which alerts this ticket owns.';
  return adfDoc([
    adfHeading('Remediation'),
    adfParagraph(adfText(group.remediation)),
    ...(group.blocker ? [adfHeading('Blocker'), adfBullets(blockerLines(group.blocker))] : []),
    adfHeading(`Findings (${alerts.length})`),
    adfParagraph(adfText(severityNote)),
    adfBullets(findingsSection(alerts, evidence)),
    adfHeading('Grouping rationale'),
    adfParagraph(adfText(group.rationale)),
    adfHeading('Acceptance criteria and required validation'),
    adfBullets(group.acceptanceCriteria),
    adfHeading('Scope'),
    adfParagraph(adfText(`Repository: ${group.repository}. Supported branches: ${branches}.`)),
    adfParagraph(adfText(footer)),
  ]);
}

export function extendComment({ group, added, evidence, runId, marker }) {
  const extended = added.length > 0;
  const severity = `Highest current GitHub severity of the findings this ticket owns: ${titleCase(group.severity)}.`;
  return adfDoc([
    adfHeading(extended ? 'Dependabot triage: scope extended' : 'Dependabot triage: finding update'),
    adfParagraph(adfText(group.updateNote ?? group.rationale)),
    extended ? adfBullets(findingsSection(added, evidence)) : null,
    adfParagraph(adfText(`${severity} Run ${runId} (ref ${marker}).`)),
  ]);
}

export function severityComment({ raise, runId, marker }) {
  const from = raise.from ? titleCase(raise.from) : 'unset';
  const text =
    `GitHub now reports ${titleCase(raise.to)} for ${raise.alerts.join(', ')}. ` +
    `Defect Severity raised from ${from} to ${titleCase(raise.to)}. Run ${runId} (ref ${marker}).`;
  return adfDoc([adfHeading('Dependabot triage: severity raised'), adfParagraph(adfText(text))]);
}

export function holdComment({ group, runId, marker }) {
  const note =
    'Severity remains unchanged. No risk acceptance or alert dismissal is implied. ' +
    `Set by Dependabot AI triage run ${runId} (ref ${marker}).`;
  return adfDoc([
    adfHeading('Reason for On Hold'),
    adfBullets(blockerLines(group.blocker)),
    adfParagraph(adfText(note)),
  ]);
}

function countLine(bySeverity) {
  return [...SEVERITIES]
    .reverse()
    .map((severity) => `${SEVERITY_ICON[severity]} ${bySeverity[severity] ?? 0} ${titleCase(severity)}`)
    .join(' · ');
}

const ENTRY_BUDGET = 6000;
const LIST_BUDGET = 9000;

// Lists are split into several nodes by size, so a long report can be divided across comments and no single
// node can outgrow a comment.
function chunks(items, size = 10) {
  const nodes = [];
  let current = [];
  let length = 0;
  for (const item of items) {
    const itemLength = JSON.stringify(item).length;
    if (current.length && (current.length >= size || length + itemLength > LIST_BUDGET)) {
      nodes.push(adfBullets(current));
      current = [];
      length = 0;
    }
    current.push(item);
    length += itemLength;
  }
  if (current.length) {
    nodes.push(adfBullets(current));
  }
  return nodes;
}

const listSection = (title, items, size) => (items.length ? [adfHeading(title), ...chunks(items, size)] : []);

function sourceLine(repo) {
  const status = repo.complete ? `${repo.open} alert(s), ${repo.pages} page(s), complete` : 'FAILED';
  return `${shortRepo(repo.name)}: ${status}`;
}

function summaryLine(outcome) {
  const { counts } = outcome;
  const label = outcome.firstReconciliation ? 'untriaged at first reconciliation' : 'newly untriaged';
  // Without a validated plan the number of untriaged findings is unknown, not zero.
  const untriaged = outcome.planDetermined
    ? countLine(outcome.newBySeverity)
    : `not determined (no validated plan; ${counts.alerts - counts.covered} alert(s) awaiting triage)`;
  return (
    `${counts.alerts} open alert(s) (${counts.uniqueAdvisories} advisories) · ${counts.covered} already covered · ` +
    `${label}: ${untriaged}`
  );
}

const ACTION_LABEL = {
  'proposed create': 'to create',
  created: 'created',
  'proposed extend': 'to extend',
  extended: 'extended',
  'proposed adopt': 'existing ticket; ownership to record',
  adopted: 'existing ticket; ownership recorded',
  'proposed keep': 'finding changed',
  'kept-updated': 'finding changed; note added',
};

function isReportable(group) {
  return group.action !== 'kept' && (group.action !== 'proposed keep' || Boolean(group.updateNote));
}

/** One line for recorded ownership; full detail only where ticket scope is created or extended. */
function groupEntry(group, site) {
  const target = group.ticketKey ? adfLink(group.ticketKey, browse(site, group.ticketKey)) : adfText('New ticket');
  const alerts = group.alerts.length === 1 ? `alert ${group.alerts[0]}` : `alerts ${group.alerts.join(', ')}`;
  const blocked = group.kind === 'blocked' ? ' · blocked' : '';
  const head = ` · ${ACTION_LABEL[group.action] ?? group.action} · ${titleCase(group.severity)}${blocked} · ${shortRepo(
    group.repository,
  )} · ${alerts}`;
  if (!['create', 'extend'].includes(group.operation)) {
    return [target, adfText(head)];
  }
  const lines = [head, group.summary ?? group.updateNote ?? '', `Fix: ${group.remediation ?? group.updateNote ?? '-'}`];
  lines.push(`Why: ${group.rationale}`);
  if (group.blocker) {
    lines.push(`Blocked by: ${group.blocker.reason} Recheck: ${group.blocker.recheck}`);
  }
  if (group.acceptanceCriteria) {
    lines.push(`Done when: ${group.acceptanceCriteria.join(' | ')}`);
  }
  return [target, adfText(clip(lines.filter(Boolean).join('\n'), ENTRY_BUDGET))];
}

function attentionLines(outcome) {
  return [
    ...outcome.failures.map((failure) => `Failure: ${failure}`),
    ...outcome.severityRaises.map(
      (raise) => `Severity: ${raise.ticket} ${raise.from ?? 'unset'} → ${raise.to} (${raise.alerts.join(', ')})`,
    ),
    ...outcome.needsReview.map(
      (item) =>
        `Needs review: ${alertId(item.repository, item.alert)} · candidate ${item.candidateTicket} · ${item.missingEvidence}`,
    ),
    ...outcome.closedMismatches
      .filter((item) => item.isNew)
      .map((item) => `Closed ticket, open alert: ${item.id} is owned only by ${item.tickets.join(', ')}`),
    ...outcome.ambiguous.map((item) => `Ambiguous: ${item.id} is recorded on ${item.tickets.join(', ')}`),
    ...outcome.cleared
      .filter((item) => item.isNew)
      .map((item) => `Alert closed on GitHub: ${item.id} (${item.state}) · ${item.tickets.join(', ')}`),
    ...outcome.warnings.map((warning) => `Note: ${warning.message}`),
    ...outcome.actions
      .filter((action) => action.status === 'failed' || action.status === 'uncertain')
      .map((action) => `Write ${action.status}: ${action.kind} ${action.target ?? ''} ${action.detail ?? ''}`),
  ];
}

/** Clean weeks post no comment: the hidden state and the Teams message are enough. */
export function reportNeeded(outcome) {
  return (
    !outcome.complete ||
    outcome.validationErrors.length > 0 ||
    outcome.groups.some(isReportable) ||
    attentionLines(outcome).length > 0
  );
}

function splitDocuments(sections) {
  const documents = [[]];
  for (const node of sections) {
    const current = documents.at(-1);
    if (current.length && JSON.stringify([...current, node]).length > COMMENT_BUDGET) {
      documents.push([node]);
    } else {
      current.push(node);
    }
  }
  return documents.map((content, index) => {
    const part = documents.length > 1 ? [adfParagraph(adfText(`Part ${index + 1}/${documents.length}`))] : [];
    return adfDoc([...part, ...content]);
  });
}

/** Short private run report for the control issue. Returns one or more ADF documents. */
export function runReport(outcome, config) {
  const status = outcome.complete ? 'complete' : 'INCOMPLETE';
  const rejected = outcome.validationErrors.length
    ? [
        adfHeading('Plan rejected by the validator; nothing was applied'),
        adfCode(
          clip(outcome.validationErrors.map((error) => `${error.code}: ${error.message}`).join('\n'), 6000),
          'text',
        ),
      ]
    : [];
  return splitDocuments([
    adfHeading(`Dependabot triage ${outcome.mode} · ${status} · run ${outcome.runId}`, 3),
    adfParagraph(adfText(`Sources: ${outcome.repositories.map(sourceLine).join(' · ')}`)),
    adfParagraph(adfText(summaryLine(outcome))),
    ...listSection(
      'Tickets',
      outcome.groups.filter(isReportable).map((group) => groupEntry(group, config.jiraSite)),
      5,
    ),
    ...listSection('Needs attention', attentionLines(outcome)),
    ...rejected,
  ]);
}

function istTimestamp(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

const block = (value, extra = {}) => {
  return { type: 'TextBlock', text: value, wrap: true, ...extra };
};

function limited(items, render, controlUrl) {
  const blocks = items.slice(0, TEAMS_SECTION_LIMIT).flatMap(render);
  if (items.length > TEAMS_SECTION_LIMIT) {
    const more = `+${items.length - TEAMS_SECTION_LIMIT} more in the [control issue](${controlUrl}).`;
    blocks.push(block(more, { isSubtle: true }));
  }
  return blocks;
}

function ticketHeading(config, key, severity, tail) {
  return block(`**[${key}](${browse(config.jiraSite, key)}) · ${titleCase(severity)} · ${tail}**`, {
    spacing: 'Small',
  });
}

/** "1 High finding needs attention." / "2 Critical and 1 High findings need attention." (zero counts omitted). */
export function attentionText(bySeverity) {
  const parts = ['critical', 'high']
    .filter((severity) => bySeverity[severity])
    .map((severity) => `${bySeverity[severity]} ${titleCase(severity)}`);
  const total = (bySeverity.critical ?? 0) + (bySeverity.high ?? 0);
  return total === 1
    ? `${parts.join(' and ')} finding needs attention.`
    : `${parts.join(' and ')} findings need attention.`;
}

function findingBlocks(outcome) {
  const fresh = outcome.newBySeverity;
  const label = outcome.firstReconciliation ? 'Untriaged findings (first reconciliation)' : 'New findings';
  const blocks = [];
  if (outcome.complete) {
    blocks.push(block('🐛 Dependabot found a few uninvited guests in the dependency tree.'));
  }
  blocks.push(block(`**${label}:** ${countLine(fresh)}`));
  if (!fresh.critical && !fresh.high) {
    return [...blocks, block('No new Critical or High findings.')];
  }
  const attention = `⚠️ **${attentionText(fresh)}**`;
  return [
    ...blocks,
    ...(fresh.critical ? [] : [block('No new Critical findings.')]),
    block(attention, { color: 'Attention' }),
  ];
}

function ticketSections(outcome, config, controlUrl) {
  const created = outcome.groups.filter((group) => group.action === 'created');
  const updated = outcome.groups.filter((group) => group.action === 'extended' || group.action === 'kept-updated');
  const updatedKeys = new Set(updated.map((group) => group.ticketKey));
  const raised = outcome.severityRaises.filter((raise) => raise.applied && !updatedKeys.has(raise.ticket));
  const entry = (group, line) => [
    ticketHeading(config, group.ticketKey, group.severity, shortRepo(group.repository)),
    block(line, { spacing: 'None' }),
  ];
  const blocks = [];
  if (created.length) {
    blocks.push(
      block(`**Tickets created · ${created.length}**`, { separator: true }),
      ...limited(created, (group) => entry(group, group.teamsLine), controlUrl),
    );
  }
  if (updated.length || raised.length) {
    blocks.push(
      block(`**Tickets updated · ${updated.length + raised.length}**`, { separator: true }),
      ...limited(updated, (group) => entry(group, group.teamsLine ?? group.updateNote), controlUrl),
      ...raised.map((raise) =>
        block(
          `**[${raise.ticket}](${browse(config.jiraSite, raise.ticket)})** · severity raised to ${titleCase(raise.to)}`,
        ),
      ),
    );
  }
  return blocks;
}

// Only new or materially changed blockers; unchanged historical blockers are not repeated.
function blockerBlocks(outcome, config) {
  const blockers = outcome.groups.filter((group) => group.kind === 'blocked' && group.blockerChanged);
  if (!blockers.length) {
    return [];
  }
  return [
    block(`**Blockers / no patch available · ${blockers.length}**`, { separator: true }),
    ...blockers
      .slice(0, TEAMS_SECTION_LIMIT)
      .flatMap((group) => [
        ticketHeading(config, group.ticketKey, group.severity, group.onHold ? 'On Hold' : 'Blocked, not On Hold'),
        block(`${clip(group.blocker.reason, 200)} Recheck: ${clip(group.blocker.recheck, 150)}`, { spacing: 'None' }),
        ...(group.heldVerified
          ? [block(`FYI: ${group.ticketKey} was automatically put On Hold.`, { isSubtle: true, spacing: 'None' })]
          : []),
      ]),
  ];
}

function reviewLines(outcome) {
  return [
    ...outcome.needsReview.map(
      (item) =>
        `${shortRepo(item.repository)}#${item.alert} · candidate ${item.candidateTicket}: ${item.missingEvidence}`,
    ),
    ...outcome.closedMismatches
      .filter((item) => item.isNew)
      .map((item) => `${shortRepo(item.id)} is still open but ${item.tickets.join(', ')} is closed.`),
    ...(outcome.ambiguous ?? []).map(
      (item) =>
        `${shortRepo(item.id)} is recorded on several open tickets (${item.tickets.join(', ')}); keep one owner.`,
    ),
  ];
}

/** Teams Adaptive Card using stacked labeled entries (no tables). */
export function teamsCard(outcome, config, now = new Date()) {
  const controlUrl = browse(config.jiraSite, config.controlIssue);
  const body = [block(`**Dependabot triage · ${istTimestamp(now, config.timezone)} IST**`, { size: 'Medium' })];
  if (!outcome.complete) {
    body.push(
      block('⚠️ **Dependabot triage — scan incomplete**', { color: 'Attention' }),
      ...outcome.failures.slice(0, 10).map((failure) => block(`• ${clip(failure, 300)}`)),
    );
  }
  const newTotal = SEVERITIES.reduce((sum, severity) => sum + (outcome.newBySeverity[severity] ?? 0), 0);
  const tickets = ticketSections(outcome, config, controlUrl);
  const review = reviewLines(outcome);
  if (outcome.complete && newTotal === 0 && !tickets.length && !review.length) {
    body.push(
      block('No new untriaged Dependabot findings were identified.'),
      block('🐛 The bugs took the day off. We checked anyway.'),
    );
  } else if (newTotal > 0) {
    body.push(...findingBlocks(outcome));
  }
  body.push(...tickets, ...blockerBlocks(outcome, config));
  if (review.length) {
    body.push(
      block(`**Needs review · ${review.length}**`, { separator: true }),
      ...limited(review, (line) => [block(`• ${clip(line, 300)}`)], controlUrl),
    );
  }
  const repositories = outcome.repositories.map((item) => shortRepo(item.name)).join(', ');
  const footer = block(`Repositories: ${repositories} · [Full report](${controlUrl}) · Run ID: ${outcome.runId}`, {
    isSubtle: true,
    separator: true,
    size: 'Small',
  });
  return cardEnvelope(fitCard(body, footer, controlUrl));
}

/** Drops trailing detail blocks until the card fits its byte budget; the omitted lines stay in the full report. */
function fitCard(body, footer, controlUrl) {
  const kept = [...body];
  let omitted = 0;
  const notice = () => block(`${omitted} more line(s) are in the [full report](${controlUrl}).`, { isSubtle: true });
  while (kept.length > 1 && jsonBytes(cardEnvelope([...kept, ...(omitted ? [notice()] : []), footer])) > CARD_BUDGET) {
    kept.pop();
    omitted += 1;
  }
  return [...kept, ...(omitted ? [notice()] : []), footer];
}

function cardEnvelope(body) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
          body,
        },
      },
    ],
  };
}

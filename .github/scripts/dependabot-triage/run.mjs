import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assessLock, card, changedSince, description, highest, matchFinding, normalize, textOf, adf } from './core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const directory = process.env.TRIAGE_STATE_DIR || path.join(process.env.RUNNER_TEMP || '/tmp', 'dependabot-triage');
const mode = process.env.TRIAGE_MODE || 'preview';
if (!['preview', 'automatic'].includes(mode)) throw new Error('Invalid execution mode');
const config = JSON.parse(await fs.readFile(path.join(root, '.github/dependabot-triage.json'), 'utf8'));
if (process.env.SECURITY_EPIC) config.epic = process.env.SECURITY_EPIC;
if (process.env.SECURITY_EPIC_QUARTER) config.epicQuarter = process.env.SECURITY_EPIC_QUARTER;
if (!/^[A-Z][A-Z0-9]+-\d+$/.test(config.epic)) throw new Error('Invalid security epic');
if (new URL(config.jiraSite).hostname !== 'hyland.atlassian.net')
  throw new Error('Review Jira destination before changing host');
await fs.mkdir(directory, { recursive: true });
const read = async (name, fallback) => {
  try {
    return JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
};
const save = async (name, data) => {
  const target = path.join(directory, name);
  await fs.writeFile(`${target}.tmp`, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(`${target}.tmp`, target);
};
const env = (name) => {
  if (!process.env[name]) throw new Error(`Missing ${name}; configure the dedicated Actions secret.`);
  return process.env[name];
};
async function request(base, endpoint, token, method = 'GET', body) {
  const response = await fetch(`${base}${endpoint}`, {
    method,
    signal: AbortSignal.timeout(60000),
    headers: {
      Authorization: token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'nuxeo-dependabot-triage',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  // Never include a credential, webhook, response body or customer data in an exception.
  if (!response.ok) throw new Error(`${new URL(base).hostname} ${method} request failed: HTTP ${response.status}`);
  return response.status === 204 ? {} : response.json();
}
const gh = (endpoint) => request('https://api.github.com', endpoint, `Bearer ${env('GH_TOKEN')}`);
const jira = (endpoint, method = 'GET', body) =>
  request(
    config.jiraSite,
    `/rest/api/3${endpoint}`,
    `Basic ${Buffer.from(`${env('JIRA_EMAIL')}:${env('JIRA_API_TOKEN')}`).toString('base64')}`,
    method,
    body,
  );
async function search(jql) {
  const issues = [];
  let token;
  do {
    const page = await jira('/search/jql', 'POST', {
      jql,
      fields: ['summary', 'description', 'status', 'issuelinks', config.severityField],
      maxResults: 100,
      ...(token ? { nextPageToken: token } : {}),
    });
    issues.push(...page.issues);
    token = page.isLast ? null : page.nextPageToken;
    if (!page.isLast && !token) throw new Error('Incomplete Jira pagination');
  } while (token);
  return issues;
}
async function file(repo, branch, filename) {
  let result = await gh(`/repos/${repo}/contents/${filename}?ref=${encodeURIComponent(branch)}`);
  if (result.encoding !== 'base64' && result.sha) result = await gh(`/repos/${repo}/git/blobs/${result.sha}`);
  if (result.encoding !== 'base64' || !result.content)
    throw new Error(`Unable to inspect ${repo}:${branch}:${filename}`);
  return JSON.parse(Buffer.from(result.content, 'base64').toString('utf8'));
}
const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}
async function branchEvidence(finding, repo) {
  const evidence = {};
  for (const branch of repo.branches) {
    if (!finding.manifest.endsWith('package-lock.json')) {
      evidence[branch] = { review: true, reason: 'Declaring manifest requires manual dependency-path assessment.' };
      continue;
    }
    const folder = path.posix.dirname(finding.manifest);
    const manifestPath = folder === '.' ? 'package.json' : `${folder}/package.json`;
    const [lock, manifest, patch] = await Promise.all([
      cached(`${repo.name}:${branch}:${finding.manifest}`, () => file(repo.name, branch, finding.manifest)),
      cached(`${repo.name}:${branch}:${manifestPath}`, () => file(repo.name, branch, manifestPath)),
      finding.patched
        ? cached(`${finding.package}@${finding.patched}`, async () => {
            const response = await fetch(
              `https://registry.npmjs.org/${encodeURIComponent(finding.package)}/${encodeURIComponent(finding.patched)}`,
              { signal: AbortSignal.timeout(30000) },
            );
            if (!response.ok) throw new Error('Cannot verify published npm patch metadata');
            return response.json();
          })
        : {},
    ]);
    evidence[branch] = assessLock(finding, lock, manifest, patch);
  }
  return evidence;
}
const state = await read('state.json', { version: 1, checkpoints: {}, fingerprints: {}, receipts: {}, active: null });
const phase = process.argv[2] || 'scan';
const runIdentity = `${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
const report = await read('report.json', null);

async function restore() {
  const repo = env('GITHUB_REPOSITORY');
  const defaultBranch = env('DEFAULT_BRANCH');
  let candidates;
  for (let page = 1; ; page++) {
    const response = await gh(`/repos/${repo}/actions/artifacts?per_page=100&page=${page}`);
    if (!Array.isArray(response.artifacts)) throw new Error('Incomplete artifact inventory');
    candidates = response.artifacts
      .filter(
        (a) =>
          a.name.startsWith('dependabot-triage-state-') && !a.expired && a.workflow_run?.head_branch === defaultBranch,
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
    if (candidates.length || response.artifacts.length < 100) break;
  }
  if (!candidates.length) {
    console.log('No retained state: reconcile all open alerts against Jira.');
    return;
  }
  const archive = await fetch(candidates[0].archive_download_url, {
    headers: { Authorization: `Bearer ${env('GH_TOKEN')}` },
    signal: AbortSignal.timeout(60000),
  });
  if (!archive.ok) throw new Error('Prior state download failed; refusing an empty-state fallback');
  const zip = path.join(directory, 'prior-state.zip');
  await fs.writeFile(zip, Buffer.from(await archive.arrayBuffer()));
  const content = execFileSync('unzip', ['-p', zip, 'state.json'], { maxBuffer: 20 * 1024 * 1024 });
  const restored = JSON.parse(content);
  if (restored.version !== 1 || !restored.checkpoints || !restored.receipts)
    throw new Error('Unsupported/corrupt prior state');
  await save('state.json', restored);
  console.log(`Restored durable state from artifact ${candidates[0].id}.`);
}

async function gate() {
  let shouldRun = true;
  if (process.env.SCHEDULE_TRIGGER === '30 * * * *') {
    const due = process.env.TRIAGE_ONE_TIME_AT;
    if (due && !Number.isFinite(Date.parse(due))) throw new Error('TRIAGE_ONE_TIME_AT must be an ISO timestamp');
    shouldRun = Boolean(due && Date.now() >= Date.parse(due) && state.oneTimeCompleted !== due);
  }
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `run=${shouldRun}\n`);
  console.log(shouldRun ? 'Triage is due.' : 'No one-time triage is due.');
}

async function scan() {
  if (state.active?.notification?.status === 'confirmed' && state.active.originRun !== process.env.GITHUB_RUN_ID) {
    state.active = null; // A delivered incomplete scan is history; a later scheduled run gets a fresh summary.
  }
  const started = state.active?.started || new Date().toISOString();
  const run = {
    id: state.active?.id || `dependabot-${runIdentity}`,
    started,
    alerts: [],
    covered: [],
    groups: [],
    blockers: [],
    review: [],
    newFindings: [],
    failures: [],
    reviewFindings: [],
  };
  if (state.active && state.active.mode !== mode)
    throw new Error('Pending run uses another execution mode; resolve it before changing modes');
  try {
    const date = new Date().toLocaleDateString('en-CA', { timeZone: config.timezone });
    const quarter = `${date.slice(0, 4)}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`;
    if (quarter !== config.epicQuarter)
      throw new Error(`Update SECURITY_EPIC and SECURITY_EPIC_QUARTER for ${quarter} before filing tickets`);
    const epic = await jira(`/issue/${config.epic}?fields=issuetype,status`);
    if (epic.fields.issuetype.name !== 'Epic' || epic.fields.status.statusCategory.key === 'done')
      throw new Error('Configured security epic is missing, closed or not an Epic');
    const issues = await search(`parent = ${config.epic} ORDER BY key ASC`);
    for (const repo of config.repositories) {
      const raw = [];
      for (let page = 1; ; page++) {
        const values = await gh(`/repos/${repo.name}/dependabot/alerts?state=open&per_page=100&page=${page}`);
        if (!Array.isArray(values)) throw new Error('Unexpected GitHub alerts response');
        raw.push(...values);
        if (values.length < 100) break;
      }
      for (const value of raw) {
        const finding = { ...normalize(repo.name, value), project: repo.project, severityField: config.severityField };
        finding.changed = changedSince(
          finding,
          state.checkpoints[mode],
          config.overlapHours,
          state.fingerprints[mode] || {},
        );
        run.alerts.push(finding);
        let match = matchFinding(finding, issues);
        if (match.kind === 'new') {
          const prior = await search(`project = ${repo.project} AND text ~ "${finding.ghsa}" ORDER BY updated DESC`);
          match = matchFinding(finding, [...issues, ...prior.filter((p) => !issues.some((i) => i.key === p.key))]);
        }
        if (match.kind === 'covered') {
          run.covered.push({
            alert: finding.id,
            ticket: match.ticket.key,
            evidence: `${finding.url}, ${finding.ghsa}, ${finding.manifest}; current severity adequate.`,
          });
          // Reassess no-patch blockers every run, not just timestamp-window changes.
          const text = textOf(match.ticket.fields.description);
          if (
            !finding.patched ||
            match.ticket.fields.status.name === config.holdStatus ||
            /blocked.*publish|publishing.*block|Blocking dependency|Blocker and recheck criteria/i.test(text)
          ) {
            run.blockers.push({
              ticket: match.ticket.key,
              severity: match.ticket.fields[config.severityField].value.toLowerCase(),
              package: finding.package,
              blocker: !finding.patched
                ? 'No patched release listed; reassess mitigation/upstream.'
                : 'Existing remediation blocker; recheck the ticket, compatible parent upgrades and upstream publishing.',
              status: match.ticket.fields.status.name,
              existing: true,
            });
          }
          if (finding.patched && match.ticket.fields.status.name === config.holdStatus) {
            const assessment = await branchEvidence(finding, repo);
            if (Object.values(assessment).every((e) => !e.blocked && !e.review)) {
              run.review.push(
                `${match.ticket.key}: a usable patch candidate is now available; review resuming from On Hold.`,
              );
            }
          }
          continue;
        }
        if (match.kind === 'closed' || match.kind === 'ambiguous') {
          run.reviewFindings.push(finding);
          run.review.push(
            `${finding.id}: ${match.kind} coverage; review ${match.ticket?.key || match.tickets.map((i) => i.key).join(', ')}.`,
          );
          continue;
        }
        if (match.kind === 'update') {
          finding.branchEvidence = {
            review: { review: true, reason: 'Existing ticket severity/scope requires review.' },
          };
          run.newFindings.push(finding);
          // Never infer retained-ticket scope or change its severity blindly without a full finding register.
          run.review.push(
            `${finding.id}: ${match.ticket.key} needs Defect Severity/scope review; no duplicate ticket proposed.`,
          );
          continue;
        }
        const related = await search(
          `project = ${repo.project} AND statusCategory != Done AND summary ~ "${finding.package.replace(/[^a-zA-Z0-9-]/g, ' ')}"`,
        );
        if (related.some((i) => textOf(i.fields.description).includes(finding.package))) {
          finding.branchEvidence = {
            review: { review: true, reason: 'Possible extension of existing remediation scope.' },
          };
          run.newFindings.push(finding);
          run.review.push(
            `${finding.id}: possible same-package follow-up in ${related.map((i) => i.key).join(', ')}; propose extending existing scope after review.`,
          );
          continue;
        }
        finding.branchEvidence = await branchEvidence(finding, repo);
        run.newFindings.push(finding);
        if (Object.values(finding.branchEvidence).some((b) => b.review))
          run.review.push(`${finding.id}: branch/dependency-path assessment required; no automatic ticket.`);
      }
    }
    const { groupFindings } = await import('./core.mjs');
    run.groups = groupFindings(run.newFindings);
    run.blockers = run.blockers.filter((g, i, all) => all.findIndex((a) => a.ticket === g.ticket) === i);
    if (state.active?.notification?.status === 'reserved' && state.active.notification.attempt !== runIdentity) {
      if (
        process.env.DELIVERY_RESOLUTION === 'delivered' &&
        process.env.DELIVERY_MESSAGE_URL?.startsWith('https://teams.microsoft.com/')
      ) {
        state.active.notification.status = 'confirmed';
        state.active.notification.receipt = process.env.DELIVERY_MESSAGE_URL;
      } else if (process.env.DELIVERY_RESOLUTION === 'not-delivered') state.active.notification = null;
      else
        run.failures.push(
          'Prior Teams delivery is uncertain. Verify the Run ID in Teams, then resolve manually; no automatic resend.',
        );
    }
  } catch (e) {
    run.failures.push(e.message);
  }
  const uncertainGroups =
    state.active?.attempt && state.active.attempt !== runIdentity
      ? [...new Set([...(state.active.uncertainGroups || []), ...(state.active.plannedKeys || [])])]
      : state.active?.uncertainGroups || [];
  state.active = {
    ...state.active,
    attempt: runIdentity,
    plannedKeys: run.groups.map((group) => group.key),
    uncertainGroups,
    id: run.id,
    started,
    mode,
    originRun: process.env.GITHUB_RUN_ID,
    oneTimeAt: process.env.SCHEDULE_TRIGGER === '30 * * * *' ? process.env.TRIAGE_ONE_TIME_AT : state.active?.oneTimeAt,
  };
  // Save intent before any external write. A retry re-queries Jira before every action.
  await save('state.json', state);
  await save('report.json', run);
  await render(run);
  console.log(
    `${run.alerts.length} reviewed; ${run.covered.length} covered; ${run.newFindings.length} new; ${run.groups.length} groups; ${run.failures.length} failures.`,
  );
}

async function reconcileGroup(group, repo) {
  const issues = await search(`project = ${repo.project} AND text ~ "${group.key}" ORDER BY created ASC`);
  const exact = issues.filter((i) => textOf(i.fields.description).includes(`Triage remediation key: ${group.key}`));
  if (exact.length > 1) throw new Error(`Multiple tickets for remediation key ${group.key}; review required`);
  if (exact.length) return exact[0];
  return null;
}
async function hold(ticket, reason, key) {
  const current = await jira(`/issue/${ticket}?fields=status`);
  if (current.fields.status.name !== config.holdStatus) {
    const available = await jira(`/issue/${ticket}/transitions`);
    const transition = available.transitions.find((t) => t.to.name === config.holdStatus);
    if (!transition) throw new Error(`No ${config.holdStatus} transition available for ${ticket}`);
    await jira(`/issue/${ticket}/transitions`, 'POST', { transition: { id: transition.id } });
  }
  const marker = `Triage hold key: ${key}`;
  const comments = [];
  for (let start = 0; ; start += 100) {
    const page = await jira(`/issue/${ticket}/comment?startAt=${start}&maxResults=100`);
    comments.push(...page.comments);
    if (start + page.comments.length >= page.total) break;
  }
  const previous = comments.find((c) => textOf(c.body).includes(marker));
  const body = adf(
    `Reason for On Hold\n${reason}\nSeverity remains unchanged. No risk acceptance or alert dismissal is implied.\nRecheck upstream fixes, compatible parent upgrades and publishing dependencies. Engineering can investigate mitigation while held.\n${marker}`,
  );
  body.content[0] = { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Reason for On Hold' }] };
  if (!previous) await jira(`/issue/${ticket}/comment`, 'POST', { body });
  else if (textOf(previous.body) !== textOf(body))
    await jira(`/issue/${ticket}/comment/${previous.id}`, 'PUT', { body });
  const verified = await jira(`/issue/${ticket}?fields=status`);
  if (verified.fields.status.name !== config.holdStatus) throw new Error(`Hold status did not persist for ${ticket}`);
}

async function apply() {
  if (!report) throw new Error('Scan report missing');
  if (mode === 'preview') {
    console.log('Preview: no Jira writes or Teams sends.');
    return;
  }
  if (process.env.ALLOW_AUTOMATIC !== 'true' || process.env.GITHUB_REF_NAME !== process.env.DEFAULT_BRANCH)
    throw new Error('Automatic writes require explicit approval and the default branch');
  if (report.failures.length) return;
  try {
    for (const group of report.groups) {
      const repo = config.repositories.find((r) => r.name === group.repository);
      let existing = await reconcileGroup(group, repo);
      if (!existing && state.active.uncertainGroups?.includes(group.key))
        throw new Error(`Uncertain prior create for ${group.key}; verify Jira indexing before any retry.`);
      if (existing?.fields.status.statusCategory.key === 'done')
        throw new Error(`Closed ticket ${existing.key} still matches; review before updating`);
      const document = description(group, config);
      let ticket;
      if (existing) {
        // Only machine-owned finding sections are rewritten. Human-modified bodies require manual review.
        const receipt = state.receipts[group.key];
        if (!receipt || receipt.descriptionHash !== hashDocument(existing.fields.description)) {
          report.review.push(`${existing.key}: existing body changed or not owned by this workflow; update manually.`);
          group.ticket = existing.key;
          continue;
        }
        const retained = report.alerts.filter((a) => textOf(existing.fields.description).includes(a.url));
        const actualSeverity = highest([...group.findings, ...retained].map((f) => f.severity));
        if (actualSeverity !== group.severity)
          throw new Error(`Retained findings require higher severity for ${existing.key}`);
        // Preserve old finding rows unless they were explicitly reconciled into this group.
        if (retained.some((a) => !group.findings.some((f) => f.id === a.id))) {
          report.review.push(`${existing.key}: additional retained findings need scope review; no automatic rewrite.`);
          group.ticket = existing.key;
          continue;
        }
        await jira(`/issue/${existing.key}`, 'PUT', {
          fields: { description: document, [config.severityField]: { id: config.severityOptions[group.severity] } },
        });
        ticket = existing.key;
        group.action = 'updated';
      } else {
        const result = await jira('/issue', 'POST', {
          fields: {
            project: { key: repo.project },
            issuetype: { name: config.issueType },
            parent: { key: config.epic },
            summary: group.summary,
            description: document,
            components: [{ name: repo.component }],
            labels: [...config.labels, group.key],
            [config.severityField]: { id: config.severityOptions[group.severity] },
            ...(config.priorityBySeverity ? { priority: { name: config.priorityBySeverity[group.severity] } } : {}),
          },
        });
        ticket = result.key;
        group.action = 'created';
      }
      group.ticket = ticket;
      const check = await jira(`/issue/${ticket}?fields=description,parent,${config.severityField}`);
      if (
        check.fields.parent.key !== config.epic ||
        check.fields[config.severityField].id !== config.severityOptions[group.severity]
      )
        throw new Error(`Jira scope/severity verification failed for ${ticket}`);
      state.receipts[group.key] = { ticket, descriptionHash: hashDocument(check.fields.description), run: report.id };
      await save('state.json', state);
      if (group.blocked)
        await hold(
          ticket,
          group.findings
            .map(
              (f) =>
                `${f.url}: ${Object.values(f.branchEvidence)
                  .map((b) => b.reason)
                  .join('; ')}`,
            )
            .join('\n'),
          group.key,
        );
    }
    for (const blocker of report.blockers) {
      if (blocker.status !== config.holdStatus) await hold(blocker.ticket, blocker.blocker, blocker.ticket);
      blocker.status = config.holdStatus;
    }
  } catch (e) {
    report.failures.push(`Jira processing: ${e.message}`);
  }
  await save('report.json', report);
  await render(report);
}
function hashDocument(document) {
  return JSON.stringify(document);
}
async function render(value) {
  await save('teams-payload.json', card(value, config, mode));
  const counts = Object.fromEntries(
    ['critical', 'high', 'medium', 'low'].map((s) => [s, value.newFindings.filter((f) => f.severity === s).length]),
  );
  const lines = [
    `# Dependabot triage — ${value.started}`,
    '',
    `Mode: ${mode}`,
    `Run ID: ${value.id}`,
    `Status: ${value.failures.length ? 'INCOMPLETE' : 'scan complete'}`,
    `${value.alerts.length} open reviewed; ${value.covered.length} covered; ${value.newFindings.length} newly untriaged.`,
    `GitHub severity counts: ${JSON.stringify(counts)}`,
    `Proposed new ticket groups: ${value.groups.filter((g) => !g.ticket).length}`,
    '',
    ...value.groups.flatMap((g) => [
      `## ${g.summary}`,
      `Repository: ${g.repository}; severity: ${g.severity}; Jira: ${g.ticket || 'proposed'}`,
      g.reason,
      ...g.findings.flatMap((f) => [
        `- [Alert ${f.number}](${f.url}) — ${f.package}, ${f.severity}, ${f.cve || 'no CVE'}, [${f.ghsa}](https://github.com/advisories/${f.ghsa}), ${f.manifest}`,
        ...Object.entries(f.branchEvidence).map(([b, e]) => `  - ${b}: ${e.reason}`),
      ]),
    ]),
    '## Covered findings',
    ...value.covered.map((c) => `- ${c.alert} → [${c.ticket}](${config.jiraSite}/browse/${c.ticket}): ${c.evidence}`),
    '## Existing blockers',
    ...value.blockers.map((b) => `- [${b.ticket}](${config.jiraSite}/browse/${b.ticket}): ${b.blocker} (${b.status})`),
    '## Needs review',
    ...value.review.map((r) => `- ${r}`),
    '## Failures',
    ...value.failures.map((f) => `- ${f}`),
    '',
    'Full reconciliation runs every time. Checkpoint and overlap prioritize detailed reviews; alert age never proves coverage.',
  ];
  await fs.writeFile(path.join(directory, 'report.md'), `${lines.join('\n')}\n`);
}
async function prepareNotification() {
  if (mode === 'preview') return;
  if (process.env.ALLOW_AUTOMATIC !== 'true' || process.env.GITHUB_REF_NAME !== process.env.DEFAULT_BRANCH)
    throw new Error('Automatic notification is not authorized');
  if (!report || !state.active) throw new Error('No active report');
  if (state.active.notification?.status === 'confirmed') return;
  if (state.active.notification?.status === 'reserved' && state.active.notification.attempt !== runIdentity) return;
  state.active.notification = { status: 'reserved', attempt: runIdentity };
  await save('state.json', state);
}
async function notify() {
  if (mode === 'preview') return;
  if (process.env.ALLOW_AUTOMATIC !== 'true' || process.env.GITHUB_REF_NAME !== process.env.DEFAULT_BRANCH)
    throw new Error('Automatic notification is not authorized');
  if (!report || !state.active) throw new Error('No active report');
  const delivery = state.active.notification;
  if (delivery?.status === 'confirmed') {
    console.log('Already delivered; not sending again.');
    return;
  }
  if (delivery?.status !== 'reserved' || delivery.attempt !== runIdentity)
    throw new Error('Uncertain prior delivery; no automatic resend');
  const webhook = new URL(env('DEPENDABOT_TEAMS_WEBHOOK_URL'));
  if (webhook.protocol !== 'https:') throw new Error('Webhook must use HTTPS');
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await fs.readFile(path.join(directory, 'teams-payload.json'), 'utf8'),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Teams delivery uncertain: HTTP ${response.status}; do not blindly retry`);
  state.active.notification = { status: 'confirmed', attempt: runIdentity, acceptedAt: new Date().toISOString() };
  await save('state.json', state);
  console.log('Dedicated Teams webhook accepted the summary.');
}
async function finish() {
  if (!report) throw new Error('Report missing');
  const deliveryComplete = mode === 'preview' || state.active?.notification?.status === 'confirmed';
  if (!report.failures.length && deliveryComplete) {
    state.checkpoints[mode] = report.started; // scan start, not finish: trigger-day alerts remain eligible.
    state.fingerprints[mode] = Object.fromEntries(report.alerts.map((a) => [a.id, a.fingerprint]));
    if (state.active?.oneTimeAt) state.oneTimeCompleted = state.active.oneTimeAt;
    state.active = null;
    await save('state.json', state);
    console.log('Successful checkpoint saved.');
  } else {
    await save('state.json', state);
    throw new Error('Incomplete run; last successful checkpoint retained');
  }
}
try {
  await { restore, gate, scan, apply, 'prepare-notification': prepareNotification, notify, finish }[phase]();
} catch (e) {
  if (report && !report.failures.includes(e.message)) {
    report.failures.push(e.message);
    await save('report.json', report);
    await render(report);
  }
  console.error(e.message);
  process.exitCode = 1;
}

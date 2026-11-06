import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assessLock,
  automaticAuthorized,
  relatedRemediation,
  card,
  changedSince,
  description,
  highest,
  matchFinding,
  normalize,
  textOf,
  adf,
  owningScope,
  hash,
} from './core.mjs';

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
async function request(base, endpoint, token, method = 'GET', body, metadata = false) {
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
  if (!response.ok) {
    const error = new Error(`${new URL(base).hostname} ${method} request failed: HTTP ${response.status}`);
    error.status = response.status;
    error.service = new URL(base).hostname;
    error.method = method;
    throw error;
  }
  const data = response.status === 204 ? {} : await response.json();
  return metadata ? { data, link: response.headers.get('link') } : data;
}
const gh = (endpoint, metadata = false) =>
  request('https://api.github.com', endpoint, `Bearer ${env('GH_TOKEN')}`, 'GET', undefined, metadata);
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
  const workflow = await gh(`/repos/${repo}/actions/workflows/dependabot-triage.yaml`);
  if (workflow.path !== '.github/workflows/dependabot-triage.yaml') throw new Error('Unexpected state workflow');
  const trustedRuns = [];
  for (let page = 1; ; page++) {
    // Unfiltered workflow history avoids the repository-wide artifact scan and
    // the search-result cap on filtered workflow-run queries.
    const response = await gh(`/repos/${repo}/actions/workflows/${workflow.id}/runs?per_page=100&page=${page}`);
    if (!Array.isArray(response.workflow_runs)) throw new Error('Incomplete workflow-run inventory');
    for (const run of response.workflow_runs) {
      if (
        run.repository?.full_name === repo &&
        run.head_repository?.full_name === repo &&
        run.workflow_id === workflow.id &&
        run.path === workflow.path &&
        ['schedule', 'workflow_dispatch'].includes(run.event) &&
        (run.head_branch === defaultBranch ||
          (run.event === 'workflow_dispatch' &&
            /^[a-f0-9]{40}$/.test(process.env.APPROVED_PREMERGE_SHA || '') &&
            run.head_sha === process.env.APPROVED_PREMERGE_SHA)) &&
        Number.isFinite(Date.parse(run.updated_at))
      )
        trustedRuns.push(run);
    }
    if (response.workflow_runs.length < 100) break;
  }
  trustedRuns.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at) || b.id - a.id);
  let latest;
  for (const run of trustedRuns) {
    // A completed run cannot gain artifacts after its last update. Keep a
    // one-minute overlap for timestamp precision and delayed metadata updates.
    if (latest && Date.parse(run.updated_at) + 60000 < Date.parse(latest.created_at)) break;
    for (let page = 1; ; page++) {
      const response = await gh(`/repos/${repo}/actions/runs/${run.id}/artifacts?per_page=100&page=${page}`);
      if (!Array.isArray(response.artifacts)) throw new Error('Incomplete workflow artifact inventory');
      for (const artifact of response.artifacts) {
        if (!artifact.name.startsWith('dependabot-triage-state-') || artifact.expired) continue;
        if (!Number.isFinite(Date.parse(artifact.created_at))) throw new Error('Invalid artifact timestamp');
        if (
          !latest ||
          Date.parse(artifact.created_at) > Date.parse(latest.created_at) ||
          (artifact.created_at === latest.created_at && artifact.id > latest.id)
        )
          latest = artifact;
      }
      if (response.artifacts.length < 100) break;
    }
  }
  const candidates = latest ? [latest] : [];
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

async function recoverNotification(notification) {
  if (!notification.snapshot || !notification.payload)
    throw new Error('Prior notification has no immutable snapshot; manual recovery is required.');
  state.active.recovery = true;
  const original = structuredClone(notification.snapshot);
  await save('state.json', state);
  await save('report.json', original);
  await render(original);
  await save('teams-payload.json', notification.payload);
  console.log('Recovering only the original notification; new alerts wait for a separate scan.');
}

async function scan() {
  if (mode === 'automatic' && !automaticAuthorized(process.env))
    throw new Error('Automatic runs require approval and the default branch or an approved manual commit');
  if (state.active && state.active.mode !== mode)
    throw new Error('Pending run uses another execution mode; resolve it before changing modes');
  const completed = state.completedRuns?.[`${mode}:${process.env.GITHUB_RUN_ID}`];
  if (completed) {
    if (state.active) throw new Error('Another notification cycle is pending; cannot replay a completed run.');
    state.active = { mode, recovery: true, notification: completed };
    await recoverNotification(completed);
    return;
  }
  if (Number(process.env.TRIAGE_RUN_NUMBER) && Number(process.env.TRIAGE_RUN_NUMBER) <= (state.completedRunNumber || 0))
    throw new Error('Completed-run replay expired; dispatch a new workflow run instead.');
  state.createIntents ||= {};
  // Migrate older pre-write journals before retiring any notification cycle.
  if (state.active?.mode === 'automatic') {
    for (const key of state.active.plannedKeys || []) state.createIntents[key] ||= { attempt: state.active.attempt };
  }
  const notification = state.active?.notification;
  if (notification?.status === 'reserved' && notification.attempt !== runIdentity) {
    if (!notification.snapshot || !notification.payload)
      throw new Error('Prior notification has no immutable snapshot; manual recovery is required.');
    const resolution = process.env.DELIVERY_RESOLUTION;
    if (resolution === 'delivered' && process.env.DELIVERY_MESSAGE_URL?.startsWith('https://teams.microsoft.com/')) {
      notification.status = 'confirmed';
      notification.receipt = process.env.DELIVERY_MESSAGE_URL;
    } else if (resolution === 'not-delivered') notification.attempt = runIdentity;
    else throw new Error('Prior Teams delivery is uncertain; verify it and provide a delivery resolution.');
    await recoverNotification(notification);
    return;
  }
  if (notification?.status === 'confirmed') {
    if (notification.snapshot && !notification.snapshot.failures.length) {
      await recoverNotification(notification);
      return;
    }
    state.active = null;
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
    carriedActions: Object.values(state.pendingOutcomes || {}),
    updates: [],
    existingReviews: [],
  };
  if (state.active && state.active.mode !== mode)
    throw new Error('Pending run uses another execution mode; resolve it before changing modes');
  const blockerCandidates = new Map();
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
      let cursor = null;
      const seen = new Set();
      do {
        const endpoint = `/repos/${repo.name}/dependabot/alerts?state=open&per_page=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`;
        const { data: values, link } = await gh(endpoint, true);
        if (!Array.isArray(values)) throw new Error('Unexpected GitHub alerts response');
        raw.push(...values);
        const next = link?.match(/<([^>]+)>;\s*rel="next"/);
        cursor = null;
        if (next) {
          const url = new URL(next[1]);
          if (url.origin !== 'https://api.github.com') throw new Error('Unsafe Dependabot pagination origin');
          cursor = url.searchParams.get('after');
          if (!cursor || seen.has(cursor)) throw new Error('Incomplete/repeated Dependabot cursor');
          seen.add(cursor);
        }
      } while (cursor);
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
          const candidate = blockerCandidates.get(match.ticket.key) || { ticket: match.ticket, findings: [] };
          candidate.findings.push({ finding, repo });
          blockerCandidates.set(match.ticket.key, candidate);
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
          finding.branchEvidence = await branchEvidence(finding, repo);
          finding.triageReview = true;
          const actualSeverity = match.ticket.fields[config.severityField]?.value?.toLowerCase();
          run.updates.push({
            ticket: match.ticket.key,
            repository: finding.repository,
            package: finding.package,
            severity: highest([actualSeverity, finding.severity]),
            currentSeverity: actualSeverity || null,
            isProposal: true,
            findings: [finding],
            reason: 'Review Defect Severity and explicit finding scope; never downgrade to fit an existing ticket.',
          });
          run.newFindings.push(finding);
          // Never infer retained-ticket scope or change its severity blindly without a full finding register.
          run.review.push(
            `${finding.id}: ${match.ticket.key} needs Defect Severity/scope review; no duplicate ticket proposed.`,
          );
          continue;
        }
        finding.branchEvidence = await branchEvidence(finding, repo);
        run.newFindings.push(finding);
        const names = new Set([
          finding.package,
          ...Object.values(finding.branchEvidence).flatMap((b) =>
            (b.evidence || [])
              .filter((e) => e.requiresParentUpgrade)
              .flatMap((e) => e.parents.filter((p) => p.name !== '(root)').map((p) => p.name)),
          ),
        ]);
        const pages = await Promise.all(
          [...names].map((name) =>
            cached(`related:${repo.project}:${name}`, () =>
              search(
                `project = ${repo.project} AND statusCategory != Done AND summary ~ "${name.replace(/[^a-zA-Z0-9-]/g, ' ')}"`,
              ),
            ),
          ),
        );
        const pool = [...new Map([...issues, ...pages.flat()].map((i) => [i.key, i])).values()];
        const related = relatedRemediation(finding, pool);
        if (related.length) {
          finding.triageReview = true;
          finding.relatedTickets = related.map(({ ticket, kind, reason }) => {
            return { ticket, kind, reason };
          });
          for (const candidate of related) {
            let update = run.updates.find((u) => u.ticket === candidate.ticket);
            const existingSeverity = candidate.issue.fields[config.severityField]?.value?.toLowerCase();
            if (!['critical', 'high', 'medium', 'low'].includes(existingSeverity)) {
              run.review.push(`${candidate.ticket}: Defect Severity needs review before adding ${finding.id}.`);
            }
            if (!update) {
              update = {
                ticket: candidate.ticket,
                repository: finding.repository,
                package: finding.package,
                severity: existingSeverity || finding.severity,
                currentSeverity: existingSeverity || null,
                isProposal: true,
                findings: [],
                reason: candidate.reason,
              };
              run.updates.push(update);
            }
            update.findings.push(finding);
            update.severity = highest([update.severity, finding.severity]);
            const confirmedNoPatch =
              Object.values(finding.branchEvidence).length &&
              Object.values(finding.branchEvidence).every((b) => b.noPatch && !b.review);
            if (
              confirmedNoPatch &&
              candidate.kind === 'same_package' &&
              /no patched|unpatched|no patch/i.test(owningScope(candidate.issue))
            ) {
              let blocker = run.blockers.find((b) => b.ticket === candidate.ticket && b.referenceOnly);
              if (!blocker) {
                blocker = {
                  ticket: candidate.ticket,
                  package: finding.package,
                  severity: finding.severity,
                  blocker:
                    'New finding shares the confirmed missing-patch blocker; extend existing scope after review.',
                  status: candidate.issue.fields.status.name,
                  existing: true,
                  referenceOnly: true,
                  isProposal: true,
                  currentSeverity: existingSeverity || null,
                  findings: [],
                  newFindingIds: [],
                };
                run.blockers.push(blocker);
              }
              blocker.newFindingIds.push(finding.id);
              blocker.findings.push(finding);
              blocker.severity = highest([blocker.severity, finding.severity]);
            }
          }
          run.review.push(
            `${finding.id}: review scope extension in ${related.map((r) => r.ticket).join(', ')}; no duplicate ticket created.`,
          );
        } else if (Object.values(finding.branchEvidence).some((b) => b.review)) {
          run.review.push(
            `${finding.id}: ${[
              ...new Set(
                Object.values(finding.branchEvidence)
                  .filter((b) => b.review)
                  .map((b) => b.reason),
              ),
            ].join(' ')}`,
          );
        }
      }
    }
    const { groupFindings } = await import('./core.mjs');
    run.groups = groupFindings(run.newFindings);
    const updateProposals = new Map();
    for (const proposal of run.updates) {
      const previous = updateProposals.get(proposal.ticket);
      if (!previous) updateProposals.set(proposal.ticket, proposal);
      else {
        previous.severity = highest([previous.severity, proposal.severity]);
        previous.findings = [...new Map([...previous.findings, ...proposal.findings].map((f) => [f.id, f])).values()];
        if (previous.reason !== proposal.reason) previous.reason += ` ${proposal.reason}`;
      }
    }
    run.updates = [...updateProposals.values()];
    for (const { ticket, findings } of blockerCandidates.values()) {
      const scope = owningScope(ticket);
      const candidate =
        ticket.fields.status.name === config.holdStatus ||
        findings.some(({ finding }) => !finding.patched) ||
        /blocked.*publish|publishing.*block|Blocking dependency|Blocker and recheck criteria/i.test(scope);
      if (!candidate) continue;
      const referenced = [...scope.matchAll(/https:\/\/github\.com\/[^\s)]+\/security\/dependabot\/\d+/g)].map(
        (m) => m[0],
      );
      const complete = referenced.every((url) => findings.some(({ finding }) => finding.url === url));
      const assessments = await Promise.all(
        findings.map(async ({ finding, repo }) => {
          return {
            finding,
            evidence: await branchEvidence(finding, repo),
          };
        }),
      );
      const allBlocked =
        complete &&
        assessments.every(
          ({ evidence }) =>
            Object.values(evidence).some((e) => e.blocked) && !Object.values(evidence).some((e) => e.review),
        );
      if (!allBlocked) {
        run.existingReviews.push(
          `${ticket.key}: current automated evidence does not confirm a ticket-wide blocker; review external dependencies and hold status. No automatic transition.`,
        );
        continue;
      }
      run.blockers.push({
        ticket: ticket.key,
        severity: ticket.fields[config.severityField].value.toLowerCase(),
        package: [...new Set(findings.map(({ finding }) => finding.package))].join(', '),
        blocker: assessments
          .flatMap(({ finding, evidence }) =>
            Object.entries(evidence).map(([branch, e]) => `${finding.url} (${branch}): ${e.reason}`),
          )
          .join('\n'),
        status: ticket.fields.status.name,
        existing: true,
      });
    }
  } catch (e) {
    run.failures.push(e.message);
  }
  state.active = {
    id: run.id,
    started,
    mode,
    attempt: runIdentity,
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
  const known = state.createIntents[group.key]?.ticket;
  if (known) return jira(`/issue/${known}?fields=summary,description,status,${config.severityField}`);
  const fresh = [];
  for (const finding of group.findings) {
    const matches = await search(`project = ${repo.project} AND text ~ "${finding.ghsa}" ORDER BY updated DESC`);
    fresh.push(...matches.filter((m) => !fresh.some((i) => i.key === m.key)));
  }
  const coverage = group.findings.map((finding) => matchFinding(finding, fresh));
  if (coverage.some((match) => match.kind !== 'new')) {
    if (state.createIntents[group.key]?.attempt === runIdentity) {
      delete state.createIntents[group.key];
      await save('state.json', state);
    }
    throw new Error(
      `Fresh alert/advisory coverage found for ${group.key}; review existing human scope before creating.`,
    );
  }
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

async function durableWriteJournal() {
  state.journalSequence = (state.journalSequence || 0) + 1;
  await save('state.json', state);
  const { DefaultArtifactClient } = await import('@actions/artifact');
  await new DefaultArtifactClient().uploadArtifact(
    `dependabot-triage-state-${runIdentity}-write-${state.journalSequence}`,
    [path.join(directory, 'state.json')],
    directory,
    { retentionDays: 90 },
  );
}
function pendingOutcome(key, intent) {
  if (!intent.group)
    throw new Error(`Missing reporting snapshot for recovered create ${key}; manual reconciliation required.`);
  state.pendingOutcomes ||= {};
  state.pendingOutcomes[key] ||= { ...intent.group, ticket: intent.ticket, action: 'created' };
}
function acknowledgeOutcomes(notification) {
  for (const key of notification.outcomeKeys || []) {
    delete state.pendingOutcomes?.[key];
    if (state.createIntents?.[key]?.ticket) delete state.createIntents[key];
  }
}

async function apply() {
  if (!report) throw new Error('Scan report missing');
  if (mode === 'preview') {
    console.log('Preview: no Jira writes or Teams sends.');
    return;
  }
  if (!automaticAuthorized(process.env)) throw new Error('Automatic Jira actions are not authorized');
  if (report.failures.length || state.active?.recovery) return;
  try {
    for (const [key, intent] of Object.entries(state.createIntents || {})) {
      if (intent.ticket) {
        pendingOutcome(key, intent);
        continue;
      }
      const matches = await search(`text ~ "${key}" ORDER BY created ASC`);
      const exact = matches.filter((i) => textOf(i.fields.description).includes(`Triage remediation key: ${key}`));
      if (exact.length !== 1) throw new Error(`Uncertain prior create for ${key}; reconcile Jira before retrying.`);
      intent.ticket = exact[0].key;
      pendingOutcome(key, intent);
      await durableWriteJournal();
    }
    for (const group of report.groups) {
      const repo = config.repositories.find((r) => r.name === group.repository);
      let existing = await reconcileGroup(group, repo);
      if (!existing && state.createIntents[group.key])
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
        state.createIntents[group.key] = { status: 'reserved', group: structuredClone(group) };
        try {
          await durableWriteJournal();
        } catch (error) {
          delete state.createIntents[group.key];
          await save('state.json', state);
          throw error;
        }
        let result;
        try {
          result = await jira('/issue', 'POST', {
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
        } catch (error) {
          if (
            error.service === new URL(config.jiraSite).hostname &&
            error.method === 'POST' &&
            [400, 401, 403, 404, 405, 413, 415, 422].includes(error.status)
          ) {
            delete state.createIntents[group.key];
            await durableWriteJournal();
          }
          throw error;
        }
        ticket = result.key;
        state.createIntents[group.key].ticket = ticket;
        pendingOutcome(group.key, state.createIntents[group.key]);
        await durableWriteJournal();
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
          ticket,
        );
      if (group.blocked) group.holdConfirmed = true;
    }
    for (const blocker of report.blockers) {
      if (blocker.referenceOnly) continue;
      await hold(blocker.ticket, blocker.blocker, blocker.ticket);
      blocker.status = config.holdStatus;
    }
  } catch (e) {
    report.failures.push(`Jira processing: ${e.message}`);
  }
  report.carriedActions = Object.values(state.pendingOutcomes || {}).filter(
    (g) => !report.groups.some((current) => current.key === g.key && current.action),
  );
  await save('report.json', report);
  await render(report);
}
function hashDocument(document) {
  return hash(document);
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
    `Tickets created: ${value.groups.filter((g) => g.action === 'created').length}; updated: ${value.groups.filter((g) => g.action === 'updated').length}; proposed: ${value.groups.filter((g) => !g.ticket).length}; existing scope updates proposed: ${(value.updates || []).length}`,
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
    '## Untriaged alert assessments',
    ...value.newFindings.flatMap((f) => [
      `### ${f.id} — ${f.package} (${f.severity})`,
      `Manifest: ${f.manifest}; advisory: ${f.ghsa}; alert: ${f.url}`,
      ...Object.entries(f.branchEvidence || {}).flatMap(([branch, evidence]) => [
        `- ${branch}: ${evidence.reason}`,
        ...(evidence.evidence || []).map(
          (instance) =>
            `  - ${instance.instance}: ${instance.installed}; parents: ${instance.parents.map((parent) => `${parent.name || parent.parent} ${parent.declared}`).join(', ')}; applicable overrides: ${instance.overrides?.map((rule) => rule.selector).join(', ') || 'none'}`,
        ),
      ]),
    ]),
    '## Recovered Jira actions awaiting notification',
    ...(value.carriedActions || []).map(
      (g) => `- [${g.ticket}](${config.jiraSite}/browse/${g.ticket}): ${g.severity}; ${g.summary}`,
    ),
    '## Existing scope updates proposed',
    ...(value.updates || []).map(
      (u) =>
        `- [${u.ticket}](${config.jiraSite}/browse/${u.ticket}): ${u.reason} Alerts: ${u.findings.map((f) => f.id).join(', ')}; required severity at least ${u.severity}.`,
    ),
    '## Covered findings',
    ...value.covered.map((c) => `- ${c.alert} → [${c.ticket}](${config.jiraSite}/browse/${c.ticket}): ${c.evidence}`),
    '## Existing blocker audit (not new findings)',
    ...value.blockers.map((b) => `- [${b.ticket}](${config.jiraSite}/browse/${b.ticket}): ${b.blocker} (${b.status})`),
    '## Existing ticket reassessments (audit only)',
    ...(value.existingReviews || []).map((r) => `- ${r}`),
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
  if (!automaticAuthorized(process.env)) throw new Error('Automatic notification is not authorized');
  if (!report || !state.active) throw new Error('No active report');
  if (state.active.notification?.status === 'confirmed') return;
  if (state.active.notification?.status === 'reserved' && state.active.notification.attempt !== runIdentity) return;
  state.active.notification = {
    status: 'reserved',
    attempt: runIdentity,
    snapshot: structuredClone(report),
    payload: await read('teams-payload.json', null),
    outcomeKeys: Object.keys(state.pendingOutcomes || {}),
  };
  await save('state.json', state);
}
async function notify() {
  if (mode === 'preview') return;
  if (!automaticAuthorized(process.env)) throw new Error('Automatic notification is not authorized');
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
    body: JSON.stringify(delivery.payload),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Teams delivery uncertain: HTTP ${response.status}; do not blindly retry`);
  state.active.notification = { ...delivery, status: 'confirmed', acceptedAt: new Date().toISOString() };
  acknowledgeOutcomes(state.active.notification);
  await save('state.json', state);
  console.log('Dedicated Teams webhook accepted the summary.');
}
async function finish() {
  if (!report) throw new Error('Report missing');
  const deliveryComplete = mode === 'preview' || state.active?.notification?.status === 'confirmed';
  if (!report.failures.length && deliveryComplete) {
    if (!state.checkpoints[mode] || Date.parse(report.started) >= Date.parse(state.checkpoints[mode])) {
      state.checkpoints[mode] = report.started; // scan start, not finish: trigger-day alerts remain eligible.
      state.fingerprints[mode] = Object.fromEntries(report.alerts.map((a) => [a.id, a.fingerprint]));
    }
    if (mode === 'automatic') acknowledgeOutcomes(state.active.notification);
    if (mode === 'automatic' && process.env.GITHUB_RUN_ID) {
      state.completedRuns ||= {};
      state.completedRuns[`${mode}:${process.env.GITHUB_RUN_ID}`] = state.active.notification;
      state.completedRunNumber = Math.max(state.completedRunNumber || 0, Number(process.env.TRIAGE_RUN_NUMBER) || 0);
      while (
        Object.keys(state.completedRuns).length > 20 ||
        Buffer.byteLength(JSON.stringify(state.completedRuns)) > 2 * 1024 * 1024
      ) {
        delete state.completedRuns[Object.keys(state.completedRuns)[0]];
      }
    }
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

// Step 1: deterministic collection and reconciliation. Makes no triage decisions.
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { githubClient, jiraClient, npmClient } from './lib/clients.mjs';
import { loadConfig } from './lib/config.mjs';
import { analyzeLockfile, analyzeManifest, vulnerableParents } from './lib/lockfile.mjs';
import { OWNED_LABEL, OWNERSHIP_PROPERTY, combinedRange, normalizeAlert, reconcile } from './lib/reconcile.mjs';
import { ControlState, LockHeldError } from './lib/state.mjs';
import {
  alertId,
  clip,
  compareVersions,
  digest,
  inAdvisoryRange,
  isMainModule,
  log,
  parseVersion,
  quarterExpired,
  textOf,
} from './lib/util.mjs';

export const CONTROL_LABEL = 'dependabot-ai-triage-control';
const TICKET_FIELDS = ['summary', 'status', 'labels', 'components', 'parent', 'issuelinks', 'description', 'updated'];

class PhaseError extends Error {}

function env(name) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name}; configure the corresponding Actions secret or variable.`);
  }
  return process.env[name];
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function linkSummary(link) {
  const other = link.outwardIssue ?? link.inwardIssue;
  return {
    type: link.outwardIssue ? link.type.outward : link.type.inward,
    key: other?.key,
    status: other?.fields?.status?.name,
  };
}

export function toTicket(issue, config) {
  const fields = issue.fields ?? {};
  const status = fields.status ?? {};
  return {
    key: issue.key,
    project: issue.key.split('-')[0],
    summary: fields.summary ?? '',
    status: status.name ?? '',
    statusCategory: status.statusCategory?.key ?? 'new',
    onHold: status.name === config.holdStatus,
    severity: config.severityOf(fields[config.severityField]?.id),
    labels: fields.labels ?? [],
    parent: fields.parent?.key,
    updated: fields.updated,
    description: textOf(fields.description),
    links: (fields.issuelinks ?? []).map(linkSummary),
    ownership: issue.properties?.[OWNERSHIP_PROPERTY] ?? null,
  };
}

function validOwnership(ticket, config, warnings) {
  const { ownership } = ticket;
  if (!ownership) {
    return null;
  }
  const repo = config.repositories.find((item) => item.name === ownership.repository);
  if (repo?.project !== ticket.project || typeof ownership.alerts !== 'object') {
    warnings.push(`${ticket.key}: ignored malformed ownership property.`);
    return null;
  }
  return ownership;
}

async function verifyProject(jira, config, repo) {
  const problems = [];
  const fields = await jira.createFields(repo.project, config.issueTypeId);
  const byId = (id) => fields.find((field) => (field.fieldId ?? field.key) === id);
  const allowed = new Map((byId(config.severityField)?.allowedValues ?? []).map((option) => [option.id, option.value]));
  for (const [name, id] of Object.entries(config.severityOptions)) {
    if ((allowed.get(id) ?? '').toLowerCase() !== name) {
      problems.push(`${repo.project}: ${config.severityField} option ${id} is not "${name}"; update configuration.`);
    }
  }
  const components = (byId('components')?.allowedValues ?? []).map((option) => option.name);
  if (repo.component && !components.includes(repo.component)) {
    problems.push(`${repo.project}: component "${repo.component}" is not available.`);
  }
  return problems;
}

/** Revalidates the control issue's restriction and the Jira field/option IDs before anything is stored. */
async function verifyJira(jira, config) {
  const control = await jira.issue(config.controlIssue, ['summary', 'security', 'labels', 'status']);
  if (!control.fields?.security || !(control.fields.labels ?? []).includes(CONTROL_LABEL)) {
    throw new PhaseError(
      `Control issue ${config.controlIssue} must have a security level and the "${CONTROL_LABEL}" label ` +
        'before it may store triage state.',
    );
  }
  const problems = (await Promise.all(config.repositories.map((repo) => verifyProject(jira, config, repo)))).flat();
  if (problems.length) {
    throw new PhaseError(problems.join(' '));
  }
}

function ticketQueries(config, alerts) {
  const projects = config.repositories.map((repo) => repo.project).join(', ');
  const queries = [
    `labels = "${OWNED_LABEL}" ORDER BY key`,
    `project in (${projects}) AND labels = dependabot AND (statusCategory != Done OR updated >= -365d) ORDER BY key`,
  ];
  if (config.epic) {
    queries.push(`parent = ${config.epic} ORDER BY key`);
  }
  const identifiers = [...new Set(alerts.flatMap((alert) => [alert.ghsa, alert.cve]).filter(Boolean))];
  for (let i = 0; i < identifiers.length; i += 10) {
    const terms = identifiers.slice(i, i + 10).map((id) => String.raw`text ~ "\"${id}\""`);
    queries.push(`project in (${projects}) AND (${terms.join(' OR ')}) ORDER BY key`);
  }
  return queries;
}

async function readTickets(jira, config, alerts, warnings) {
  const fields = [...TICKET_FIELDS, config.severityField];
  const pages = await Promise.all(
    ticketQueries(config, alerts).map((jql) => jira.search(jql, fields, [OWNERSHIP_PROPERTY])),
  );
  const byKey = new Map(pages.flat().map((issue) => [issue.key, issue]));
  // Upstream tickets that blocked owners wait for must be read too, so a status change triggers a recheck.
  const upstream = [...byKey.values()]
    .map((issue) => issue.properties?.[OWNERSHIP_PROPERTY]?.blocker?.upstreamRef)
    .filter((ref) => /^[A-Z][A-Z0-9]+-\d+$/.test(ref ?? '') && !byKey.has(ref));
  if (upstream.length) {
    const extra = await jira.search(`key in (${[...new Set(upstream)].join(', ')})`, fields, [OWNERSHIP_PROPERTY]);
    for (const issue of extra) {
      byKey.set(issue.key, issue);
    }
  }
  byKey.delete(config.controlIssue);
  return [...byKey.values()].map((issue) => {
    const ticket = toTicket(issue, config);
    return { ...ticket, ownership: validOwnership(ticket, config, warnings) };
  });
}

function stableVersions(packument) {
  return Object.keys(packument.versions).filter((version) => {
    const parsed = parseVersion(version);
    return parsed && !parsed.pre;
  });
}

/** Lowest published stable version in `major`, at or above `floor`, outside every vulnerable range. */
function lowestFixInMajor(versions, major, floor, range) {
  return (
    versions
      .filter((version) => parseVersion(version).parts[0] === major && compareVersions(version, floor) >= 0)
      .sort(compareVersions)
      .find((version) => inAdvisoryRange(version, range) === false) ?? null
  );
}

export function npmSummary(packument, alert, instances) {
  if (!packument?.versions) {
    return null;
  }
  const versions = stableVersions(packument);
  const range = combinedRange(alert);
  const floors = new Map();
  for (const instance of instances.filter((item) => item.vulnerable !== false)) {
    const major = parseVersion(instance.version)?.parts[0];
    if (major !== undefined && (!floors.has(major) || compareVersions(instance.version, floors.get(major)) < 0)) {
      floors.set(major, instance.version);
    }
  }
  return {
    latest: packument['dist-tags']?.latest,
    latestIsVulnerable: inAdvisoryRange(packument['dist-tags']?.latest, range),
    advisoryRanges: alert.advisoryRanges,
    firstPatchedPublished: alert.firstPatched ? versions.includes(alert.firstPatched) : false,
    // null for a major means no fixed release exists in that major: a major upgrade (not a blocker) is needed.
    lowestFixPerVulnerableMajor: Object.fromEntries(
      [...floors].map(([major, floor]) => [major, lowestFixInMajor(versions, major, floor, range)]),
    ),
    firstPatchedEngines: packument.versions[alert.firstPatched]?.engines ?? null,
  };
}

async function parentSummary(npm, name, packageName, warnings) {
  try {
    const packument = await npm.packument(name);
    const latest = packument['dist-tags']?.latest;
    const manifest = packument.versions?.[latest] ?? {};
    const range = ['dependencies', 'optionalDependencies', 'peerDependencies']
      .map((field) => manifest[field]?.[packageName])
      .find(Boolean);
    return { name, latest, latestDeclaresRange: range ?? null, latestEngines: manifest.engines ?? null };
  } catch (error) {
    warnings.push(`npm metadata unavailable for parent ${name}: ${error.message}`);
    return { name, error: 'metadata unavailable' };
  }
}

async function branchEvidence(readJson, alert, sha) {
  const { manifest: file } = alert;
  if (file.endsWith('package-lock.json')) {
    const [lock, manifest] = await Promise.all([
      readJson(sha, file),
      readJson(sha, path.posix.join(path.posix.dirname(file), 'package.json')),
    ]);
    return lock
      ? analyzeLockfile({ lock, manifest, name: alert.package, vulnerableRange: combinedRange(alert) })
      : { kind: 'lockfile', supported: false, reason: 'lockfile not present on this branch' };
  }
  if (file.endsWith('package.json')) {
    return analyzeManifest({ manifest: await readJson(sha, file), name: alert.package });
  }
  return { kind: 'other', supported: false, reason: `unsupported manifest ${file}` };
}

async function alertEvidence(readJson, alert, branchShas) {
  const entries = await Promise.all(
    Object.entries(branchShas).map(async ([branch, sha]) => [branch, await branchEvidence(readJson, alert, sha)]),
  );
  return Object.fromEntries(entries);
}

async function npmEvidence(npm, alert, evidence, warnings) {
  const analyses = Object.values(evidence).filter((analysis) => analysis.kind === 'lockfile' && analysis.supported);
  const parents = [...new Set(analyses.flatMap((analysis) => vulnerableParents(analysis)))].slice(0, 25);
  try {
    const packument = await npm.packument(alert.package);
    return {
      package: npmSummary(
        packument,
        alert,
        analyses.flatMap((analysis) => analysis.instances),
      ),
      parents: await Promise.all(parents.map((name) => parentSummary(npm, name, alert.package, warnings))),
    };
  } catch (error) {
    warnings.push(`npm metadata unavailable for ${alert.package}: ${error.message}`);
    return { error: 'metadata unavailable' };
  }
}

function plannerTicket(ticket, comments) {
  const owned = ticket.ownership ? Object.keys(ticket.ownership.alerts).map(Number) : [];
  return {
    key: ticket.key,
    project: ticket.project,
    summary: ticket.summary,
    status: ticket.status,
    statusCategory: ticket.statusCategory,
    onHold: ticket.onHold,
    defectSeverity: ticket.severity,
    labels: ticket.labels,
    parent: ticket.parent,
    updated: ticket.updated,
    recordedOwnership: ticket.ownership
      ? { repository: ticket.ownership.repository, alerts: owned, remediationId: ticket.ownership.remediationId }
      : null,
    links: ticket.links,
    description: clip(ticket.description, 8000),
    recentComments: comments.map((comment) => {
      return { created: comment.created, author: comment.author?.displayName, body: clip(textOf(comment.body), 1500) };
    }),
  };
}

function escapeRegExp(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export function mentions(ticket, alert) {
  const text = `${ticket.summary}\n${ticket.description}`.toLowerCase();
  const word = new RegExp(`(^|[^a-z0-9@/_-])${escapeRegExp(alert.package.toLowerCase())}([^a-z0-9_-]|$)`);
  return (
    word.test(text) || [alert.ghsa, alert.cve, alert.url].filter(Boolean).some((id) => text.includes(id.toLowerCase()))
  );
}

function selectCandidates(tickets, aiAlerts, currentOwner, config) {
  return tickets.filter((ticket) => {
    const openInEpic = ticket.statusCategory !== 'done' && ticket.parent === config.epic;
    return aiAlerts.some(
      (alert) =>
        mentions(ticket, alert) ||
        currentOwner[alertId(alert.repository, alert.number)] === ticket.key ||
        (openInEpic && config.repositoryConfig(alert.repository).project === ticket.project),
    );
  });
}

const alertFile = (alert) => `alerts/${alert.repository.replace('/', '__')}__${alert.number}.json`;

function indexEntry(alert) {
  return {
    repository: alert.repository,
    number: alert.number,
    severity: alert.severity,
    package: alert.package,
    manifest: alert.manifest,
    ghsa: alert.ghsa,
    firstPatched: alert.firstPatched,
    reason: alert.reason,
    changeReason: alert.changeReason,
    currentOwner: alert.currentOwner,
    file: alertFile(alert),
  };
}

function ticketIndexEntry(ticket) {
  return {
    key: ticket.key,
    project: ticket.project,
    status: ticket.status,
    statusCategory: ticket.statusCategory,
    onHold: ticket.onHold,
    defectSeverity: ticket.defectSeverity,
    summary: ticket.summary,
    recordedOwnership: ticket.recordedOwnership,
    file: `tickets/${ticket.key}.json`,
  };
}

/** One file per alert and ticket so the agent can read selectively; returns the digest the plan must echo. */
function writePlannerInput(dir, { runInfo, plannerAlerts, plannerTickets, covered }) {
  const inventoryDigest = digest({ runInfo, plannerAlerts, plannerTickets, covered });
  writeJson(path.join(dir, 'run.json'), { ...runInfo, inventoryDigest });
  writeJson(path.join(dir, 'alerts-index.json'), plannerAlerts.map(indexEntry));
  writeJson(path.join(dir, 'tickets-index.json'), plannerTickets.map(ticketIndexEntry));
  writeJson(path.join(dir, 'covered.json'), covered);
  for (const alert of plannerAlerts) {
    writeJson(path.join(dir, alertFile(alert)), alert);
  }
  for (const ticket of plannerTickets) {
    writeJson(path.join(dir, 'tickets', `${ticket.key}.json`), ticket);
  }
  return inventoryDigest;
}

async function collectRepository(github, repo) {
  const shas = await Promise.all(repo.branches.map((branch) => github.branchSha(repo.name, branch)));
  const { alerts, pages } = await github.openAlerts(repo.name);
  return {
    name: repo.name,
    project: repo.project,
    complete: true,
    open: alerts.length,
    pages,
    retrievedAt: new Date().toISOString(),
    branchShas: Object.fromEntries(repo.branches.map((branch, index) => [branch, shas[index]])),
    alerts: alerts.map((raw) => normalizeAlert(repo.name, raw)),
  };
}

/** Every open alert per repository, with explicit completion evidence; a failure is never an empty list. */
async function collectRepositories(github, config, failures) {
  const settled = await Promise.allSettled(config.repositories.map((repo) => collectRepository(github, repo)));
  return settled.map((result, index) => {
    const { name, project } = config.repositories[index];
    if (result.status === 'fulfilled') {
      log(`${name}: ${result.value.open} open alert(s), ${result.value.pages} page(s)`);
      return result.value;
    }
    failures.push(`${name}: ${result.reason.message}`);
    log(`${name}: FAILED`);
    return { name, project, complete: false, open: 0, pages: 0, branchShas: {}, alerts: [] };
  });
}

async function clearedAlerts(github, ownedNotOpen, warnings) {
  const lookups = await Promise.allSettled(
    ownedNotOpen.slice(0, 100).map(async (item) => {
      const [repository, number] = item.id.split('#');
      return { ...item, state: (await github.alert(repository, Number(number))).state };
    }),
  );
  return lookups
    .map((lookup, index) => {
      if (lookup.status === 'fulfilled') {
        return lookup.value;
      }
      warnings.push(`State of ${ownedNotOpen[index].id} unavailable: ${lookup.reason.message}`);
      return null;
    })
    .filter(Boolean);
}

function repositorySummary(repo) {
  const summary = { ...repo };
  delete summary.alerts;
  return summary;
}

function ticketSummary(ticket) {
  const summary = { ...ticket };
  delete summary.description;
  return summary;
}

async function buildPlannerInput(ctx, { alerts, repositories, tickets, result }) {
  const byId = new Map(alerts.map((alert) => [alertId(alert.repository, alert.number), alert]));
  const currentOwner = Object.fromEntries([...result.covered, ...result.changed].map(({ id, ticket }) => [id, ticket]));
  const changeReason = Object.fromEntries(result.changed.map(({ id, reason }) => [id, reason]));
  const aiInput = [...result.unowned, ...result.changed.map((item) => item.id)];
  const aiAlerts = aiInput.map((id) => byId.get(id));
  const readJson = (() => {
    const cache = new Map();
    return (repo, sha, file) => {
      const key = `${repo}@${sha}:${file}`;
      if (!cache.has(key)) {
        cache.set(key, ctx.github.jsonFile(repo, sha, file));
      }
      return cache.get(key);
    };
  })();
  const shasOf = (alert) => repositories.find((repo) => repo.name === alert.repository).branchShas;
  // Any evidence read failure rejects here and makes the run incomplete.
  const evidenceList = await Promise.all(
    aiAlerts.map((alert) => alertEvidence((sha, file) => readJson(alert.repository, sha, file), alert, shasOf(alert))),
  );
  const evidence = Object.fromEntries(aiInput.map((id, index) => [id, evidenceList[index]]));
  const npmInfo = await Promise.all(
    aiAlerts.map((alert, index) => npmEvidence(ctx.npm, alert, evidenceList[index], ctx.warnings)),
  );
  const candidates = selectCandidates(tickets, aiAlerts, currentOwner, ctx.config);
  const comments = await Promise.all(candidates.map((ticket) => ctx.jira.recentComments(ticket.key, 5)));
  const plannerAlerts = aiAlerts.map((alert, index) => {
    const id = alertId(alert.repository, alert.number);
    const owner = currentOwner[id] ?? null;
    return {
      ...alert,
      reason: owner ? 'changed' : 'unowned',
      changeReason: changeReason[id] ?? null,
      currentOwner: owner,
      evidence: evidenceList[index],
      npm: npmInfo[index],
    };
  });
  const covered = result.covered.map(({ id, ticket }) => {
    const { package: pkg, severity, manifest } = byId.get(id);
    return { id, ticket, package: pkg, severity, manifest };
  });
  const runInfo = {
    runId: ctx.runId,
    repositories: ctx.config.repositories.map(({ name, project, branches }) => {
      return { name, project, branches };
    }),
    epic: ctx.config.epic,
    epicQuarter: ctx.config.epicQuarter,
    holdStatus: ctx.config.holdStatus,
  };
  const inventoryDigest = writePlannerInput(path.join(ctx.work, 'planner'), {
    runInfo,
    plannerAlerts,
    plannerTickets: candidates.map((ticket, index) => plannerTicket(ticket, comments[index])),
    covered,
  });
  return { currentOwner, aiInput, evidence, inventoryDigest };
}

function configurationWarnings(config) {
  if (!config.epic || !config.epicQuarter) {
    return ['SECURITY_EPIC or SECURITY_EPIC_QUARTER is not set; ticket creation is disabled.'];
  }
  if (quarterExpired(config.epicQuarter, new Date())) {
    return [`Epic quarter ${config.epicQuarter} has expired; supply the new epic. Ticket creation is disabled.`];
  }
  return [];
}

async function acquire(ctx, inventory) {
  try {
    await verifyJira(ctx.jira, ctx.config);
    inventory.previousState = await ctx.control.load();
    await ctx.control.acquireLock(ctx.runId);
    inventory.lockAcquired = true;
  } catch (error) {
    inventory.lockHeld = error instanceof LockHeldError;
    const prefix = error instanceof PhaseError || inventory.lockHeld ? '' : 'Jira setup: ';
    ctx.failures.push(`${prefix}${error.message}`);
  }
}

async function reconcileAndPlan(ctx, inventory) {
  const repositories = await collectRepositories(ctx.github, ctx.config, ctx.failures);
  inventory.repositories = repositories.map(repositorySummary);
  if (ctx.failures.length) {
    return;
  }
  const alerts = repositories.flatMap((repo) => repo.alerts);
  inventory.alerts = alerts;
  const tickets = await readTickets(ctx.jira, ctx.config, alerts, ctx.warnings);
  inventory.tickets = tickets.map(ticketSummary);
  const previous = inventory.previousState?.lastSuccess ? inventory.previousState : null;
  const result = reconcile({ alerts, tickets, previousState: previous });
  inventory.reconciliation = result;
  inventory.cleared = await clearedAlerts(ctx.github, result.ownedNotOpen, ctx.warnings);
  const planner = await buildPlannerInput(ctx, { alerts, repositories, tickets, result });
  Object.assign(inventory, planner, { plannerNeeded: planner.aiInput.length > 0 });
}

function defaultClients(config) {
  return {
    jira: jiraClient({ site: config.jiraSite, email: env('JIRA_EMAIL'), token: env('JIRA_API_TOKEN') }),
    github: githubClient(env('GH_TOKEN')),
    npm: npmClient(),
  };
}

/** @param {object} [clients] Injected API clients (tests and local dry runs); defaults to the real services. */
export async function collect(clients) {
  const work = env('TRIAGE_WORK_DIR');
  const config = loadConfig(process.env.TRIAGE_CONFIG ?? '.github/dependabot-ai-triage.json');
  const runId = env('TRIAGE_RUN_ID');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const { jira, github, npm } = clients ?? defaultClients(config);
  const ctx = {
    work,
    config,
    runId,
    jira,
    github,
    npm,
    control: new ControlState(jira, config.controlIssue),
    failures: [],
    warnings: configurationWarnings(config),
  };
  const inventory = {
    schemaVersion: 1,
    runId,
    configRevision: config.configRevision,
    mode: config.mode,
    modeReason: config.modeReason,
    epic: config.epic,
    epicQuarter: config.epicQuarter,
    startedAt: new Date().toISOString(),
    failures: ctx.failures,
    warnings: ctx.warnings,
    lockAcquired: false,
    plannerNeeded: false,
  };
  await acquire(ctx, inventory);
  if (inventory.lockAcquired) {
    try {
      await reconcileAndPlan(ctx, inventory);
    } catch (error) {
      ctx.failures.push(`Collection: ${error.message}`);
    }
  }
  if (ctx.failures.length) {
    inventory.plannerNeeded = false;
  }
  inventory.collectedAt = new Date().toISOString();
  writeJson(path.join(work, 'inventory.json'), inventory);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `planner_needed=${inventory.plannerNeeded}\n`);
  }
  const status = ctx.failures.length ? 'INCOMPLETE' : 'complete';
  log(
    `Collection ${status}: ${ctx.failures.length} failure(s), ${(inventory.aiInput ?? []).length} alert(s) for the ` +
      `planner, mode ${config.mode} (${config.modeReason}).`,
  );
  return inventory;
}

if (isMainModule(import.meta.url)) {
  try {
    await collect();
  } catch (error) {
    process.stderr.write(`Collection failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

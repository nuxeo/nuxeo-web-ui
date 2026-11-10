// Step 1: deterministic collection and reconciliation. Makes no triage decisions.
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { anonymouslyReadable, githubClient, jiraClient, npmClient } from './lib/clients.mjs';
import { loadConfig } from './lib/config.mjs';
import { analyzeLockfile, analyzeManifest, vulnerableParents } from './lib/lockfile.mjs';
import { OWNED_LABEL, OWNERSHIP_PROPERTY, combinedRange, normalizeAlert, reconcile } from './lib/reconcile.mjs';
import { ControlState, LockHeldError, isClearedReported } from './lib/state.mjs';
import {
  alertId,
  clip,
  compareVersions,
  digest,
  inAdvisoryRange,
  isMainModule,
  log,
  mapSequential,
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
async function verifyJira(jira, config, probe) {
  const control = await jira.issue(config.controlIssue, ['summary', 'security', 'labels', 'status']);
  const level = control.fields?.security?.id;
  if (level !== config.controlSecurityLevelId || !(control.fields.labels ?? []).includes(CONTROL_LABEL)) {
    throw new PhaseError(
      `Control issue ${config.controlIssue} must have security level ${config.controlSecurityLevelId} and the ` +
        `"${CONTROL_LABEL}" label before it may store triage state.`,
    );
  }
  if (await probe(config.jiraSite, config.controlIssue)) {
    throw new PhaseError(`Control issue ${config.controlIssue} is readable without signing in; refusing to use it.`);
  }
  const problems = (await Promise.all(config.repositories.map((repo) => verifyProject(jira, config, repo)))).flat();
  if (problems.length) {
    throw new PhaseError(problems.join(' '));
  }
}

function batches(items, size = 10) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/**
 * Each query carries the identifiers or packages it searched for. `text ~` also matches comments, so a ticket
 * found this way is kept as a planner candidate even when its summary and description do not mention the alert.
 */
export function ticketQueries(config, alerts) {
  const projects = config.repositories.map((repo) => repo.project).join(', ');
  const recent = '(statusCategory != Done OR updated >= -365d)';
  const queries = [
    { jql: `labels = "${OWNED_LABEL}" ORDER BY key`, matches: [] },
    { jql: `project in (${projects}) AND labels = dependabot AND ${recent} ORDER BY key`, matches: [] },
  ];
  if (config.epic) {
    queries.push({ jql: `parent = ${config.epic} ORDER BY key`, matches: [] });
  }
  const identifiers = [...new Set(alerts.flatMap((alert) => [alert.ghsa, alert.cve, alert.url]).filter(Boolean))];
  for (const batch of batches(identifiers)) {
    const terms = batch.map((id) => String.raw`text ~ "\"${id}\""`);
    queries.push({ jql: `project in (${projects}) AND (${terms.join(' OR ')}) ORDER BY key`, matches: batch });
  }
  // Upgrade tickets outside the epic and without the dependabot label often name only the package.
  const packages = [...new Set(alerts.map((alert) => alert.package).filter(Boolean))];
  for (const batch of batches(packages)) {
    const terms = batch.map((name) => String.raw`summary ~ "\"${name}\""`);
    queries.push({
      jql: `project in (${projects}) AND ${recent} AND (${terms.join(' OR ')}) ORDER BY key`,
      matches: batch.map((name) => `package:${name}`),
    });
  }
  return queries;
}

async function readTickets(jira, config, alerts, warnings) {
  const fields = [...TICKET_FIELDS, config.severityField];
  const queries = ticketQueries(config, alerts);
  const pages = await Promise.all(queries.map(({ jql }) => jira.search(jql, fields, [OWNERSHIP_PROPERTY])));
  const byKey = new Map();
  const matchedBy = new Map();
  pages.forEach((issues, index) => {
    for (const issue of issues) {
      byKey.set(issue.key, issue);
      matchedBy.set(issue.key, [...(matchedBy.get(issue.key) ?? []), ...queries[index].matches]);
    }
  });
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
    const matched = [...new Set(matchedBy.get(issue.key) ?? [])];
    return { ...ticket, matchedBy: matched, ownership: validOwnership(ticket, config, warnings) };
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

/**
 * The lowest published stable release above every vulnerable installed version that lies outside every vulnerable
 * range. It proves a fix exists even when GitHub lists no patched version (e.g. range "< 2.0.0", 2.0.0 published).
 */
function fixAboveInstalled(versions, instances, alert, range) {
  const installed = instances.filter((item) => item.vulnerable !== false).map((item) => item.version);
  const floor = installed.sort(compareVersions).at(-1) ?? alert.firstPatched;
  // Without a known installed version or patched release there is no floor to prove an upgrade from.
  if (!floor) {
    return null;
  }
  return (
    versions
      .filter((version) => compareVersions(version, floor) > 0 && inAdvisoryRange(version, range) === false)
      .sort(compareVersions)[0] ?? null
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
  const perMajor = Object.fromEntries(
    [...floors].map(([major, floor]) => [major, lowestFixInMajor(versions, major, floor, range)]),
  );
  const majorFixes = Object.values(perMajor).filter(Boolean).sort(compareVersions);
  return {
    latest: packument['dist-tags']?.latest,
    latestIsVulnerable: inAdvisoryRange(packument['dist-tags']?.latest, range),
    fixAboveInstalled: fixAboveInstalled(versions, instances, alert, range),
    advisoryRanges: alert.advisoryRanges,
    firstPatchedPublished: alert.firstPatched ? versions.includes(alert.firstPatched) : false,
    // null for a major means no fixed release exists in that major: a major upgrade (not a blocker) is needed.
    lowestFixPerVulnerableMajor: perMajor,
    // A fixed release in at least one vulnerable major: an upstream patch exists even if another major has none.
    fixInSomeVulnerableMajor: majorFixes[0] ?? null,
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

export async function branchEvidence(readJson, alert, sha) {
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
    const manifest = await readJson(sha, file);
    const declared = analyzeManifest({ manifest, name: alert.package });
    const owner = await owningLockfile(readJson, sha, file);
    if (!owner) {
      return declared;
    }
    // A workspace root's overrides and engines apply to the whole lockfile; the workspace's own declarations are
    // kept separately below.
    const rootFile = path.posix.join(path.posix.dirname(owner.file), 'package.json');
    const analysis = analyzeLockfile({
      lock: owner.lock,
      manifest: rootFile === file ? manifest : await readJson(sha, rootFile),
      name: alert.package,
      vulnerableRange: combinedRange(alert),
    });
    return analysis.supported ? { ...analysis, lockfile: owner.file, declarations: declared.declarations } : declared;
  }
  return { kind: 'other', supported: false, reason: `unsupported manifest ${file}` };
}

/**
 * The lockfile that resolves a package.json: its own, or the nearest ancestor's when the package is one of that
 * project's npm workspaces (the ancestor lockfile then lists the workspace path in its "packages" map).
 */
async function owningLockfile(readJson, sha, file) {
  const dir = path.posix.dirname(file);
  const dirs = [dir];
  while (dirs.at(-1) !== '.') {
    dirs.push(path.posix.dirname(dirs.at(-1)));
  }
  const files = dirs.map((item) => path.posix.join(item, 'package-lock.json'));
  const locks = await Promise.all(files.map((item) => readJson(sha, item)));
  const index = locks.findIndex(Boolean);
  if (index < 0) {
    return null;
  }
  const relative = path.posix.relative(dirs[index], dir);
  const owns = index === 0 || Boolean(locks[index].packages?.[relative]);
  return owns ? { lock: locks[index], file: files[index] } : null;
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

export function plannerTicket(ticket, comments) {
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
      ? {
          repository: ticket.ownership.repository,
          alerts: owned,
          remediationId: ticket.ownership.remediationId,
          kind: ticket.ownership.kind ?? null,
          blocker: ticket.ownership.blocker ?? null,
          checkedAt: ticket.ownership.checkedAt ?? null,
        }
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

export function selectCandidates(tickets, aiAlerts, currentOwner, config) {
  // The upstream tickets that re-planned blocked owners wait for are always shown with their current status.
  const owners = new Set(aiAlerts.map((alert) => currentOwner[alertId(alert.repository, alert.number)]));
  const upstream = new Set(
    tickets
      .filter((ticket) => owners.has(ticket.key))
      .map((ticket) => ticket.ownership?.blocker?.upstreamRef)
      .filter(Boolean),
  );
  return tickets.filter((ticket) => {
    if (upstream.has(ticket.key)) {
      return true;
    }
    const openInEpic = ticket.statusCategory !== 'done' && ticket.parent === config.epic;
    const matched = new Set(ticket.matchedBy ?? []);
    // Identifier searches also match comments, so such a hit counts even if the description is silent.
    const searchHit = (alert) =>
      [alert.ghsa, alert.cve, alert.url, `package:${alert.package}`].some((id) => id && matched.has(id));
    return aiAlerts.some(
      (alert) =>
        searchHit(alert) ||
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

const LOOKUP_BATCH = 10;
const CLOSED_STATES = new Set(['fixed', 'dismissed', 'auto_dismissed']);

async function clearedBatch(github, batch, warnings) {
  const lookups = await Promise.allSettled(
    batch.map(async (item) => {
      const [repository, number] = item.id.split('#');
      return { ...item, state: (await github.alert(repository, Number(number))).state };
    }),
  );
  return lookups
    .map((lookup, index) => {
      if (lookup.status === 'fulfilled') {
        // An alert can reopen between the open-alert scan and this lookup; only a confirmed closure counts.
        return CLOSED_STATES.has(lookup.value.state) ? lookup.value : null;
      }
      warnings.push(`State of ${batch[index].id} unavailable: ${lookup.reason.message}`);
      return null;
    })
    .filter(Boolean);
}

/** Looks up owned alerts that are no longer open, in small batches; ones already reported are skipped. */
export async function clearedAlerts(github, ownedNotOpen, warnings, isReported = () => false) {
  const pending = ownedNotOpen.filter((item) => !isReported(item.id));
  const batches = [];
  for (let i = 0; i < pending.length; i += LOOKUP_BATCH) {
    batches.push(pending.slice(i, i + LOOKUP_BATCH));
  }
  return (await mapSequential(batches, (batch) => clearedBatch(github, batch, warnings))).flat();
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
  // Registry-confirmed fix availability is kept on the alert so the validator can reject a false "no patch".
  aiAlerts.forEach((alert, index) => {
    const npmPackage = npmInfo[index].package;
    alert.registryFix = npmPackage?.fixAboveInstalled ?? npmPackage?.fixInSomeVulnerableMajor ?? null;
  });
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
    await verifyJira(ctx.jira, ctx.config, ctx.probe);
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
  const reported = await ctx.control.loadCleared();
  inventory.cleared = await clearedAlerts(ctx.github, result.ownedNotOpen, ctx.warnings, (id) =>
    isClearedReported(reported, id),
  );
  const planner = await buildPlannerInput(ctx, { alerts, repositories, tickets, result });
  Object.assign(inventory, planner, { plannerNeeded: planner.aiInput.length > 0 });
}

function defaultClients(config) {
  return {
    jira: jiraClient({ site: config.jiraSite, email: env('JIRA_EMAIL'), token: env('JIRA_API_TOKEN') }),
    github: githubClient(env('GH_TOKEN')),
    npm: npmClient(),
    probe: anonymouslyReadable,
  };
}

/** @param {object} [clients] Injected API clients (tests and local dry runs); defaults to the real services. */
export async function collect(clients) {
  const work = env('TRIAGE_WORK_DIR');
  const config = loadConfig(process.env.TRIAGE_CONFIG ?? '.github/dependabot-ai-triage.json');
  const runId = env('TRIAGE_RUN_ID');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const { jira, github, npm, probe = anonymouslyReadable } = clients ?? defaultClients(config);
  const ctx = {
    work,
    config,
    runId,
    jira,
    github,
    npm,
    probe,
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

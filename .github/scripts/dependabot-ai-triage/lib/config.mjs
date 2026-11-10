import { readFileSync } from 'node:fs';
import { shortHash } from './util.mjs';

const REQUIRED = [
  'jiraSite',
  'controlIssue',
  'controlSecurityLevelId',
  'issueTypeId',
  'severityField',
  'severityOptions',
  'holdStatus',
];

function validate(raw) {
  for (const key of REQUIRED) {
    if (!raw[key]) {
      throw new Error(`Configuration is missing "${key}".`);
    }
  }
  if (!Array.isArray(raw.repositories) || !raw.repositories.length) {
    throw new Error('Configuration needs at least one repository.');
  }
  const order = Array.isArray(raw.priorityOrder) ? raw.priorityOrder : [];
  for (const [severity, priority] of Object.entries(raw.priorityBySeverity ?? {})) {
    if (!(severity in raw.severityOptions) || !order.includes(priority)) {
      throw new Error(`Priority "${priority}" for "${severity}" must be listed in priorityOrder.`);
    }
  }
  for (const repo of raw.repositories) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo.name) || !/^[A-Z][A-Z0-9]+$/.test(repo.project) || !repo.branches?.length) {
      throw new Error(`Repository configuration for "${repo.name}" is incomplete.`);
    }
  }
}

/** Automatic mode needs the explicit switch and the default branch (or the approved ref); otherwise preview. */
function resolveMode(env) {
  const requested = (env.TRIAGE_MODE || 'preview').trim();
  if (requested !== 'automatic') {
    return { mode: 'preview', modeReason: 'preview requested' };
  }
  const ref = env.GITHUB_REF || '';
  const defaultRef = env.DEFAULT_BRANCH ? `refs/heads/${env.DEFAULT_BRANCH}` : '';
  const approvedRef = (env.APPROVED_REF || '').trim();
  if (env.ALLOW_AUTOMATIC !== 'true') {
    return {
      mode: 'preview',
      modeReason: 'automatic requested but DEPENDABOT_AI_TRIAGE_ALLOW_AUTOMATIC is not "true"',
    };
  }
  if (ref !== defaultRef && (!approvedRef || ref !== approvedRef)) {
    return {
      mode: 'preview',
      modeReason: `automatic is only allowed on ${defaultRef || 'the default branch'} or the approved ref`,
    };
  }
  return { mode: 'automatic', modeReason: 'automatic authorized' };
}

/**
 * Static settings come from the reviewed JSON file. The quarterly epic and the execution mode come from
 * repository variables so they can be changed without a code change; nothing here is guessed.
 */
export function loadConfig(file, env = process.env) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  validate(raw);
  const epic = (env.SECURITY_EPIC || '').trim();
  const epicQuarter = (env.SECURITY_EPIC_QUARTER || '').trim();
  const { mode, modeReason } = resolveMode(env);
  const config = {
    ...raw,
    epic,
    epicQuarter,
    mode,
    modeReason,
    configRevision: shortHash({ raw, epic, epicQuarter }),
    repositoryConfig(name) {
      const repo = raw.repositories.find((item) => item.name === name);
      if (!repo) {
        throw new Error(`Unconfigured repository ${name}`);
      }
      return repo;
    },
    severityOf(optionId) {
      return Object.keys(raw.severityOptions).find((severity) => raw.severityOptions[severity] === optionId) || null;
    },
  };
  return config;
}

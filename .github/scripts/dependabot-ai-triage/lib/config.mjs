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

/**
 * Static settings come from the reviewed JSON file. The quarterly epic and the execution mode come from
 * repository variables so they can be changed without a code change; nothing here is guessed.
 */
export function loadConfig(file, env = process.env) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  for (const key of REQUIRED) {
    if (!raw[key]) {
      throw new Error(`Configuration is missing "${key}".`);
    }
  }
  if (!Array.isArray(raw.repositories) || !raw.repositories.length) {
    throw new Error('Configuration needs at least one repository.');
  }
  for (const repo of raw.repositories) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo.name) || !/^[A-Z][A-Z0-9]+$/.test(repo.project) || !repo.branches?.length) {
      throw new Error(`Repository configuration for "${repo.name}" is incomplete.`);
    }
  }
  const epic = (env.SECURITY_EPIC || '').trim();
  const epicQuarter = (env.SECURITY_EPIC_QUARTER || '').trim();
  const requested = (env.TRIAGE_MODE || 'preview').trim();
  const ref = env.GITHUB_REF || '';
  const defaultRef = env.DEFAULT_BRANCH ? `refs/heads/${env.DEFAULT_BRANCH}` : '';
  const approvedRef = (env.APPROVED_REF || '').trim();
  let mode = 'preview';
  let modeReason = requested === 'automatic' ? '' : 'preview requested';
  if (requested === 'automatic') {
    if (env.ALLOW_AUTOMATIC !== 'true') {
      modeReason = 'automatic requested but DEPENDABOT_AI_TRIAGE_ALLOW_AUTOMATIC is not "true"';
    } else if (ref !== defaultRef && (!approvedRef || ref !== approvedRef)) {
      modeReason = `automatic is only allowed on ${defaultRef || 'the default branch'} or the approved ref`;
    } else {
      mode = 'automatic';
      modeReason = 'automatic authorized';
    }
  }
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

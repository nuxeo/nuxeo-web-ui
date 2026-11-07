// Step 2: AI planning with Copilot CLI. The agent can only read the planner input directory.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.mjs';
import { isMainModule, log } from './lib/util.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Extracts the single JSON object from the agent's reply, tolerating Markdown fences. */
export function extractJson(output) {
  const text = String(output ?? '')
    .replaceAll(/```(?:json)?/g, '')
    .trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Planner reply contains no JSON object.');
  }
  return JSON.parse(text.slice(start, end + 1));
}

/** Absolute path of the Copilot CLI, resolved by the workflow; never looked up through PATH here. */
function copilotBinary() {
  const binary = process.env.COPILOT_BIN ?? '';
  if (!path.isAbsolute(binary) || !existsSync(binary)) {
    throw new Error('COPILOT_BIN must be the absolute path of the installed Copilot CLI.');
  }
  return binary;
}

function runCopilot({ prompt, cwd, model, timeoutMinutes }) {
  const tools = ['view', 'glob', 'grep'];
  const args = [
    '-p',
    prompt,
    '-s',
    '--no-ask-user',
    '--no-custom-instructions',
    '--disable-builtin-mcps',
    '--no-auto-update',
    '--log-level=none',
    `--model=${model}`,
    `--available-tools=${tools.join(',')}`,
    ...tools.map((tool) => `--allow-tool=${tool}`),
  ];
  // Only what the CLI needs: no GitHub, Jira or Teams credentials reach the agent process. PATH holds only the
  // directory of the running Node (for the CLI's `env node` shebang) and the system directories.
  const env = {
    PATH: [path.dirname(process.execPath), '/usr/bin', '/bin'].join(path.delimiter),
    HOME: process.env.HOME,
    COPILOT_GITHUB_TOKEN: process.env.COPILOT_GITHUB_TOKEN,
  };
  return spawnSync(copilotBinary(), args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: timeoutMinutes * 60 * 1000,
  });
}

/** One planner attempt: the parsed plan, or the reason it could not be used (and whether to stop retrying). */
function attemptPlan(options) {
  const result = runCopilot(options);
  if (result.error || result.status !== 0) {
    // stderr may echo prompt content; keep it out of public logs.
    const reason = result.error
      ? `Copilot CLI could not run (${result.error.code})`
      : `Copilot CLI exited ${result.status}`;
    const denied = /policy|denied|unauthori[sz]ed|401|403/i.test(result.stderr ?? '');
    return {
      reason: denied ? `${reason}: Copilot access was denied (check the token and Copilot policy)` : reason,
      stop: denied,
    };
  }
  try {
    return { plan: extractJson(result.stdout) };
  } catch (error) {
    return { reason: error.message, stop: false };
  }
}

function fail(file, message) {
  writeFileSync(file, JSON.stringify({ message }), { mode: 0o600 });
  log(message);
}

export function plan() {
  const work = process.env.TRIAGE_WORK_DIR;
  const config = loadConfig(process.env.TRIAGE_CONFIG ?? '.github/dependabot-ai-triage.json');
  const inventory = JSON.parse(readFileSync(path.join(work, 'inventory.json'), 'utf8'));
  const failure = path.join(work, 'plan-error.json');
  if (!inventory.plannerNeeded) {
    log('Planner skipped: no unowned or changed alerts, or collection incomplete.');
    return;
  }
  if (!process.env.COPILOT_GITHUB_TOKEN) {
    fail(failure, 'Planner unavailable: the DEPENDABOT_TRIAGE_COPILOT_TOKEN secret is not configured.');
    return;
  }
  const base = readFileSync(path.join(here, 'planner-prompt.md'), 'utf8');
  const options = {
    cwd: path.join(work, 'planner'),
    model: config.copilot.model,
    timeoutMinutes: config.copilot.timeoutMinutes ?? 20,
  };
  let attempt;
  try {
    attempt = attemptPlan({ ...options, prompt: base });
    if (!attempt.plan && !attempt.stop) {
      const retry = `${base}\n\nYour previous reply could not be used (${attempt.reason}). Reply with only the JSON object.`;
      attempt = attemptPlan({ ...options, prompt: retry });
    }
  } catch (error) {
    attempt = { reason: error.message };
  }
  if (!attempt.plan) {
    fail(failure, `Planner failed: ${attempt.reason}`);
    return;
  }
  writeFileSync(path.join(work, 'plan.json'), `${JSON.stringify(attempt.plan, null, 2)}\n`, { mode: 0o600 });
  const groups = Array.isArray(attempt.plan.groups) ? attempt.plan.groups.length : 0;
  log(`Planner produced ${groups} group(s).`);
}

if (isMainModule(import.meta.url)) {
  if (existsSync(process.env.TRIAGE_WORK_DIR ?? '')) {
    plan();
  } else {
    process.stderr.write('TRIAGE_WORK_DIR does not exist.\n');
    process.exitCode = 1;
  }
}

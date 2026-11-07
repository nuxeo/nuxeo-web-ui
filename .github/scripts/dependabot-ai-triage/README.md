# Dependabot AI triage

Weekly, cloud-only triage of open Dependabot alerts in `nuxeo/nuxeo-web-ui` and `nuxeo/nuxeo-elements`. It runs
on a GitHub-hosted runner (no laptop involved), uses Copilot for the judgement calls, and lets only
deterministic code write to Jira and Teams.

Workflow: [`.github/workflows/dependabot-ai-triage.yaml`](../../workflows/dependabot-ai-triage.yaml). Settings:
[`.github/dependabot-ai-triage.json`](../../dependabot-ai-triage.json).

## How a run works

| Step       | Script        | AI? | What it does                                                                                                                                                                                                                                                    |
| ---------- | ------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Collect | `collect.mjs` | No  | Locks the run, reads **every** open alert (paginated, per-repository completion recorded), reads Jira tickets with their ownership property, reconciles alerts by exact lookup, and gathers lockfile/npm evidence only for alerts that are unowned or changed.  |
| 2. Plan    | `plan.mjs`    | Yes | Runs Copilot CLI with `planner-prompt.md`. The agent can only read the planner input files (`view`, `glob`, `grep`); no shell, network, MCP servers or credentials other than the Copilot token. Output: a JSON plan.                                           |
| 3. Apply   | `apply.mjs`   | No  | Validates the plan (`lib/plan-validator.mjs`). In automatic mode it creates/extends tickets, records ownership, raises severity, moves blocked tickets On Hold and posts the Teams card. Every run posts a private report to the control issue and saves state. |

Ownership is never inferred from description text. When a ticket owns alerts, the executor writes the Jira issue
property `dependabot-ai-triage-ownership` (alert numbers and fingerprints) and adds the `dependabot-ai-triage`
label. Next week, step 1 matches alerts against those records exactly, so the AI only sees new or changed alerts.
People can freely edit ticket descriptions; that never changes ownership.

The first run has no ownership records, so the planner sees every alert and is expected to **adopt** existing
tickets (record ownership without editing them) and create tickets only for uncovered work.

### What the validator enforces

A plan is rejected, and nothing is written, unless:

- it belongs to this run and inventory snapshot, and contains only known fields;
- every alert given to the planner is owned, flagged for review, or reported as a closed-ticket mismatch exactly once;
- no group mixes repositories, and each group's severity equals the highest current GitHub severity it owns;
- no alert owned by another open ticket is claimed, and no owned alert is dropped;
- tickets that are already in progress are not extended (a new linked ticket is created instead), and closed
  tickets are never targeted;
- blocked groups use an external blocker (`no-upstream-patch` only when no major of the package has a fix, or
  `upstream-release-pending`) with upstream reference, mitigation and recheck criteria; major upgrades and
  compatibility work are not blockers;
- no ticket is created after the configured epic quarter ends.

## Where data lives

This repository is public, so its Actions logs and artifacts are public. The workflow uploads no artifacts and logs
only counts. Everything else is in Jira:

- **Control issue** (`controlIssue` in the config, currently WEBUI-2435, security level _Internal_, label
  `dependabot-ai-triage-control`). Holds the run lock, checkpoint and action journal as hidden issue properties
  (`dependabot-ai-triage-state`, `dependabot-ai-triage-journal`) and one private report comment per run. The
  collector refuses to run if the issue loses its security level or label. Do not close it or put it under an epic.
- **Remediation tickets** carry their own ownership property.

## Configuration

| Setting                                                                                      | Where                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Repositories, Jira projects, components, labels, supported branches                          | `.github/dependabot-ai-triage.json`                                                            |
| Defect Severity field and option IDs (revalidated against Jira create metadata on every run) | `.github/dependabot-ai-triage.json`                                                            |
| Copilot CLI version, model, timeout                                                          | `.github/dependabot-ai-triage.json` (`copilot`)                                                |
| Security epic and quarter                                                                    | Repository variables `SECURITY_EPIC`, `SECURITY_EPIC_QUARTER` (e.g. `NXENG-987`, `2026-Q4`)    |
| Scheduled mode                                                                               | Repository variable `DEPENDABOT_AI_TRIAGE_MODE` (`preview` by default)                         |
| Write approval                                                                               | Repository variable `DEPENDABOT_AI_TRIAGE_ALLOW_AUTOMATIC` (`true` to allow writes)            |
| Pre-merge test ref                                                                           | Repository variable `DEPENDABOT_AI_TRIAGE_APPROVED_REF` (e.g. `refs/heads/<branch>`), optional |
| Schedule                                                                                     | Workflow `cron` (Monday 07:30 UTC = 13:00 IST); one-time runs via **Run workflow**             |

Secrets: `GIT_ADMIN_TOKEN` (alerts and lockfiles), `DEPENDABOT_TRIAGE_JIRA_EMAIL` and `DEPENDABOT_TRIAGE_TOKEN` (Jira),
`DEPENDABOT_TEAMS_WEBHOOK_URL` (dedicated Teams webhook), `DEPENDABOT_TRIAGE_COPILOT_TOKEN` (fine-grained personal
access token with only the **Copilot Requests** account permission). Each step receives only the secrets it needs;
the Copilot step receives only the Copilot token.

### Quarterly epic change

Update `SECURITY_EPIC` and `SECURITY_EPIC_QUARTER` when the new epic exists. Nothing else changes: ownership lives on
the tickets and the checkpoint on the control issue, so existing coverage is kept and no ticket is duplicated. Owned
tickets under older epics are still found through the `dependabot-ai-triage` label. When the quarter has ended and
the variables were not updated, the run still reconciles and reports, but refuses to create tickets and says so.

## Modes

- **preview** (default): collects, plans and validates, then posts the proposed plan to the control issue. No ticket
  changes and no Teams message.
- **automatic**: requires `DEPENDABOT_AI_TRIAGE_ALLOW_AUTOMATIC=true` and the default branch (or the approved ref).
  Applies the plan, then posts the Teams card. Every Jira/Teams write is reserved in the journal before it is made.
  A write whose outcome is unknown (timeout, 5xx) stops further writes and is reconciled on the next run; it is never
  blindly repeated. A Teams post whose delivery is unknown is not resent. Re-running the same workflow run does not
  repeat completed writes.

The checkpoint advances only after a complete automatic run. Collection, planning, validation or write failures make
the run incomplete: the report and (in automatic mode) the Teams card say "scan incomplete" and name the failure;
nothing claims a clean scan.

## Enabling the weekly run

1. Merge to `develop-2023` (the default branch; GitHub schedules only the default branch's workflows, so there is
   exactly one weekly scheduler).
2. Add the `DEPENDABOT_TRIAGE_COPILOT_TOKEN` secret.
3. Run **Run workflow** with `preview`, review the report on the control issue.
4. Set `DEPENDABOT_AI_TRIAGE_ALLOW_AUTOMATIC=true` and `DEPENDABOT_AI_TRIAGE_MODE=automatic`.

## Development

```sh
npm test --prefix .github/scripts/dependabot-ai-triage
```

No npm dependencies: Node 22+ built-ins only. `collect()` and `apply()` accept injected clients, which the tests
use with an in-memory Jira.

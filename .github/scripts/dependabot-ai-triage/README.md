# Dependabot AI triage

Weekly, cloud-only triage of open Dependabot alerts in `nuxeo/nuxeo-web-ui` and `nuxeo/nuxeo-elements`. It runs
on a GitHub-hosted runner (no laptop involved), uses Copilot for the judgement calls, and lets only
deterministic code write to Jira and Teams.

Workflow: [`.github/workflows/dependabot-ai-triage.yaml`](../../workflows/dependabot-ai-triage.yaml). Settings:
[`.github/dependabot-ai-triage.json`](../../dependabot-ai-triage.json).

## How a run works

| Step       | Script        | AI? | What it does                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Collect | `collect.mjs` | No  | Locks the run, reads **every** open alert (paginated, per-repository completion recorded), reads Jira tickets with their ownership property, reconciles alerts by exact lookup, and gathers lockfile/npm evidence only for alerts that are unowned or changed.                                                  |
| 2. Plan    | `plan.mjs`    | Yes | Runs Copilot CLI with `planner-prompt.md`. The agent can only read the planner input files (`view`, `glob`, `grep`); no shell, network, MCP servers or credentials other than the Copilot token. Output: a JSON plan.                                                                                           |
| 3. Apply   | `apply.mjs`   | No  | Validates the plan (`lib/plan-validator.mjs`). In automatic mode it creates/extends tickets, records ownership, raises severity, moves blocked tickets On Hold and posts the Teams card. Saves state on the control issue and adds a short private report there when something changed, needs review or failed. |

Ownership is never inferred from description text. When a ticket owns alerts, the executor writes the Jira issue
property `dependabot-ai-triage-ownership` (alert numbers and fingerprints) and adds the `dependabot-ai-triage`
label. Next week, step 1 matches alerts against those records exactly, so the AI only sees new or changed alerts.
People can freely edit ticket descriptions; that never changes ownership.

The first run has no ownership records, so the planner sees every alert and is expected to **adopt** existing
tickets (record ownership without editing them) and create tickets only for uncovered work.

Blocked owners are also sent back to the planner when the upstream Jira ticket they wait for changes status, and at
least every four weeks, because publishing an upstream release does not change the GitHub alert.

### What the validator enforces

A plan is rejected, and nothing is written, unless:

- it belongs to this run and inventory snapshot, and contains only known fields;
- every alert given to the planner is owned, flagged for review, or reported as a closed-ticket mismatch exactly once;
- no group mixes repositories, and each group's severity equals the highest current GitHub severity it owns;
- no alert owned by another open ticket is claimed, and no owned alert is dropped;
- tickets that are already in progress are not extended (a new linked ticket is created instead), and closed
  tickets are never targeted;
- a ticket is never moved On Hold automatically when its work has started or it already owns actionable findings
  (checked again just before the transition);
- blocked groups use an external blocker (`no-upstream-patch` only when no major of the package has a fix, or
  `upstream-release-pending`) with upstream reference, mitigation and recheck criteria; major upgrades and
  compatibility work are not blockers;
- no ticket is created after the configured epic quarter ends.

## Where data lives

This repository is public, so its Actions logs and artifacts are public. The workflow uploads no artifacts and logs
only counts. Everything else is in Jira:

- **Control issue** (`controlIssue` in the config, currently WEBUI-2435, security level _Internal_, label
  `dependabot-ai-triage-control`). Holds the run lock, checkpoint and action journal as hidden issue properties
  (`dependabot-ai-triage-state`, `dependabot-ai-triage-journal`). A short private report comment is added only when
  a run proposes or makes a change, needs review, or fails; a clean week adds no comment. Each comment lists the
  sources, the counts, one line per affected ticket (with the fix, reason and acceptance criteria only for new or
  extended tickets) and anything that needs attention. Before storing anything, every run checks that the issue has
  exactly the configured security level (`controlSecurityLevelId`) and its label, and that it cannot be read without
  signing in; otherwise the run stops. Who the security level admits is Jira administration: confirm it covers only
  the intended group. Do not close the issue or put it under an epic.
- **Remediation tickets** carry their own ownership property.

## Configuration

| Setting                                                                                      | Where                                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Repositories, Jira projects, components, labels, supported branches                          | `.github/dependabot-ai-triage.json`                                                            |
| Control issue and its required security level id                                             | `.github/dependabot-ai-triage.json` (`controlIssue`, `controlSecurityLevelId`)                 |
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
  Each target is re-read just before it is changed; a ticket closed, started or re-owned since collection is left
  alone and reported. The ownership property is written **last**, after the scope, severity and On Hold changes are
  verified, so an interrupted run leaves those alerts unowned and they are simply planned again. A write whose
  outcome is unknown (timeout, 5xx) stops further writes and is never blindly repeated; the next automatic run settles
  it from Jira (preview only reports it). A Teams post whose delivery is unknown is not resent, and no Teams message is
  sent when the private journal is unavailable. Re-running the same workflow run does not repeat completed writes.

The checkpoint advances only after a complete automatic run. Collection, planning, validation or write failures make
the run incomplete: the report and (in automatic mode) the Teams card say "scan incomplete" and name the failure;
nothing claims a clean scan.

## Enabling the weekly run

1. Merge to `develop-2023` (the default branch; GitHub schedules only the default branch's workflows, so there is
   exactly one weekly scheduler).
2. Add the `DEPENDABOT_TRIAGE_COPILOT_TOKEN` secret.
3. Run **Run workflow** with `preview`, review the report on the control issue.
4. Set `DEPENDABOT_AI_TRIAGE_ALLOW_AUTOMATIC=true` and `DEPENDABOT_AI_TRIAGE_MODE=automatic`.

## Pre-merge testing

Before the workflow is on the default branch, **Run workflow** is not offered in the UI. The workflow is already
registered (id `410170056`), so a branch can still be dispatched through the API:

```sh
gh api -X POST repos/nuxeo/nuxeo-web-ui/actions/workflows/410170056/dispatches \
  -f ref=<branch> -f 'inputs[mode]=preview'
```

Automatic mode from a branch also needs `DEPENDABOT_AI_TRIAGE_APPROVED_REF=refs/heads/<branch>`.

## Development

```sh
npm test --prefix .github/scripts/dependabot-ai-triage
```

No npm dependencies: Node 22+ built-ins only. `collect()` and `apply()` accept injected clients, which the tests
use with an in-memory Jira.

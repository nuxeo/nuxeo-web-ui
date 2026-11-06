# GitHub-hosted Dependabot triage (no AI credentials)

This workflow runs on GitHub-hosted Ubuntu, independently of a laptop. It follows the existing PR-reminder Actions/Teams Adaptive Card pattern, with a separate Teams webhook.

## Activation

Merge `.github/workflows/dependabot-triage.yaml`, `.github/dependabot-triage.json`, and this package into the repository's default branch (`develop-2023`). Scheduled GitHub workflows execute the default branch only. This infrastructure needs one default-branch deployment, not one production job per LTS line: the single scanner inspects both branches in both repositories.

Secrets (never put values in source, reports, or chat):

- `GIT_ADMIN_TOKEN`: read Dependabot alerts and repository contents in both configured repos. The ordinary workflow token reads this repo's state artifacts only.
- `DEPENDABOT_TRIAGE_JIRA_EMAIL` and `DEPENDABOT_TRIAGE_TOKEN`: Naveen’s Jira email and API token, configured explicitly for this workflow. No Cloud Fix credentials are reused. The first preview must verify this identity’s access to WEBUI, ELEMENTS and the epic. Add the values in GitHub Actions secrets; never paste tokens in chat.
- `DEPENDABOT_TEAMS_WEBHOOK_URL`: the new **Dependabot CVE Triage** workflow for **Nuxeo → WebUI - Collaboration**. Do not replace or reuse `TEAMS_WEBHOOK_URL`, which belongs to review reminders.

Repository variables:

| Variable                            | Initial value / purpose                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `SECURITY_EPIC`                     | `NXENG-987`                                                                          |
| `SECURITY_EPIC_QUARTER`             | `2026-Q4`; update together with the epic every quarter                               |
| `DEPENDABOT_TRIAGE_MODE`            | `preview` initially; change to `automatic` after preview approval                    |
| `DEPENDABOT_TRIAGE_ALLOW_AUTOMATIC` | `false` initially; must also be `true` for automatic Jira writes                     |
| `TRIAGE_ONE_TIME_AT`                | Optional ISO timestamp with timezone offset for one future run; leave unset normally |

Use **Actions → Dependabot CVE Triage → Run workflow → preview** first. Preview reads GitHub/Jira and saves a report/card payload; it does not modify Jira or post to Teams. Automatic mode must run on the default branch and pass both mode/approval gates.

The regular schedule is Monday 13:00 Asia/Kolkata (07:30 UTC). A configured one-time date is checked hourly at minute 30 UTC and runs at the first check on/after that timestamp; it is not an exact-minute scheduler. The completed timestamp is recorded so it does not repeat. Change the timestamp for another one-time run. GitHub can delay scheduled executions. Manual dispatch is also available.

## Deterministic triage

Every run reconciles **all** open alerts (stronger than weekly full reconciliation); checkpoint minus the 24-hour overlap and fingerprints prioritize investigation. Preview and automatic checkpoints are independent. A successful checkpoint is the scan start, never its finish. Failed runs keep the prior checkpoint.

Coverage requires repository/project, exact alert URL, advisory, package, manifest and adequate actual Defect Severity in an open ticket's owning scope. Related/out-of-scope references are excluded. Closed matches, low severity fields, possible same-package follow-ups and ambiguous matches go to review rather than automatic duplicate creation. Human-written ticket descriptions are not blindly rewritten.

New findings group by repository, package, affected version line and compatible patched target or shared blocker. Different repositories and unrelated dependencies remain separate. All resolved vulnerable instances, parent ranges, exact pins and declared Node floors are examined on every supported branch. Published-patch absence, parent/engine blockers and branch uncertainty are distinguished. A patch candidate still needs engineering implementation tests; no patch does not prove that no removal/mitigation exists.

Automatic mode creates concrete, scoped Bugs under the configured epic, uses `customfield_12201` for vulnerability severity, preserves individual classifications, and keeps Jira priority independent. Blocked groups get their own ticket, an actual **On Hold** transition and a recheck/mitigation comment. Existing blocked tickets are rechecked. Discovery of a usable patch for held work is reported for review; the workflow does not guess a resume status, close tickets, dismiss alerts or accept risk.

## State, retries and delivery

One concurrency group serializes scheduled/manual runs. State is stored in named Actions artifacts (90-day retention); no GitHub Contents API commits or unsigned state commits are used. The latest retained state from the default branch is restored. If state is unavailable because retention expired, the full Jira reconciliation still runs before any new ticket is created.

Write intent is uploaded **before** Jira actions; stable markers and a fresh Jira query precede creates. Outcomes and ownership receipts are persisted. Description changes by a person trigger manual review instead of overwrite. Reports and Teams card drafts are separate 30-day artifacts, also attached to the run summary.

A notification intent is uploaded **before** the webhook POST. Webhook acceptance is recorded; it is not proof that Power Automate's downstream channel action succeeded. Check the dedicated flow's run history and the channel during the first hosted test. Exactly-once delivery cannot be promised across GitHub/Power Automate. A timed-out or interrupted POST is not retried blindly. The incomplete run retains its checkpoint and asks for delivery review.

If delivery is uncertain, inspect the Run ID in Teams and the flow history, then dispatch the workflow with `delivery_resolution=delivered` and the existing Teams message URL, or `not-delivered` after confirming it did not arrive. This is an explicit operator decision, not an automatic assumption. Source errors generate an incomplete summary rather than a clean-scan claim; Teams failures remain visible in Actions reports. No successful checkpoint is saved until required processing and webhook acceptance are confirmed.

## Development

```sh
npm ci --ignore-scripts --prefix .github/scripts/dependabot-triage
npm test --prefix .github/scripts/dependabot-triage
```

Tests cover severity, repository boundaries, grouping, parent and engine constraints, nested instances, coverage exclusions, date overlap, source failure and actual CLI preview/checkpoint behavior without live credentials. Reports may contain internal Jira context: apply repository visibility/access policy before distributing artifacts.

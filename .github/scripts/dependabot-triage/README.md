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

Use **Actions → Dependabot CVE Triage → Run workflow → preview** first. Preview reads GitHub/Jira and saves a report/card payload; it does not modify Jira or post to Teams. Automatic mode must pass both mode/approval gates and run on the default branch or an explicitly approved manual pre-merge commit.

A pre-merge hosted preview can also be dispatched against the PR branch using `gh workflow run dependabot-triage.yaml --repo nuxeo/nuxeo-web-ui --ref <PR-branch> -f mode=preview`. It uses the same workflow, runner and repository credentials. State restoration accepts trusted default-branch history and the explicitly approved pre-merge commit; unapproved PR artifacts cannot seed automatic execution. Inspect both the workflow result and the generated report: a failed/incomplete run is not a verified dry run. Preview exercises live source reads and report generation; Jira mutations, Teams delivery and the cron trigger require separate validation.

The regular schedule is Monday 13:00 Asia/Kolkata (07:30 UTC). A configured one-time date is checked hourly at minute 30 UTC and runs at the first check on/after that timestamp; it is not an exact-minute scheduler. The completed timestamp is recorded so it does not repeat. Change the timestamp for another one-time run. GitHub can delay scheduled executions. Manual dispatch is also available.

## Deterministic triage

Every run reconciles **all** open alerts (stronger than weekly full reconciliation); checkpoint minus the 24-hour overlap and fingerprints prioritize investigation. Preview and automatic checkpoints are independent. A successful checkpoint is the scan start, never its finish. Failed runs keep the prior checkpoint.

Coverage requires repository/project, exact alert URL, advisory, package, manifest and adequate actual Defect Severity in an open ticket's owning scope. Related/out-of-scope references are excluded. Closed matches, low severity fields, possible same-package follow-ups and ambiguous matches go to review rather than automatic duplicate creation. Human-written ticket descriptions are not blindly rewritten. New findings are assessed before reuse matching. Same-package scope extensions and shared parent upgrades in the same manifest are proposed against existing tickets; these proposals are not treated as coverage until explicit alert scope is added.

New findings group by repository, package, affected version line and identical validated patch target or shared blocker. Differing patch minimums are kept separate until a common advisory-free target is verified. Different repositories and unrelated dependencies remain separate. All resolved vulnerable instances and their dependency paths are collected before classification on every supported branch. Overrides are evaluated against the actual ancestor path and selector, so unrelated sibling overrides do not affect the finding. Published-patch absence requires a vulnerable resolved instance. Unreadable ranges/lockfiles and affected manifest overrides go to review rather than becoming inferred blockers. Parent/pin changes are engineering remediation work, not a confirmed external blocker. Engine and unreadable-parent uncertainty go to review. Only a confirmed missing patch automatically produces an On Hold proposal; existing external publishing dependencies remain subject to verification. A patch candidate still needs engineering implementation tests; no patch does not prove that no removal/mitigation exists.

Automatic mode creates concrete, scoped Bugs under the configured epic, uses `customfield_12201` for vulnerability severity, preserves individual classifications, and keeps Jira priority independent. Blocked groups get their own ticket, an actual **On Hold** transition and a recheck/mitigation comment. Existing blocked tickets are rechecked. Discovery of a usable patch for held work is reported for review; the workflow does not guess a resume status, close tickets, dismiss alerts or accept risk.

## State, retries and delivery

One concurrency group serializes scheduled/manual runs. State is stored in named Actions artifacts (90-day retention); no GitHub Contents API commits or unsigned state commits are used. Only state produced by this repository’s triage workflow, on its default branch or the explicitly approved pre-merge commit, through an allowed event is restored. Fork PRs, other workflows and other event types are rejected; scanning continues to older trusted artifacts. If state is unavailable because retention expired, the full Jira reconciliation still runs before any new ticket is created.

Jira create and description-update intents persist independently of notification completion until a remote outcome is reconciled. Each create reservation is uploaded **immediately before its POST**, using the official artifact client from a JavaScript Actions step; untouched groups are not reserved. Definitive non-creating Jira rejections durably release their reservation; transport/server uncertainty preserves it. Updates reserve a durable description/severity intent before PUT and persist the verified outcome before continuing. Uncertain update results require remote reconciliation; confirmed actions survive later human edits without being replayed. Confirmed create results and pending notification outcomes are uploaded before continuing; stable markers and a fresh Jira query precede creates. Outcomes and ownership receipts are persisted. Description changes by a person trigger manual review instead of overwrite. Reports and Teams card drafts are separate 30-day artifacts, also attached to the run summary. Completed-run snapshots are capped at 20 entries and 2 MiB; old replay attempts are refused using the completed workflow run-number watermark. Unresolved write/delivery journals are preserved independently. The uploader’s archiver utilities use patched glob 14.0.4; the local ZIP round-trip test covers this override.

A notification intent is uploaded **before** the webhook POST. Webhook acceptance is recorded; it is not proof that Power Automate's downstream channel action succeeded. Check the dedicated flow's run history and the channel during the first hosted test. Exactly-once delivery cannot be promised across GitHub/Power Automate. A timed-out or interrupted POST is not retried blindly. The incomplete run retains its checkpoint and asks for delivery review.

If delivery is uncertain, inspect the Run ID in Teams and the flow history, then dispatch the workflow with `delivery_resolution=delivered` and the existing Teams message URL, or `not-delivered` after confirming it did not arrive. Recovery uses only the original immutable report and payload; it never scans new alerts into an already-confirmed notification. Newly arrived alerts are processed in a separate run, retaining the original scan-start checkpoint. This is an explicit operator decision, not an automatic assumption. Source errors generate an incomplete summary rather than a clean-scan claim; Teams failures remain visible in Actions reports. No successful checkpoint is saved until required processing and webhook acceptance are confirmed.

## Development

```sh
npm ci --ignore-scripts --prefix .github/scripts/dependabot-triage
npm test --prefix .github/scripts/dependabot-triage
```

Tests cover severity, repository boundaries, grouping, parent and engine constraints, nested instances, coverage exclusions, date overlap, source failure and actual CLI preview/checkpoint behavior without live credentials. Reports may contain internal Jira context: apply repository visibility/access policy before distributing artifacts.

## Explicit pre-merge automatic execution

For an authorized real integration run before merge, set `DEPENDABOT_TRIAGE_PREMERGE_SHA` to the exact reviewed and signed 40-character PR commit and temporarily set `DEPENDABOT_TRIAGE_ALLOW_AUTOMATIC=true`. Manually dispatch that commit with mode `automatic`. The regular scheduled mode can remain `preview`. Automatic execution on other non-default commits, PR events and scheduled non-default events remains prohibited.

This is a real run: Jira tickets/comments/statuses and Teams posts are live. Observe the run without manually creating tickets, posting messages, repairing its state or retrying uncertain writes. A failed test remains a failure. After observing completion, restore the write-approval flag to `false`. Retain the approved SHA as provenance for historical pre-merge state so interrupted actions can be reconciled and the post-merge scanner can restore its journal. Removing the write-approval flag disables execution even while this provenance SHA remains configured.

## Teams presentation

Use stacked Adaptive Card text entries, not Markdown tables or column grids. Show untriaged alert and unique advisory counts separately from created/updated Jira counts, existing scope-update proposals and alerts requiring review. New blocked tickets remain in the created/proposed ticket section. Existing blockers appear only when linked to a new untriaged alert with current evidence; unrelated existing blocker details and hold reassessments stay in the full audit report. Large lists are truncated with a link to the full Actions report. Preview generates a draft and never posts it.

The report retains every vulnerable instance, parent constraint and applicable override, including findings routed to existing-work proposals. Existing On Hold tickets are not automatically resumed: an unsupported legacy hold is flagged for review in the full audit record.

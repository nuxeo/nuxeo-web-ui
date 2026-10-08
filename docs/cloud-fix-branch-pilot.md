# Dispatcher test without merging

This push-only workflow runs exclusively on `cloud-fix-dispatcher-pilot-20261008`.
It validates a request for WEBUI-2366 and runs dispatcher unit tests. It does not
submit Codex Cloud tasks, change Jira, or implement a new fix. The workflow has
read-only GitHub permissions and no cloud submission step.

If repository Actions secrets `CLOUD_FIX_JIRA_USERNAME` and
`CLOUD_FIX_JIRA_API_TOKEN` exist, it also fetches the ticket and checks for
`cloud-fix` in Tags (`customfield_13956`). If absent, that step is skipped and the
run summary explicitly marks Jira validation blocked. A green payload test alone
is not evidence of Jira/Cloud connectivity or a working label-triggered pipeline.

An administrator must configure those dedicated Jira credentials through
Settings → Secrets and variables → Actions → Secrets if live reads are wanted.
They are separate from the credentials configured in this chat's cloud environment.
No credentials or Jira description are placed in logs or artifacts.

GitHub must permit workflow-file publication and Actions execution for this branch.
No default-branch merge is needed for a push trigger. This does not activate the
Jira webhook: repository_dispatch still requires a default-branch workflow, either
in this repository or a separate private automation repository.

WEBUI-2366 is a QA ticket for open PRs #3586 and #3587. Browser QA still requires
matching deployed builds and a reviewed QA task mode before Cloud submission.

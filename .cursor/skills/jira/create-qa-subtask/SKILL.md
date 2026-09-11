---
name: create-qa-subtask
description: >-
  Create a QA sub-task ("QA task") under a main Nuxeo Web UI Jira so the QA team
  can plan verification of that ticket in a sprint. Reads the parent issue's
  description, comments, fix-summary and PR links, then files a Sub-task titled
  "QA task" whose description captures the full issue, the fix that was made,
  what to verify (acceptance criteria) and how to verify (step-by-step). Use when
  the user gives a WEBUI-<id> (or Jira key/URL) with an intent like "create QA
  jira", "create QA task", "raise QA sub-task", "plan QA for this ticket", or
  "QA sub-task for the sprint".
---

# Create a QA sub-task for the QA team

Given a main Jira (a `WEBUI-<id>`, other Jira key, or Jira URL) plus an intent like
"create QA jira/task", file a **Sub-task** under it named **`QA task`** that tells the QA
team what was fixed and exactly how to verify it in the sprint.

Constants:
- Atlassian cloudId: `252cce86-035e-4b0e-abd2-3c002935632f` (site `hyland.atlassian.net`)
- QA sub-task convention (from existing tasks): `issuetype = Sub-task`, `summary = "QA task"`,
  `parent = <main issue>`, `component` inherited from the parent (usually `UI`), and the
  **Tags** field `customfield_13956 = ["nxqa", "nxui", "nxui-triaged"]` (always set these
  three; this is the "Tags" custom field, NOT the built-in `labels` field).

## Workflow

Track these steps with a TODO list.

### 1. Resolve the parent key
Extract the `WEBUI-<id>` (or other key) from the user's text/URL. If Atlassian tools aren't
listed, call `mcp_auth` for the Atlassian server first.

### 2. Read the parent issue fully
`getJiraIssue` with `issueIdOrKey=<key>`, `fields:["*all"]` (includes `comment`),
`contentFormat:"markdown"`. From it gather:
- **Issue** — summary, description, user-visible symptom, repro steps, expected vs actual.
- **Fix made** — look in the comments for the structured **fix-summary** comment (sections
  *Issue / Root cause / Fix provided / Steps to reproduce / Steps to verify / Areas affected*
  produced by the `fix-nuxeo-web-ui-bug` skill) and for **PR links**. Also check
  `getJiraIssueRemoteIssueLinks` for linked PRs if the comments don't have them.
  If the PRs are known but have **no remote web link** on the parent, that's a gap on the parent —
  add them per [`fix-nuxeo-web-ui-bug` → Phase 6.5](../../fix-nuxeo-web-ui-bug/SKILL.md#phase-65--link-every-pr-on-the-jira-issue-as-a-remote-web-link-mandatory)
  while you're here, so QA can reach the PRs from the ticket.
- **Metadata to inherit** — `components` (copy to the sub-task), `fixVersions`, `priority`.

If the fix details are missing (no fix-summary comment, no PRs, ticket not yet resolved), do NOT
invent them. Fill the "Fix delivered" section with what's known and say the fix is pending /
ask the user for the PR(s).

### 3. Draft the QA task description
Use this Markdown template (mirrors the existing "QA task" tickets — a verify statement, context,
then acceptance criteria — extended with explicit how-to-verify steps the QA team asked for):

```markdown
### Summary
Verify that <the fixed behaviour, one sentence>.

### Issue
<Original problem: user-visible symptom + impact, from the parent. Keep it self-contained so QA
need not open the parent to understand it.>

### Fix delivered
<Root cause in one line + what changed and why it is safe.>
PR(s): <links, one per base — lts-2025 / maintenance-3.1.x>

### How to verify
1. <Environment / setup — e.g. NUXEO_PACKAGES value, seed data, LDAP/multi-repo; or "no
   environment changes required".>
2. <Exact URL / screen to open.>
3. <Actions to perform.>
4. <Expected (fixed) result vs. the old behaviour.>

### What to verify (Acceptance criteria)
* <Observable pass condition 1>
* <Observable pass condition 2>
* No new console/JS errors; UI layout and performance uncompromised.

### Areas to check for regressions
* <Other screens/elements that share the changed code, adjacent behaviours, edge cases/scale.>

### References
* Parent: <WEBUI-id>
* Before/after evidence: <attachment names if any>
```

Prefer reusing the parent's *Steps to verify* and *Areas affected* from the fix-summary comment
verbatim where they exist, rather than rewriting them.

### 4. Create the sub-task
`createJiraIssue` with:
- `cloudId` = constant above
- `projectKey` = parent's project (e.g. `WEBUI`)
- `issueTypeName` = `Sub-task`
- `parent` = the main issue key
- `summary` = `QA task`
- `description` = the drafted Markdown, `contentFormat:"markdown"`
- `additional_fields` = `{"components": [{"name":"<parent component, e.g. UI>"}], "customfield_13956": ["nxqa", "nxui", "nxui-triaged"]}`
  (copy the parent's components and always set the three **Tags** via `customfield_13956`, not
  `labels`; add `fixVersions`/`priority` only if the user asks).

Do **not** set an assignee unless the user names the QA engineer (then resolve with
`lookupJiraAccountId` and pass `assignee_account_id`). Sub-tasks follow the parent's sprint —
no sprint field to set.

### 5. Confirm
Report the new sub-task key + URL (`https://hyland.atlassian.net/browse/<new-key>`) and a one-line
recap of what QA is asked to verify.

## Notes
- Keep the summary exactly `QA task` — that is the team convention across the project.
- One QA sub-task per main Jira unless the user asks to split verification.
- Never fabricate fix/PR/verification details; when unknown, state so and ask.

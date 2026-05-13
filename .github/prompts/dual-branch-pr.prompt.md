---
description: "Create branches and PRs for both LTS-2023 (maintenance-3.1.x) and LTS-2025 (lts-2025) from local changes. Use when you need to push a code change to both maintenance branches via PRs."
agent: "agent"
tools: [execute, read, edit, search, mcp_io_github_git/*, mcp_com_atlassian/*]
argument-hint: "JIRA issue key (e.g., WEBUI-1234)"
---

# Dual-Branch PR Workflow

You are automating the process of creating two PRs (one for LTS-2023, one for LTS-2025) from local code changes.

## Input

The user provides a JIRA issue key (e.g., `WEBUI-1234`). Use this to:
1. Fetch the issue type from JIRA (cloudId: `252cce86-035e-4b0e-abd2-3c002935632f`) to determine the branch prefix (`task`, `bug`, or `feature`)
2. Derive a short slug from the issue summary (2-3 words, kebab-case, lowercase)

## Branch Naming Convention

```
<type>-webui-<number>-<slug>-lts2023
<type>-webui-<number>-<slug>-lts2025
```

Examples:
- `task-webui-2007-enforce-npm-ci-lts2023`
- `bug-webui-1500-fix-dialog-close-lts2025`

## Procedure

### Step 1: Gather info

- Fetch the JIRA issue (use `mcp_com_atlassian_getJiraIssue`) to get the issue type and summary
- Determine the current branch and identify which files are **staged** (`git diff --cached --name-only`)
- Only staged changes will be included in the PRs; unstaged changes must remain untouched throughout the workflow
- Confirm with the user: the branch names, commit message, and the staged files to include

### Step 2: Create LTS-2023 branch, commit, and push

```bash
# Create a patch from staged changes only
git diff --cached > /tmp/dual-branch-pr.patch

# Stash ALL local changes (staged + unstaged) to allow branch switch
git stash push -m "dual-branch-pr-all-changes"

# Fetch latest remote state for both target branches
git fetch origin maintenance-3.1.x lts-2025

# Create branch from maintenance-3.1.x
git checkout -b <type>-webui-<number>-<slug>-lts2023 origin/maintenance-3.1.x

# Apply only the staged patch
git apply /tmp/dual-branch-pr.patch
```

If there are conflicts during `git apply`, show the conflicting files and help the user resolve them (try `git apply --3way /tmp/dual-branch-pr.patch` as fallback).

Then commit and push:
```bash
git add -A
git commit -m "<ISSUE-KEY> : <short description>"
git push -u origin <type>-webui-<number>-<slug>-lts2023
```

**Record the commit hash** — it will be needed for the next step.

### Step 3: Create LTS-2025 branch via cherry-pick

After Step 2, the changes are committed (not in working directory). Use `cherry-pick` to apply the same commit onto the LTS-2025 branch:

```bash
# Create branch from lts-2025
git checkout -b <type>-webui-<number>-<slug>-lts2025 origin/lts-2025

# Cherry-pick the commit from the LTS-2023 branch
git cherry-pick <commit-hash-from-step-2>
```

If there are cherry-pick conflicts:
1. Show `git status` and the conflicting files
2. Help the user resolve them
3. Then `git cherry-pick --continue`

Push:
```bash
git push -u origin <type>-webui-<number>-<slug>-lts2025
```

### Step 3.5: Restore original branch and unstaged changes

Return to the original branch and restore all local changes (both previously-staged and unstaged):

```bash
# Switch back to the original branch
git checkout <original-branch>

# Restore all stashed changes (staged + unstaged return as unstaged)
git stash pop
```

This ensures the user's working directory is back to its original state with all unstaged modifications intact.

### Step 4: Create PRs on GitHub via MCP

Use the `mcp_io_github_git_create_pull_request` tool to create both PRs on `nuxeo/nuxeo-web-ui`.

**Important**: If the MCP server is not responding, tell the user to start it (GitHub MCP server) and retry. Do NOT fall back to CLI tools like `gh` or `curl`.

1. **LTS-2023 PR**:
   - owner: `nuxeo`
   - repo: `nuxeo-web-ui`
   - head: `<type>-webui-<number>-<slug>-lts2023`
   - base: `maintenance-3.1.x`
   - title: `<ISSUE-KEY> : <description>`
   - body: `JIRA: https://hyland.atlassian.net/browse/<ISSUE-KEY>`

2. **LTS-2025 PR**:
   - owner: `nuxeo`
   - repo: `nuxeo-web-ui`
   - head: `<type>-webui-<number>-<slug>-lts2025`
   - base: `lts-2025`
   - title: `<ISSUE-KEY> : <description>`
   - body: `JIRA: https://hyland.atlassian.net/browse/<ISSUE-KEY>`

### Step 5: Report

Print a summary table:

| | LTS-2023 | LTS-2025 |
|---|---|---|
| Branch | `<branch-name>` | `<branch-name>` |
| Base | `maintenance-3.1.x` | `lts-2025` |
| Commit | `<short-hash>` | `<short-hash>` |
| PR | `<link>` | `<link>` |

Also note any conflicts that were resolved.

## Important Notes

- **NEVER commit or push directly to `maintenance-3.1.x` or `lts-2025`** — always create feature branches off them and submit changes via PRs
- Only **staged** changes (`git diff --cached`) are included in the PRs — unstaged changes are preserved and never committed
- Always `git fetch` both target branches before creating feature branches
- After committing to the first branch, use `git cherry-pick` (not stash) to apply the same change to the second branch
- The commit message format is: `<ISSUE-KEY> : <short description>`
- Do NOT force-push or modify existing branches
- Do NOT use `gh` CLI or raw `curl` for PR creation — always use the GitHub MCP tool
- Ask the user before any destructive or irreversible operation
- After PRs are created, always return to the original branch and restore the stash so the user's unstaged changes are intact
- Clean up the temporary patch file (`/tmp/dual-branch-pr.patch`) at the end

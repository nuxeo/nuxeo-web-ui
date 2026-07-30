# Nuxeo Web UI — Cursor Agent Skills

Shared [Cursor Agent Skills](https://docs.cursor.com) for the Web UI team. They are **project
skills**: because they live in `.cursor/skills/`, anyone who clones this repo and opens it in Cursor
gets them automatically — no install step. Just describe your task in chat and the matching skill
activates.

> **First time using these?** Do the one-time [Setup](#one-time-setup) below (Atlassian MCP,
> Jira token, GitHub CLI, signed commits). If you skip it, the Jira/PR steps will fail with auth
> errors. When you start a bug-fix, the agent will also check these prerequisites and walk you
> through anything missing.

## Skills catalog

| Skill | Use it when you… | Notes |
|---|---|---|
| [`fix-nuxeo-web-ui-bug`](fix-nuxeo-web-ui-bug/SKILL.md) | say "fix WEBUI-\<id>", paste a Jira URL, "commit and raise PR", "take this to Ready for QA" | **Orchestrator** — runs the full flow end-to-end. Delegates to the two PR skills below. |
| [`nuxeo-web-ui-pr`](nuxeo-web-ui-pr/SKILL.md) | open a PR, push a branch, backport to both bases | Branch naming, commit format, PR body, `lts-2025` + `maintenance-3.1.x` backport. |
| [`nuxeo-web-ui-pr-checks`](nuxeo-web-ui-pr-checks/SKILL.md) | run the gating checks before pushing | Mirrors CI lint + unit tests. Script: `nuxeo-web-ui-pr-checks/scripts/pr-checks.sh`. |
| [`jira/create-qa-subtask`](jira/create-qa-subtask/SKILL.md) | "create a QA task", "plan QA for this ticket" | Files a `QA task` sub-task with what/how to verify. |
| [`jira/raise-backend-jira-ticket`](jira/raise-backend-jira-ticket/SKILL.md) | a fix needs a server-side change; "raise a backend/NXP ticket" | Files an NXP (`nxplatform`) ticket and links it as a blocker. |

**Dependencies:** `fix-nuxeo-web-ui-bug` → `nuxeo-web-ui-pr` + `nuxeo-web-ui-pr-checks`. The Jira
skills are independent and can be used on their own.

## One-time setup

Prerequisites: [Cursor](https://cursor.com), Node ≥ 18 (repo uses `nvm`), the
[GitHub CLI](https://cli.github.com) (`gh`), and `git`. Do the following once per machine.

### 1. Atlassian (Jira/Confluence) MCP server — needed for every Jira-touching skill

The skills read/write Jira and Confluence through the **Atlassian MCP server**. Add and authenticate
it in Cursor:

1. Open **Cursor → Settings → Tools & MCP → Add** and add the Atlassian server (from Cursor's MCP
   directory), or add it manually to `~/.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "atlassian": { "url": "https://mcp.atlassian.com/v1/sse" }
     }
   }
   ```
2. Reload Cursor. The first call opens a browser **OAuth** flow — sign in with your **Hyland
   Atlassian** account and grant access. (Inside the agent this is the `mcp_auth` step; if a call
   ever returns `needsAuth` / 403, re-run it.)
3. Verify: the agent can call `atlassianUserInfo` and `getAccessibleAtlassianResources`. Our site is
   `hyland.atlassian.net`, cloudId `252cce86-035e-4b0e-abd2-3c002935632f`.

> You need Jira access to the **WEBUI** and **NXP** projects (via org SSO). Ask your lead if a call
> returns "no accessible resources".

### 2. Jira API token — needed to upload evidence (screenshots/videos) & link PRs on the ticket

The Atlassian MCP has **no attachment-upload tool** and **no create-remote-link tool**, so uploading
evidence and adding each PR as a Jira **web link** both go through the Jira REST API, which needs an
API token. Store your credentials in two local files (kept out of git, **never commit**):

```bash
printf '%s' 'you@hyland.com' > ~/.jira_email
printf '%s' '<api-token>'    > ~/.jira_token && chmod 600 ~/.jira_token
```

Create the token at <https://id.atlassian.com/manage-profile/security/api-tokens>. Rotate it there if
it ever leaks. The skills auto-detect these files; if they're absent, the agent will ask you to
create them rather than have you paste a token into chat.

### 3. GitHub CLI — needed to open PRs and watch CI

```bash
gh auth login     # GitHub.com; pick HTTPS or SSH; authenticate in the browser
gh auth status    # verify you're logged in
```

You need push access to `nuxeo/nuxeo-web-ui` (branches are pushed to **origin**, never a fork — CI
checks out by branch name from the upstream repo).

### 4. Signed commits (SSH) — the repo requires signed commits

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub   # your SSH public key
git config --global commit.gpgsign true
```

Then add that **same** SSH key to GitHub as a **Signing key** (GitHub → Settings → SSH and GPG keys →
New SSH key → Key type: *Signing Key*). Verify a commit shows `signed:G` via
`git log --format='%G? %s' -1`. (Internal signed-commits guide: Confluence page `4125330218`.)

### 5. Local dev/test prerequisites (for the bug-fix gating checks)

```bash
nvm use 22        # or any Node ≥ 18
npm ci
```

If unit tests fail to import `@nuxeo/...` after an install, the `nuxeo-elements` symlinks were
replaced — re-link them (see the [`nuxeo-web-ui-pr`](nuxeo-web-ui-pr/SKILL.md) skill, "Before opening
a PR").

## How to use (examples)

Type these in Cursor chat — the right skill activates automatically:

- **Fix a bug end-to-end:** "Fix WEBUI-2138" or paste `https://hyland.atlassian.net/browse/WEBUI-2138`
  → reproduce (with before/after evidence) → fix → gating checks → signed-commit PRs on both bases →
  watch CI → Ready-for-QA check.
- **Just the PR:** "Open a PR for these changes and backport to both bases."
- **Just local checks:** "Run the PR gating checks" — or directly:
  ```bash
  bash .cursor/skills/nuxeo-web-ui-pr-checks/scripts/pr-checks.sh --fix
  ```
- **QA task:** "Create a QA task for WEBUI-1234."
- **Backend ticket:** "This needs a server change — raise a backend NXP ticket and link it."

## Running several agents at once (different tickets in parallel)

Do **not** point two agents at this checkout at the same time. One working tree holds one branch, so
they will fight over `HEAD`; and a clone shares its refs, config and **stash stack** with all of its
worktrees, so `git stash` in one ticket can be popped by another. Give each run its own workspace:

```bash
bash .cursor/skills/fix-nuxeo-web-ui-bug/scripts/new-ticket-workspace.sh WEBUI-2170 lts-2025
bash .cursor/skills/fix-nuxeo-web-ui-bug/scripts/new-ticket-workspace.sh WEBUI-2170 maintenance-3.1.x
```

Then move that agent's root to the printed work tree and `. env.sh` before doing anything else. The
`fix-nuxeo-web-ui-bug` skill does this for you in Phase 0.5.

Each workspace is a full clone with its own `node_modules`, `nuxeo-elements` clone, Docker container
name, host port and build directories — nothing is shared. It is cheap because `git clone --local`
hardlinks the object store (~1s, a few hundred KB) and `cp -Rc` is an APFS copy-on-write clone of
`node_modules` (~20s, no real disk), so setup is ~25s per base. Layout:

```
WebUI/
  nuxeo-web-ui/                      # reference clone — agents never write here
  nuxeo-elements/                    # reference clone
  tickets/WEBUI-2170/lts-2025/       # web-ui/ + elements/ + env.sh
  tickets/WEBUI-2170/maintenance-3.1.x/
```

Override the location with `NX_TICKETS_ROOT`, but keep it **outside** this repo — a nested workspace
becomes untracked content that `git status`, eslint and `prettier --list-different` all walk into.
Tear down with `--remove` (keeps the evidence folder, refuses to delete uncommitted work).

This is for **new** work. Tickets already in flight in an existing checkout or worktree stay where
they are — finish them there rather than migrating, since another agent may still be using it.

Two rules that matter more than the tooling: never `git stash` (use a throwaway worktree of the base
for a clean tree), and never hard-code a port or container name — use `$NX_PORT` / `$NX_CONTAINER`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| MCP call returns `needsAuth` / 403 | Re-run the Atlassian OAuth (agent: `mcp_auth`); confirm SSO access to the WEBUI/NXP projects. |
| Attachment upload 401/403 | Check `~/.jira_email` / `~/.jira_token`; regenerate the token if expired. |
| `gh` command fails | `gh auth status`; re-run `gh auth login`. |
| Commit shows unsigned (`N`/`E`) | Re-check §4; the SSH key must be added to GitHub as a **Signing** key. |
| Tests can't import `@nuxeo/*` | Re-link `nuxeo-elements` symlinks with **absolute** paths (see the PR skill). |
| Two agents keep changing each other's branch | You are sharing one checkout — give each a workspace (see [Running several agents at once](#running-several-agents-at-once-different-tickets-in-parallel)). |
| A build shows someone else's `nuxeo-elements` change | The `@nuxeo/*` symlinks are relative, so they resolve to the shared checkout. Re-run the workspace script to repoint them absolutely. |
| Work vanished / an unexpected diff appeared | A stray `git stash`. Check `git stash list` in **both** repos; the stack is shared across a clone's worktrees. |

## Using these skills in other repos (optional)

Project skills only load for *this* repo. To use them everywhere on your machine, symlink them into
your personal skills folder:

```bash
mkdir -p ~/.cursor/skills
ln -s "$PWD/.cursor/skills/fix-nuxeo-web-ui-bug"   ~/.cursor/skills/fix-nuxeo-web-ui-bug
ln -s "$PWD/.cursor/skills/nuxeo-web-ui-pr"        ~/.cursor/skills/nuxeo-web-ui-pr
ln -s "$PWD/.cursor/skills/nuxeo-web-ui-pr-checks" ~/.cursor/skills/nuxeo-web-ui-pr-checks
```

`git pull` on this repo then updates them everywhere (symlinks, so no re-copy needed).

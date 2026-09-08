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
| [`bug-fix-validation`](bug-fix-validation/SKILL.md) | "validate the fix for WEBUI-\<id>", "QA sign-off", "regression test this PR" | **Test Engineer 3 orchestrator** — runs the buggy and fixed branches side by side, validates the UI (incl. translations, RTL, browsers, accessibility) and publishes a validation report. Never edits code, never writes automated tests. |
| [`nuxeo-web-ui-pr`](nuxeo-web-ui-pr/SKILL.md) | open a PR, push a branch, backport to both bases | Branch naming, commit format, PR body, `lts-2025` + `maintenance-3.1.x` backport. |
| [`nuxeo-web-ui-pr-checks`](nuxeo-web-ui-pr-checks/SKILL.md) | run the gating checks before pushing | Mirrors CI lint + unit tests. Script: `nuxeo-web-ui-pr-checks/scripts/pr-checks.sh`. |
| [`jira/create-qa-subtask`](jira/create-qa-subtask/SKILL.md) | "create a QA task", "plan QA for this ticket" | Files a `QA task` sub-task with what/how to verify. |
| [`jira/raise-backend-jira-ticket`](jira/raise-backend-jira-ticket/SKILL.md) | a fix needs a server-side change; "raise a backend/NXP ticket" | Files an NXP (`nxplatform`) ticket and links it as a blocker. |
| [`dependabot-fix`](dependabot-fix/SKILL.md) | "work on"/"fix" a Dependabot or dependency-security ticket, a CVE, a `WEBUI-`/`ELEMENTS-` security bump, a Dependabot alert number, or a package name | End-to-end dependency-security workflow across `nuxeo-web-ui` **and** `nuxeo-elements`, both LTS lines: scope contract, cross-manifest scan, local validation gates, PRs + Jira comment. Uses `dependabot-impact-analyst` for blast-radius analysis. |
| [`dependabot-impact-analyst`](dependabot-impact-analyst/SKILL.md) | need the blast radius of a dependency upgrade before writing the Jira/PR summary | Maps where a package is used across both repos, classifies risk, reads the changelog for breaking changes, and returns a concrete sanity-test checklist. Used by `dependabot-fix`. |

**Dependencies:** `fix-nuxeo-web-ui-bug` → `nuxeo-web-ui-pr` + `nuxeo-web-ui-pr-checks`.
`bug-fix-validation` runs standalone and hands back to `fix-nuxeo-web-ui-bug` when validation fails.
`dependabot-fix` → `dependabot-impact-analyst` (for the impact report).
The Jira skills are independent and can be used on their own.

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

### 2. Jira API token — needed to upload evidence (screenshots/videos) & some comment ops

The Atlassian MCP has **no attachment-upload tool**, so binary uploads go through the Jira REST API,
which needs an API token. Store your credentials in two local files (kept out of git, **never
commit**):

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
- **Validate a delivered fix:** "Validate the fix for WEBUI-2138" → analyse the ticket and PRs → run the
  buggy base and the fixed branch on separate ports → reproduce, verify, regression + blast-radius test
  with full evidence → publish a validation report with a Pass/Fail recommendation.
- **Just the PR:** "Open a PR for these changes and backport to both bases."
- **Just local checks:** "Run the PR gating checks" — or directly:
  ```bash
  bash .cursor/skills/nuxeo-web-ui-pr-checks/scripts/pr-checks.sh --fix
  ```
- **QA task:** "Create a QA task for WEBUI-1234."
- **Backend ticket:** "This needs a server change — raise a backend NXP ticket and link it."

## Where the skills write files

Two roots, both keyed by ticket id so a finished ticket is one command to clean up. Skills must not
write anywhere else — in particular, **never a folder directly on `~/Desktop`** and **never a loose
worktree in `~/Desktop/Projects/WebUI/`**, which is where the primary clones live.

```
~/Desktop/jira-evidence/<TICKET-ID>/        # evidence — screenshots, videos, logs, reports
    reproduce/                              #   reproduce-nuxeo-web-ui-bug
    fix/                                    #   fix-nuxeo-web-ui-bug
    validation/                             #   bug-fix-validation (Evidence/, harness/, run.log)

~/Desktop/Projects/WebUI/worktrees/<TICKET-ID>/   # code — extra git checkouts, deleted after the run
    webui-lts/ webui-m31/ elements-lts/ elements-m31/   # fix skill roles
    target/ fixed/                                      # validation skill roles
```

All three phases of a ticket therefore collect under one evidence folder. Evidence is kept after a
run (QA needs it); worktrees are removed, because each carries its own `node_modules` at roughly 1 GB
apiece. Override the roots with `NX_VAL_ROOT` / `NX_WT_ROOT` if you need to.

Remove a worktree with `git worktree remove` rather than `rm -rf`, so the repo's `.git/worktrees`
metadata is cleaned up too; the branch itself always survives. To audit what is currently on disk:

```bash
git -C nuxeo-web-ui worktree list && git -C nuxeo-elements worktree list
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| MCP call returns `needsAuth` / 403 | Re-run the Atlassian OAuth (agent: `mcp_auth`); confirm SSO access to the WEBUI/NXP projects. |
| Attachment upload 401/403 | Check `~/.jira_email` / `~/.jira_token`; regenerate the token if expired. |
| `gh` command fails | `gh auth status`; re-run `gh auth login`. |
| Commit shows unsigned (`N`/`E`) | Re-check §4; the SSH key must be added to GitHub as a **Signing** key. |
| Tests can't import `@nuxeo/*` | Re-link `nuxeo-elements` symlinks (see the PR skill). |
| Validation run can't start a container | `docker info` — start Docker Desktop (`open -a Docker`); a missing `NUXEO_CLID` shows up as "Registration required". |
| Validation capture produces no video | Re-run `validation-init.sh <TICKET>`; it installs `puppeteer-screen-recorder` (which bundles ffmpeg) into the run's own harness. |

## Using these skills in other repos (optional)

Project skills only load for *this* repo. To use them everywhere on your machine, symlink them into
your personal skills folder:

```bash
mkdir -p ~/.cursor/skills
ln -s "$PWD/.cursor/skills/fix-nuxeo-web-ui-bug"   ~/.cursor/skills/fix-nuxeo-web-ui-bug
ln -s "$PWD/.cursor/skills/bug-fix-validation"     ~/.cursor/skills/bug-fix-validation
ln -s "$PWD/.cursor/skills/nuxeo-web-ui-pr"        ~/.cursor/skills/nuxeo-web-ui-pr
ln -s "$PWD/.cursor/skills/nuxeo-web-ui-pr-checks" ~/.cursor/skills/nuxeo-web-ui-pr-checks
```

`git pull` on this repo then updates them everywhere (symlinks, so no re-copy needed).

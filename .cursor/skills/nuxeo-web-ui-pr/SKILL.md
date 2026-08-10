---
name: nuxeo-web-ui-pr
description: >-
  Create and push a pull request for the Nuxeo Web UI repository following team
  conventions: branch naming, WEBUI-<id> commit messages, the origin (same-repo)
  flow — always push branches to origin (nuxeo/nuxeo-web-ui), never a fork,
  because CI checks out the branch by name from the upstream repo — the Problem /
  Root cause / Changes / Test plan / Notes PR body format, and backporting to both
  lts-2025 and maintenance-3.1.x. Use when opening a PR, pushing a branch, or
  backporting a fix in nuxeo-web-ui.
---

# Nuxeo Web UI — Pull Request workflow

Reference PR this format mirrors: https://github.com/nuxeo/nuxeo-web-ui/pull/3259

## Before opening a PR

Always validate locally first (see `AGENTS.md`):

```bash
npm run format   # prettier --write then eslint --fix
npm run lint     # eslint + prettier --list-different — must pass
npm test         # Web Test Runner unit tests — must pass
```

If `npm test` fails to import `@nuxeo/nuxeo-ui-elements/...`, a prior `npm install`
replaced the local `nuxeo-elements` symlinks. Re-link them:

```bash
rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s "../../../nuxeo-elements/ui" node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s "../../../nuxeo-elements/core" node_modules/@nuxeo/nuxeo-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s "../../../nuxeo-elements/dataviz" node_modules/@nuxeo/nuxeo-dataviz-elements
```

Do not commit incidental `package-lock.json` churn (npm version differences add/remove
`"peer": true` lines). Revert it: `git checkout -- package-lock.json`.

## Branch naming

`<type>-WEBUI-<id>-<kebab-summary>-<base-branch>`

- type: `fix` (bug), `feat` (feature), `task` (chore/infra)
- include the base branch suffix so the target is unambiguous, e.g.
  `fix-WEBUI-1571-queue-view-navigation-multi-repository-lts-2025`

## Commit message

`WEBUI-<id>: <Concise summary>` (matches `git log` history; the squash-merge appends `(#PR)`).
Add a body explaining the *why* (root cause + approach). Pass via heredoc to preserve formatting.

## Access model — always push to origin (never a fork)

**Always push the feature branch to `origin` (`nuxeo/nuxeo-web-ui`) and open a same-repo PR.**
Do **not** use a fork.

Why: the CI workflows (`.github/workflows/lint.yaml`, `test.yaml`, etc.) check out the branch
**by name from the upstream repo** — `actions/checkout` with `ref: ${{ github.head_ref }}` and no
`repository:` override, so it defaults to `nuxeo/nuxeo-web-ui`. A fork branch does not exist upstream,
so a fork-based PR fails immediately at checkout (`The process '/usr/bin/git' failed with exit code 1`,
surfacing as red **lint/unit-test/a11y**). A same-repo branch is found and CI runs correctly.

Confirm you have push access, then push to origin:
```bash
gh api repos/nuxeo/nuxeo-web-ui --jq '.permissions'   # expect "push": true
git push -u origin HEAD
```
If you ever lack push access, request it rather than falling back to a fork (fork PRs can't pass CI here).

## Open the PR (per base branch)

Same-repo head (just the branch name, no owner prefix):
```bash
gh pr create --repo nuxeo/nuxeo-web-ui \
  --base <base-branch> \
  --head <branch> \
  --title "WEBUI-<id>: <summary> [<base-branch>]" \
  --body "$(cat <<'EOF'
<PR body — see template below>
EOF
)"
```

## After opening each PR — link it on the Jira issue (required)

Every PR must also appear on the ticket as a Jira **remote web link** (the issue's *Web links* /
*Links* section) — one link per PR, backports included. A PR URL pasted in a Jira **comment**, a PR
**title containing `WEBUI-<id>`**, or a GitHub-side link do **not** satisfy this, and the Atlassian MCP
has **no** create-remote-link tool (only `getJiraIssueRemoteIssueLinks` to read, and `createIssueLink`
for issue↔issue links), so it must go through the Jira REST `remotelink` endpoint.

Canonical procedure, with the ready-to-run `curl` (idempotent via `globalId`) and the
`GET /remotelink` verification:
[`fix-nuxeo-web-ui-bug` → Phase 6.5](../fix-nuxeo-web-ui-bug/SKILL.md#phase-65--link-every-pr-on-the-jira-issue-as-a-remote-web-link-mandatory).
Run it as soon as the PR exists, then confirm the link is listed before calling the PR done.

## Base branches & backports

**Default rule: every fix targets BOTH bases.** For each fix, create a branch off `lts-2025`
*and* a branch off `maintenance-3.1.x`, each named with the ticket id
(`<type>-WEBUI-<id>-<kebab-summary>-<base>`), and open **one PR per base** (two PRs total).
Only skip a base when the Jira `fixVersions` explicitly exclude it — call that out.

- Primary development: `lts-2025`.
- Maintenance/backport: `maintenance-3.1.x` (the repo default branch).
- Match the Jira `fixVersions`. When a fix targets multiple versions, open one PR per base.
  Backport by branching from the maintenance base and cherry-picking the commit:

```bash
git fetch origin maintenance-3.1.x
git checkout -b <branch>-maintenance-3.1.x origin/maintenance-3.1.x
git cherry-pick <sha>
git push -u origin HEAD
```

## Keep both PRs in sync (post-creation changes)

When a fix targets multiple bases, treat the PRs as a matched pair. **Any change made after the
PRs exist — review feedback (Copilot/Sonar/reviewers), CI fixes, follow-up tweaks — must be applied
to _every_ PR/base, not just one.** Never fix a review comment on one branch and leave the other
diverged.

- Make the change once, commit it (signed), then cherry-pick the same commit onto each other base
  branch and push. Keep the branches' diffs identical apart from unavoidable base differences.
- Re-run the local gate (`nuxeo-web-ui-pr-checks`) before each push.
- After pushing, confirm CI is (re)running on **both** PRs.

```bash
# example: applied & committed the review fix on the current base, now mirror to the other base
SHA=$(git rev-parse HEAD)
git push origin HEAD
git checkout <other-base-branch-branch>
git cherry-pick "$SHA"
git push origin HEAD
```

## PR body template

```markdown
## Problem
<User-visible symptom + impact.> Jira: [WEBUI-<id>](https://hyland.atlassian.net/browse/WEBUI-<id>)

## Root cause
<Why it happens, naming the responsible code path.>

## Changes
* **`<file>`**: <what changed and why it is safe>.

## Test plan
- [x] `npm run lint` passes
- [x] `npm test` passes
- [ ] <Manual/functional verification steps, esp. anything CI can't cover>

## Notes
<Backport relationship, limitations, follow-ups.>
```

## Git safety

- Never update git config; never force-push to `lts-2025`/`maintenance-3.1.x`.
- Only commit when asked; keep the bug-fix PR focused (don't bundle unrelated files).

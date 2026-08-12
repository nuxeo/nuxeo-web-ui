# Repo facts — nuxeo-elements

Used by the `dependabot-fix` skill (Step 0 onward) when the ticket is an `ELEMENTS-<num>` Jira key, or the alert/package is resolved to `nuxeo/nuxeo-elements`.

## Identity
- GitHub repo: `nuxeo/nuxeo-elements`
- Jira: cloudId `hyland.atlassian.net`, project `ELEMENTS`
- Branch mapping: **LTS-2025 → `lts-2025`**, **LTS-2023 → `maintenance-3.1.x`** (default branch) — same mapping as nuxeo-web-ui
- Feature-branch naming (observed convention): `ELEMENTS-<num>-<slug>` (add an `-lts-2025`/`-3.1.x`-style suffix only when the same fix needs distinct commits per line; check recent branches with `gh api repos/nuxeo/nuxeo-elements/branches` if unsure)
- Downstream consumer (not a dependency of this repo): `../nuxeo-web-ui`

## Lockfile topology — npm workspaces, ONE shared lockfile
This is a Lerna-managed **npm workspaces** monorepo (`package.json` → `"workspaces": ["core", "dataviz", "storybook", "testing-helpers", "ui"]`), with a **single root `package-lock.json`** — there is no per-workspace lockfile anywhere in the tree. Fix the dependency **once at the repo root**; `npm update <pkg> --package-lock-only` (run from the repo root) re-resolves across all five workspaces at once.

Because it's one shared lockfile, always identify **which workspace(s) actually declare the dependency** before running Step 4's tests — grep each workspace's own manifest:
```bash
for p in core dataviz storybook testing-helpers ui; do grep -l '"<pkg>"' "$p/package.json" 2>/dev/null && echo "^ in $p"; done
```
Only the affected workspace's test script needs to run for fast local signal (see CI gate commands below); still run `npm run lint` and, if time permits, the full `npm test` before pushing.

## CI gate commands
| Gate | Command | Notes |
| --- | --- | --- |
| Lint | `npm run lint` | Runs `polymer lint`, then `eslint`, then `prettier --list-different` — all three must pass |
| Test | `npm test` | Runs `test:core` → `test:ui` → `test:dataviz` **sequentially**, each its own `web-test-runner --coverage` run (set via `NX_PACKAGE`) |
| Targeted test | `npm run test:core` / `npm run test:ui` / `npm run test:dataviz` | Use whichever matches the workspace(s) found above, for fast local signal |
| Build | **None** — this is a published component library, not a bundled app. There is no `npm run build`; skip that gate entirely for this repo. |

CI (`lint.yaml`/`test.yaml`) uses `npm ci --ignore-scripts`; the `pretest` hook separately provisions a bundled Chromium via `puppeteer browsers install chrome`, so no system Chrome is needed.

## Publish model — this repo produces npm packages, it does not deploy
Fixing a dependency here does **not** by itself reach end users of nuxeo-web-ui. The chain is:
1. A PR merges to `lts-2025` (or `maintenance-3.1.x`) → `main.yaml` runs lint + test + storybook + sonar, then **auto-publishes a `SNAPSHOT`** version of every workspace package (except storybook) to `packages.nuxeo.com`.
2. A maintainer later runs `promote.yaml` (manual `workflow_dispatch`) to cut and publish the real release version from an RC tag.
3. **Only once nuxeo-web-ui bumps its own `@nuxeo/nuxeo-elements` / `@nuxeo/nuxeo-ui-elements` / `@nuxeo/nuxeo-dataviz-elements` version** (in `nuxeo-web-ui`'s `package.json`/lockfile) do the fixed dependencies actually ship to Web UI users.

**Always state this explicitly** in the PR body's "Cross-repo follow-up" section and the Jira comment: name the exact published version once known, and say whether a companion `WEBUI-` ticket/PR to bump it already exists or still needs to be filed. Do not imply this PR alone closes any `WEBUI-`-side Dependabot alert.

## Common pitfalls
- No bundler/dev server here — don't add a "build" validation step; it doesn't exist for this repo.
- `@nuxeo` npm packages come from `https://packages.nuxeo.com/repository/npm-public/`, not npmjs.org — installs need that registry/scope configured (see `test.yaml`/`lint.yaml`'s `setup-node` step for the exact config if reproducing CI locally).
- The `ui/` package has its own `eslint.config.mjs` in addition to the root config — `npm run lint` covers both, but if you scope a manual eslint run, run it from the repo root.
- `ui/viewers/pdfjs/` and `ui/js-interpreter/` are vendored/forked — a Dependabot alert naming a package only reachable through these paths still needs the same scope-contract treatment (Step 2 of the main skill); don't hand-edit the vendored code itself.

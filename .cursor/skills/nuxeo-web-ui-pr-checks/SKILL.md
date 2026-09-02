---
name: nuxeo-web-ui-pr-checks
description: >-
  Run the gating checks that nuxeo-web-ui PR CI runs (Lint + Unit tests),
  locally, before pushing. Use before every `git push` to a PR branch, when
  updating an open PR, or before opening one — so the push doesn't turn the PR
  red. Mirrors .github/workflows/lint.yaml and test.yaml. Also documents the
  heavier CI-only checks (a11y, Maven build, sonar) and the common local
  gotchas (broken @nuxeo symlinks, package-lock churn, flaky document-tree test).
---

# Nuxeo Web UI — pre-push PR checks

Before pushing commits to a PR branch (new PR or updating an existing one),
run the same checks that gate the PR, and **only push if they pass**.

## What the PR actually gates on

| CI workflow | Command | Run locally? |
|---|---|---|
| **Lint** (`lint.yaml`) | `npm run lint` (eslint + `prettier --list-different`) | Yes — fast |
| **Test** (`test.yaml`) | `npm run test` (web-test-runner `--coverage`) | Yes — ~2 min |
| A11y (`a11y.yaml`) | `mvn -B -ntp install` + `mvn -B -ntp -f plugin/a11y install` | Optional — needs Java + npm token + repo creds |
| Sonar / full build | push-only (`main.yaml`) | No — not a PR gate |

`npm run lint` and `npm run test` are the gate developers must reproduce locally.
A11y/build/sonar need Maven and secrets, so they're not part of the fast pre-push loop.

## Run the gate

From the repo root:

```bash
bash .cursor/skills/nuxeo-web-ui-pr-checks/scripts/pr-checks.sh         # lint + test (matches CI)
bash .cursor/skills/nuxeo-web-ui-pr-checks/scripts/pr-checks.sh --fix   # npm run format first, then lint + test
```

- Exit code `0` → safe to push.
- Non-zero → **do not push**; fix and re-run.

CI runs `npm run lint` in **check** mode (it does not auto-fix). Use `--fix`
locally to apply `npm run format` (prettier `--write` then eslint `--fix`) before
the lint gate, then commit the formatting changes.

## Push only on green

```bash
bash .cursor/skills/nuxeo-web-ui-pr-checks/scripts/pr-checks.sh && git push --force-with-lease origin HEAD
```

Never force-push to `lts-2025` / `maintenance-3.1.x` themselves — only to the PR's feature branch.

## Common local gotchas

- **`@nuxeo/...` import errors in `npm test`**: a prior `npm install` replaced the
  `nuxeo-elements` symlinks. Re-link (see `AGENTS.md`) and re-run:

```bash
rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s ../../../nuxeo-elements/ui node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s ../../../nuxeo-elements/core node_modules/@nuxeo/nuxeo-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s ../../../nuxeo-elements/dataviz node_modules/@nuxeo/nuxeo-dataviz-elements
```

- **`package-lock.json` churn**: npm version differences add/remove `"peer": true`
  lines. Don't commit it: `git checkout -- package-lock.json`.

- **"Tests were interrupted because the browser disconnected" with `0 passed, 0 failed`**: almost
  never your change. `npm test` exiting `143` (SIGTERM) with no browser logs means something outside
  the run killed it — most often another agent's helper script doing a machine-wide
  `pkill -f web-test-runner`. Confirm with `pgrep -fl web-test-runner` (you will see the *other*
  script's shell in the list), then either wait for it to finish or run the suite under a command
  line that pattern cannot match. Note there must be **no `--config` argument**: the filename
  `web-test-runner.config.mjs` contains the pattern, so passing it explicitly leaves you just as
  killable. Web Test Runner picks that config up on its own. Keep the coverage steps so the run
  stays equivalent to the gate:

```bash
npm run update-coverage-imports && npm run update-test-load-all \
  && node node_modules/@web/test-runner/dist/bin.js --coverage \
  && node scripts/test/unit/inject-zero-coverage.js
```

  Verify it is actually hidden with `pgrep -f web-test-runner` while it runs — that should list the
  *other* script but not yours. Never write such a `pkill` yourself: kill only PIDs you started.

- **Flaky `nuxeo-document-tree` test** (`test/nuxeo-document-tree.test.js` "Tree should
  collapse when clicking on a document"): timing flake unrelated to most changes. If it
  fails *only* in CI but passes locally, re-run the job instead of "fixing" it:
  `gh run rerun <run-id> --failed`.

## Optional: reproduce the A11y check locally

Only when a change might affect accessibility/build. Requires Java (21 for `lts-2025`,
17 for `maintenance-3.1.x`) and `@nuxeo` npm/Maven auth configured:

```bash
mvn -B -ntp install
mvn -B -ntp -f plugin/a11y install
```

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
| Ftest (`ftest`, cross-repo `web-ui`) | `npm run ftest` (WebdriverIO + a running Nuxeo server) | No — tens of minutes |
| Sonar / full build | push-only (`main.yaml`) | No — not a PR gate |

`npm run lint` and `npm run test` are the gate developers must reproduce locally.
A11y/build/sonar need Maven and secrets, so they're not part of the fast pre-push loop.

**Don't wait on the functional tests.** `ftest` (and the cross-repo `web-ui` check) boots a Nuxeo
server and drives a browser suite, so it runs for tens of minutes — never poll it locally or in CI
while a task is in flight. Push once lint + unit are green, snapshot the ftest state, and report it as
"still running, not waited on". Look at it only once it has reported **failed**; if the failure can't
plausibly come from the change, re-run the job rather than investigating it.

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

# Repo facts — nuxeo-web-ui

Used by the `dependabot-fix` skill (Step 0 onward) when the ticket is a `WEBUI-<num>` Jira key, or the alert/package is resolved to `nuxeo/nuxeo-web-ui`.

## Identity
- GitHub repo: `nuxeo/nuxeo-web-ui`
- Jira: cloudId `hyland.atlassian.net`, project `WEBUI`
- Branch mapping: **LTS-2025 → `lts-2025`**, **LTS-2023 → `maintenance-3.1.x`** (default branch)
- Feature-branch naming: `WEBUI-<num>-<slug>-lts-2025` and `WEBUI-<num>-<slug>-lts-2023`
- Sibling repo (published dependency, not vendored): `../nuxeo-elements`

## Lockfile topology — root + 3 independent sibling projects
nuxeo-web-ui is **not** an npm-workspaces monorepo. The root is a normal webpack app with its own `package.json`/`package-lock.json`, and three other directories are **completely independent npm projects** with their own installs and lockfiles — they do not share resolution with the root or each other:
- `packages/nuxeo-web-ui-ftest` (WebdriverIO/Cucumber functional tests)
- `packages/nuxeo-designer-catalog`
- `plugin/a11y` (Maven module wrapping an a11y check)

A Dependabot alert can point at any one of these four lockfiles independently. Check the ticket's manifest path to know which directory to fix in — fixing the root does **not** fix a vulnerable package pinned only in `plugin/a11y/package-lock.json`, and vice versa.

**Because each manifest is scanned independently, the same package can be separately vulnerable — and separately alerted/ticketed — in more than one of these 4 files at once.** Fixing only the manifest your ticket names can leave a duplicate, independently-tracked alert open elsewhere (and someone else may already be working it). The `dependabot-fix` skill's Step 2 always scans all 4 manifests for the target package and cross-references any other open alert it finds rather than silently re-fixing (or silently ignoring) it — see "Cross-manifest duplicate scan" there before assuming a single-manifest fix is complete.

**And within one manifest, the same package can resolve to several instances at different majors — each alerted separately.** `plugin/a11y` has carried both a `brace-expansion@1.x` and a `2.x` instance under two distinct alerts (#391 and #392) at the same time. Patching the line your ticket names does nothing for the other, and the CVE-resolution check won't catch it because that alert has its own vulnerable range. See "Same-manifest multi-instance scan" in the skill's Step 2.

## Sub-project local gates — there are none
The three sibling projects have **no lint, unit-test or build script** to run locally:
| Project | Scripts it actually declares |
| --- | --- |
| `packages/nuxeo-web-ui-ftest` | `postinstall: check-engine --ignore` only |
| `packages/nuxeo-designer-catalog` | `postinstall: check-engine --ignore`, `clean-data` |
| `plugin/a11y` | `test` / `test:dev` — WebdriverIO against a **live Nuxeo server** (`NUXEO_WEB_UI_URL` + `NUXEO_URL`) |

So a fix landing entirely in one of those lockfiles is still validated from the **repo root**: `npm run lint`, `npm test`, `npm run build`, plus the skill's CVE-resolution check pointed at that sub-project's lockfile. The a11y suite is CI-gated through Maven (`mvn -f plugin/a11y install`) and ftest needs a running server — don't attempt either as a local pre-push gate, and don't imply in a PR that you did.

## CI gate commands
| Gate | Command | PR-gating? |
| --- | --- | --- |
| Lint | `npm run lint` (eslint + `prettier --list-different`) | Yes |
| Test | `npm run test` (single `test/load-all-tests.js` barrel via `@web/test-runner`, with coverage) | Yes |
| Build | `npm run build` (`webpack --env production`) | No (push-only `main.yaml`), but still run it in Step 4 to catch build-breaking bumps |
| A11y | `mvn -B -ntp install` + `mvn -B -ntp -f plugin/a11y install` | Yes, but heavy (needs Java 21 + Maven creds) — optional locally |

CI uses `npm ci` (not `npm install`) — deterministic, lockfile-based.

## Local dev symlink gotcha
`npm install` **replaces** the local `nuxeo-elements` symlinks used for sibling-repo development. If `npm test` fails to import `@nuxeo/nuxeo-ui-elements/...` after running `npm install`/`npm ci`, re-link:
```bash
rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s ../../../nuxeo-elements/ui node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s ../../../nuxeo-elements/core node_modules/@nuxeo/nuxeo-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s ../../../nuxeo-elements/dataviz node_modules/@nuxeo/nuxeo-dataviz-elements
```

## `overrides` precedent (use for "transitive, parent range forbids the patch")
The root `package.json` already carries an `overrides` block from prior CVE fixes — follow this exact shape rather than inventing a new one:
```json
"overrides": {
  "ws": "8.20.1",
  "tar-fs": "^3.0.9",
  "marked": "^4.0.17",
  "serialize-javascript": "^7.0.5",
  "tmp": "^0.2.4",
  "cross-spawn": "^7.0.6",
  "qs": "^6.14.1",
  "form-data": "^2.5.4",
  "@nuxeo/page": { "path-to-regexp": "^8.4.0" },
  "mocha": { "diff": "^8.0.3" },
  "uuid": "$uuid",
  "request": { "uuid": "^3.4.0" },
  "replace": { "minimatch": "^3.1.4" }
}
```
Scoped overrides (e.g. `"@nuxeo/page": { "path-to-regexp": "..." }`) pin a transitive dep only under that specific parent — prefer this narrower form over a bare top-level override when the vulnerable package is only unsafe under one dependent.

## Cross-repo: consumes nuxeo-elements
nuxeo-web-ui depends on the **published** npm packages `@nuxeo/nuxeo-elements`, `@nuxeo/nuxeo-ui-elements`, `@nuxeo/nuxeo-dataviz-elements` (built from the `nuxeo-elements` repo) — it does not vendor their source; local dev only symlinks them (see gotcha above).

If the vulnerable package is nested **inside** one of those published packages' own dependency tree:
1. Check whether some *other* web-ui dependency's range already causes npm to dedupe to a safe version in this lockfile — if so, `npm update`/`npm install --package-lock-only` alone may resolve it here.
2. If not, and the `@nuxeo/*` package's own `package.json` pins the vulnerable range, an `overrides` entry here is only a **documented, temporary workaround** — the durable fix must land in `nuxeo-elements` (see `references/nuxeo-elements.md`), get published, and then web-ui must bump its `@nuxeo/*` version in a **separate follow-up** once that's available. Say this explicitly in the PR body's "Cross-repo follow-up" section and the Jira comment — do not imply this PR alone is the complete fix.

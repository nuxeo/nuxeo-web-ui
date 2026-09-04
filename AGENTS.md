# Agent Instructions for Nuxeo Web UI

## Overview

This is a Polymer 3 web application (SPA) for the Nuxeo content services platform. Code ownership: `@nuxeo/ui`. The main development branch is `lts-2025` for LTS-2025.

## Build & Validate

Always follow this sequence when making changes:

```bash
npm install                  # Install dependencies (Node ≥ 18)
npm run format               # Auto-fix formatting (Prettier → ESLint)
npm run lint                 # ESLint + Prettier check — must pass
npm test                     # Web Test Runner unit tests — must pass
```

- `npm run lint` runs both `eslint` and `prettier --list-different`.
- `npm run format` runs `prettier --write` first, then `eslint --fix`.
- Always run `npm run format` before committing. Pre-commit hooks enforce this.
- Do NOT commit `.only` in test files — the `no-only-tests` ESLint rule blocks it.

## CLA-safe commits

`license/cla` fails if any commit or `Co-authored-by` trailer names `cursoragent@cursor.com`. Never add
`Co-authored-by: Cursor` and never commit as the Cursor agent user. Husky runs
`scripts/git/commit-msg-cla.sh` on every commit to block those trailers. If a PR branch is already
polluted, squash on the PR base and rewrite with `git commit-tree` + a message file (agent
`git commit` may re-inject Cursor trailers).

Before marking a PR ready, verify the current head SHA has a successful `license/cla` status. If
GitHub shows `license/cla Expected — Waiting for status to be reported`, first push a signed empty
retrigger commit. If the legacy status provider still does not report, ask a repo maintainer to
refresh the required check or CLA app configuration instead of leaving the PR blocked.

## Project Structure

```
index.js              → Bootstrap (promise chain: disableRobotoFont → setupRTLSupport → loadApp → loadLegacy → loadBundle → setupApp → loadRouting → loadAddons)
elements/             → ALL Polymer web components live here
  nuxeo-app.js        → Root element
  routing.js          → Client-side router (@nuxeo/page, hashbang)
  elements.js         → Central import barrel
  document/           → Document type layouts (view/edit/metadata/create)
  search/             → Search form layouts
  bulk/               → Bulk editing
  diff/               → Document comparison
  nuxeo-admin/        → Admin panel
  nuxeo-browser/      → Document browser
  nuxeo-results/      → Result display
addons/               → Optional feature bundles (each has index.js entry)
i18n/                 → Translation JSON files (16 languages)
themes/               → Visual themes (default, dark; hyland-light, hyland-dark)
test/                 → Unit tests (@web/test-runner + Mocha; sources in test/*.test.js)
ftest/features/       → Functional test Gherkin scenarios
packages/nuxeo-web-ui-ftest/ → WDIO page objects + step definitions
scripts/              → Build helpers (merge-messages.js, test/unit/, test/ftest/)
plugin/               → Maven sub-modules
```

## Coding Patterns

### Polymer Elements

Most elements use the **legacy Polymer factory** — do NOT convert to class-based:

```javascript
Polymer({
  is: 'nuxeo-my-element',
  _template: html`...`,
  behaviors: [FormatBehavior, RoutingBehavior],
  properties: { document: { type: Object, notify: true } },
  _myMethod() { ... },
});
```

Some elements are `.html` files with `<dom-module>` + inline `<script>` — this is intentional.

### Server Communication

Always use Nuxeo Elements for API calls, never `fetch()`:

- `<nuxeo-operation>` — Automation operations
- `<nuxeo-resource>` — REST endpoints
- `<nuxeo-document>` — Document CRUD
- `<nuxeo-page-provider>` — Paginated queries

### Naming Conventions

- Elements: `nuxeo-<name>` (kebab-case)
- Document layouts: `elements/document/<doctype>/nuxeo-<doctype>-<mode>-layout.html`
- Search layouts: `elements/search/<name>/nuxeo-<name>-search-form.html`
- Test files: `test/nuxeo-<element-name>.test.js`
- i18n keys: `this.i18n('key')` or `[[i18n('key')]]` in templates

### Style Rules

- Prettier: `printWidth: 120`, `singleQuote: true`, `trailingComma: 'all'`, `semi: true`
- ESLint: flat config in `eslint.config.mjs`
- Max line length: 120 characters
- `Polymer` global is `readonly`, `Nuxeo` is `writable`

## Testing

### Unit Tests

```bash
npm test                    # Single run with coverage (~1 runner file, 1000+ Mocha tests)
npm run test:watch          # Watch mode (no coverage)
npm run update-test-load-all  # Regenerate test/load-all-tests.js after adding *.test.js
```

- Framework: `@web/test-runner` + Mocha + Chai + Sinon
- **Runner vs suites**: `web-test-runner.config.mjs` lists one entry (`test/load-all-tests.js`); WTR shows `1/1 test files`. That file imports every `*.test.js` module — pass/fail counts are individual Mocha tests.
- Globals available: `expect`, `assert`, `sinon`, `should`
- Test setup: `test/setup.js` (chai + sinon-chai)
- Element helpers: `@nuxeo/testing-helpers`

### Functional Tests

```bash
npm run ftest               # Headless (needs running Nuxeo server)
npm run ftest:dev           # Against localhost:8080 + localhost:5000
```

- Framework: WebdriverIO 9 + Cucumber
- Feature files: `ftest/features/*.feature`
- Page objects: `packages/nuxeo-web-ui-ftest/pages/`
- Step defs: `packages/nuxeo-web-ui-ftest/features/step_definitions/`

## CI Workflow

Push to the `lts-2025` branch triggers: **lint → test → a11y → ftest → sonar → build** (all must pass).

PRs run lint and test workflows automatically.

- CI uses `npm ci` (not `npm install`) for deterministic, lockfile-based installs.
- `package-lock.json` is committed and must be kept in sync with `package.json`.
- Sub-packages `packages/nuxeo-web-ui-ftest`, `packages/nuxeo-designer-catalog`, and `plugin/a11y` also have committed lockfiles and use `npm ci` in CI.

## Common Pitfalls

- `npm install` **replaces** nuxeo-elements symlinks. Re-create them manually after install if developing locally against a sibling `nuxeo-elements` repo (see `.github/skills/link-nuxeo-elements/SKILL.md` for the procedure).
- Always commit `package-lock.json` changes when dependencies change. CI relies on it for `npm ci`.
- `.html` files contain real Polymer components with inline JS — don't treat them as static HTML.
- The `NUXEO_PACKAGES` env var controls which addon JS bundles are imported at runtime via `Nuxeo.UI.bundles`. If unset, addon resources are still copied to the build but no addon entry points are imported (except `nuxeo-spreadsheet`, which is always loaded).
- `@nuxeo` npm packages come from `https://packages.nuxeo.com/repository/npm-public/`, not npmjs.org.
- Maven build requires **Java 21**.

## Environment Variables

| Variable         | Default                                                                   | Purpose                                                           |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `NUXEO_URL`      | `/nuxeo`                                                                  | Server URL in the app                                             |
| `NUXEO_HOST`     | `localhost:8080`                                                          | Dev proxy target                                                  |
| `NUXEO_PACKAGES` | empty (no addon entry points imported; `nuxeo-spreadsheet` always loaded) | Addon JS entry points to import at runtime via `Nuxeo.UI.bundles` |

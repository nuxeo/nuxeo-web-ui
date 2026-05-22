# Nuxeo Web UI — Copilot Instructions

## Source of Truth

- Use `AGENTS.md` as the authoritative source for build/validate order, coding patterns, and common pitfalls.
- This file provides Copilot-focused context and quick references; when guidance differs, follow `AGENTS.md`.

## Project Overview

Nuxeo Web UI is the standard web application for the Nuxeo content services platform, built with **Polymer 3** (mostly legacy `Polymer({…})` factory pattern) and backed by the **@nuxeo/nuxeo-elements** library of web components. Licensed Apache 2.0, owned by Hyland Software.

- **Runtime**: Browser (no server-side JS in production)
- **Node**: ≥ 18
- **Build**: Webpack 5
- **Package manager**: npm (no yarn/pnpm)
- **Java**: 21 (Maven wraps the frontend build for marketplace packaging)

## Repository Layout

```
index.js              → App bootstrap (disableRobotoFont → setupRTLSupport → loadApp (nuxeo-app.js) → loadLegacy → loadBundle → setupApp → loadRouting → loadAddons; see ARCHITECTURE.md boot sequence)
index.html            → SPA shell
elements/             → All Polymer web components
  nuxeo-app.js        → Root application element
  routing.js          → Client-side router (@nuxeo/page, hashbang mode)
  elements.js         → Central import barrel for all components
  document/           → Per-doctype layouts (view, edit, metadata, create)
  search/             → Search form layouts (default, expired, trash, nxql, document_picker)
  bulk/               → Bulk edit components
  diff/               → Document comparison
  nuxeo-admin/        → Admin console (analytics, user-group management)
  nuxeo-browser/      → Document browser & breadcrumb
  nuxeo-results/      → Result list/grid display
addons/               → Optional addon bundles (Drive, LiveConnect, CSV, Spreadsheet, etc.)
i18n/                 → Localization JSON files (16 languages), merged at build time
themes/               → Themeable CSS (default, dark, light, kawaii)
test/                 → Unit tests (@web/test-runner + Mocha + Chai + Sinon)
ftest/                → Functional tests (Cucumber/Gherkin .feature files)
packages/
  nuxeo-web-ui-ftest/ → WDIO test framework (page objects, step definitions, hooks)
  nuxeo-designer-catalog/ → Design element catalog builder
plugin/               → Maven sub-modules (web-ui addon/marketplace, itests, a11y, metrics)
server/               → Nginx configs for Docker-based deployment
scripts/              → Build helpers (merge-messages.js, test/unit/, test/ftest/)
```

## Commands

| Task | Command | Notes |
|---|---|---|
| Install | `npm install` | Also runs `check-engine` and installs sub-packages |
| Dev server | `npm start` | Webpack dev server at `:5000`, proxies to Nuxeo at `NUXEO_HOST` (default `localhost:8080`) |
| Lint | `npm run lint` | ESLint (flat config) + Prettier check |
| Format | `npm run format` | Prettier write → ESLint fix |
| Unit tests | `npm test` | Web Test Runner + Chrome headless; 1 runner file, all suites via `test/load-all-tests.js` |
| Unit tests (watch) | `npm run test:watch` | Auto-rerun on changes (no coverage) |
| Functional tests | `npm run ftest` | WebdriverIO + Cucumber, requires running Nuxeo server |
| Production build | `npm run build` | Output in `dist/` |
| Bundle analysis | `npm run build:analyze` | Webpack bundle analyzer |
| Maven full build | `mvn clean install` | Builds marketplace ZIP |
| Maven + ftests | `mvn clean install -Pftest` | Builds + runs functional tests |
| Link nuxeo-elements | See `.github/skills/link-nuxeo-elements/SKILL.md` | Manual symlinks for `node_modules/@nuxeo/*` → sibling `nuxeo-elements` repo |

## Coding Conventions

### Polymer / Web Components

- **Legacy Polymer**: Most elements use `Polymer({ is: '...', _template: html\`...\` })`. Do NOT convert to class-based unless explicitly asked.
- **Behaviors**: Shared logic uses Polymer behaviors (`FiltersBehavior`, `FormatBehavior`, `RoutingBehavior`, `I18nBehavior`), not mixins.
- **HTML templates**: Some elements are `.html` files with `<dom-module>` and inline `<script>` blocks. Others are `.js` files with `html` tagged template literals.
- **Nuxeo element APIs**: Use `<nuxeo-operation>`, `<nuxeo-resource>`, `<nuxeo-document>`, `<nuxeo-page-provider>` for server communication — never raw `fetch()`.

### Style

- **Prettier**: `printWidth: 120`, `singleQuote: true`, `trailingComma: 'all'`, `semi: true`, `tabWidth: 2`
- **ESLint**: Flat config (`eslint.config.mjs`), `eslint-plugin-html` for `.html` files, `eslint-plugin-wc` for web component rules
- **Max line length**: 120 characters
- **`Polymer` global**: Declared as `readonly` in ESLint; `Nuxeo` is `writable`
- Run `npm run format` before committing (enforced by husky + lint-staged).

### Naming

- Custom elements: kebab-case prefixed with `nuxeo-` (e.g., `nuxeo-document-tree`)
- Document layouts: `elements/document/<doctype>/nuxeo-<doctype>-<view|edit|metadata|create>-layout.html`
- Search layouts: `elements/search/<name>/nuxeo-<name>-search-form.html`
- Test files: `test/nuxeo-<element-name>.test.js`

### i18n

- Message keys in `i18n/messages.json` (English default), translated files are `messages-<locale>.json`
- Access via `this.i18n('key')` or `[[i18n('key')]]` in templates
- Build merges addon + nuxeo-ui-elements messages into `.tmp/i18n/` via `scripts/merge-messages.js`

## Testing

### Unit Tests

- Framework: `@web/test-runner` + Mocha + Chai + Sinon (globals: `expect`, `assert`, `sinon`)
- **One runner file**: `test/load-all-tests.js` imports every `*.test.js` — WTR reports `1/1 test files`; ignore that and read Mocha pass/fail counts
- Helpers: `@nuxeo/testing-helpers` for creating/fixture-ing elements and mocking server
- Setup: `test/setup.js` configures chai with sinon-chai
- After adding `test/foo.test.js`: run `npm run update-test-load-all` (or `npm test`) to refresh the barrel
- Run a single suite: `npx web-test-runner --files test/nuxeo-keys.test.js` (must import `./setup.js` or use the full barrel)
- Do not use `.only` — the `no-only-tests` lint rule catches it

### Functional Tests

- Framework: WebdriverIO 9 + Cucumber (Gherkin)
- Feature files: `ftest/features/*.feature`
- Page objects: `packages/nuxeo-web-ui-ftest/pages/`
- Step definitions: `packages/nuxeo-web-ui-ftest/features/step_definitions/`
- Requires a running Nuxeo server (Docker or local)
- Dev mode: `npm run ftest:dev` (expects Nuxeo at `localhost:8080`, UI at `localhost:5000`)

## Local Development with nuxeo-elements

When developing against a local `nuxeo-elements` checkout, manually create symlinks to replace the registry packages:

```sh
rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s "../../../nuxeo-elements/ui" node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s "../../../nuxeo-elements/dataviz" node_modules/@nuxeo/nuxeo-dataviz-elements
rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s "../../../nuxeo-elements/core" node_modules/@nuxeo/nuxeo-elements
```

See `.github/skills/link-nuxeo-elements/SKILL.md` for full details and custom path instructions.

**Warning**: `npm install` replaces these symlinks. Re-create them after any install.

## CI / GitHub Actions

- **Main branch flow (`lts-2025`)**: lint → test → a11y → ftest → sonar → build (sequential gates)
- **Preview**: PRs tagged `preview` get ephemeral environments (cross-repo with nuxeo-elements)
- **Registry**: `@nuxeo` packages come from `https://packages.nuxeo.com/repository/npm-public/`
- **Lockfile**: `package-lock.json` is committed. CI workflows use `npm ci` for deterministic installs.
- **Sub-package lockfiles**: `packages/nuxeo-web-ui-ftest`, `packages/nuxeo-designer-catalog`, and `plugin/a11y` also have committed lockfiles and use `npm ci`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `NUXEO_URL` | Nuxeo server URL for Web UI (default: `/nuxeo`) |
| `NUXEO_HOST` | Dev server proxy target (default: `localhost:8080`) |
| `NUXEO_PACKAGES` | Space/comma-separated list of addon packages to bundle |
| `NUXEO_ELEMENTS_DIR` | Convenience shell variable for the manual nuxeo-elements symlink procedure; not read by the app/build tooling |
| `NUXEO_WEB_UI_VERSION` | Docker image version tag |
| `NUXEO_VERSION` | Nuxeo server Docker image version |
| `NUXEO_DEV_MODE` | Enable Nuxeo dev mode in Docker |
| `NUXEO_CLID` | Nuxeo license key for Docker |

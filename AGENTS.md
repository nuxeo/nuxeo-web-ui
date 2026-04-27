# Agent Instructions for Nuxeo Web UI

## Overview

This is a Polymer 3 web application (SPA) for the Nuxeo content services platform. Code ownership: `@nuxeo/ui`. The main development branch is `lts-2023` for the current LTS line (check `pom.xml` if that changes in future LTS cycles).

## Build & Validate

Always follow this sequence when making changes:

```bash
npm install                  # Install dependencies (Node ≥ 18)
npm run lint                 # ESLint + Prettier check — must pass
npm test                     # Karma unit tests — must pass
npm run format               # Auto-fix formatting (Prettier → ESLint)
```

- `npm run lint` runs both `eslint` and `prettier --list-different`.
- `npm run format` runs `prettier --write` first, then `eslint --fix`.
- Always run `npm run format` before committing. Pre-commit hooks enforce this.
- Do NOT commit `.only` in test files — the `no-only-tests` ESLint rule blocks it.

## Project Structure

```
index.js              → Bootstrap (promise chain: app → bundle → routing → addons)
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
themes/               → Visual themes (default, dark, light, kawaii)
test/                 → Unit tests (test/nuxeo-*.test.js)
ftest/features/       → Functional test Gherkin scenarios
packages/nuxeo-web-ui-ftest/ → WDIO page objects + step definitions
scripts/              → Build helpers
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
npm test                    # Single run with coverage
npm run test:watch          # Watch mode
```

- Framework: Karma + Mocha + Chai + Sinon
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

Push to the `lts-2023` branch triggers: **lint → test → a11y → ftest → build** (all must pass).

PRs run lint and test workflows automatically.

## Common Pitfalls

- `npm install` **replaces** nuxeo-elements symlinks. Re-run `node scripts/link-nuxeo-elements.js` after install if developing locally against a sibling nuxeo-elements repo.
- `.html` files contain real Polymer components with inline JS — don't treat them as static HTML.
- The `NUXEO_PACKAGES` env var controls which addon JS bundles are imported at runtime via `Nuxeo.UI.bundles`. If unset, addon resources are still copied to the build but no addon entry points are imported (except `nuxeo-spreadsheet`, which is always loaded).
- `@nuxeo` npm packages come from `https://packages.nuxeo.com/repository/npm-public/`, not npmjs.org.
- Maven build requires **Java 17**.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `NUXEO_URL` | `/nuxeo` | Server URL in the app |
| `NUXEO_HOST` | `localhost:8080` | Dev proxy target |
| `NUXEO_PACKAGES` | (all addons) | Addons to bundle |
| `NUXEO_ELEMENTS_DIR` | `../nuxeo-elements` | Sibling repo path for linking |

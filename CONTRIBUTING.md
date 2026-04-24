# Contributing to Nuxeo Web UI

## Prerequisites

- **Node.js** ≥ 18
- **npm** (bundled with Node — no yarn or pnpm)
- **Maven** and the appropriate **Java** version for marketplace builds (check the CI workflows or the upstream `nuxeo-parent` POM for the required version)
- A running **Nuxeo Server** at `localhost:8080` for development and functional testing

## Getting Started

```bash
# Clone the repository
git clone https://github.com/nuxeo/nuxeo-web-ui.git
cd nuxeo-web-ui

# Create local environment config
cp .env.sample .env

# Install dependencies (also installs sub-packages automatically)
npm install

# Start the dev server (serves at http://localhost:5000, proxies API to localhost:8080)
npm start
```

Ensure your Nuxeo Server has CORS enabled:
```
# In nuxeo.conf
nuxeo.cors.urls=*
```

## Development Workflow

### Making Changes

1. Create a feature branch from the current main branch
2. Edit components in `elements/`
3. The webpack dev server hot-reloads changes
4. Format and lint before committing:

```bash
npm run format     # Prettier + ESLint auto-fix
npm run lint       # Verify lint passes
npm test           # Run unit tests
```

### Pre-commit Hooks

Husky + lint-staged automatically runs Prettier and ESLint on staged `.js` and `.html` files at commit time. Do not bypass with `--no-verify`.

## Code Style

- **Prettier** handles formatting: 120 char width, single quotes, trailing commas, semicolons
- **ESLint** enforces code quality: flat config in `eslint.config.mjs`
- Run `npm run format` to auto-fix both
- Run `npm run lint` to check without modifying

Config files:
- `prettier.config.js` — Prettier settings
- `eslint.config.mjs` — ESLint flat config (includes sub-project configs)

## Writing Components

### New Polymer Element

Create a `.js` file in the appropriate `elements/` subdirectory:

```javascript
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

Polymer({
  is: 'nuxeo-my-component',
  _template: html`
    <style>
      :host { display: block; }
    </style>
    <div>[[i18n('myComponent.label')]]</div>
  `,
  behaviors: [I18nBehavior],
  properties: {
    document: { type: Object },
  },
});
```

### New Document Layout

Create an HTML file following the naming convention:

```
elements/document/<doctype>/nuxeo-<doctype>-<mode>-layout.html
```

Where `<mode>` is one of: `view`, `edit`, `metadata`, `create`.

### Adding i18n Keys

Add English keys to `i18n/messages.json`:

```json
{
  "myComponent.label": "My Component"
}
```

Translations for other languages go in `i18n/messages-<locale>.json`.

## Testing

### Unit Tests

```bash
npm test                  # Single run with coverage
npm run test:watch        # Watch mode for development
```

Create test files at `test/nuxeo-<element-name>.test.js`:

```javascript
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/path/to/nuxeo-my-component.js';

suite('nuxeo-my-component', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-my-component></nuxeo-my-component>`);
  });

  test('should render', () => {
    expect(element).to.exist;
  });
});
```

Available globals: `expect`, `assert`, `sinon`, `should` (configured in `test/setup.js`).

### Functional Tests

```bash
npm run ftest             # Headless (CI mode, needs Nuxeo server via Docker)
npm run ftest:dev         # Against local servers (Nuxeo:8080, UI:5000)
npm run ftest:watch       # Re-runs @watch-tagged scenarios on change
```

- Feature files: `ftest/features/*.feature` (Gherkin syntax)
- Step definitions: `packages/nuxeo-web-ui-ftest/features/step_definitions/`
- Page objects: `packages/nuxeo-web-ui-ftest/pages/`

## Working with nuxeo-elements Locally

To develop against a local checkout of the `nuxeo-elements` sibling repo:

```bash
# Default: expects ../nuxeo-elements as sibling directory
node scripts/link-nuxeo-elements.js

# Or specify a custom path
NUXEO_ELEMENTS_DIR=/path/to/nuxeo-elements node scripts/link-nuxeo-elements.js
```

This creates symlinks:
- `node_modules/@nuxeo/nuxeo-ui-elements` → `nuxeo-elements/ui`
- `node_modules/@nuxeo/nuxeo-dataviz-elements` → `nuxeo-elements/dataviz`
- `node_modules/@nuxeo/nuxeo-elements` → `nuxeo-elements/core`

**Important**: `npm install` overwrites these symlinks. Re-run the link script after any install.

## Building for Production

```bash
npm run build             # Webpack production build → dist/
npm run build:analyze     # Build with bundle analyzer
```

### Maven Marketplace Package

```bash
mvn clean install                 # Build marketplace ZIP
mvn clean install -Pftest         # Build + functional tests
mvn clean install -Pa11y          # Build + accessibility tests
```

Requires the Java version specified in the project POM.

## Docker Development

```bash
# Copy and edit environment variables
cp .env.sample .env

# Build and start all services
docker-compose up --build
```

This starts:
- **Nginx proxy** on `:8080`
- **Nuxeo Server** (version from `NUXEO_VERSION`)
- **Web UI** (served via Nginx)

## Branch Strategy

- The main development branch is the long-lived branch for the current LTS version (e.g., `lts-2025`, `maintenance-3.1.x`)
- Feature branches are created from and merged back to the main branch
- PRs trigger lint and test workflows automatically
- PRs tagged `preview` get ephemeral preview environments

## CI/CD

GitHub Actions run on every push to the main branch and on PRs:

1. **Lint** — ESLint + Prettier
2. **Test** — Karma unit tests
3. **A11y** — Accessibility tests
4. **FTest** — WebdriverIO functional tests
5. **Build** — Maven marketplace package (only after all above pass)

## npm Registry

`@nuxeo` scoped packages are published to and installed from:
```
https://packages.nuxeo.com/repository/npm-public/
```

This is configured in `.npmrc` or via `setup-node` in CI workflows.

## License

Apache License 2.0. All contributions must be compatible with this license.

© Hyland Software, Inc. and its affiliates.

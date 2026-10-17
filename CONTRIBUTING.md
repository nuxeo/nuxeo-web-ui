# Contributing to Nuxeo Web UI

## Prerequisites

- **Node.js** ≥ 22.13 (`.nvmrc` pins 24 — run `nvm use` or `fnm use` in the repo root)
- **npm** (bundled with Node — no yarn or pnpm)
- **Maven** and **Java 17** for marketplace builds
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

1. Create a feature branch from the dev branch for the LTS line you are targeting — `develop-2025` or `develop-2023` (see [Branch Strategy](#branch-strategy))
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

Translations for other languages are managed by Crowdin — do not edit `i18n/messages-<locale>.json` files manually.

## Testing

### Unit Tests

```bash
npm test                  # Single run with coverage (Web Test Runner)
npm run test:watch        # Watch mode for development
npm run update-test-load-all  # After adding/removing test/*.test.js files
```

Web Test Runner lists one entry file (`test/load-all-tests.js`) that imports every suite module. Progress shows `1/1 test files`; pass/fail counts are individual Mocha tests (~1000+).

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
npm run ftest             # Headless (CI-friendly; needs a reachable Nuxeo server)
npm run ftest:dev         # Against local servers (Nuxeo:8080, UI:5000)
npm run ftest:watch       # Re-runs @watch-tagged scenarios on change
```

- Feature files: `ftest/features/*.feature` (Gherkin syntax)
- Step definitions: `packages/nuxeo-web-ui-ftest/features/step_definitions/`
- Page objects: `packages/nuxeo-web-ui-ftest/pages/`

## Working with nuxeo-elements Locally

To develop against a local checkout of the `nuxeo-elements` sibling repo, manually create symlinks:

```bash
# Default: expects ../nuxeo-elements as sibling directory
rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s "../../../nuxeo-elements/ui" node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s "../../../nuxeo-elements/dataviz" node_modules/@nuxeo/nuxeo-dataviz-elements
rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s "../../../nuxeo-elements/core" node_modules/@nuxeo/nuxeo-elements
```

For custom paths, use absolute paths instead. See `.github/skills/link-nuxeo-elements/SKILL.md` for full details.

**Important**: `npm install` overwrites these symlinks. Re-create them after any install.

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

Requires Java version 17.

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

Each LTS line has a permanent **dev branch** that collects work, and a **release branch** that holds released code only:

| LTS line | Dev branch — branch from and target this | Release branch      |
| -------- | ---------------------------------------- | ------------------- |
| LTS 2025 | `develop-2025`                           | `lts-2025`          |
| LTS 2023 | `develop-2023`                           | `maintenance-3.1.x` |

- `develop-2023` is the repository default branch.
- Create your feature branch from the dev branch for the line you are targeting, and open the PR back against that same dev branch. Most fixes apply to both lines, so raise one PR per line.
- When the release content is agreed, the dev branch is merged into its release branch, and the release branch is merged back afterwards to pick up the version bump.
- **Those two merges must use a merge commit.** The sync checks whether anything is outstanding with `git rev-list --count dev..release`, which only reaches zero when the release branch is an ancestor of the dev branch. Squashing copies the content without the ancestry, so every later sync re-proposes the whole release branch. Ordinary ticket PRs are still squashed.
- Hotfix work on an already-released version branches from the release branch directly. That path is unchanged.
- Delete your branch once its PR is merged or closed. Cross-repo CI pairs a Web UI PR with a `nuxeo-elements` branch of the **same name**, so an abandoned branch can be silently picked up by a later, unrelated PR — the only clue is one line in a CI log.
- PRs trigger lint and test workflows automatically
- PRs tagged `preview` publish a combined Nuxeo + Web UI image and comment its reference on the PR; deploying that
  image to a preview environment is handled outside this repository

## CI/CD

GitHub Actions run on every push to a dev branch (`develop-2025`, `develop-2023`), on every push to a release branch, and on PRs:

1. **Lint** — ESLint + Prettier
2. **Test** — Web Test Runner unit tests (`test/load-all-tests.js` entry, Mocha pass/fail counts)
3. **A11y** — Accessibility tests
4. **FTest** — WebdriverIO functional tests
5. **Sonar** — SonarCloud quality/security scan
6. **Build** — Maven marketplace package (only after all above pass)

On a dev branch, steps 1–4 run in parallel via `develop.yaml` and step 5 runs from `sonar.yaml`'s own push trigger. Step 6 tags and publishes, so it runs only on a release branch, where `main.yaml` starts steps 1–5 in parallel and makes the build depend on all of them.

CI workflows use `npm ci` for deterministic installs from `package-lock.json`. Always commit lockfile changes when dependencies are added or updated.

## npm Registry

`@nuxeo` scoped packages are published to and installed from:
```
https://packages.nuxeo.com/repository/npm-public/
```

This is configured in `.npmrc` or via `setup-node` in CI workflows.

## License

Apache License 2.0. All contributions must be compatible with this license.

© Hyland Software, Inc. and its affiliates.

---
applyTo: "webpack.config.js,eslint.config.mjs,karma.conf.js,prettier.config.js"
---

# Build Configuration

## Webpack (`webpack.config.js`)

- **Mode**: `development` (dev server) or `production` (build)
- **Dev server**: Port 5000, proxies `/nuxeo` to `NUXEO_HOST` (default `localhost:8080`)
- **Output**: `dist/` in production
- **Key plugins**: `HtmlWebpackPlugin` (injects `Nuxeo.UI.bundles` from `NUXEO_PACKAGES`), `CopyWebpackPlugin` (copies polyfills, i18n, themes, addon resources)
- **Environment**: `.env` file loaded via `dotenv`
- **Addons**: Scanned from `addons/` directory; resources (HTML, images, i18n) are always copied; JS entry points are only imported when listed in `NUXEO_PACKAGES`
- **Merge step**: `scripts/merge-messages.js` runs before build to merge i18n messages into `.tmp/i18n/`

### Modifying webpack.config.js

- Uses `webpack-merge` for composing configs — prefer extending over overwriting
- Copy patterns use `{ from, to, flatten }` — test with `npm run build` to verify file placement
- Bundle analysis: `npm run build:analyze` opens an interactive treemap

## ESLint (`eslint.config.mjs`)

- **Format**: ESLint 9 flat config (array of config objects, not legacy `.eslintrc`)
- **Plugins**: `eslint-plugin-html` (lints `<script>` blocks in `.html` files), `eslint-plugin-wc` (web component rules)
- **Globals**: `Polymer` is `readonly`, `Nuxeo` is `writable`
- **Rule**: `no-only-tests` prevents `.only` from being committed
- **Sub-configs**: Includes configs for `packages/nuxeo-web-ui-ftest/` and `plugin/a11y/`
- Run `npm run lint` to check; `npm run format` to auto-fix

## Karma (`karma.conf.js`)

- **Browsers**: Chrome headless (via `karma-chrome-launcher`)
- **Framework**: Mocha + Chai + Sinon
- **Preprocessor**: Webpack bundles test files before running
- **Coverage**: Istanbul via `karma-coverage`
- **Files**: `test/**/*.test.js` matched by glob
- **Setup**: `test/setup.js` configures chai with sinon-chai

## Prettier (`prettier.config.js`)

- `printWidth: 120`
- `singleQuote: true`
- `trailingComma: 'all'`
- `semi: true`
- `tabWidth: 2`
- Runs via `npm run format` (Prettier write → ESLint fix)
- Enforced at commit time by husky + lint-staged

## Rules

- Always run `npm run format` followed by `npm run lint` after modifying any config file
- Test webpack changes with both `npm start` (dev) and `npm run build` (production)
- ESLint config changes must not break existing code — run `npm run lint` across the entire project
- Do not add new global variables without documenting them in the ESLint config
- Karma config changes should be validated with `npm test`

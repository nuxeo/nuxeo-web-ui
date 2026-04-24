---
applyTo: "ftest/**,packages/nuxeo-web-ui-ftest/**"
---

# Functional Tests

## Framework

WebdriverIO 9 + Cucumber (Gherkin).

## Structure

- Feature files: `ftest/features/*.feature`
- Step definitions: `packages/nuxeo-web-ui-ftest/features/step_definitions/`
- Page objects: `packages/nuxeo-web-ui-ftest/pages/`
- WDIO config: `packages/nuxeo-web-ui-ftest/wdio.conf.js`
- Custom plugins: `wdio-shadow-plugin.js` (Shadow DOM support), `wdio-compat-plugin.js`

## Running

```bash
npm run ftest           # Headless, needs Nuxeo server (Docker)
npm run ftest:dev       # localhost:8080 (Nuxeo) + localhost:5000 (UI)
npm run ftest:watch     # Re-runs @watch tagged scenarios
```

## Conventions

- Tag ignored tests with `@ignore`
- Tag tests under development with `@watch` for use with `ftest:watch`
- Page objects encapsulate element selectors and interactions
- Step definitions map Gherkin steps to WebdriverIO commands

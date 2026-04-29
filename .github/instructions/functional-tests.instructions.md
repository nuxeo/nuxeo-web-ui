---
applyTo: "ftest/**,packages/nuxeo-web-ui-ftest/**"
---

# Functional Tests

## Framework

WebdriverIO 9 + Cucumber (Gherkin).

## Layout

- Feature files: `ftest/features/*.feature`
- Step definitions: `packages/nuxeo-web-ui-ftest/features/step_definitions/`
- Page objects: `packages/nuxeo-web-ui-ftest/pages/`

## Running

```bash
npm run ftest          # Headless CI mode (needs Docker Nuxeo server)
npm run ftest:dev      # Against localhost:8080 (Nuxeo) + localhost:5000 (UI)
npm run ftest:watch    # Reruns @watch-tagged scenarios on change
```

## Patterns

- Page objects inherit from the base page class
- Steps use Cucumber expressions and may also use regex literals in existing step definitions
- Use `@watch` tag during development for fast iteration
- Requires a running Nuxeo Server instance

## Conventions

- Feature files describe user-facing scenarios in Gherkin syntax
- Page objects encapsulate WebdriverIO selectors and actions
- Step definitions map Gherkin steps to page object methods

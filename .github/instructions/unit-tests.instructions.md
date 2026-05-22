---
applyTo: "test/**/*.test.js,test/**/*.js"
---

# Unit Tests

## Framework

`@web/test-runner` + Mocha + Chai + Sinon with `@nuxeo/testing-helpers`.

## How tests are loaded

- **Source files**: `test/**/*.test.js` and `addons/*/test/**/*.test.js`
- **Runner entry**: `test/load-all-tests.js` (auto-generated) — the only file in `web-test-runner.config.mjs`
- Web Test Runner shows **1 test file** in progress; **pass/fail counts are Mocha tests**, not file count
- After adding a new `*.test.js`, run `npm run update-test-load-all` so it is imported in the barrel

## Globals

`test/setup.js` provides: `expect`, `assert`, `should`, `sinon` (via chai + sinon-chai).

## Test Structure

```javascript
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/path/to/nuxeo-my-component.js';

suite('nuxeo-my-component', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-my-component></nuxeo-my-component>`);
  });

  test('should do something', () => {
    expect(element.someProperty).to.equal('value');
  });
});
```

## Rules

- Test files go in `test/nuxeo-<element-name>.test.js` (or `addons/<addon>/test/`)
- Regenerate `test/load-all-tests.js` after adding or removing test files (`npm run update-test-load-all`)
- Do NOT use `.only` — the `no-only-tests` ESLint rule blocks it
- Use `@nuxeo/testing-helpers` for creating elements and mocking server responses
- Run: `npm test` (single) or `npm run test:watch` (watch mode)

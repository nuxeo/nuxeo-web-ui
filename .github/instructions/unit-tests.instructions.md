---
applyTo: "test/**/*.test.js,test/**/*.js"
---

# Unit Tests

## Framework

Karma + Mocha + Chai + Sinon with `@nuxeo/testing-helpers`.

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

- Test files go in `test/nuxeo-<element-name>.test.js`
- Do NOT use `.only` — the `no-only-tests` ESLint rule blocks it
- Use `@nuxeo/testing-helpers` for creating elements and mocking server responses
- Run: `npm test` (single) or `npm run test:watch` (watch mode)

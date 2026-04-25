---
name: write-unit-test
description: Generate unit tests for Nuxeo Web UI Polymer elements. Use this skill when
  the user wants to write tests, add test coverage, create test files, or test a web
  component. Generates Karma + Mocha + Chai + Sinon test suites using @nuxeo/testing-helpers
  with proper fixtures, mocks, and assertions. Also use when the user mentions testing
  an element, verifying behavior, or checking component functionality.
---

# Write Unit Test

Generate unit test files for Nuxeo Web UI Polymer elements using Karma + Mocha + Chai + Sinon.

## Workflow

1. Identify the element to test (read its source first to understand properties, methods, events)
2. Determine what to test: properties, methods, events, DOM rendering, user interactions
3. Generate the test file following the patterns below
4. Run `npm test` to verify

## File Location

```
test/nuxeo-<element-name>.test.js
```

## Template: Basic Test

```javascript
/**
 @license
 ©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/<path>/nuxeo-<element-name>.js';

suite('nuxeo-<element-name>', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-<element-name>></nuxeo-<element-name>>`);
  });

  test('should initialize with default properties', () => {
    expect(element).to.exist;
  });
});
```

## Template: Test with Document Fixture

```javascript
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/<path>/nuxeo-<element-name>.js';

suite('nuxeo-<element-name>', () => {
  let element;
  const document = {
    'entity-type': 'document',
    uid: '1234',
    path: '/default-domain/workspaces/test-doc',
    type: 'File',
    title: 'Test Document',
    properties: {
      'dc:title': 'Test Document',
      'dc:description': 'A test document',
      'dc:created': '2023-01-01T00:00:00.000Z',
      'dc:modified': '2023-06-15T12:00:00.000Z',
      'dc:creator': 'Administrator',
      'dc:contributors': ['Administrator'],
    },
    contextParameters: {
      permissions: ['ReadWrite'],
    },
    facets: ['Versionable', 'Commentable'],
  };

  setup(async () => {
    element = await fixture(html`<nuxeo-<element-name> .document="${document}"></nuxeo-<element-name>>`);
  });

  test('should display document title', () => {
    expect(element.document.title).to.equal('Test Document');
  });
});
```

## Template: Test with Sinon Stubs

```javascript
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/<path>/nuxeo-<element-name>.js';

suite('nuxeo-<element-name>', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-<element-name>></nuxeo-<element-name>>`);
    // Stub behavior methods
    sinon.stub(element, 'hasPermission').returns(true);
    sinon.stub(element, 'isImmutable').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasType').returns(false);
  });

  suite('permission checks', () => {
    test('should allow action when user has permission', () => {
      expect(element.hasPermission('Write')).to.be.true;
    });

    test('should call method when triggered', () => {
      const spy = sinon.spy(element, '_someMethod');
      element._someMethod();
      expect(spy).to.have.been.calledOnce;
    });
  });
});
```

## Template: Test with Nuxeo Server Mock

```javascript
import { fixture, html, login, waitForEvent } from '@nuxeo/testing-helpers';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import '../elements/<path>/nuxeo-<element-name>.js';

suite('nuxeo-<element-name>', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-<element-name>></nuxeo-<element-name>>`);
  });

  test('should fetch data from server', async () => {
    // Mock a server response
    server.respondWith('GET', '/api/v1/path/to/resource', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ 'entity-type': 'document', title: 'Test' }),
    ]);

    // Trigger the element's fetch
    element.someProperty = 'value';

    // Wait for response
    await waitForEvent(element, 'response');
    expect(element.data).to.exist;
  });
});
```

## Rules

- **File naming**: `test/nuxeo-<element-name>.test.js`
- **NEVER use `.only`** — the `no-only-tests` ESLint rule blocks it
- **Globals available** (from `test/setup.js`): `expect`, `assert`, `should`, `sinon`
- **Use `@nuxeo/testing-helpers`** for `fixture`, `html`, `login`, `waitForEvent`
- **Use `suite`/`test`** (Mocha TDD interface), not `describe`/`it`
- **Use `setup`/`teardown`**, not `beforeEach`/`afterEach`
- **Async setup**: `setup(async () => { element = await fixture(…) })`
- **Property binding in fixtures**: use `.property="${value}"` syntax in template literals
- **Sinon stubs**: Stub behavior methods (`hasPermission`, `isTrashed`, etc.) in setup
- **Event testing**: Use `sinon.spy` or `waitForEvent` for async events
- **Run tests**: `npm test` (single run) or `npm run test:watch` (watch mode)
- **Include the Hyland license header** at the top of every test file

## Common Assertion Patterns

```javascript
// Property checks
expect(element.someProperty).to.equal('value');
expect(element.someProperty).to.be.true;
expect(element.someProperty).to.be.null;
expect(element.someArray).to.have.lengthOf(3);
expect(element.someObject).to.deep.equal({ key: 'value' });

// DOM checks
expect(element.shadowRoot.querySelector('.my-class')).to.exist;
expect(element.shadowRoot.querySelector('#myId').textContent).to.equal('text');
expect(element.shadowRoot.querySelectorAll('li')).to.have.lengthOf(5);

// Sinon assertions (via sinon-chai)
expect(spy).to.have.been.called;
expect(spy).to.have.been.calledOnce;
expect(spy).to.have.been.calledWith('arg');
expect(stub).to.have.returned('value');

// Event assertions
const listener = sinon.spy();
element.addEventListener('my-event', listener);
element.fire('my-event', { detail: 'data' });
expect(listener).to.have.been.called;
```

## What to Test

- **Default property values** after element creation
- **Property changes** and their effects on the DOM
- **Method behavior** (especially private `_methods`)
- **Event firing** (via `this.fire()`)
- **Conditional rendering** (e.g., `dom-if` templates)
- **User interactions** (click handlers, input changes)
- **Behavior methods** (e.g., permission checks, formatting)
- **Edge cases** (null values, empty arrays, missing properties)

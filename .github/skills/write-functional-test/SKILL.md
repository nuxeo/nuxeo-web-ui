---
name: write-functional-test
description: Generate functional tests for Nuxeo Web UI using WebdriverIO and Cucumber.
  Use this skill when the user wants to create end-to-end tests, feature files, Gherkin
  scenarios, step definitions, or page objects. Generates .feature files, step definitions,
  and page objects for testing UI workflows in a browser. Also use when the user mentions
  BDD tests, acceptance tests, browser tests, e2e tests, or integration tests for
  Nuxeo Web UI.
---

# Write Functional Test

Generate functional tests using WebdriverIO 9 + Cucumber (Gherkin) for Nuxeo Web UI.

## Workflow

1. Understand the user flow to test (browse, search, create, edit, workflow, etc.)
2. Write the `.feature` file with Gherkin scenarios
3. Check if step definitions already exist (many common steps are shared)
4. Write new step definitions only for steps not already covered
5. Write or update page objects if new selectors/interactions are needed
6. Run `npm run ftest:dev` to verify (requires running Nuxeo server)

## File Locations

```
ftest/features/<feature-name>.feature
packages/nuxeo-web-ui-ftest/features/step_definitions/<area>.js
packages/nuxeo-web-ui-ftest/pages/<page-name>.js
```

## Template: Feature File

```gherkin
Feature: <Feature Name>

  <Brief description of the feature>

  Background:
    Given user "John" exists in group "members"
    And I login as "John"

  Scenario: <Scenario description>
    When I browse to the document
    Then I can see the document page
    And I can see the "<element>" element

  Scenario: <Another scenario>
    Given I have a File document
    When I browse to the document
    And I click the "Edit" button
    Then I can edit the document properties
```

## Template: Step Definition

```javascript
/* eslint-disable no-await-in-loop */
// eslint-disable-next-line import/no-extraneous-dependencies
import { Given, When, Then } from '@cucumber/cucumber';

Given('I have a {word} document', async function (docType) {
  docType = docType || 'File';
  const doc = await fixtures.documents.init(docType);
  const createDoc = await fixtures.documents.create(this.doc.path || '/default-domain', doc).then((d) => {
    this.doc = d;
  });
  return createDoc;
});

When(/^I browse to the document$/, async function () {
  await driver.pause(1000);
  const path = await this.doc.path;
  const browser = await this.ui.browser;
  await browser.browseTo(path);
});

Then(/^I can see the document page$/, async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
});
```

## Template: Page Object

```javascript
export default class MyPage {
  // Use getter for element selectors
  get myButton() {
    return $('nuxeo-my-element').shadow$('paper-button#myBtn');
  }

  get myInput() {
    return $('nuxeo-my-element').shadow$('nuxeo-input#nameInput');
  }

  async clickMyButton() {
    const btn = await this.myButton;
    await btn.waitForDisplayed({ timeout: 10000 });
    await btn.click();
  }

  async setInputValue(value) {
    const input = await this.myInput;
    await input.waitForDisplayed({ timeout: 10000 });
    await input.setValue(value);
  }

  async waitForVisible() {
    const el = await $('nuxeo-my-element');
    await el.waitForDisplayed({ timeout: 10000 });
  }
}
```

## Rules

### Feature Files
- Live in `ftest/features/*.feature`
- Use Gherkin syntax: `Feature`, `Background`, `Scenario`, `Given`, `When`, `Then`, `And`
- `Background` runs before every scenario — use for login and common setup
- Tag ignored tests with `@ignore`
- Tag tests under development with `@watch` (used with `npm run ftest:watch`)
- Keep scenarios focused on one user flow each
- Use existing step definitions before writing new ones

### Step Definitions
- Live in `packages/nuxeo-web-ui-ftest/features/step_definitions/`
- Import `Given`, `When`, `Then` from `@cucumber/cucumber`
- Use `async function` (not arrow functions — Cucumber binds `this` for world context)
- Access test context via `this`: `this.doc`, `this.ui`, `this.username`
- Access fixtures via global `fixtures` object:
  - `fixtures.documents.init(type)` — Initialize a document
  - `fixtures.documents.create(path, doc)` — Create a document on server
  - `fixtures.documents.setPermissions(doc, permission, user)` — Set permissions
  - `fixtures.collections.addToNewCollection(doc, name)` — Add to collection
  - `fixtures.workflows.start(doc, workflow, user)` — Start a workflow
- Use `driver.pause(ms)` sparingly for timing issues

### Page Objects
- Live in `packages/nuxeo-web-ui-ftest/pages/`
- Export a class with getter properties for selectors
- Use `$()` for CSS selectors, `.shadow$()` for Shadow DOM piercing
- The project uses `wdio-shadow-plugin.js` for Shadow DOM support
- Always include `waitForDisplayed()` before interactions
- Use `{ timeout: 10000 }` for wait timeouts

### Shadow DOM Selectors
Nuxeo Web UI uses Shadow DOM extensively. Chain `.shadow$()` calls:

```javascript
// Pierce through shadow roots
const element = await $('nuxeo-app').shadow$('nuxeo-browser').shadow$('nuxeo-document-page');

// Use deep selectors
const button = await $('nuxeo-app').$('paper-button.primary');
```

## Common Pre-existing Steps

Check these files before writing new steps — many common actions already exist:

- `step_definitions/document.js` — Document CRUD, browse, permissions
- `step_definitions/search.js` — Search actions
- `step_definitions/browser.js` — Navigation, breadcrumb
- `step_definitions/collection.js` — Collection management
- `step_definitions/workflow.js` — Workflow actions
- `step_definitions/login.js` — Authentication
- `step_definitions/home.js` — Home page actions

## Running

```bash
npm run ftest           # Headless, needs Nuxeo server (Docker)
npm run ftest:dev       # localhost:8080 (Nuxeo) + localhost:5000 (UI)
npm run ftest:watch     # Re-runs @watch tagged scenarios
```

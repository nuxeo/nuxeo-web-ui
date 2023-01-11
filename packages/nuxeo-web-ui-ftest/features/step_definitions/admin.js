import { Given, Then, When } from '@cucumber/cucumber';

Then('I can see the administration menu', async function() {
  const isVisible = await this.ui.drawer.administration.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected administration menu to be visible');
  }
});

Then('I cannot see the administration button', async function() {
  const isVisible = await this.ui.adminButton.isVisible();
  if (isVisible) {
    throw new Error('Expected administration button to not be visible');
  }
});

// XXX: this.ui.drawer.administration.click()
When('I click {string} in the administration menu', async (text) => {
  const el = driver.$(`nuxeo-menu-item[name="${text}"]`);
  await el.waitForVisible();
  await el.click();
});

Then('I can see the analytics page',async function() {
  await this.ui.administration.analytics.waitForVisible();
});

Then('I can see the users and groups page', async function() {
  const isVisible = await this.ui.administration.userAndGroupManagement.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected users and groups page to be visible');
  }
});

Then('I can see the vocabulary page', function() {
  this.ui.administration.vocabularyManagement.waitForVisible().should.be.true;
});

Then('I can see the audit page', async function() {
  const isVisible = await this.ui.administration.audit.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected audit page to be visible');
  }
});

Then('I can see the nxql search page', async function() {
  const isVisible = await this.ui.administration.nxqlSearch.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected nxql search page to be visible');
  }
});

Then('I can see the cloud services page', async function() {
  const isVisible = await this.ui.administration.cloudServices.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected cloud services page to be visible');
  }
});

Given('I am on cloud services page', function() {
  this.ui.administration.goToCloudServices();
});

// ¯\_(ツ)_/¯ no way to escape a / character in cucumber expressions
When(/^I click the new user\/group button$/, function() {
  this.ui.administration.userGroupCreateButton.waitForVisible();
  this.ui.administration.userGroupCreateButton.click();
});

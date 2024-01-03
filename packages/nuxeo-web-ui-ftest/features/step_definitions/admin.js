import { Given, Then, When } from '../../node_modules/@cucumber/cucumber';

Then('I can see the administration menu', async function() {
  const { drawer } = this.ui;
  const element = await drawer.administration;
  const isVisible = element.waitForVisible();
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
  const el = await driver.$(`nuxeo-menu-item[name="${text}"]`);
  setTimeout(async () => {
    await el.waitForVisible();
    el.click();
  }, 2000);
});

Then('I can see the analytics page', async function() {
  await this.ui.administration.analytics;
});

Then('I can see the users and groups page', async function() {
  await this.ui.administration.userAndGroupManagement;
});

Then('I can see the vocabulary page', async function() {
  const isVisible = await this.ui.administration.vocabularyManagement.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected vocabulary page to be visible');
  }
});

Then('I can see the audit page', async function() {
  const ui = await this.ui;
  const admin = await ui.administration;
  const auditPage = await admin.audit;
  const isVisible = auditPage.isVisible();
  if (!isVisible) {
    throw new Error('Expected audit page to be visible');
  }
});

Then('I can see the nxql search page', async function() {
  await this.ui.administration.nxqlSearch;
});

Then('I can see the cloud services page', async function() {
  const isVisible = await this.ui.administration.cloudServices.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected cloud services page to be visible');
  }
});

Given('I am on cloud services page', async function() {
  await this.ui.administration.goToCloudServices();
});

// ¯\_(ツ)_/¯ no way to escape a / character in cucumber expressions
When(/^I click the new user\/group button$/, async function() {
  const userGroupEle = await this.ui.administration.userGroupCreateButton;
  await userGroupEle.waitForVisible();
  await userGroupEle.click();
});

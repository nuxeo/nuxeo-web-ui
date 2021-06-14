import { Given, Then, When } from '@cucumber/cucumber';

Then('I can see the administration menu', function() {
  this.ui.drawer.administration.waitForVisible().should.be.true;
});

Then('I cannot see the administration button', function() {
  this.ui.adminButton.waitForVisible(browser.options.waitForTimeout, true).should.be.true;
});

// XXX: this.ui.drawer.administration.click()
When('I click {string} in the administration menu', (text) => {
  const el = driver.element(`nuxeo-menu-item[name="${text}"]`);
  el.waitForVisible();
  el.click();
});

Then('I can see the analytics page', function() {
  this.ui.administration.analytics.waitForVisible();
});

Then('I can see the users and groups page', function() {
  this.ui.administration.userAndGroupManagement.waitForVisible().should.be.true;
});

Then('I can see the vocabulary page', function() {
  this.ui.administration.vocabularyManagement.waitForVisible().should.be.true;
});

Then('I can see the audit page', function() {
  this.ui.administration.audit.waitForVisible().should.be.true;
});

Then('I can see the nxql search page', function() {
  this.ui.administration.nxqlSearch.waitForVisible().should.be.true;
});

Then('I can see the cloud services page', function() {
  this.ui.administration.cloudServices.waitForVisible().should.be.true;
});

Given('I am on cloud services page', function() {
  this.ui.administration.goToCloudServices();
});

// ¯\_(ツ)_/¯ no way to escape a / character in cucumber expressions
When(/^I click the new user\/group button$/, function() {
  this.ui.administration.userGroupCreateButton.waitForVisible();
  this.ui.administration.userGroupCreateButton.click();
});

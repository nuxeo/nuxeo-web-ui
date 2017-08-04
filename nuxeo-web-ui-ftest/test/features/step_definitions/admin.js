'use strict';

module.exports = function () {
  this.Then('I can see the administration menu', () => this.ui.drawer.administration.waitForVisible().should.be.true);

  this.Then('I cannot see the administration button', () => this.ui.adminButton
      .waitForVisible(browser.options.waitForTimeout, true).should.be.true);

  // XXX: this.ui.drawer.administration.click()
  this.When('I click "$text" in the administration menu', (text) => driver.click(`a=${text}`));

  this.Then('I can see the analytics page', () =>
    this.ui.administration.analytics.waitForVisible());

  this.Then('I can see the users and groups page', () =>
    this.ui.administration.userAndGroupManagement.waitForVisible().should.be.true);

  this.Then('I can see the vocabulary page', () =>
    this.ui.administration.vocabularyManagement.waitForVisible().should.be.true);

  this.Then('I can see the audit page', () =>
  this.ui.administration.audit.waitForVisible().should.be.true);

  this.Then('I can see the cloud services page', () =>
    this.ui.administration.cloudServices.waitForVisible().should.be.true);

  this.Given('I am on cloud services page', () =>
    this.ui.administration.goToCloudServices());

  this.When('I click the new user/group button', () => {
    this.ui.administration.userGroupCreateButton.waitForVisible();
    this.ui.administration.userGroupCreateButton.click();
  });
};

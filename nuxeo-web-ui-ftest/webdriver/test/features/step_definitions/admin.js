'use strict';

module.exports = function () {
  this.Then('I can see the administration menu', () => this.ui.drawer.administration.isVisible().should.be.true);

  this.Then('I cannot see the administration button', () => this.ui.adminButton.isVisible().should.be.false);

  this.Then('I cannot see the administration menu', () => this.ui.drawer.administration.isVisible().should.be.false);

  // XXX: this.ui.drawer.administration.click()
  this.When('I click "$text" in the administration menu', (text) => driver.click(`a=${text}`));

  this.Then('I can see the analytics page', () =>
    this.ui.administration.analytics.waitForVisible(10000));

  this.Then('I can see the users and groups page', () =>
    this.ui.administration.userAndGroupManagement.isVisible().should.be.true);

  this.Then('I can see the vocabulary page', () =>
    this.ui.administration.vocabularyManagement.isVisible().should.be.true);
};

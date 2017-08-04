'use strict';

module.exports = function () {
  this.When('I click the Nuxeo logo', () => this.ui.goHome());

  this.Then('I can see my home', () => this.ui.home.waitForVisible().should.be.true);

  this.Then('I have a "$title" card', (title) => this.ui.home.card(title).waitForVisible().should.be.true);
};

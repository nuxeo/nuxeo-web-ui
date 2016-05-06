'use strict';

module.exports = function () {
  this.When('I click the browser button', () => this.ui.goToBrowser());
  this.Then('I can see the browser', () => this.ui.browser.isSelected.should.be.true);
};

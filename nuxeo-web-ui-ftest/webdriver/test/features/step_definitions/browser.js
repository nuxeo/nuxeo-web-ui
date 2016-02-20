'use strict';

module.exports = function () {
  this.Then('I can see the browser', () => this.ui.browser.isSelected.should.be.true);
};

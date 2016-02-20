'use strict';

module.exports = function () {
  this.Then('I can see the Admin center', () => this.ui.admin.isSelected.should.be.true);
};

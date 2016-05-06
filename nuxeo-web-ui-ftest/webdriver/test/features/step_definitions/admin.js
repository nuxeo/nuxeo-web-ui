'use strict';

module.exports = function () {
  this.Then('I can see the administration menu', () => this.ui.admin.isSelected.should.be.true);
};

'use strict';

module.exports = function () {
  this.Then('I can see my personal workspace', () => this.ui.personal.isSelected.should.be.true);
};

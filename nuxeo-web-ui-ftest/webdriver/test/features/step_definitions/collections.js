'use strict';

module.exports = function () {
  this.Then('I can see the list of collections', () => this.ui.collections.isSelected.should.be.true);
};

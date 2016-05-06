'use strict';

module.exports = function () {
  this.Then('I can see the Search window', () => this.ui.search.isSelected.should.be.true);
};

'use strict';

module.exports = function () {
  this.Then('I can see the list of favorites', () => this.ui.favorites.isSelected.should.be.true);
};

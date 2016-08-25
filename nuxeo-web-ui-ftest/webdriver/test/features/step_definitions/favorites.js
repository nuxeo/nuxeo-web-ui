'use strict';

module.exports = function () {
  this.Then('I can see the list of favorites', () => this.ui.drawer.favorites.isVisible().should.be.true);
};

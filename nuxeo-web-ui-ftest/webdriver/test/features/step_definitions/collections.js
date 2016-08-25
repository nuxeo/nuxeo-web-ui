'use strict';

module.exports = function () {
  this.Then('I can see the list of collections', () => this.ui.drawer.collections.isVisible().should.be.true);
  this.Then('The list of collections is empty', () => this.ui.drawer.collections.isVisible().should.be.true);
};

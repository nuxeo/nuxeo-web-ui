'use strict';

module.exports = function () {
  this.Then('I can see the Search panel', () => this.ui.drawer.search.isVisible().should.be.true);
  this.Then('I can see the Search results', () => this.ui.search.isVisible().should.be.true);
  this.Then('I cannot see the Search results', () => this.ui.search.isVisible().should.be.false);
};

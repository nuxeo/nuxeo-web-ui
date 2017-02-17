'use strict';

module.exports = function () {
  this.Then('I can see the "$name" search panel', (name) => this.ui.drawer._search(name).waitForVisible());
  this.Then('I can see the search results', () => this.ui.search.isVisible().should.be.true);
  this.Then('I cannot see the search results', () => this.ui.search.isVisible().should.be.false);
};

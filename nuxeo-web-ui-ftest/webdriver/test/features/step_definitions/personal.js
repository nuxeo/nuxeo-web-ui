'use strict';

module.exports = function () {
  this.Then('I can see my personal workspace', () => this.ui.drawer.personal.isVisible().should.be.true);
};

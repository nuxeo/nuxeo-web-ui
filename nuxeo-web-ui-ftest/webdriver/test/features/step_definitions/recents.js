'use strict';

module.exports = function () {
  this.Then('I can see the list of recently viewed documents', () => this.ui.drawer.recents.isVisible().should.be.true);
};

'use strict';

module.exports = function () {
  this.When('I click the Create Document button', () => this.ui.openCreateDocDialog());
  this.Then('I can see the Create Document dialog', () => this.ui.createDialog.isVisible.should.be.true);
};

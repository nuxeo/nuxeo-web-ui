'use strict';

module.exports = function () {
  this.When('I click the Create Document button', () => this.ui.openCreateDocDialog());
  this.Then('I can see the Create Document dialog', () => this.ui.createDialog.isVisible.should.be.true);
  this.When('I select "$docType"', (docType) => this.ui.createDialog.docType = docType);
  this.Then('I can see the Create "$docType" form', (docType) =>
    this.ui.createDialog.form(docType).isVisible().should.be.true);
};

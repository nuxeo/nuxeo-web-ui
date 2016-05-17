'use strict';

module.exports = function () {

  this.When('I click the Create Document button', () => {
    this.ui.openCreateDocDialog();
    this.ui.createDialog.isVisible.should.be.true;
  });

  this.Given(/^I select (.*) from the Document Type menu$/, (docType) => {
    this.ui.createDialog.docType = docType;
    this.ui.createDialog.form(docType).isVisible().should.be.true;
  });

  this.Then(/^I create a (.*)$/, (docType) => {
    this.ui.title(docType);
    this.ui.createDialog.submit();
  });

  this.Then(/^I go to the (.*)$/, (docType) => this.ui.preview(docType).isVisible().should.be.true);
};

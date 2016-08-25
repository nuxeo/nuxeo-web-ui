'use strict';

module.exports = function () {

  this.When('I click the Create Document button', () => {
    this.ui.createButton.click();
    this.ui.createDialog.isVisible.should.be.true;
  });

  this.When(/^I select (.*) from the Document Type menu$/, (docType) => {
    this.ui.createDialog.docType = docType;
    this.ui.createDialog.form.isVisible().should.be.true;
  });

  this.When(/^I create a (.*)$/, (docType) => {
    this.ui.createDialog.title = `Test ${docType}`;
    this.ui.createDialog.submit();
  });

  this.Then(/^I see the (.*) page$/, (docType) => {
    this.ui.browser.documentPage(docType).view.waitForVisible(5000);
  });
};

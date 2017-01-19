'use strict';

var currentDocType;

module.exports = function () {

  this.When('I click the Create Document button', () => {
    this.ui.createButton.waitForVisible();
    this.ui.createButton.click();
  });

  this.When(/^I select (.+) from the Document Type menu$/, (docType) => {
    this.ui.createDialog.waitForVisible();
    let button = this.ui.createDialog.documentCreate.getDoctypeButton(docType);
    button.waitForVisible();
    button.click();
    currentDocType = docType;
  });

  this.When(/^I create a document with the following properties:$/, (table) => {
    let documentCreate = this.ui.createDialog.documentCreate;
    documentCreate.waitForVisible();
    table.rows().forEach((row) => {
      documentCreate.layout(currentDocType).setFieldValue(row[0], row[1]);
    });
    this.ui.createDialog.createButton.waitForVisible();
    this.ui.createDialog.createButton.click();
  });

  this.Then(/^I see the (.*) page$/, (docType) => {
    this.ui.browser.documentPage(docType).view.waitForVisible();
  });
};

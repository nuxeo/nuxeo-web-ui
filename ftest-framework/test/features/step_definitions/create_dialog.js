'use strict';

let currentDocType;

module.exports = function () {
  this.When('I click the Create Document button', () => {
    this.ui.createButton.waitForVisible();
    this.ui.createButton.click();
  });

  this.When(/^I select (.+) from the Document Type menu$/, (docType) => {
    this.ui.createDialog.waitForVisible();
    const button = this.ui.createDialog.documentCreate.getDoctypeButton(docType);
    button.waitForVisible();
    button.click();
    currentDocType = docType;
  });

  this.When(/^I create a document with the following properties:$/, (table) => {
    this.ui.createDialog.documentCreate.waitForVisible();
    this.ui.createDialog.documentCreate.layout(currentDocType).fillMultipleValues(table);
    this.ui.createDialog.documentCreate.layout(currentDocType).getField('title').should.not.be.empty;
    const title = this.ui.createDialog.documentCreate.layout(currentDocType).getFieldValue('title');
    this.ui.createDialog.createButton.waitForVisible();
    this.ui.createDialog.createButton.click();
    this.ui.browser.hasTitle(title).should.be.true;
  });

  this.Then(/^I see the (.*) page$/, (docType) => {
    this.ui.browser.documentPage(docType).view.waitForVisible();
  });
};

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
    let title = '';
    table.rows().forEach((row) => {
      if (row[0] === 'expired') {
        this.ui.createDialog.documentCreate.layout(currentDocType).el.element(`input[name="${row[0]}"]`).click();
        var keys = row[1].split("-");
        driver.keys(keys);
      } else {
        this.ui.createDialog.documentCreate.layout(currentDocType).setFieldValue(row[0], row[1]);
        if (row[0] === 'title') {
          title = row[1];
        }
      }
    });
    title.should.not.be.empty;
    this.ui.createDialog.createButton.waitForVisible();
    this.ui.createDialog.createButton.click();
    this.ui.browser.hasTitle(title).should.be.true;
  });

  this.Then(/^I see the (.*) page$/, (docType) => {
    this.ui.browser.documentPage(docType).view.waitForVisible();
  });
};

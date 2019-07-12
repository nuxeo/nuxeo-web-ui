import {
  Then,
  When,
} from 'cucumber';

let currentDocType;

When('I click the Create Document button', function () {
  this.ui.createButton.waitForVisible();
  this.ui.createButton.click();
});

When('I select {word} from the Document Type menu', function (docType) {
  this.ui.createDialog.waitForVisible();
  const button = this.ui.createDialog.documentCreate.getDoctypeButton(docType);
  button.waitForVisible();
  button.click();
  currentDocType = docType;
});

When('I select the CSV tab', function () {
  this.ui.createDialog.waitForVisible();
  this.ui.createDialog.csvImportTab.waitForVisible();
  this.ui.createDialog.csvImportTab.click();
});

When('I upload the CSV file', function () {
  this.ui.createDialog.waitForVisible();
  this.ui.createDialog.documentCreate.fileInput.waitForExist();
  browser.chooseFile('#uploadFiles', fixtures.blobs.get('sample.csv'));
  browser.pause(1000);
  this.ui.createDialog.createButton.waitForVisible();
  this.ui.createDialog.createButton.click();
  browser.pause(1000);
});

When('I create a document with the following properties:', function (table) {
  this.ui.createDialog.documentCreate.waitForVisible();
  this.ui.createDialog.documentCreate.layout(currentDocType).fillMultipleValues(table);
  this.ui.createDialog.documentCreate.layout(currentDocType).getField('title').should.not.be.empty;
  const title = this.ui.createDialog.documentCreate.layout(currentDocType).getFieldValue('title');
  browser.pause(1000);
  this.ui.createDialog.createButton.waitForVisible();
  this.ui.createDialog.createButton.click();
  this.ui.browser.hasTitle(title).should.be.true;
  this.doc = { type: currentDocType, title };
});

Then('I see the {word} page', function (docType) {
  this.ui.browser.documentPage(docType).view.waitForVisible();
});

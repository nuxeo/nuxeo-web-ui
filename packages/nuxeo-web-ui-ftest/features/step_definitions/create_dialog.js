import { Then, When } from 'cucumber';

let currentDocType;
let currentName;

When('I click the Create Document button', function() {
  this.ui.createButton.waitForVisible();
  this.ui.createButton.click();
});

Then('I click the Create button to finish the import', function() {
  const importButton = this.ui.createDialog.importCreateButton;
  importButton.waitForVisible();
  importButton.click();
});

Then(/^I go to the (.+) tab$/, function(name) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.importTab(name).click();
});

Then(/^I can see the (.+) tab content$/, function(name) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.importPage(name).waitForVisible();
  currentName = name;
});

Then(/^I upload the (.+) on the tab content page$/, function(file) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.setFileToImport(file, currentName);
  dialog.selectedFileToImport.waitForVisible();
});

Then('I upload the following files on the tab content page:', function(table) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  const docs = table.rows().map((row) => dialog.setFileToImport(row[0], currentName));
  return docs.reduce((current, next) => current.then(next), Promise.resolve([]));
});

When('I select {word} from the Document Type menu', function(docType) {
  this.ui.createDialog.waitForVisible();
  const button = this.ui.createDialog.documentCreate.getDoctypeButton(docType);
  button.waitForVisible();
  button.click();
  currentDocType = docType;
});

When('I create a document with the following properties:', function(table) {
  this.ui.createDialog.documentCreate.waitForVisible();
  this.ui.createDialog.documentCreate.layout(currentDocType).fillMultipleValues(table);
  this.ui.createDialog.documentCreate.layout(currentDocType).getField('title').should.not.be.empty;
  const title = this.ui.createDialog.documentCreate.layout(currentDocType).getFieldValue('title');
  this.ui.createDialog.createButton.waitForVisible();
  this.ui.createDialog.createButton.click();
  this.ui.browser.waitForNotVisible('iron-overlay-backdrop');
  this.ui.browser.hasTitle(title).should.be.true;
  this.doc = { type: currentDocType, title };
});

Then('I see the {word} page', function(docType) {
  this.ui.browser.waitForNotVisible('iron-overlay-backdrop');
  this.ui.browser.documentPage(docType).view.waitForVisible();
});

Then(/^I can see that a document of the type (.+) and title (.+) is created$/, function(docType, title) {
  this.ui.browser.waitForNotVisible('iron-overlay-backdrop');
  this.ui.browser.documentPage(docType).view.waitForVisible();
  this.ui.browser.hasTitle(title).should.be.true;
  this.doc = { type: currentDocType, title };
});

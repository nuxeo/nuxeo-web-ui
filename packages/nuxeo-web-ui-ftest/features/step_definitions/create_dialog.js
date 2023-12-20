import { Then, When } from '../../node_modules/@cucumber/cucumber';

let currentDocType;
let selectedTabName;

When('I click the Create Document button', async function() {
  const createBtn = await this.ui.createButton;
  await createBtn.waitForVisible();
  await createBtn.click();
});

Then('I click the Create button to finish the import', function() {
  const importButton = this.ui.createDialog.importCreateButton;
  importButton.waitForVisible();
  importButton.waitForEnabled();
  importButton.click();
  driver.waitForExist('iron-overlay-backdrop', driver.options.waitForTimeout, true);
  driver.pause(3000); // XXX just give it some time to the server to do the conversions
});

Then(/^I go to the (.+) tab$/, async function(name) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  const dialogImport = await dialog.importTab(name);
  await dialogImport.click();
});

Then(/^I can see the (.+) tab content$/, function(name) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.importPage(name).waitForVisible();
  selectedTabName = name;
});

Then(/^I upload the (.+) on the tab content page$/, function(file) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  dialog.upload(file, selectedTabName);
  dialog.selectedFileToImport.waitForVisible();
});

Then('I upload the following files on the tab content page:', function(table) {
  const dialog = this.ui.createDialog;
  dialog.waitForVisible();
  const docs = table.rows().map((row) => dialog.upload(row[0], selectedTabName));
  return docs.reduce((current, next) => current.then(next), Promise.resolve([]));
});

When('I select {word} from the Document Type menu', async function(docType) {
  const createDialogElem = await this.ui.createDialog;
  await createDialogElem.waitForVisible();
  const docCreateElem = await createDialogElem.documentCreate;
  const button = await docCreateElem.getDoctypeButton(docType);
  await button.waitForVisible();
  await button.click();
  currentDocType = docType;
});

When('I create a document with the following properties:', async function(table) {
  const createDialogElem = await this.ui.createDialog;
  const docCreateEle = await createDialogElem.documentCreate;
  const layout = await docCreateEle.layout(currentDocType);
  await layout.fillMultipleValues(table);
  const field = await layout.getField('title');
  field.should.not.be.empty;
  const title = await layout.getFieldValue('title');
  const button = await createDialogElem.createButton;
  await button.waitForVisible();
  await button.click();
  await this.ui.browser.waitForNotVisible('iron-overlay-backdrop');
  const hasTitle = await this.ui.browser.hasTitle(title);
  hasTitle.should.be.true;
  this.doc = { type: currentDocType, title };
});

Then('I see the {word} page', async function(docType) {
  const ele = await this.ui.browser;
  await ele.waitForNotVisible('iron-overlay-backdrop');
  const docPage = await ele.documentPage(docType);
  const docPageView = await docPage.view;
  await docPageView.waitForVisible();
});

Then(/^I can see that a document of the type (.+) and title (.+) is created$/, function(docType, title) {
  this.ui.browser.waitForNotVisible('iron-overlay-backdrop');
  this.ui.browser.documentPage(docType).view.waitForVisible();
  currentDocType = docType;
  this.ui.browser.hasTitle(title).should.be.true;
  this.doc = { type: currentDocType, title };
});

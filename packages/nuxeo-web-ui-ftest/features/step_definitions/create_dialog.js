import { Then, When } from '@cucumber/cucumber';

let currentDocType;
let selectedTabName;

When('I click the Create Document button', async function() {
  const createBtn = await this.ui.createButton;
  await createBtn.waitForVisible();
  await createBtn.click();
});

Then('I click the Create button to finish the import', async function() {
  const createDialog = await this.ui.createDialog;
  const importButton = await createDialog.importCreateButton;
  await importButton.waitForVisible();
  await importButton.waitForEnabled();
  await driver.pause(2000);
  await importButton.click();
  await driver.waitForExist('iron-overlay-backdrop', driver.options.waitForTimeout, true);
  await driver.pause(1000); // XXX just give it some time to the server to do the conversions
});

Then(/^I go to the (.+) tab$/, async function(name) {
  const dialog = await this.ui.createDialog;
  await dialog.waitForVisible();
  const importTab = await dialog.importTab(name);
  await importTab.click();
});

Then(/^I can see the (.+) tab content$/, async function(name) {
  const dialog = await this.ui.createDialog;
  await dialog.waitForVisible();
  const importPage = await dialog.importPage(name);
  await importPage.waitForVisible();
  selectedTabName = name;
});

Then(/^I upload the (.+) on the tab content page$/, async function(file) {
  const dialog = await this.ui.createDialog;
  await dialog.waitForVisible();
  await dialog.upload(file, selectedTabName);
  const fileToImport = await dialog.selectedFileToImport;
  await fileToImport.waitForVisible();
});

Then('I upload the following files on the tab content page:', async function(table) {
  const dialog = await this.ui.createDialog;
  await dialog.waitForVisible();
  const rows = await table.rows();
  const rowArray = Array.from(rows);
  const docs = await rowArray.reduce(async (currentPromise, row) => {
    const currentArray = await currentPromise;
    const uploadedDoc = await dialog.upload(row[0], selectedTabName);
    return [...currentArray, uploadedDoc];
  }, Promise.resolve([]));
  return docs;
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
  const browser = await this.ui.browser;
  await browser.waitForNotVisible('iron-overlay-backdrop');
  const hasTitle = await browser.hasTitle(title);
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

Then(/^I can see that a document of the type (.+) and title (.+) is created$/, async function(docType, title) {
  const browser = await this.ui.browser;
  await browser.waitForNotVisible('iron-overlay-backdrop');
  const documentPage = await browser.documentPage(docType);
  const docView = await documentPage.view;
  await docView.waitForVisible();
  await driver.pause(1000);
  currentDocType = docType;
  const docTitle = await browser.hasTitle(title);
  await docTitle.should.be.true;
  this.doc = { type: currentDocType, title };
});

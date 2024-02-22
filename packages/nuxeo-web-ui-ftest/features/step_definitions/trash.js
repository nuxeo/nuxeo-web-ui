// eslint-disable-next-line import/no-extraneous-dependencies
import { Given, Then, When } from '@cucumber/cucumber';

Given(/^I have the following trashed documents$/, (table) => {
  const tasks = table.rows().map((row) => () => {
    const doc = fixtures.documents.init(row[0]);
    // eslint-disable-next-line prefer-destructuring
    doc.name = row[1];
    doc.properties = {
      'dc:title': row[1],
    };
    // create the document
    return fixtures.documents.create(row[2], doc).then((docCreated) => fixtures.documents.trash(docCreated));
  });
  return tasks.reduce((current, next) => current.then(next), Promise.resolve([]));
});

Given(/^I have a (.*) document trashed/, async function(docType) {
  docType = docType || 'File';
  const doc = await fixtures.documents.init(docType);
  // create the document
  return fixtures.documents.create(this.doc.path, doc).then((d) =>
    fixtures.documents.trash(d).then((trashedDoc) => {
      this.doc = trashedDoc;
    }),
  );
});

Then('I can trash selected documents', async function() {
  const browserEle = await this.ui.browser;
  const toolBarEle = await browserEle.selectionToolbar;
  await toolBarEle.waitForVisible();
  await toolBarEle.trashDocuments();
  await driver.alertAccept();
  await toolBarEle.waitForNotVisible();
  await driver.pause(1000);
});

Then('I cannot trash selected documents', async function() {
  const toolBarEle = await this.ui.browser.selectionToolbar;
  await toolBarEle.waitForVisible();
  const trashDocbutton = await toolBarEle.trashDocumentsButton;
  const buttonVisible = await trashDocbutton.isVisible();
  buttonVisible.should.be.false;
});

Then('I can permanently delete selected documents', async function() {
  const toolBarEle = await this.ui.browser.selectionToolbar;
  await toolBarEle.waitForVisible();
  const resultEle = await this.ui.browser.results;
  await resultEle.deleteDocuments();
  await driver.alertAccept();
  await toolBarEle.waitForNotVisible();
});

Then('I cannot permanently delete selected documents', async function() {
  const toolBarEle = await this.ui.browser.selectionToolbar;
  await toolBarEle.waitForVisible();
  const resultEle = await this.ui.browser.results;
  const deleteDocButton = await resultEle.deleteDocumentsButton;
  const buttonVisible = await deleteDocButton.isVisible();
  buttonVisible.should.be.false;
});

Then('I can untrash selected documents', async function() {
  const toolBarEle = await this.ui.browser.selectionToolbar;
  await toolBarEle.waitForVisible();
  const resultEle = await this.ui.browser.results;
  await resultEle.untrashDocuments();
  await driver.alertAccept();
  await toolBarEle.waitForNotVisible();
  await driver.pause(1000);
});

Then('I cannot untrash selected documents', async function() {
  const toolBarEle = await this.ui.browser.selectionToolbar;
  await toolBarEle.waitForVisible();
  const resultEle = await this.ui.browser.results;
  const untrashDocButton = await resultEle.untrashDocumentsButton;
  const buttonVisible = await untrashDocButton.isVisible();
  buttonVisible.should.be.false;
});

Then('I can trash current document', async function() {
  const el = await this.ui.browser.trashDocumentButton;
  await el.waitForVisible();
  await el.click();
  await driver.alertAccept();
});

Then('I cannot trash current document', async function() {
  const trashButton = await this.ui.browser.trashDocumentButton;
  const buttonVisible = await trashButton.isExisting();
  buttonVisible.should.be.false;
});

Then('I can untrash current document', async function() {
  const infoBarEle = await this.ui.browser.trashedInfobar;
  await infoBarEle.waitForVisible();
  const el = await this.ui.browser.untrashDocumentButton;
  await el.waitForVisible();
  await el.click();
  await driver.pause(1000);
  const infoVisible = await infoBarEle.isVisible();
  if (infoVisible) {
    throw new Error('Document is not untrashed');
  }
});

Then('I cannot untrash current document', async function() {
  const trashDocEle = await this.ui.browser.untrashDocumentButton;
  const docVisible = await trashDocEle.isExisting();
  docVisible.should.be.false;
});

Then('I can permanently delete current document', async function() {
  const trashedToolbar = await this.ui.browser.trashedInfobar;
  await trashedToolbar.waitForVisible();
  const el = await this.ui.browser.deleteDocumentButton;
  await el.waitForVisible();
  await el.click();
  await driver.alertAccept();
});

Then('I cannot permanently delete current document', async function() {
  const deleteDoc = await this.ui.browser.deleteDocumentButton;
  const docVisible = await deleteDoc.isExisting();
  docVisible.should.be.false;
});

When(/^I perform a Trash Search for (.+)/, async function(searchTerm) {
  const searcFormEle = await this.ui.trashSearchForm;
  await searcFormEle.search('fulltext', searchTerm);
  await driver.pause(1000);
});

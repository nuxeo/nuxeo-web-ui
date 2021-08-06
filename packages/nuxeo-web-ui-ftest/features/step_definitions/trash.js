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

Given(/^I have a (.*) document trashed/, function(docType) {
  docType = docType || 'File';
  const doc = fixtures.documents.init(docType);
  // create the document
  return fixtures.documents.create(this.doc.path, doc).then((d) =>
    fixtures.documents.trash(d).then((trashedDoc) => {
      this.doc = trashedDoc;
    }),
  );
});

Then('I can trash selected documents', function() {
  this.ui.browser.selectionToolbar.waitForVisible();
  this.ui.browser.selectionToolbar.trashDocuments();
  driver.alertAccept();
  this.ui.browser.selectionToolbar.waitForNotVisible();
});

Then('I cannot trash selected documents', function() {
  this.ui.browser.selectionToolbar.waitForVisible();
  this.ui.browser.selectionToolbar.trashDocumentsButton.isVisible().should.be.false;
});

Then('I can permanently delete selected documents', function() {
  this.ui.browser.selectionToolbar.waitForVisible();
  this.ui.browser.results.deleteDocuments();
  driver.alertAccept();
  this.ui.browser.selectionToolbar.waitForNotVisible();
});

Then('I cannot permanently delete selected documents', function() {
  this.ui.browser.selectionToolbar.waitForVisible();
  this.ui.browser.results.deleteDocumentsButton.isVisible().should.be.false;
});

Then('I can untrash selected documents', function() {
  this.ui.browser.selectionToolbar.waitForVisible();
  this.ui.browser.results.untrashDocuments();
  driver.alertAccept();
  this.ui.browser.selectionToolbar.waitForNotVisible();
});

Then('I cannot untrash selected documents', function() {
  this.ui.browser.selectionToolbar.waitForVisible();
  this.ui.browser.results.untrashDocumentsButton.isVisible().should.be.false;
});

Then('I can trash current document', function() {
  const el = this.ui.browser.trashDocumentButton;
  el.waitForVisible();
  el.click();
  driver.alertAccept();
});

Then('I cannot trash current document', function() {
  this.ui.browser.trashDocumentButton.isExisting().should.be.false;
});

Then('I can untrash current document', function() {
  this.ui.browser.trashedInfobar.waitForVisible();
  const el = this.ui.browser.untrashDocumentButton;
  el.waitForVisible();
  el.click();
  driver.waitUntil(() => !this.ui.browser.trashedInfobar.isVisible());
});

Then('I cannot untrash current document', function() {
  this.ui.browser.untrashDocumentButton.isExisting().should.be.false;
});

Then('I can permanently delete current document', function() {
  this.ui.browser.trashedInfobar.waitForVisible();
  const el = this.ui.browser.deleteDocumentButton;
  el.waitForVisible();
  el.click();
  driver.alertAccept();
});

Then('I cannot permanently delete current document', function() {
  this.ui.browser.deleteDocumentButton.isExisting().should.be.false;
});

When(/^I perform a Trash Search for (.+)/, function(searchTerm) {
  this.ui.trashSearchForm.search('fulltext', searchTerm);
});

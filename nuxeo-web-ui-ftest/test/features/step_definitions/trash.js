'use strict';

module.exports = function () {
  this.Given(/^I have the following trashed documents$/, (table) => {
    const tasks = table.rows().map((row) => () => {
      const doc = fixtures.documents.init(row[0]);
      doc.name = row[1];
      doc.properties = {
        'dc:title': row[1],
      };
      // create the document
      return fixtures.documents.create(row[2], doc).then((docCreated) => fixtures.documents.trash(docCreated));
    });
    return tasks.reduce((current, next) => current.then(next), Promise.resolve([]));
  });

  this.Given(/^I have a (.*) document trashed/, (docType) => {
    docType = docType || 'File';
    const doc = fixtures.documents.init(docType);
    // create the document
    return fixtures.documents.create(this.doc.path, doc).then((d) => fixtures.documents.trash(d).then(trashedDoc => {
      this.doc = trashedDoc;
    }));
  });

  this.Then('I can trash selected documents', () => {
    this.ui.browser.selectionToolbar.waitForVisible();
    this.ui.browser.selectionToolbar.trashDocuments();
    driver.alertAccept();
  });

  this.Then('I cannot trash selected documents', () => {
    this.ui.browser.selectionToolbar.waitForVisible();
    this.ui.browser.selectionToolbar.trashDocumentsButton.isExisting().should.be.false;
  });

  this.Then('I can permanently delete selected documents', () => {
    this.ui.browser.selectionToolbar.waitForVisible();
    this.ui.browser.selectionToolbar.deleteDocuments();
    driver.alertAccept();
  });

  this.Then('I cannot permanently delete selected documents', () => {
    this.ui.browser.selectionToolbar.waitForVisible();
    this.ui.browser.selectionToolbar.deleteDocumentsButton.isExisting().should.be.false;
  });

  this.Then('I can untrash selected documents', () => {
    this.ui.browser.selectionToolbar.waitForVisible();
    this.ui.browser.selectionToolbar.untrashDocuments();
    driver.alertAccept();
  });

  this.Then('I cannot untrash selected documents', () => {
    this.ui.browser.selectionToolbar.waitForVisible();
    this.ui.browser.selectionToolbar.untrashDocumentsButton.isExisting().should.be.false;
  });

  this.Then('I can trash current document', () => {
    const el = this.ui.browser.trashDocumentButton;
    el.waitForVisible();
    el.click();
    driver.alertAccept();
  });

  this.Then('I cannot trash current document', () => {
    this.ui.browser.trashDocumentButton.isExisting().should.be.false;
  });

  this.Then('I can untrash current document', () => {
    this.ui.browser.trashedInfobar.waitForVisible();
    const el = this.ui.browser.untrashDocumentButton;
    el.waitForVisible();
    el.click();
    driver.waitUntil(() => !this.ui.browser.trashedInfobar.isVisible());
  });

  this.Then('I cannot untrash current document', () => {
    this.ui.browser.untrashDocumentButton.isExisting().should.be.false;
  });

  this.Then('I can permanently delete current document', () => {
    this.ui.browser.trashedInfobar.waitForVisible();
    const el = this.ui.browser.deleteDocumentButton;
    el.waitForVisible();
    el.click();
    driver.alertAccept();
  });

  this.Then('I cannot permanently delete current document', () => {
    this.ui.browser.deleteDocumentButton.isExisting().should.be.false;
  });

  this.When(/^I perform a Trash Search for (.+)/, (searchTerm) => {
    this.ui.trashSearchForm.search('fulltext', searchTerm);
  });
};

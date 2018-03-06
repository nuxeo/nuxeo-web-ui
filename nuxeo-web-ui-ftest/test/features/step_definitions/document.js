'use strict';

module.exports = function () {
  this.Given(/^I have a (.*) document$/, (docType) => {
    docType = docType || 'File';
    const doc = fixtures.documents.init(docType);
    // create the document
    return fixtures.documents.create(this.doc.path, doc).then((d) => {
      this.doc = d;
    });
  });

  this.Given(/^I have a document imported from file "(.+)"$/, (mimeType) =>
      fixtures.documents.import(this.doc, fixtures.blobs.mimeTypeBlobs[mimeType]).then((d) => { this.doc = d; }));

  this.Given(/^I have permission (\w+) for this document$/, (permission) =>
      fixtures.documents.setPermissions(this.doc, permission, this.username).then((d) => { this.doc = d; }));

  this.Given(/^This document has a (major|minor) version$/, (versionType) =>
      fixtures.documents.createVersion(this.doc, versionType).then((d) => { this.doc = d; }));

  this.Given(/^I have a document added to "([^"]*)" collection$/, (colName) => {
    const docFile = fixtures.documents.init('File');
    // create the document
    return fixtures.documents.create(this.doc.path, docFile)
        .then((doc) => fixtures.collections.addToNewCollection(doc, colName)).then((d) => {
          this.doc = d;
        });
  });

  this.Given(/^this document has file "(.+)" for content$/, (file) =>
      fixtures.documents.attach(this.doc, fixtures.blobs.get(file)));

  this.Given(/^this document has file "(.+)" for attachment/, (file) =>
      fixtures.documents.attach(this.doc, fixtures.blobs.get(file), true));

  this.When(/^I browse to the document$/, () => {
    driver.url(`#!/browse${this.doc.path}`);
    this.ui.browser.waitForVisible();
    this.ui.browser.breadcrumb.waitForVisible();
  });

  this.When(/^I browse to the document with path "(.+)"$/, (path) => {
    driver.url(`#!/browse`.concat(path));
    this.ui.browser.waitForVisible();
    this.ui.browser.breadcrumb.waitForVisible();
  });

  this.Then(/^I can't view the document$/, () => {
    driver.url(`#!/browse${this.doc.path}`);
    this.ui.browser.breadcrumb.waitForVisible(browser.options.waitforTimeout, true).should.be.true;
  });

  this.Then('I can see the document\'s title', () => {
    this.ui.browser.title.waitForVisible();
  });

  this.Then(/I can see (.+) metadata with the following properties:/, (docType, table) => {
    this.ui.browser.documentPage(docType).waitForVisible();
    this.ui.browser.documentPage(docType).metadata.waitForVisible();
    table.rows().forEach((row) => {
      this.ui.browser.documentPage(docType).metadata.layout().waitForVisible();
      if (row[0] === 'subjects') {
        this.ui.browser.documentPage(docType).metadata.layout().getFieldValue(row[0]).should.include(row[1]);
      } else {
        this.ui.browser.documentPage(docType).metadata.layout().getFieldValue(row[0]).should.equal(row[1]);
      }
    });
  });

  this.Then(/^I can edit the (.*) metadata$/, (docType) => {
    const browser = this.ui.browser;
    browser.editButton.waitForVisible();
    browser.editButton.click();
    browser.editDialog.waitForVisible();
    browser.editDialog.edit(docType).waitForVisible();
    browser.editDialog.edit(docType).title = docType;
    browser.editDialog.saveButton.waitForVisible().should.be.true;
    browser.editDialog.saveButton.click();
  });

  this.Then(/^I can edit the following properties in the (.+) metadata:$/, (docType, table) => {
    const browser = this.ui.browser;
    browser.editButton.waitForVisible();
    browser.editButton.click();
    browser.editDialog.waitForVisible();
    browser.editDialog.edit(docType).waitForVisible();
    browser.editDialog.edit(docType).layout().waitForVisible();
    browser.editDialog.edit(docType).layout().fillMultipleValues(table);
    browser.editDialog.saveButton.waitForVisible().should.be.true;
    browser.editDialog.saveButton.click();
  });

  this.Given(/^I have a (.+) Note$/, (format) => {
    const doc = fixtures.documents.init('Note');
    doc.properties['note:mime_type'] = fixtures.notes.formats[format].mimetype;
    doc.properties['note:note'] = fixtures.notes.formats[format].content;
    return fixtures.documents.create(this.doc.path, doc).then((result) => {
      this.doc = result;
    });
  });

  this.Then(/^I can edit the (.*) Note$/, (format) => {
    const page = this.ui.browser.documentPage(this.doc.type);
    page.view.waitForVisible();

    const newContent = `NEW ${format} CONTENT`;

    switch (format) {
      case 'HTML':
        page.view.noteEditor.waitForVisible();
        page.view.noteEditor.setContent(newContent);
        page.view.noteEditor.save();
        page.view.noteEditor.hasContent(`<p>${newContent}</p>`);
        break;
      case 'XML':
      case 'Markdown':
      case 'Text':
        page.view.noteEditor.waitForVisible();
        page.view.noteEditor.edit();
        page.view.noteEditor.textarea.waitForVisible();
        page.view.noteEditor.textarea.setValue(newContent);
        page.view.noteEditor.save();
        page.view.preview.waitForVisible();
        if (format === 'XML') {
          const xmlContent = page.view.preview.element('#xml');
          xmlContent.waitForVisible();
          xmlContent.getText().should.equal(newContent);
        } else if (format === 'Markdown') {
          page.view.preview.waitForVisible('marked-element #content');
          const markedContent = page.view.preview.element('marked-element #content');
          markedContent.waitForVisible();
          markedContent.getText().should.equal(newContent);
        } else if (format === 'Text') {
          page.view.preview.element('iframe').waitForVisible();
        }
        break;
      default:
        // do nothing
    }
  });

  this.Then('I add the document to the "$name" collection', (name) => {
    this.ui.browser.addToCollection(name);
  });

  this.Then('I can see the document belongs to the "$name" collection', (name) =>
      this.ui.browser.hasCollection(name).should.be.true);

  this.Then('I can delete the document from the "$name" collection', (name) => {
    this.ui.browser.removeFromCollection(name);
  });

  this.Then('I can see the document does not belong to the "$name" collection', (name) =>
      this.ui.browser.doesNotHaveCollection(name).should.be.true);

  this.Then('I add the document to the favorites', () => {
    this.ui.browser.addToFavorites();
  });

  this.Then('I can see the document has "$nb" children', (nb) =>
    this.ui.browser.waitForNbChildren(parseInt(nb))
  );
};

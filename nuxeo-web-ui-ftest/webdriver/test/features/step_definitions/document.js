'use strict';

module.exports = function() {

  this.Given(/^I have a (.*) document$/, (docType) => {
    docType = docType || 'File';
    let doc = fixtures.documents.init(docType);
    // create the document
    return fixtures.documents.create(this.doc.path, doc).then((doc) => {
      this.doc = doc;
    });
  });

  this.Given(/^I have a document imported from file "(.+)"$/, (mimeType) => {
    return fixtures.documents.import(this.doc, fixtures.blobs.mimeTypeBlobs[mimeType])
        .then((doc) => { this.doc = doc; });
  });

  this.Given(/^I have permission (\w+) for this document$/, (permission) => {
    return fixtures.documents.setPermissions(this.doc, permission, this.username).then((doc) => {
      this.doc = doc;
    })
  });

  this.Given(/^I have a document added to "([^"]*)" collection$/, (colName) => {
    let doc = fixtures.documents.init('File');
    // create the document
    return fixtures.documents.create(this.doc.path, doc)
        .then((doc) => fixtures.collections.addToNewCollection(doc, colName)).then((doc) => {
          this.doc = doc;
        });
  });

  this.Given(/^this document has file "(.+)" for content$/, (file) => {
    return fixtures.documents.attach(this.doc, fixtures.blobs.get(file));
  });

  this.Given(/^this document has file "(.+)" for attachment/, (file) => {
    return fixtures.documents.attach(this.doc, fixtures.blobs.get(file), true);
  });

  this.When('I browse to the document', () => {
    driver.url('/#!/browse' + this.doc.path);
    this.ui.browser.breadcrumb.waitForVisible();
  });

  this.Then('I can see the document\'s title', () => {
    this.ui.browser.title.waitForVisible();
  });

  this.Then(/I can see (.+) metadata with the following properties:/, (docType, table) => {
    let page = this.ui.browser.documentPage(docType);
    page.waitForVisible();
    page.metadata.waitForVisible();
    table.rows().forEach((row) => {
      page.metadata.layout().getFieldValue(docType, row[0], row[1]);
    });
  });

  this.Then(/^I can edit the (.*) metadata$/, (docType) => {
    const page = this.ui.browser.documentPage(docType);
    page.metadata.waitForVisible();
    page.edit.isVisible().should.be.false;
    page.editButton.waitForVisible();
    page.editButton.click();
    page.edit.waitForVisible();
    page.metadata.isVisible().should.be.false;
    page.edit.title = docType;
    page.saveButton.isVisible().should.be.true;
    page.saveButton.click();
    page.metadata.waitForVisible();
  });

  this.Given(/^I have a (.+) Note$/, (format) => {
    let doc = fixtures.documents.init('Note');
    doc.properties['note:mime_type'] = fixtures.notes.formats[format].mimetype;
    doc.properties['note:note'] = fixtures.notes.formats[format].content;
    return fixtures.documents.create(this.doc.path, doc).then((result) => {
      this.doc = result;
    });
  });

  this.Then(/^I can edit the (.*) Note$/, (format) => {
    let page = this.ui.browser.documentPage(this.doc.type);
    page.view.waitForVisible();

    let newContent = 'NEW ' + format + ' CONTENT';

    switch (format) {
      case 'HTML':
      case 'XML':
        page.view.noteEditor.alloy.waitForVisible();
        page.view.noteEditor.alloy.setValue(newContent);
        page.view.noteEditor.save();
        page.view.noteEditor.alloy.waitForVisible();
        page.view.noteEditor.alloyHasContent('<p>' + newContent + '</p>');
        break;
      case 'Markdown':
      case 'Text':
        page.view.noteEditor.edit();
        page.view.noteEditor.textarea.waitForVisible();
        page.view.noteEditor.textarea.setValue(newContent);
        page.view.noteEditor.save();
        page.view.preview.waitForVisible();
        if (format == 'Markdown') {
          let markedElement = page.view.preview.element('marked-element');
          markedElement.waitForVisible();
          let markedContent = markedElement.element('div.markdown-html');
          markedContent.waitForVisible();
          markedContent.getText().should.equal(newContent);
        } else if (format == 'Text') {
          page.view.preview.element('iframe').waitForVisible();
        }
        break;
    }
  });

  this.Then('I add the document to the "$name" collection', (name) => {
    this.ui.browser.addToCollection(name);
    liveCollections.push(name);
  });

  this.Then('I can see the document belongs to the "$name" collection', (name) => {
    this.ui.browser.hasCollection(name).should.be.true;
  });

  this.Then('I can delete the document from the "$name" collection', (name) => {
    this.ui.browser.removeFromCollection(name);
  });

  this.Then('I can see the document does not belong to the "$name" collection', (name) => {
    this.ui.browser.hasCollection(name, true).should.be.true;
  });

  this.Then('I add the document to the favorites', () => {
    this.ui.browser.addToFavorites();
  });
};

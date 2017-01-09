'use strict';

let teardownCbs = [];

let workspace = {
  'entity-type': 'document',
  name: 'workspace',
  type: 'Workspace',
  properties: {
    'dc:title': 'workspace',
  }
};

let doc = {
  'entity-type': 'document',
  name: 'doc',
  properties: {
    'dc:title': 'document'
  }
};

module.exports = function() {

  this.Given(/^I have a (.*) document$/, (docType) => {
    docType = docType || 'File';
    doc.type = docType.trim();
    // create workspace
    return this.client.repository().create('/default-domain/workspaces/', workspace).then((result) => {
      workspace = result;
      // add a callback to teardown the workspace
      teardownCbs.push(((path) => {
        return () => this.client.repository().delete(path);
      })(workspace.path));
      // create the document
      return this.client.repository().create('/default-domain/workspaces/workspace/', doc).then((result) => {
        doc = result;
        // add a callback to teardown the document
        teardownCbs.push(((path) => {
          return () => this.client.repository().delete(path);
        })(doc.path));
      });
    });
  });

  this.When('I browse to the document', () => {
    driver.url('/#!/browse' + doc.path);
    //driver.waitForExist('p.title', 5000);
  });

  this.Then(/^I can edit the (.*) metadata$/, (docType) => {
    const page = this.ui.browser.documentPage(docType);
    page.metadata.isVisible().should.be.true;
    page.edit.isVisible().should.be.false;
    page.editButton.isVisible().should.be.true;
    page.editButton.click();
    page.edit.isVisible().should.be.true;
    page.edit.title = docType;
    page.edit.submit();
    page.view.isVisible().should.be.true;
  });

  this.Given('I have a HTML Note', () => {
    // create workspace
    return this.client.repository().create('/default-domain/workspaces/', workspace).then((result) => {
      workspace = result;
      // add a callback to teardown the workspace
      teardownCbs.push(((path) => {
        return () => this.client.repository().delete(path);
      })(workspace.path));
      // create the Note document
      doc.type = 'Note';
      doc.properties['note:mime_type'] = 'text/html';
      doc.properties['note:note'] = '<h1>HTML CONTENT</h1>';
      return this.client.repository().create('/default-domain/workspaces/workspace/', doc).then((result) => {
        doc = result;
        // add a callback to teardown the document
        teardownCbs.push(((path) => {
          return () => this.client.repository().delete(path);
        })(doc.path));
      });
    });
  });

  this.Then('I can edit the Note content', () => {
    let page = this.ui.browser.documentPage(doc.type);
    page.view.isVisible().should.be.true;
    let newContent = '<h2>NEW HTML CONTENT</h2>';
    let editor = page.view.element('#editor');
    editor.isVisible().should.be.true;
    editor.setValue(newContent);
    let save = page.view.element('#editorSave');
    save.isVisible().should.be.true;
    save.click();
    driver.waitForExist('#editor');
    editor = page.view.element('#editor');
    editor.isVisible().should.be.true;
    (editor.getText() === newContent).should.be.true;
  });

  this.After(function(scenario) {
    return Promise.all(teardownCbs.map((cb) => cb()));
  });
};

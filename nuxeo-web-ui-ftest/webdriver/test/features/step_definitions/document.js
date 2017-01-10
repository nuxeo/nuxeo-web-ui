'use strict';

let teardownCbs = [];

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
    // create the document
    return this.client.repository().create('/default-domain/', doc).then((doc) => {
      // add a callback to teardown the document
      teardownCbs.push(((path) => {
        return () => this.client.repository().delete(path);
      })(doc.path));
    })
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
    page.saveButton.isVisible().should.be.true;
    page.saveButton.click();
    page.view.isVisible().should.be.true;
  });

  this.Given(/^I have a (.*) Note$/, (format) => {

    // create workspace (Note documents needs to be in a workspace in Web UI)
    let workspace = {
      'entity-type': 'document',
      name: 'workspace',
      type: 'Workspace',
      properties: {
        'dc:title': 'workspace',
      }
    };
    return this.client.repository().create('/default-domain/workspaces/', workspace).then((result) => {
      workspace = result;
      // add a callback to teardown the workspace document
      teardownCbs.push(((path) => {
        return () => this.client.repository().delete(path);
      })(workspace.path));

      // create the Note document
      let formats = {
        'HTML': { mimetype: 'text/html', content: '<h1>HTML CONTENT</h1>'},
        'XML': { mimetype: 'text/xml', content: '<tag>XML CONTENT</tag>'},
        'Markdown': { mimetype: 'text/x-web-markdown', content: 'MARKDOWN CONTENT'},
        'Text': { mimetype: 'text/plain', content: 'TEXT CONTENT'},
      };
      doc.type = 'Note';
      doc.properties['note:mime_type'] = formats[format].mimetype;
      doc.properties['note:note'] = formats[format].content;
      return this.client.repository().create(workspace.path, doc).then((result) => {
        doc = result;
        // add a callback to teardown the note document
        teardownCbs.push(((path) => {
          return () => this.client.repository().delete(path);
        })(doc.path));
      });

    });
  });

  this.Then(/^I can edit the (.*) Note$/, (format) => {
    let page = this.ui.browser.documentPage(doc.type);
    page.view.isVisible().should.be.true;
    switch (format) {
      case 'HTML':
        let newContent = '<h2>NEW HTML CONTENT</h2>';
        let editor = page.view.element('#editor');
        editor.isVisible().should.be.true;
        editor.setValue(newContent);
        let save = page.view.element('paper-button[name="editorSave"]');
        save.isVisible().should.be.true;
        save.click();
        driver.waitForExist('#editor');
        editor = page.view.element('#editor');
        editor.isVisible().should.be.true;
        (editor.getText() === newContent).should.be.true;
        break;
    }
  });

  this.After((scenario) => Promise.all(teardownCbs.map((cb) => cb())).then(() => { teardownCbs = []; }));
};

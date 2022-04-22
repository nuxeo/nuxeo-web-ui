import { Given, When, Then } from '@cucumber/cucumber';
import { url } from '../../pages/helpers';

Given('I have a {word} document', function(docType) {
  docType = docType || 'File';
  const doc = fixtures.documents.init(docType);
  // create the document
  return fixtures.documents.create(this.doc.path || '/default-domain', doc).then((d) => {
    this.doc = d;
  });
});

Given(/^I have a document imported from file "(.+)"$/, function(mimeType) {
  return fixtures.documents.import(this.doc, fixtures.blobs.mimeTypeBlobs[mimeType]).then((d) => {
    this.doc = d;
  });
});

Given(/^I have permission (\w+) for this document$/, function(permission) {
  return fixtures.documents.setPermissions(this.doc, permission, this.username).then((d) => {
    this.doc = d;
  });
});

Given(/^I have permission (\w+) for the document with path "(.+)"$/, function(permission, path) {
  return fixtures.documents.setPermissions(path, permission, this.username).then((d) => {
    this.doc = d;
  });
});

Given(/^I have the following permissions to the documents$/, function(table) {
  return Promise.all(table.rows().map((row) => fixtures.documents.setPermissions(row[1], row[0], this.username)));
});

Given(/^This document has a (major|minor) version$/, function(versionType) {
  return fixtures.documents.createVersion(this.doc, versionType).then((d) => {
    this.doc = d;
  });
});

Given(/^I have a document added to "([^"]*)" collection$/, function(colName) {
  const docFile = fixtures.documents.init('File');
  // create the document
  return fixtures.documents
    .create(this.doc.path, docFile)
    .then((doc) => fixtures.collections.addToNewCollection(doc, colName))
    .then((d) => {
      this.doc = d;
    });
});

Given(/^This document has a "([^"]*)" workflow running$/, function(workflowName) {
  return fixtures.workflows.start(this.doc, workflowName, this.username).then((workflowInstance) => {
    this.workflowInstance = workflowInstance;
  });
});

Given(
  /^The workflow running for this document will proceed with "([^"]*)" action and the following variables:$/,
  function(action, table) {
    this.workflowInstance.should.not.be.undefined;
    return this.workflowInstance.fetchTasks().then((tasks) => {
      tasks.entries.length.should.be.equal(1);
      const task = tasks.entries[0];
      table.rows().forEach((row) => {
        row[2].should.to.be.oneOf(['list', 'text'], 'An unknown type was passed as argument');
        let value;
        switch (row[2]) {
          case 'list':
            value = row[1].split(',');
            break;
          case 'text':
            // eslint-disable-next-line prefer-destructuring
            value = row[1];
            break;
          default:
          // do nothing
        }
        task.variable(row[0], value);
      });
      return task.complete(action);
    });
  },
);

Given(/^This document has file "(.+)" for content$/, function(file) {
  return fixtures.documents.attach(this.doc, fixtures.blobs.get(file));
});

Given(/^This document has file "(.+)" for attachment/, function(file) {
  return fixtures.documents.attach(this.doc, fixtures.blobs.get(file), true);
});

Given(/^I have a (.+) Note$/, function(format) {
  const doc = fixtures.documents.init('Note');
  doc.properties['note:mime_type'] = fixtures.notes.formats[format].mimetype;
  doc.properties['note:note'] = fixtures.notes.formats[format].content;
  return fixtures.documents.create(this.doc.path, doc).then((result) => {
    this.doc = result;
  });
});

When(/^I browse to the document$/, function() {
  this.ui.browser.browseTo(this.doc.path);
});

When(/^I browse to the "(.*)" document page$/, function(page) {
  this.ui.browser.browseTo(`${this.doc.path}?p=${page}`);
});

When(/^I browse to the document with path "(.+)"$/, function(path) {
  this.ui.browser.browseTo(path);
});

Then('I navigate to {string} child', function(title) {
  this.ui.browser.clickChild(title);
});

When(/^I start a (.+)$/, function(workflow) {
  this.ui.browser.startWorkflow(workflow);
});

When(/^I click the process button$/, function() {
  const { processWorkflowButton } = this.ui.browser.documentPage();
  processWorkflowButton.waitForVisible();
  processWorkflowButton.click();
});

Then(/^I can't view the document$/, function() {
  url(`#!/browse${this.doc.path}`);
  this.ui.browser.breadcrumb.waitForVisible(browser.options.waitforTimeout, true).should.be.true;
});

Then("I can see the document's title", function() {
  this.ui.browser.title.waitForVisible();
});

Then(/I can see (.+) metadata with the following properties:/, function(docType, table) {
  this.ui.browser.documentPage(docType).waitForVisible();
  this.ui.browser.documentPage(docType).metadata.waitForVisible();
  table.rows().forEach((row) => {
    this.ui.browser
      .documentPage(docType)
      .metadata.layout()
      .waitForVisible();
    if (row[0] === 'subjects') {
      driver.waitUntil(
        () =>
          this.ui.browser
            .documentPage(docType)
            .metadata.layout()
            .getFieldValue(row[0])
            .indexOf(row[1]) > -1,
      );
    } else {
      driver.waitUntil(
        () =>
          this.ui.browser
            .documentPage(docType)
            .metadata.layout()
            .getFieldValue(row[0])
            .toString() === row[1],
      );
    }
  });
});

Then(/^I can't edit the document metadata$/, function() {
  this.ui.browser.editButton.waitForVisible(browser.options.waitforTimeout, true).should.be.true;
});

Then(/^I can edit the (.*) metadata$/, function(docType) {
  const { browser } = this.ui;
  browser.editButton.waitForVisible();
  browser.editButton.click();
  const form = browser.editForm(docType);
  form.waitForVisible();
  form.title = docType;
  form.save();
  driver.waitForExist('iron-overlay-backdrop', driver.options.waitForTimeout, true);
});

Then(/^I can edit the following properties in the (.+) metadata:$/, function(docType, table) {
  const { browser } = this.ui;
  browser.editButton.waitForVisible();
  browser.editButton.click();
  const form = browser.editForm(docType);
  form.waitForVisible();
  form.layout.waitForVisible();
  form.layout.fillMultipleValues(table);
  form.save();
});

Then(/^I can't edit the Note$/, function() {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.view.waitForVisible();
  page.view.noteEditor.waitForVisible();
  page.view.noteEditor.editButton.waitForVisible(browser.options.waitforTimeout, true).should.be.true;
});

Then(/^I can edit the (.*) Note$/, function(format) {
  const page = this.ui.browser.documentPage(this.doc.type);
  page.view.waitForVisible();

  const newContent = `NEW ${format} CONTENT`;

  switch (format) {
    case 'HTML':
      page.view.noteEditor.waitForVisible();
      page.view.noteEditor.setContent(newContent);
      page.view.noteEditor.save();
      driver.waitUntil(() => page.view.noteEditor.hasContent(`<p>${newContent}</p>`));
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
      driver.waitUntil(() => {
        try {
          const elContent =
            format === 'XML' ? page.view.preview.element('#xml') : page.view.preview.element('marked-element #content');
          return elContent.isVisible() && elContent.getText() === newContent;
        } catch (e) {
          return false;
        }
      });
      break;
    default:
    // do nothing
  }
});

Then('I add the document to the {string} collection', function(name) {
  this.ui.browser.addToCollection(name);
});

Then('I can see the document belongs to the {string} collection', function(name) {
  this.ui.browser.hasCollection(name).should.be.true;
});

Then('I can delete the document from the {string} collection', function(name) {
  this.ui.browser.removeFromCollection(name);
});

Then('I can see the document does not belong to the {string} collection', function(name) {
  this.ui.browser.doesNotHaveCollection(name).should.be.true;
});

Then('I add the document to the favorites', function() {
  this.ui.browser.addToFavorites();
});

Then('I can see the document has {int} children', function(nb) {
  this.ui.browser.waitForNbChildren(nb);
});

Then(/^I can see a process is running in the document$/, function() {
  const documentPage = this.ui.browser.documentPage();
  // check info bar in the document is visible
  documentPage.infoBar.waitForVisible();
  // assert that info bar displays a task is running
  documentPage.taskInfo.waitForVisible();
  // assert that there's a button to process the task
  documentPage.processWorkflowButton.waitForVisible();
  // assert that document info says a process is running
  documentPage.info.waitForVisible();
  documentPage.info.waitForVisible('[name="process"]');
});

Then(/^I can see a process is not running in the document$/, function() {
  const documentPage = this.ui.browser.documentPage();
  // check info bar in the document is not visible
  documentPage.infoBar.isVisible().should.be.false;
});

Then(/^I cannot start a workflow$/, function() {
  this.ui.browser.startWorkflowButton.isExisting().should.be.false;
});

Then(/^I can abandon the workflow$/, function() {
  const { abandonWorkflowButton } = this.ui.browser.documentPage();
  abandonWorkflowButton.waitForVisible();
  abandonWorkflowButton.click();
  driver.alertAccept();
  const documentPage = this.ui.browser.documentPage();
  // check info bar in the document is not visible
  documentPage.infoBar.waitForVisible(browser.options.waitforTimeout, true);
  // assert that info bar displays a task is running
  documentPage.taskInfo.waitForVisible(browser.options.waitforTimeout, true);
  // assert that document info says a process is running
  documentPage.info.waitForVisible();
  documentPage.info.waitForVisible('[name="process"]', browser.options.waitforTimeout, true);

  // In order to avoid errors when performing the teardown
  fixtures.workflows.removeInstance(this.workflowInstance.id);
});

Then(/^I can see the document is a publication$/, function() {
  const infoBar = this.ui.browser.publicationInfobar;
  infoBar.waitForVisible();
});

Then(/^I can unpublish the document$/, function() {
  const unpublishButton = this.ui.browser.publicationInfobar.element('nuxeo-unpublish-button');
  unpublishButton.waitForVisible();
  unpublishButton.click();
  const unpublishConfirm = unpublishButton.element('nuxeo-confirm-button #dialog paper-button[class="primary"]');
  unpublishConfirm.waitForVisible();
  unpublishConfirm.click();
});

Then('I can see {int} validation error(s) in the {string} edit form', function(nbErrors, docType) {
  const { browser } = this.ui;
  const form = browser.editForm(docType);
  form.waitForVisible();
  driver.waitUntil(
    () => form.errorMessages.length === nbErrors,
    `Expecting to get ${nbErrors} results but found ${form.errorMessages.length}`,
  );
});

Then('I can see the {string} error message in the {string} edit form', function(message, docType) {
  const { browser } = this.ui;
  const form = browser.editForm(docType);
  form.waitForVisible();
  driver.waitUntil(
    () => form.errorMessages.some((err) => err === message),
    `Expecting to find '${message}' error message but not found`,
  );
});

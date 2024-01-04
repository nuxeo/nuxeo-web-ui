/* eslint-disable no-await-in-loop */
import { Given, When, Then } from '../../node_modules/@cucumber/cucumber';
import { url } from '../../pages/helpers';

Given('I have a {word} document', async function(docType) {
  docType = docType || 'File';
  const doc = await fixtures.documents.init(docType);
  // create the document
  const createDoc = await fixtures.documents.create(this.doc.path || '/default-domain', doc).then((d) => {
    this.doc = d;
  });
  return createDoc;
});

Given(/^I have a document imported from file "(.+)"$/, function(mimeType) {
  return fixtures.documents.import(this.doc, fixtures.blobs.mimeTypeBlobs[mimeType]).then((d) => {
    this.doc = d;
  });
});

Given(/^I have permission (\w+) for this document$/, async function(permission) {
  const setPermission = await fixtures.documents.setPermissions(this.doc, permission, this.username).then((d) => {
    this.doc = d;
  });
  return setPermission;
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

Given(/^This document has a "([^"]*)" workflow running$/, async function(workflowName) {
  const workflow = await fixtures.workflows.start(this.doc, workflowName, this.username).then((workflowInstance) => {
    this.workflowInstance = workflowInstance;
  });
  return workflow;
});

Given(
  /^The workflow running for this document will proceed with "([^"]*)" action and the following variables:$/,
  async function(action, table) {
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

Given(/^This document has file "(.+)" for content$/, async function(file) {
  const contentEle = await fixtures.documents.attach(this.doc, fixtures.blobs.get(file));
  return contentEle;
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

When(/^I browse to the document$/, async function() {
  await driver.pause(500);
  await this.ui.browser.browseTo(this.doc.path);
});

When(/^I browse to the "(.*)" document page$/, async function(page) {
  await this.ui.browser.browseTo(`${this.doc.path}?p=${page}`);
});

When(/^I browse to the document with path "(.+)"$/, async function(path) {
  await driver.pause(2000);
  await this.ui.browser.browseTo(path);
});

Then('I navigate to {string} child', async function(title) {
  const browser = await this.ui.browser;
  const child = browser.clickChild(title);
  if (!child) {
    throw Error(`child should have ${title} title`);
  }
});

When(/^I start a (.+)$/, async function(workflow) {
  await this.ui.browser.startWorkflow(workflow);
});

When(/^I click the process button$/, async function() {
  const documentPage = await this.ui.browser.documentPage();
  const documentPageInfo = await documentPage.info;
  await documentPageInfo.waitForVisible();
  const processButton = await documentPage.processWorkflowButton;
  await processButton.waitForVisible();
  await processButton.click();
});

Then(/^I can't view the document$/, async function() {
  url(`#!/browse${this.doc.path}`);
  const breadcumbEle = await this.ui.browser.breadcrumb;
  const isVisible = await breadcumbEle.waitForVisible(browser.options.waitforTimeout, true);
  isVisible.should.be.true;
});

Then("I can see the document's title", function() {
  this.ui.browser.title.waitForVisible();
});

Then(/I can see (.+) metadata with the following properties:/, async function(docType, table) {
  const browser = await this.ui.browser;
  const docPage = await browser.documentPage(docType);
  await docPage.waitForVisible();
  const docMeta = await docPage.metadata;
  await docMeta.waitForVisible();
  const tableRows = await table.rows;
  for (let i = 0; i < tableRows.length; i++) {
    const tableRow = tableRows[i];
    const docLayout = await docMeta.layout();
    await docLayout.waitForVisible();
    if (tableRow[0] === 'subjects') {
      const docField = await docLayout.getFieldValue(tableRow[0]);
      (await docField.indexOf(tableRow[1])) > -1;
    } else {
      const docFiel = await docLayout.getFieldValue(tableRow[0]);
      (await docFiel.toString()) === tableRow[1];
    }
  }
});

Then(/^I can't edit the document metadata$/, function() {
  this.ui.browser.editButton.waitForVisible(browser.options.waitforTimeout, true).should.be.true;
});

Then(/^I can edit the (.*) metadata$/, async function(docType) {
  const browser = await this.ui.browser;
  const browserEditButton = await browser.editButton;
  await browserEditButton.waitForVisible();
  await browserEditButton.click();
  const form = await browser.editForm(docType);
  await form.waitForVisible();
  const inputElement = await form.el.element('.input-element input');
  await fixtures.layouts.setValue(inputElement, docType);
  await form.save();
  await driver.waitForExist('iron-overlay-backdrop', driver.options.waitForTimeout, true);
});

Then(/^I can edit the following properties in the (.+) metadata:$/, async function(docType, table) {
  const browser = await this.ui.browser;
  await browser.editButton.waitForVisible();
  await browser.editButton.click();
  const form = await browser.editForm(docType);
  await form.waitForVisible();
  await form.layout.waitForVisible();
  await form.layout.fillMultipleValues(table);
  await form.save();
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
          let elContent;
          if (format === 'XML') {
            elContent = page.view.preview.element('#xml');
          } else if (format === 'Text') {
            elContent = page.view.preview.element('#plain');
          } else {
            elContent = page.view.preview.element('marked-element #content');
          }
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

Then('I add the document to the favorites', async function() {
  await this.ui.browser.addToFavorites();
});

Then('I can see the document has {int} children', async function(nb) {
  if (await !this.ui.browser.waitForNbChildren(nb)) {
    throw Error(`Document should have ${nb} children`);
  }
});

Then(/^I can see a process is running in the document$/, async function() {
  const documentPage = await this.ui.browser.documentPage();
  // check info bar in the document is visible
  const infoBar = await documentPage.infoBar;
  await infoBar.waitForVisible();
  // assert that info bar displays a task is running
  const taskInfo = await documentPage.taskInfo;
  await taskInfo.waitForVisible();
  // assert that there's a button to process the task
  const processWorkflowButton = await documentPage.processWorkflowButton;
  await processWorkflowButton.waitForVisible();
  // assert that document info says a process is running
  const documentPageInfo = await documentPage.info;
  await documentPageInfo.waitForVisible();
  await documentPageInfo.$('[name="process"]').waitForVisible();
});

Then(/^I can see a process is not running in the document$/, async function() {
  const documentPage = await this.ui.browser.documentPage();
  // check info bar in the document is not visible
  const infoBar = await documentPage.infoBar;
  const infoBarVisible = await infoBar.isVisible();
  infoBarVisible.should.be.false;
});

Then(/^I cannot start a workflow$/, async function() {
  const button = await this.ui.browser.startWorkflowButton;
  const isButtonExisting = await button.isExisting();
  isButtonExisting.should.be.false;
});

Then(/^I can abandon the workflow$/, async function() {
  const documentPage = await this.ui.browser.documentPage();
  const abandonWorkflowButton = await documentPage.abandonWorkflowButton;
  await abandonWorkflowButton.waitForVisible();
  await abandonWorkflowButton.click();
  await driver.alertAccept();
  // check info bar in the document is not visible
  const infoBar = await documentPage.infoBar;
  await infoBar.waitForVisible(browser.options.waitforTimeout, true);
  // assert that info bar displays a task is running
  const taskInfo = await documentPage.taskInfo;
  await taskInfo.waitForVisible(browser.options.waitforTimeout, true);
  // assert that document info says a process is running
  const docPageInfo = await documentPage.info;
  await docPageInfo.waitForVisible();
  await docPageInfo.waitForVisible('[name="process"]', browser.options.waitforTimeout, true);

  // In order to avoid errors when performing the teardown
  await fixtures.workflows.removeInstance(this.workflowInstance.id);
});

Then(/^I can see the document is a publication$/, async function() {
  const infoBar = await this.ui.browser.publicationInfobar;
  await infoBar.waitForVisible();
});

Then(/^I can unpublish the document$/, async function() {
  const infoBar = await this.ui.browser.publicationInfobar;
  const unpublishButton = await infoBar.element('nuxeo-unpublish-button');
  await unpublishButton.waitForVisible();
  await unpublishButton.click();
  const unpublishConfirm = await unpublishButton.$('nuxeo-confirm-button #dialog paper-button[class="primary"]');
  await unpublishConfirm.waitForVisible();
  await unpublishConfirm.click();
});

Then('I can see {int} validation error(s) in the {string} edit form', async function(nbErrors, docType) {
  const browser = await this.ui.browser;
  const form = await browser.editForm(docType);
  await form.waitForVisible();
  await driver.waitUntil(
    async () => {
      await driver.pause(1000);
      const errorMessages = await form.errorMessages;
      return errorMessages.length === nbErrors;
    },
    {
      timeout: 5000,
      timeoutMsg: `Expecting to get ${nbErrors} results but found ${form.errorMessages.length}`,
    },
  );
});

Then('I can see the {string} error message in the {string} edit form', async function(message, docType) {
  const { browser } = await this.ui;
  try {
    const form = await browser.editForm(docType);
    await form.waitForVisible();
    const errorMessages = await form.errorMessages;
    const hasErrorMessage = errorMessages.some((err) => err === message);
    if (!hasErrorMessage) {
      throw new Error(`Expecting to find '${message}' error message but not found`);
    }
  } catch (error) {
    console.error(error.message);
  }
});

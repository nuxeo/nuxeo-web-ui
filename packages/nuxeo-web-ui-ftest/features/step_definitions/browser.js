/* eslint-disable no-await-in-loop */
import { Then, When } from '../../node_modules/@cucumber/cucumber';

Then('I can see the {word} tree', async function(tab) {
  const drawer = await this.ui.drawer;
  await drawer._section(tab);
  const isVisible = await drawer.waitForVisible();
  isVisible.should.be.true;
});

Then('I can see the {string} {word} tree node', async function(title, tab) {
  const drawer = await this.ui.drawer;
  const sectionTab = await drawer._section(tab);
  await sectionTab.waitForVisible();
  driver.pause(10000);
  await sectionTab.$$('.content a');

  await driver.waitUntil(
    async () => {
      const sectionText = await sectionTab.$$('.content a').map((elem) => elem.getText());
      const someSectionText = sectionText.some((e) => e === title);
      return someSectionText;
    },
    {
      timeout: 10000,
      timeoutMsg: 'expecteed 1 text to be differeent after 5s',
    },
  );
});

Then('I can navigate to {word} pill', async function(pill) {
  await this.ui.browser.waitForVisible();
  const ele = await this.ui.browser.el.$(`nuxeo-page-item[name='${pill.toLowerCase()}']`);
  await ele.waitForVisible();
  await ele.click();
  await this.ui.browser.waitForVisible(`#nxContent [name='${pill.toLowerCase()}']`);
});

Then('I cannot see to {word} pill', async function(pill) {
  await this.ui.browser.waitForVisible();
  const outElement = await this.ui.browser.waitForNotVisible(`nuxeo-page-item[name='${pill.toLowerCase()}']`);
  outElement.should.be.true;
});

Then('I am on the {word} pill', function(pill) {
  this.ui.browser.waitForVisible();
  this.ui.browser.currentPageName.should.equal(pill);
});

When('I click {string} in the {word} tree', async function(title, tab) {
  const drawer = await this.ui.drawer;
  const sectionTab = await drawer._section(tab);
  await sectionTab.waitForVisible();
  driver.pause(10000);
  const sectionText = await sectionTab.$$('.content a').map((element) => element.getText());
  await driver.waitUntil(async () => sectionText.some((e) => e === title), {
    timeout: 10000,
    timeoutMsg: 'expected text to be different after 5s',
  });
  const el = await sectionTab.$$('.content a');
  const index = sectionText.findIndex((e) => e === title);
  await el[index].waitForVisible();
  await el[index].click();
});

Then('I can see the {string} document', async function(title) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const browserTitle = await browser.hasTitle(title);
  browserTitle.should.be.true;
});

Then('I select all child documents', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectAllChildDocuments();
});

Then('I select all the documents', async function() {
  await this.ui.browser.waitForVisible();
  const ele = await this.ui.browser;
  await ele.selectAllDocuments();
});

Then('I deselect the {string} document', function(title) {
  this.ui.browser.waitForVisible();
  this.ui.browser.deselectChildDocument(title);
});

Then('I select the {string} document', async function(title) {
  await this.ui.browser.waitForVisible();
  await this.ui.browser.selectChildDocument(title);
});

Then('I can see the selection toolbar', async function() {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const toolbar = await browser.selectionToolbar;
  await toolbar.waitForVisible();
});

When('I cannot see the display selection link', function() {
  this.ui.browser.selectionToolbar.waitForNotVisible('.selectionLink').should.be.true;
});

Then('I can add selection to the {string} collection', function(collectionName) {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.addToCollectionDialog.addToCollection(collectionName);
});

Then('I can add selection to clipboard', async function() {
  const browser = await this.ui.browser;
  browser.waitForVisible();
  const toolbar = await browser.selectionToolbar;
  await toolbar.addToClipboard();
});

Then('I can move selection down', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.moveDown();
});

Then('I can move selection up', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.moveUp();
});

Then('I can see the {string} child document is at position {int}', async function(title, pos) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const childIndex = await browser.indexOfChild(title);
  await driver.waitUntil(async () => childIndex === pos - 1, {
    timeout: 10000,
    timeoutMsg: 'expected 4774 text to be different after 5s',
  });
});

When('I sort the content by {string} in {string} order', async function(field, order) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  await browser.sortContent(field, order);
});

Then('I can see {int} document(s)', function(numberOfResults) {
  const { results } = this.ui.browser;
  results.waitForVisible();

  const { displayMode } = results;
  driver.waitUntil(() => results.resultsCount(displayMode) === numberOfResults, {
    timeout: 10000,
    timeoutMsg: 'expected 5 text to be different after 5s',
  });
});

Then(/^I can see the permissions page$/, async function() {
  await this.ui.browser.permissionsView.waitForVisible();
});

Then(/^I can see the document has (\d+) publications$/, async function(nbPublications) {
  const count = await this.ui.browser.publicationView.count;
  if ((await count) !== nbPublications) {
    throw new Error(`Expected count to be equal ${nbPublications}`);
  }
});

Then(/^I can see the document has the following publication$/, async function(table) {
  const rows = table.rows();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const publication = await this.ui.browser.publicationView;
    const isRowPresent = await publication.hasPublication(row[0], row[1], row[2]);
    await isRowPresent.should.be.true;
  }
});

Then(/^I can republish the following publication$/, async function(table) {
  const rows = table.hashes();
  for (let i = 0; i < rows.length; i++) {
    const { path, rendition, version } = rows[i];
    let pubRow = await this.ui.browser.publicationView.getPublicationRow(path, rendition);
    if (!pubRow) {
      return false;
    }
    const ele = await pubRow.$('nuxeo-data-table-cell .version').getText();
    const previousVersion = parseFloat(ele.trim().toLowerCase());
    await this.ui.browser.publicationView.republish(path, rendition, version);
    pubRow = await this.ui.browser.publicationView.getPublicationRow(path, rendition);
    const eleNew = await pubRow.$('nuxeo-data-table-cell .version').getText();
    const newVersion = parseFloat(eleNew.trim().toLowerCase());
    if (Number.isNaN(newVersion)) {
      throw Error('Failed to republish the document');
    }
    return newVersion > previousVersion;
  }
});

Then('I can publish selection to {string}', async function(target) {
  await this.ui.browser.waitForVisible();
  const selectionToolBar = await this.ui.browser.selectionToolbar;
  const dialog = await selectionToolBar.publishDialog;
  await dialog.publish(target);
  // HACK because publishing all documents is asynchronous
  await driver.pause(1000);
});

Then(/^I can perform the following publications$/, async function(table) {
  let page = this.ui.browser.documentPage(this.doc.type);
  await page.waitForVisible();
  let pubCount = await page.publicationsCount;
  pubCount.should.not.be.NaN;
  const rows = table.hashes();
  for (let i = 0; i < rows.length; i++) {
    const { target, rendition, version, override } = rows[i];
    const dialog = await this.ui.browser.publishDialog;
    await dialog.publish(target, rendition, version, override);
    page = await this.ui.browser.documentPage(this.doc.type);
    const newCount = await page.publicationsCount;
    let check;
    const bar = await page.isVisible('#versionInfoBar');
    if (bar) {
      check = newCount === 0;
    } else {
      check = override ? newCount === 1 : newCount > pubCount;
    }
    if (check) {
      pubCount = page.publicationsCount;
    }
  }
});

Then('I can delete all the documents from the {string} collection', function(name) {
  this.ui.browser.removeSelectionFromCollection(name);
  // HACK - because the delete all is async
  driver.pause(1000);
});

Then('I can see the browser title as {string}', async (title) => {
  driver.pause(3000);
  await driver.waitUntil(
    async () => {
      const browserTitle = await browser.getTitle();
      return title === browserTitle;
    },
    {
      timeout: 10000,
      timeoutMsg: 'expected 10 text to be different after 5s',
    },
  );
});

/* eslint-disable no-await-in-loop */
// eslint-disable-next-line import/no-extraneous-dependencies
import { Then, When } from '@cucumber/cucumber';

Then('I can see the {word} tree', async function (tab) {
  const drawer = await this.ui.drawer;
  await drawer._section(tab);
  const isVisible = await drawer.waitForVisible();
  isVisible.should.be.true;
});

Then('I can see the {string} {word} tree node', async function (title, tab) {
  const drawer = await this.ui.drawer;
  const sectionTab = await drawer._section(tab);
  await sectionTab.waitForVisible();
  await sectionTab.$$('.content a');
  await driver.pause(2000);
  const sectionTexts = await sectionTab.$$('.content a').map((elem) => elem.getText());
  for (let i = 0; i < sectionTexts.length; i++) {
    const sectionText = await sectionTexts[i];
    if (sectionText === title) {
      return true;
    }
  }
  throw new Error(`Expected text to be ${title} but not found`);
});

Then('I can navigate to {word} pill', async function (pill) {
  await driver.pause(1000);
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const ele = await browser.el.$(`nuxeo-page-item[name='${pill.toLowerCase()}']`);
  await ele.waitForVisible();
  await ele.click();
  await browser.waitForVisible(`#nxContent [name='${pill.toLowerCase()}']`);
  await driver.pause(1000);
});

Then('I cannot see to {word} pill', async function (pill) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const outElement = await browser.waitForNotVisible(`nuxeo-page-item[name='${pill.toLowerCase()}']`);
  outElement.should.be.true;
});

Then('I am on the {word} pill', async function (pill) {
  await this.ui.browser.waitForVisible();
  const currentPageEle = await this.ui.browser.currentPageName;
  currentPageEle.should.equal(pill);
});

When('I click {string} in the {word} tree', async function (title, tab) {
  const drawer = await this.ui.drawer;
  const sectionTab = await drawer._section(tab);
  await sectionTab.waitForVisible();
  await driver.pause(1000);
  const sectionText = await sectionTab.$$('.content a').map((element) => element.getText());
  const el = await sectionTab.elements('.content a');
  let index;
  for (let i = 0; i < sectionText.length; i++) {
    const item = sectionText[i];
    if (item === title) {
      index = i;
      break;
    }
  }
  if (index > -1) {
    const elEle = await el[index];
    await elEle.waitForVisible();
    await elEle.click();
  } else {
    throw new Error(`Expected title to be ${title} but not found`);
  }
});

Then('I can see the {string} document', async function (title) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const browserTitle = await browser.hasTitle(title);
  browserTitle.should.be.true;
});

Then('I select all child documents', async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  await browser.selectAllChildDocuments();
});

Then('I select all the documents', async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  await browser.selectAllDocuments();
});

Then('I deselect the {string} document', async function (title) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  await browser.deselectChildDocument(title);
});

Then('I select the {string} document', async function (title) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  await browser.selectChildDocument(title);
});

Then('I can see the selection toolbar', async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const toolbar = await browser.selectionToolbar;
  await toolbar.waitForVisible();
});

When('I cannot see the display selection link', async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const selectionToolbarElem = await browser.selectionToolbar;
  await driver.pause(1000);
  await selectionToolbarElem.waitForVisible();
  const selectionLinkVisible = await selectionToolbarElem.waitForNotVisible('.selectionLink');
  selectionLinkVisible.should.be.true;
});

Then('I can add selection to the {string} collection', async function (collectionName) {
  const browserEle = await this.ui.browser;
  await browserEle.waitForVisible();
  const selectionToolEle = await browserEle.selectionToolbar;
  const addToDialog = await selectionToolEle.addToCollectionDialog;
  await addToDialog.addToCollection(collectionName);
});

Then('I can add selection to clipboard', async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const toolbar = await browser.selectionToolbar;
  await toolbar.addToClipboard();
});

Then('I can move selection down', async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const selectionToolbar = await browser.selectionToolbar;
  await selectionToolbar.moveDown();
});

Then('I can move selection up', async function () {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const selectionToolbar = await browser.selectionToolbar;
  await selectionToolbar.moveUp();
});

Then('I can see the {string} child document is at position {int}', async function (title, pos) {
  await driver.pause(1000);
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const childIndex = await browser.indexOfChild(title);
  if (childIndex !== pos - 1) {
    throw new Error(`${title} child document not present at expected position`);
  }
});

When('I sort the content by {string} in {string} order', async function (field, order) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  await browser.sortContent(field, order);
});

Then('I can see {int} document(s)', async function (numberOfResults) {
  const browser = await this.ui.browser;
  const uiResult = await browser.results;
  const displayMode = await uiResult.displayMode;
  const outResult = await uiResult.resultsCount(displayMode);
  if (outResult !== numberOfResults) {
    throw new Error(`Expecting to get ${numberOfResults} results but found ${outResult}`);
  }
});

Then(/^I can see the permissions page$/, async function () {
  await this.ui.browser.permissionsView.waitForVisible();
});

Then(/^I can see the document has (\d+) publications$/, async function (nbPublications) {
  const browser = await this.ui.browser;
  const count = await browser.publicationView.count;
  if ((await count) !== nbPublications) {
    throw new Error(`Expected count to be equal ${nbPublications}`);
  }
});

Then(/^I can see the document has the following publication$/, async function (table) {
  const rows = await table.rows();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const browser = await this.ui.browser;
    const publication = await browser.publicationView;
    const isRowPresent = await publication.hasPublication(row[0], row[1], row[2]);
    await isRowPresent.should.be.true;
  }
});

Then(/^I can republish the following publication$/, async function (table) {
  const rows = table.hashes();
  for (let i = 0; i < rows.length; i++) {
    const { path, rendition, version } = rows[i];
    let pubRow = await this.ui.browser.publicationView.getPublicationRow(path, rendition);
    if (!pubRow) {
      return false;
    }
    const ele = await pubRow.$('nuxeo-data-table-cell .version').getText();
    const previousVersion = parseFloat(ele.trim().toLowerCase());
    const browser = await this.ui.browser;
    const publicationView = await browser.publicationView;
    await publicationView.republish(path, rendition, version);
    pubRow = await publicationView.getPublicationRow(path, rendition);
    const eleNew = await pubRow.$('nuxeo-data-table-cell .version').getText();
    const newVersion = parseFloat(eleNew.trim().toLowerCase());
    if (Number.isNaN(newVersion)) {
      throw new Error('Failed to republish the document');
    }
    return newVersion > previousVersion;
  }
});

Then('I can publish selection to {string}', async function (target) {
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const selectionToolBar = await browser.selectionToolbar;
  const dialog = await selectionToolBar.publishDialog;
  await dialog.publish(target);
  // HACK because publishing all documents is asynchronous
  await driver.pause(1000);
});

Then(/^I can perform the following publications$/, async function (table) {
  console.log('tabletabletabletabletable', table)
  const browser = await this.ui.browser;
  await browser.waitForVisible();
  const page = await browser.documentPage(this.doc.type);
  await page.waitForVisible();
  let pubCount = await page.publicationsCount;
  pubCount.should.not.be.NaN;
  const rows = table.hashes();
  for (let i = 0; i < rows.length; i++) {
    const { target, rendition, version, override } = rows[i];
    const dialog = await browser.publishDialog;
    const isdocumentPublished = await dialog.publish(target, rendition, version, override);
    console.log('isdocumentPublishedisdocumentPublishedisdocumentPublished', isdocumentPublished)
    isdocumentPublished.should.be.true;
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

Then('I can delete all the documents from the {string} collection', async function (name) {
  const browser = await this.ui.browser;
  await browser.removeSelectionFromCollection(name);
  // HACK - because the delete all is async
  await driver.pause(1000);
});

Then('I can see the browser title as {string}', async (title) => {
  await driver.pause(1000);
  const browserTitle = await browser.getTitle();
  if (title !== browserTitle) {
    throw new Error(`Expected text to be ${title} but not found`);
  }
});

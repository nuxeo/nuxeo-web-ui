import { Then, When } from '@cucumber/cucumber';

Then('I can see the {word} tree', async function(tab) {
  const isVisible = await this.ui.drawer._section(tab).waitForVisible();
  if (!isVisible) {
    throw new Error(`Expected ${tab} tree to be visible`);
  }
});

Then('I can see the {string} {word} tree node', async function(title, tab) {
  await this.ui.drawer._section(tab).waitForVisible();
  let found = false;
  while (!found) {
    const elements = await this.ui.drawer._section(tab).$$('.content a');
    for (const element of elements) {
      const text = await element.getText();
      if (text === title) {
        found = true;
        break;
      }
    }
  }
});

Then('I can navigate to {word} pill', function(pill) {
  this.ui.browser.waitForVisible();
  const el = this.ui.browser.el.element(`nuxeo-page-item[name='${pill.toLowerCase()}']`);
  el.waitForVisible();
  el.click();
  this.ui.browser.waitForVisible(`#nxContent [name='${pill.toLowerCase()}']`);
});

Then('I cannot see to {word} pill', function(pill) {
  this.ui.browser.waitForVisible();
  this.ui.browser.waitForNotVisible(`nuxeo-page-item[name='${pill.toLowerCase()}']`).should.be.true;
});

Then('I am on the {word} pill', function(pill) {
  this.ui.browser.waitForVisible();
  this.ui.browser.currentPageName.should.equal(pill);
});

When('I click {string} in the {word} tree', async function(title, tab) {
  const section = this.ui.drawer._section(tab);
  await section.waitForVisible();
  let found = false;
  while (!found) {
    const elements = await section.$$('.content a');
    for (const element of elements) {
      const text = await element.getText();
      console.log(text);
      if (text === title) {
        found = true;
        await element.click();
        break;
      }
    }
  }
});

Then('I can see the {string} document', async function(title) {
  await this.ui.browser.waitForVisible();
  const isVisible = await this.ui.browser.hasTitle(title).waitForVisible();
  if (!isVisible) {
    throw new Error(`Expected document to be visible`);
  }
});

Then('I select all child documents', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectAllChildDocuments();
});

Then('I select all the documents', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectAllDocuments();
});

Then('I deselect the {string} document', function(title) {
  this.ui.browser.waitForVisible();
  this.ui.browser.deselectChildDocument(title);
});

Then('I select the {string} document', function(title) {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectChildDocument(title);
});

Then('I can see the selection toolbar', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.waitForVisible();
});

When('I cannot see the display selection link', function() {
  this.ui.browser.selectionToolbar.waitForNotVisible('.selectionLink').should.be.true;
});

Then('I can add selection to the {string} collection', function(collectionName) {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.addToCollectionDialog.addToCollection(collectionName);
});

Then('I can add selection to clipboard', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.addToClipboard();
});

Then('I can move selection down', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.moveDown();
});

Then('I can move selection up', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.moveUp();
});

Then('I can see the {string} child document is at position {int}', function(title, pos) {
  this.ui.browser.waitForVisible();
  driver.waitUntil(() => this.ui.browser.indexOfChild(title) === pos - 1);
});

When('I sort the content by {string} in {string} order', function(field, order) {
  this.ui.browser.waitForVisible();
  this.ui.browser.sortContent(field, order);
});

Then('I can see {int} document(s)', function(numberOfResults) {
  const { results } = this.ui.browser;
  results.waitForVisible();

  const { displayMode } = results;
  driver.waitUntil(() => results.resultsCount(displayMode) === numberOfResults);
});

Then(/^I can see the permissions page$/, function() {
  this.ui.browser.permissionsView.waitForVisible();
});

Then(/^I can see the document has (\d+) publications$/, function(nbPublications) {
  driver.waitUntil(() => this.ui.browser.publicationView.count === nbPublications);
});

Then(/^I can see the document has the following publication$/, function(table) {
  table.rows().forEach((row) => {
    this.ui.browser.publicationView.hasPublication(row[0], row[1], row[2]).should.be.true;
  });
});

Then(/^I can republish the following publication$/, function(table) {
  table.hashes().forEach((row) => {
    const { path, rendition, version } = row;
    // XXX we need to store the current version of the publication to check against the updated version after republish
    let previousVersion;
    driver.waitUntil(() => {
      const pubRow = this.ui.browser.publicationView.getPublicationRow(path, rendition);
      if (!pubRow) {
        return false;
      }
      previousVersion = parseFloat(
        pubRow
          .getText('nuxeo-data-table-cell .version')
          .trim()
          .toLowerCase(),
      );
      return !Number.isNaN(previousVersion);
    });
    this.ui.browser.publicationView.republish(path, rendition, version);
    // XXX we need to wait for the new version to be greater than the previous one, otherwise we can have the steps
    // executed after this one operating over an outdated list of publications
    driver.waitUntil(() => {
      try {
        const pubRow = this.ui.browser.publicationView.getPublicationRow(path, rendition);
        if (!pubRow) {
          return false;
        }
        const newVersion = parseFloat(
          pubRow
            .getText('nuxeo-data-table-cell .version')
            .trim()
            .toLowerCase(),
        );
        if (Number.isNaN(newVersion)) {
          return false;
        }
        return newVersion > previousVersion;
      } catch (e) {
        return false;
      }
    });
  });
});

Then('I can publish selection to {string}', function(target) {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.publishDialog.publish(target);
  // HACK because publishing all documents is asynchronous
  driver.pause(1000);
});

Then(/^I can perform the following publications$/, function(table) {
  let page = this.ui.browser.documentPage(this.doc.type);
  page.waitForVisible();
  let pubCount = page.publicationsCount;
  pubCount.should.not.be.NaN;
  table.hashes().forEach((row) => {
    const { target, rendition, version, override } = row;
    this.ui.browser.publishDialog.publish(target, rendition, version, override);
    // XXX We need to wait for the document to be updated after publishing, but this might take a while. If we don't
    // do it, the next step can ve triggered before the view is updated, which can lead to an unexpected state. A way
    // to achieve this is to wait for the number of publications to be updated on the document info panel.
    driver.waitUntil(() => {
      try {
        page = this.ui.browser.documentPage(this.doc.type);
        const newCount = page.publicationsCount;
        let check;
        // XXX if we pick a version that's not the latest, we no longer see the number of publications, and the versions
        // bar will be displayed instead
        if (page.isVisible('#versionInfoBar')) {
          check = newCount === 0;
        } else {
          // XXX the problem might not be solved if we're only overriding one publication
          check = override ? newCount === 1 : newCount > pubCount;
        }
        if (check) {
          pubCount = page.publicationsCount;
          return true;
        }
      } catch (e) {
        return false;
      }
    });
  });
});

Then('I can delete all the documents from the {string} collection', function(name) {
  this.ui.browser.removeSelectionFromCollection(name);
  // HACK - because the delete all is async
  driver.pause(1000);
});

Then('I can see the browser title as {string}', async function(title) {
  await driver.waitUntil(async () => title === await browser.getTitle());
});

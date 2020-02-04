import { Then, When } from 'cucumber';

Then('I can see the {word} tree', function(tab) {
  this.ui.drawer._section(tab).waitForVisible().should.be.true;
});

Then('I can see the {string} {word} tree node', function(title, tab) {
  this.ui.drawer._section(tab).waitForVisible();
  this.ui.drawer
    ._section(tab)
    .elementByTextContent('.content a', title)
    .waitForVisible();
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

When('I click {string} in the {word} tree', function(title, tab) {
  const section = this.ui.drawer._section(tab);
  section.waitForVisible();
  section.waitForVisible('.content a');
  const el = section.elementByTextContent('.content a', title);
  el.waitForVisible();
  el.click();
});

Then('I can see the {string} document', function(title) {
  this.ui.browser.waitForVisible();
  this.ui.browser.hasTitle(title).should.be.true;
});

Then('I select all child documents', function() {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectAllChildDocuments();
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

Then('I can see the {string} child document is at position "{int}"', function(title, pos) {
  this.ui.browser.waitForVisible();
  this.ui.browser.indexOfChild(title).should.equals(pos - 1);
});

When('I sort the content by {string} in {string} order', function(field, order) {
  this.ui.browser.waitForVisible();
  this.ui.browser.sortContent(field, order);
});

Then('I can see {int} document(s)', function(numberOfResults) {
  const results = this.ui.browser.currentPageResults;
  results.waitForVisible();
  const { displayMode } = results;
  results.getResults(displayMode).waitForVisible();
  results.resultsCount(displayMode).should.equal(numberOfResults);
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
  table.rows().forEach((row) => {
    this.ui.browser.publicationView.republish(row[0], row[1], row[2]);
  });
});

Then('I can publish selection to {string}', function(target) {
  this.ui.browser.waitForVisible();
  this.ui.browser.selectionToolbar.publishDialog.publish(target);
});

Then(/^I can perform the following publications$/, function(table) {
  table.rows().forEach((row) => {
    this.ui.browser.publishDialog.publish(row[0], row[1], row[2], row[3]);
  });
});

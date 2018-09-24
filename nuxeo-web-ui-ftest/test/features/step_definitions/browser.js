'use strict';

module.exports = function () {
  this.Then('I can see the $tab tree', (tab) => this.ui.drawer._section(tab).waitForVisible().should.be.true);

  this.Then('I can see the "$title" $tab tree node', (title, tab) => {
    this.ui.drawer._section(tab).waitForVisible();
    this.ui.drawer._section(tab).elementByTextContent(`.content a`, title).waitForVisible();
  });

  this.Then(/^I can navigate to (.*) pill$/, (pill) => {
    this.ui.browser.waitForVisible();
    const el = this.ui.browser.el.element(`nuxeo-page-item[name='${pill.toLowerCase()}']`);
    el.waitForVisible();
    el.click();
  });

  this.When('I click "$title" in the $tab tree', (title, tab) => {
    const section = this.ui.drawer._section(tab);
    section.waitForVisible();
    section.waitForVisible(`.content a`);
    const el = section.elementByTextContent(`.content a`, title);
    el.waitForVisible();
    el.click();
  });

  this.Then('I can see the "$title" document', (title) => {
    this.ui.browser.waitForVisible();
    this.ui.browser.hasTitle(title).should.be.true;
  });

  this.Then('I select all child documents', () => {
    this.ui.browser.waitForVisible();
    this.ui.browser.selectAllChildDocuments();
  });

  this.Then('I deselect the "$title" document', (title) => {
    this.ui.browser.waitForVisible();
    this.ui.browser.deselectChildDocument(title);
  });

  this.Then('I select the "$title" document', (title) => {
    this.ui.browser.waitForVisible();
    this.ui.browser.selectChildDocument(title);
  });

  this.Then('I can see the selection toolbar', () => {
    this.ui.browser.waitForVisible();
    this.ui.browser.selectionToolbar.waitForVisible();
  });

  this.Then('I can add selection to clipboard', () => {
    this.ui.browser.selectionToolbar.addToClipboard();
  });

  this.Then('I can move selection down', () => {
    this.ui.browser.selectionToolbar.moveDown();
  });

  this.Then('I can move selection up', () => {
    this.ui.browser.selectionToolbar.moveUp();
  });

  this.Then('I can see the "$title" child document is at position "$pos"', (title, pos) => {
    this.ui.browser.indexOfChild(title).should.equals(parseInt(pos) - 1);
  });

  this.Then(/^I can see (\d+) documents$/, (numberOfResults) => {
    const results = this.ui.browser.currentPageResults;
    results.waitForVisible();
    const displayMode = results.displayMode;
    results.getResults(displayMode).waitForVisible();
    results.resultsCount(displayMode).toString().should.equal(numberOfResults);
  });

  this.Then(/^I can see the permissions page$/, () => this.ui.browser.permissionsView.waitForVisible());
};

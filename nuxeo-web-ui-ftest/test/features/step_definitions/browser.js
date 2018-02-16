'use strict';

module.exports = function () {
  this.Then('I can see the $tab tree', (tab) => this.ui.drawer._section(tab).waitForVisible().should.be.true);

  this.Then('I can see the "$title" $tab tree node', (title, tab) => {
    this.ui.drawer._section(tab).waitForVisible();
    this.ui.drawer._section(tab).elementByTextContent(`.content a`, title).waitForVisible();
  });

  this.When('I click "$title" in the $tab tree', (title, tab) => {
    this.ui.drawer._section(tab).waitForVisible();
    const el = this.ui.drawer._section(tab).elementByTextContent(`.content a`, title);
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
};

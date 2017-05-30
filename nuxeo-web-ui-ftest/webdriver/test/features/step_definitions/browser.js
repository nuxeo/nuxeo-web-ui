'use strict';

module.exports = function () {
  this.Then('I can see the $tab tree', (tab) => this.ui.drawer._section(tab).waitForVisible().should.be.true);

  this.Then('I can see the "$title" $tab tree node', (title, tab) =>
      this.ui.drawer._section(tab).element(`///nuxeo-tree-node//a[text()="${title}"]`).waitForVisible());

  this.When('I click "$title" in the $tab tree', (title, tab) => {
    this.ui.drawer._section(tab)
        .element(`///nuxeo-tree-node//a[text()="${title}"]|//*[@id="navTree"]//span[text()="${title}"]`)
        .waitForVisible();
    this.ui.drawer._section(tab)
        .click(`///nuxeo-tree-node//a[text()="${title}"]|//*[@id="navTree"]//span[text()="${title}"]`);
  });

  this.Then('I can see the "$title" document', (title) => {
    this.ui.browser.waitForVisible();
    this.ui.browser.hasTitle(title).should.be.true;
  });
};

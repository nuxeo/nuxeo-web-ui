'use strict';

module.exports = function () {
  this.Then('I can see the tree', () => this.ui.drawer.browser.isVisible().should.be.true);

  this.When('I click "$title" in the $tab tree', (title, tab) => {
    this.ui.drawer._section(tab).click('///nuxeo-tree-node//a[text()="' + title + '"]');
    driver.waitUntil(() => this.ui.browser.title === title, 5000);
  });

  this.Then('I can see the "$title" document content', (title) => {
    this.ui.browser.documentContent.table.isVisible().should.be.true;
    this.ui.browser.title.should.equal(title);
  });
};

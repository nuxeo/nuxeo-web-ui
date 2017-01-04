'use strict';

module.exports = function () {
  this.Then('I can see the $tab tree', (tab) => {
    this.ui.drawer._section(tab).isVisible().should.be.true;
  });

  this.Then('I can see the "$title" $tab tree node', (title, tab) => {
    this.ui.drawer._section(tab).element('///nuxeo-tree-node//a[text()="' + title + '"]').isVisible().should.be.true;
  });

  this.When('I click "$title" in the $tab tree', (title, tab) => {
    this.ui.drawer._section(tab).click('///nuxeo-tree-node//a[text()="' + title + '"]');
  });

  this.Then('I can see the "$title" document', (title) => {
    this.ui.browser.title.should.equal(title);
  });
};

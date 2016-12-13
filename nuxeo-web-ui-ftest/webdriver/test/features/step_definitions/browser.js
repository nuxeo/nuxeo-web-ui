'use strict';

import DocumentTree from '../../pages/ui/tree';

module.exports = function () {
  this.Then('I can see the $tab tree', (tab) => {
    this.ui.drawer._section(tab).isVisible().should.be.true;
  });

  this.Then('I can see the "$title" $tab tree node', (title, tab) => {
    this.ui.drawer._section(tab).element('///nuxeo-tree-node//a[text()="' + title + '"]').isVisible().should.be.true;
  });

  this.When('I click "$title" in the $tab tree', (title, tab) => {
    this.ui.drawer._section(tab).click('///nuxeo-tree-node//a[text()="' + title + '"]');
    this.ui.browser.title.should.equal(title);
  });

  this.Then('I can see the "$title" document content', (title) => {
    this.ui.browser.documentContent.table.isVisible().should.be.true;
    this.ui.browser.title.should.equal(title);
  });
};

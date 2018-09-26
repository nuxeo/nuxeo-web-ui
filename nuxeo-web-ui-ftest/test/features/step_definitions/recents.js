'use strict';

module.exports = function () {
  this.Then('I can see the list of recently viewed documents', () => {
    this.ui.drawer.recents.waitForVisible().should.be.true;
  });

  this.Then('I can see the list of recently viewed documents has "$nb" items', (nb) => {
    this.ui.drawer.recents.waitForVisible();
    this.ui.drawer.recents.nbItems.should.be.equals(parseInt(nb));
  });

  this.Then('I can see the list of recently viewed documents has "$title" document', (title) => {
    this.ui.drawer.recents.waitForVisible();
    this.ui.drawer.recents.el.hasElementByTextContent('#recentDocumentsList .list-item-title', title).should.be.true;
  });
};

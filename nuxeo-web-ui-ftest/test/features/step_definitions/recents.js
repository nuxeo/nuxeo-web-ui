const {
  Then,
} = require('cucumber');

Then('I can see the list of recently viewed documents', function () {
  this.ui.drawer.recents.waitForVisible().should.be.true;
});

Then('I can see the list of recently viewed documents has {int} item(s)', function (nb) {
  this.ui.drawer.recents.waitForVisible();
  this.ui.drawer.recents.nbItems.should.be.equals(parseInt(nb));
});

Then('I can see the list of recently viewed documents has {string} document', function (title) {
  this.ui.drawer.recents.waitForVisible();
  this.ui.drawer.recents.el.hasElementByTextContent('#recentDocumentsList .list-item-title', title).should.be.true;
});

const {
  Given,
  Then,
  When,
} = require('cucumber');

When('I click remove button for {string} document', function (title) {
  this.ui.drawer.clipboard.waitForVisible();
  this.ui.drawer.clipboard.removeItem(title);
});

When('I click the clipboard move action', function () {
  if (!this.ui.drawer.clipboard.isVisible()) {
    this.ui.drawer.open('clipboard');
  }
  this.ui.waitForToastNotVisible();
  this.ui.drawer.clipboard.move();
});

When('I click the clipboard paste action', function () {
  if (!this.ui.drawer.clipboard.isVisible()) {
    this.ui.drawer.open('clipboard');
  }
  this.ui.waitForToastNotVisible();
  this.ui.drawer.clipboard.paste();
});

Then('I can see the clipboard has {string} document', function (title) {
  this.ui.drawer.clipboard.waitForVisible();
  driver.waitUntil(() => this.ui.drawer.clipboard.el.hasElementByTextContent('#list .list-item-title', title));
});
Then('I can see the clipboard has {int} item(s)', function (nb) {
  this.ui.drawer.clipboard.waitForVisible();
  driver.waitUntil(() => this.ui.drawer.clipboard.nbItems === nb);
});

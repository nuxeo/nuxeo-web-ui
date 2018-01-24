'use strict';

module.exports = function () {
  this.Then('I can see the clipboard has "$nb" items', (nb) => {
    this.ui.drawer.clipboard.waitForVisible();
    this.ui.drawer.clipboard.nbItems.should.be.equals(parseInt(nb));
  });
  this.When('I click the clipboard move action', () => {
    if (!this.ui.drawer.clipboard.isVisible()) {
      this.ui.drawer.open('clipboard');
    }
    this.ui.waitForToastNotVisible();
    this.ui.drawer.clipboard.move();
  });
  this.When('I click the clipboard paste action', () => {
    if (!this.ui.drawer.clipboard.isVisible()) {
      this.ui.drawer.open('clipboard');
    }
    this.ui.waitForToastNotVisible();
    this.ui.drawer.clipboard.paste();
  });
};

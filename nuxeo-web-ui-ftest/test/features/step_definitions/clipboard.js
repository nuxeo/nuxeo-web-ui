'use strict';

module.exports = function () {

  this.When('I click remove button for "$title" document', (title) => {
    this.ui.drawer.clipboard.waitForVisible();
    this.ui.drawer.clipboard.removeItem(title);
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

  this.Then('I can see the clipboard has "$title" document', (title) => {
    this.ui.drawer.clipboard.waitForVisible();
    driver.waitUntil(() => this.ui.drawer.clipboard.el.hasElementByTextContent('#list .list-item-title', title));
  });
  this.Then('I can see the clipboard has "$nb" items', (nb) => {
    this.ui.drawer.clipboard.waitForVisible();
    driver.waitUntil(() => this.ui.drawer.clipboard.nbItems === parseInt(nb));
  });
};

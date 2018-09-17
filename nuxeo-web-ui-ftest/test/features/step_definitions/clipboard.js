'use strict';

module.exports = function () {
  this.Given(/^I have a clean clipboard$/, () => {
    fixtures.documents.clearLocalStorage(this.username, 'nuxeo-clipboard');
  });

  this.Given(/^I have document with path "(.+)" on clipboard$/, (path) => {
    fixtures.documents.addToLocalStorage(path, this.username, 'nuxeo-clipboard')
        .then(() => this.ui.drawer.clipboard.reload());
  });

  this.Given(/^I have the following documents on clipboard$/, (table) => {
    const promises = [];
    table.rows().map((row) => {
      promises.push(fixtures.documents.addToLocalStorage(row[0], this.username, 'nuxeo-clipboard'));
    });
    return Promise.all(promises).then(() => this.ui.drawer.clipboard.reload());
  });

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

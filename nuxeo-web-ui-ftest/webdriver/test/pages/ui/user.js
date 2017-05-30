'use strict';

export default class User {

  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    return driver.element(this._selector);
  }

  get page() {
    return driver.element(this._selector);
  }

  getField(field, opts) {
    opts = opts || {};
    const parent = opts.parent || '';
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    if (field === 'password' || field === 'passwordConfirmation') {
      return this.el.element(`${parent}[id="${field}"]`);
    } else {
      return this.el.element(`${parent}[name="${field}"]`);
    }
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }

  get dropdown() {
    return this.page.element('#menu.nuxeo-user-group-management');
  }

  get userItem() {
    return this.page.element(`paper-icon-item[name="user"]`);
  }

  get createUserForm() {
    return this.page.element(`#form.nuxeo-create-user`);
  }

  get createUserDialog() {
    return { parent: '#form.nuxeo-create-user ' };
  }

  get createUserButton() {
    return this.page.element(`#createButton.nuxeo-create-user`);
  }

  get editUserButton() {
    return this.page.element(`#editUserButton`);
  }

  get editUserDialog() {
    return { parent: '#editUserDialog ' };
  }

  get editUserDialogButton() {
    return this.page.element(`#editUserDialog paper-button`);
  }

  get deleteUserButton() {
    return this.page.element('#deleteUserButton');
  }

  get confirmDeleteUserButton() {
    return this.page.element('#deleteUserDialog paper-button');
  }

  fillMultipleValues(table, opts) {
    opts = opts || {};
    const parent = opts.parent || '';
    table.rows().forEach((row) => {
      if (row[0] === 'username') {
        global.users[row[1]] = row[1];
        this.page.element('paper-toggle-button[name="password-toggle"]').click();
      }
      const fieldEl = this.getField(row[0], { parent });
      return fixtures.layouts.setValue(fieldEl, row[1]);
    });
  }

  searchFor(searchTerm) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    const searchBox = this.el.element('paper-input.nuxeo-user-group-search');
    searchBox.waitForVisible();
    return fixtures.layouts.setValue(searchBox, searchTerm);
  }

  searchResult(searchTerm) {
    return this.page.element(`///paper-card[contains(@class, "nuxeo-user-group-search")]//*[text()="${searchTerm}"]`);
  }
}

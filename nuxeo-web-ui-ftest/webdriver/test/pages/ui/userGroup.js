'use strict';

export default class UserGroup {

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
    let parent = opts.parent || '';
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

  get userButton() {
    return this.page.element('#createButton.nuxeo-user-group-management');
  }

  get createUserButton() {
    return this.page.element('#createButton.nuxeo-create-user');
  }

  get editUserButton() {
    return this.page.element('#editUserButton');
  }

  get editUserDialog() {
    return { parent: '#editUserDialog ' };
  }

  get editUserDialogButton() {
    return this.page.element('#editUserDialog paper-button');
  }

  get dropdown() {
    return this.page.element('#menu.nuxeo-user-group-management');
  }

  get deleteUserButton() {
    return this.page.element('#deleteUserButton');
  }

  get confirmDeleteUserButton() {
    return this.page.element('#deleteUserDialog paper-button');
  }

  searchResult(searchTerm) {
    return this.page.element(`///paper-card[contains(@class, "nuxeo-user-group-search")]//*[text()="${searchTerm}"]`);
  }

  item(userOrGroup) {
    return this.page.element(`paper-icon-item[name="${userOrGroup}"]`);
  }

  form(userOrGroup) {
    return this.page.element(`#form.nuxeo-create-${userOrGroup}`);
  }

  fillMultipleValues(table, opts) {
    opts = opts || {};
    let parent = opts.parent || '';
    let currentUsername;
    table.rows().forEach((row) => {
      if (row[0] === 'username') {
        currentUsername = row[1];
      }
      const fieldEl = this.getField(row[0], { parent: parent});
      return fixtures.layouts.setValue(fieldEl, row[1]);
    });
    global.users[currentUsername] = currentUsername;
  }

  searchFor(searchTerm) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    const searchBox = this.el.element('paper-input.nuxeo-user-group-search');
    return fixtures.layouts.setValue(searchBox, searchTerm);
  }

  setPassword() {
    return this.page.element('paper-toggle-button[name="password-toggle"]');
  }



}

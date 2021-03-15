import BasePage from '../base';

export default class User extends BasePage {
  getField(field, opts) {
    opts = opts || {};
    const parent = opts.parent || '';
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    this.el.waitForVisible(parent);
    if (field === 'password' || field === 'passwordConfirmation') {
      return this.el.element(`${parent} [id="${field}"]`);
    }
    return this.el.element(`${parent} [name="${field}"]`);
  }

  get dropdown() {
    return this.el.element('#menu');
  }

  get userItem() {
    return this.el.element('paper-icon-item[name="user"]');
  }

  get createUserForm() {
    return this.el.element('nuxeo-create-user #form');
  }

  get createUserDialog() {
    return { parent: 'nuxeo-create-user #form' };
  }

  get createUserButton() {
    return this.el.element('nuxeo-create-user #createButton');
  }

  get editUserButton() {
    return this.el.element('#editUserButton');
  }

  get editUserDialog() {
    return { parent: '#editUserDialog ' };
  }

  get editUserDialogButton() {
    return this.el.element('#editUserDialog paper-button');
  }

  get deleteUserButton() {
    return this.el.element('#deleteUserButton');
  }

  get confirmDeleteUserButton() {
    return this.el.element('#deleteUserDialog paper-button');
  }

  fillMultipleValues(table, opts) {
    opts = opts || {};
    const parent = opts.parent || '';
    table.rows().forEach((row) => {
      if (row[0] === 'username') {
        // eslint-disable-next-line prefer-destructuring
        global.users[row[1]] = row[1];
        this.el.element('paper-toggle-button[name="password-toggle"]').waitForVisible();
        this.el.element('paper-toggle-button[name="password-toggle"]').click();
      }
      const fieldEl = this.getField(row[0], { parent });
      fieldEl.waitForVisible();
      return fixtures.layouts.setValue(fieldEl, row[1]);
    });
  }

  searchFor(searchTerm) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    const searchBox = this.el.element('nuxeo-user-group-search nuxeo-input');
    searchBox.waitForVisible();
    return fixtures.layouts.setValue(searchBox, searchTerm);
  }

  searchResult(searchTerm) {
    this.el.waitForExist('nuxeo-card[name="users"] .table [name="id"]');
    return this.el.elements('nuxeo-card[name="users"] .table [name="id"]').find((e) => e.getText() === searchTerm);
  }
}

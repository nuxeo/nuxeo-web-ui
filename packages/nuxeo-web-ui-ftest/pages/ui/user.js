/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class User extends BasePage {
  async getField(field, opts) {
    opts = opts || {};
    const parent = opts.parent || '';
    await driver.waitForExist(this._selector);
    await driver.waitForVisible(this._selector);
    await this.el.waitForVisible(parent);
    if (field === 'password' || field === 'passwordConfirmation') {
      const fieldEle = await this.el.element(`${parent} [id="${field}"]`);
      return fieldEle;
    }
    const finalEle = await this.el.element(`${parent} [name="${field}"]`);
    return finalEle;
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

  async fillMultipleValues(table, opts) {
    opts = opts || {};
    const parent = opts.parent || '';
    const rows = table.rows();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === 'username') {
        /* eslint-disable prefer-destructuring */
        global.users[row[1]] = row[1];
        const toggleEle = await this.el.element('paper-toggle-button[name="password-toggle"]');
        await toggleEle.waitForVisible();
        await toggleEle.click();
      }
      const fieldEl = await this.getField(row[0], { parent });
      await fieldEl.waitForVisible();
      await fixtures.layouts.setValue(fieldEl, row[1]);
    }
  }

  async searchFor(searchTerm) {
    await driver.waitForExist(this._selector);
    await driver.waitForVisible(this._selector);
    const searchBox = await this.el.element('nuxeo-user-group-search nuxeo-input');
    await searchBox.waitForVisible();
    const finaleEle = await fixtures.layouts.setValue(searchBox, searchTerm);
    return finaleEle;
  }

  async searchResult(searchTerm) {
    const ele = await this.el;
    await driver.pause(1000);
    const results = await ele.elements('nuxeo-card[name="users"] .table [name="id"]');
    const match = await results.find(async (e) => (await e.getText()) === searchTerm);
    return match;
  }
}

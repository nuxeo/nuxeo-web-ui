import BasePage from '../base';

export default class Group extends BasePage {
  getField(field) {
    driver.waitForExist(this._selector);
    $(this._selector).waitForVisible();
    return this.el.element(`[id="${field}"]`);
  }

  get dropdown() {
    return this.el.element('#menu');
  }

  get groupItem() {
    return this.el.element('paper-icon-item[name="group"]');
  }

  get createGroupForm() {
    return this.el.element('nuxeo-create-group #form');
  }

  get createGroupButton() {
    return this.el.element('nuxeo-create-group #createButton');
  }

  get editGroupButton() {
    return this.el.element('#editGroupButton');
  }

  get editGroupLabel() {
    return this.el.element('#editGroupDialog input');
  }

  get editGroupDialogButton() {
    return this.el.element('#editGroupDialog paper-button.primary');
  }

  get deleteGroupButton() {
    return this.el.element('#deleteGroupButton');
  }

  get confirmDeleteGroupButton() {
    return this.el.element('#deleteGroupDialog paper-button');
  }

  fillMultipleValues(table) {
    table.rows().forEach((row) => {
      if (row[0] === 'groupName') {
        // eslint-disable-next-line prefer-destructuring
        global.groups[row[1]] = row[1];
      }
      const fieldEl = this.getField(row[0]);
      fieldEl.waitForVisible();
      return fixtures.layouts.setValue(fieldEl, row[1]);
    });
  }

  searchFor(searchTerm) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    const searchBox = this.el.element('nuxeo-user-group-search paper-input');
    searchBox.waitForVisible();
    return fixtures.layouts.setValue(searchBox, searchTerm);
  }

  searchResult(searchTerm) {
    this.el.waitForExist('nuxeo-card[name="groups"] .table [name="id"]');
    return this.el.elements('nuxeo-card[name="groups"] .table [name="id"]').find((e) => e.getText() === searchTerm);
  }
}

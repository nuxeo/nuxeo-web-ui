'use strict';

export default class Group {

  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    return driver.element(this._selector);
  }

  get page() {
    return driver.element(this._selector);
  }

  getField(field) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    return this.el.element(`[id="${field}"]`);
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }

  get dropdown() {
    return this.page.element('#menu.nuxeo-user-group-management');
  }

  get groupItem() {
    return this.page.element(`paper-icon-item[name="group"]`);
  }

  get createGroupForm() {
    return this.page.element(`#form.nuxeo-create-group`);
  }

  get createGroupButton() {
    return this.page.element(`#createButton.nuxeo-create-group`);
  }

  get editGroupButton() {
    return this.page.element(`#editGroupButton`);
  }

  get editGroupLabel() {
    return this.page.element('#editGroupDialog input');
  }

  get editGroupDialogButton() {
    return this.page.element(`#editGroupDialog paper-button`);
  }

  get deleteGroupButton() {
    return this.page.element('#deleteGroupButton');
  }

  get confirmDeleteGroupButton() {
    return this.page.element('#deleteGroupDialog paper-button');
  }

  fillMultipleValues(table) {
    table.rows().forEach((row) => {
      if (row[0] === 'groupName') {
        global.groups[row[1]] = row[1];
      }
      const fieldEl = this.getField(row[0]);
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

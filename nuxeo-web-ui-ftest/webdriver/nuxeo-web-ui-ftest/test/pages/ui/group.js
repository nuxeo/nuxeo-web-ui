'use strict';

import BasePage from '../base';

export default class Group extends BasePage {

  getField(field) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    return this.el.element(`[id="${field}"]`);
  }

  get dropdown() {
    return this.el.element('#menu.nuxeo-user-group-management');
  }

  get groupItem() {
    return this.el.element(`paper-icon-item[name="group"]`);
  }

  get createGroupForm() {
    return this.el.element(`#form.nuxeo-create-group`);
  }

  get createGroupButton() {
    return this.el.element(`#createButton.nuxeo-create-group`);
  }

  get editGroupButton() {
    return this.el.element(`#editGroupButton`);
  }

  get editGroupLabel() {
    return this.el.element('#editGroupDialog input');
  }

  get editGroupDialogButton() {
    return this.el.element(`#editGroupDialog paper-button`);
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
    return this.el.element(`///paper-card[contains(@class, "nuxeo-user-group-search")]//*[text()="${searchTerm}"]`);
  }
}

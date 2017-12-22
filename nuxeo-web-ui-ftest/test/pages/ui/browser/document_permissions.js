'use strict';

export default class DocumentPermissions {

  constructor(selector) {
    this._selector = selector;
  }

  get el() {
    return driver.element(this._selector);
  }

  get page() {
    return driver.element(this._selector);
  }

  get newPermissionButton() {
    return this.page.element('#localPermissions #newPermissionButton');
  }

  get createPermissionButton() {
    return this.page.element('#createPermissionButton');
  }

  get editPermissionButton() {
    return this.page.element('nuxeo-popup-permission paper-icon-button[icon="nuxeo:edit"]');
  }

  get updatePermissionButton() {
    return this.page.element('nuxeo-document-acl-table #popupRight paper-button.primary');
  }

  get timeFrameButton() {
    return this.page.element('paper-radio-button #radioContainer');
  }

  permission(permission, name, timeFrame) {
    return driver.waitUntil(() => {
      const rows = this.page.elements(`div.acl-table-row`).value;
      return rows.find((row) => {
        const nameCheck = name ? row.isExisting(`span.user[title="${name}"]`) : true;
        const permissionCheck = permission ? !!row.hasElementByTextContent('span.label', permission) : true;
        // XXX should rely on a class or column header name
        const timeFrameCheck = timeFrame ? !!row.hasElementByTextContent('span', permission)  : true;
        return nameCheck && permissionCheck && timeFrameCheck;
      });
    });
  }

  getField(field) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    if (field === 'begin' || field === 'end') {
      return this.el.element(`[id="${field}"]`);
    } else {
      return this.el.element(`[name="${field}"]`);
    }
  }

  getEditField(field) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    if (field === 'begin' || field === 'end') {
      return this.el.element(`nuxeo-document-acl-table nuxeo-popup-permission [id="${field}"]`);
    } else {
      return this.el.element(`nuxeo-document-acl-table nuxeo-popup-permission [name="${field}"]`);
    }
  }

  setFieldValue(field, value) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  editFieldValue(field, value) {
    const fieldEl = this.getEditField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  setPermissions(name, opts) {
    opts = opts || {};
    const permission = opts.permission || '';
    const timeFrame = opts.timeFrame || '';
    const begin = opts.begin || '';
    const end = opts.end || '';
    const notify = opts.notify;
    if (name) {
      this.setFieldValue('userGroup', name);
    }
    this.setFieldValue('right', permission);
    this.timeFrameButton.click();
    if (timeFrame === 'datebased') {
      this.setFieldValue('begin', begin);
      if (end) {
        this.setFieldValue('end', end);
      }
    }
    this.setFieldValue('notify', notify);
  }

  editPermissions(opts) {
    opts = opts || {};
    const permission = opts.permission || '';
    const timeFrame = opts.timeFrame || '';
    const begin = opts.begin || '';
    const end = opts.end || '';
    const notify = opts.notify;
    this.editFieldValue('right', permission);
    this.editFieldValue(timeFrame, timeFrame);
    if (timeFrame === 'datebased') {
      this.editFieldValue('begin', begin);
      if (end) {
        this.editFieldValue('end', end);
      }
    }
    this.editFieldValue('notify', notify);
  }

  waitForVisible() {
    return this.page.waitForVisible();
  }
}

import BasePage from '../../base';

export default class DocumentPermissions extends BasePage {
  get newPermissionButton() {
    return this.el.element('#localPermissions #newPermissionButton');
  }

  get createPermissionButton() {
    return this.el.element('#createPermissionButton');
  }

  get editPermissionButton() {
    return this.el.element('nuxeo-popup-permission paper-icon-button[icon="nuxeo:edit"]');
  }

  get updatePermissionButton() {
    return this.el.element('nuxeo-document-acl-table #popupRight paper-button.primary');
  }

  get timeFrameButton() {
    return this.el.element('paper-radio-button #radioContainer');
  }

  permission(permission, name, timeFrame) {
    return driver.waitUntil(() => {
      const rows = this.el.elements('div.acl-table-row');
      return rows.find((row) => {
        const nameCheck = name ? row.isExisting(`span.user[title="${name} - ${name}@test.com"]`) : true;
        const permissionCheck = permission
          ? !!row.elements('span.label').some((e) => e.getText() === permission)
          : true;
        // XXX should rely on a class or column header name
        const timeFrameCheck = timeFrame ? !!row.elements('span').some((e) => e.getText() === permission) : true;
        return nameCheck && permissionCheck && timeFrameCheck;
      });
    });
  }

  getField(field) {
    this.el.waitForVisible();
    if (field === 'begin' || field === 'end') {
      return this.el.element(`[id="${field}"]`);
    }
    return this.el.element(`[name="${field}"]`);
  }

  getEditField(field) {
    this.el.waitForVisible();
    if (field === 'begin' || field === 'end') {
      return this.el.element(`nuxeo-document-acl-table nuxeo-popup-permission [id="${field}"]`);
    }
    return this.el.element(`nuxeo-document-acl-table nuxeo-popup-permission [name="${field}"]`);
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
    const { notify } = opts;
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
    const { notify } = opts;
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
    return this.el.waitForVisible();
  }
}

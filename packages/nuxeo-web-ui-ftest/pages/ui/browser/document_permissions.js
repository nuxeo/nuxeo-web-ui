/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

export default class DocumentPermissions extends BasePage {
  get newPermissionButton() {
    return (async () => {
      const ele = await this.el;
      return ele.element('#localPermissions #newPermissionButton');
    })();
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
    return (async () => {
      const ele = await this.el;
      return ele.element('paper-radio-button #radioContainer');
    })();
  }

  async permission(permission, name, timeFrame) {
    const ele = await this.el;
    const rows = await ele.elements('div.acl-table-row');
    for (let i = 0; i < rows.length; i++) {
      const nameCheck = name ? await rows[i].isExisting(`span.user[title="${name} - ${name}@test.com"]`) : true;
      const permissionCheck = permission ? await !!rows[i].hasElementByTextContent('span.label', permission) : true;
      // XXX should rely on a class or column header name
      const timeFrameCheck = timeFrame ? await !!rows[i].hasElementByTextContent('span', permission) : true;
      return nameCheck && permissionCheck && timeFrameCheck;
    }
    return false;
  }

  async getField(field) {
    const ele = await this.el;
    await ele.waitForVisible();
    if (field === 'begin' || field === 'end') {
      return ele.element(`[id="${field}"]`);
    }
    return ele.element(`[name="${field}"]`);
  }

  getEditField(field) {
    this.el.waitForVisible();
    if (field === 'begin' || field === 'end') {
      return this.el.element(`nuxeo-document-acl-table nuxeo-popup-permission [id="${field}"]`);
    }
    return this.el.element(`nuxeo-document-acl-table nuxeo-popup-permission [name="${field}"]`);
  }

  async setFieldValue(field, value) {
    const fieldEl = await this.getField(field);
    await fieldEl.waitForVisible();
    const ret = await fixtures.layouts.setValue(fieldEl, value);
    return ret;
  }

  editFieldValue(field, value) {
    const fieldEl = this.getEditField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  async setPermissions(name, opts) {
    opts = opts || {};
    const permission = opts.permission || '';
    const timeFrame = opts.timeFrame || '';
    const begin = opts.begin || '';
    const end = opts.end || '';
    const { notify } = opts;
    if (name) {
      await this.setFieldValue('userGroup', name);
    }
    await this.setFieldValue('right', permission);
    const timeButton = await this.timeFrameButton;
    await timeButton.click();
    if (timeFrame === 'datebased') {
      await this.setFieldValue('begin', begin);
      if (end) {
        await this.setFieldValue('end', end);
      }
    }
    await this.setFieldValue('notify', notify);
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

/* eslint-disable no-await-in-loop */
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
    return (async () => {
      const ele = await this.el;
      return ele.element('paper-radio-button #radioContainer');
    })();
  }

  async hasElement(selector, textContent, currentElement) {
    const ele = await currentElement.elements(selector);
    let found = false;
    for (let i = 0; i < ele.length; i++) {
      const text = await ele[i].getText();
      if (text === textContent) {
        found = true;
      }
    }
    return found;
  }

  async permission(permission, name, timeFrame) {
    let found;
    const rows = await this.el.elements('div.acl-table-row');
    for (let i = 0; i < rows.length; i++) {
      const nameEle = await rows[i].isExisting(`span.user[title="${name} - ${name}@test.com"]`);
      const nameCheck = name ? nameEle : true;
      const contentEle = await this.hasElement('span.label', permission, rows[i]);
      const permissionCheck = permission ? await !!contentEle : true;
      // XXX should rely on a class or column header name
      const timeFrameEle = await this.hasElement('span', permission, rows[i]);
      const timeFrameCheck = timeFrame ? !!timeFrameEle : true;
      if (nameCheck && permissionCheck && timeFrameCheck) {
        found = rows[i];
        break;
      }
    }
    return found;
  }

  async getField(field) {
    const ele = await this.el;
    await ele.waitForVisible();
    if (field === 'begin' || field === 'end') {
      return ele.element(`[id="${field}"]`);
    }
    return ele.element(`[name="${field}"]`);
  }

  async getEditField(field) {
    const ele = await this.el;
    await ele.waitForVisible();
    if (field === 'begin' || field === 'end') {
      return ele.element(`nuxeo-document-acl-table nuxeo-popup-permission [id="${field}"]`);
    }
    return ele.element(`nuxeo-document-acl-table nuxeo-popup-permission [name="${field}"]`);
  }

  async setFieldValue(field, value) {
    const fieldEl = await this.getField(field);
    await fieldEl.waitForVisible();
    const finalSet = await fixtures.layouts.setValue(fieldEl, value);
    return finalSet;
  }

  async editFieldValue(field, value) {
    const fieldEl = await this.getEditField(field);
    await fieldEl.waitForVisible();
    const finalGet = await fixtures.layouts.setValue(fieldEl, value);
    return finalGet;
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

  async editPermissions(opts) {
    opts = opts || {};
    const permission = opts.permission || '';
    const timeFrame = opts.timeFrame || '';
    const begin = opts.begin || '';
    const end = opts.end || '';
    const { notify } = opts;
    await this.editFieldValue('right', permission);
    await this.editFieldValue(timeFrame, timeFrame);
    if (timeFrame === 'datebased') {
      await this.editFieldValue('begin', begin);
      if (end) {
        await this.editFieldValue('end', end);
      }
    }
    await this.editFieldValue('notify', notify);
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}

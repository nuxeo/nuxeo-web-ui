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
    await driver.pause(1000);
    const elements = await currentElement.elements(selector);
    let found = false;
    for (let i = 0; i < elements.length; i++) {
      const ele = await elements[i];
      const text = await ele.getText();
      if (text === textContent) {
        found = true;
      }
    }
    return found;
  }

  async permission(permission, name, timeFrame) {
    let found;
    await driver.pause(1000);
    const rows = await this.el.elements('div.acl-table-row');
    for (let i = 0; i < rows.length; i++) {
      const row = await rows[i];
      const nameEle = await row.isExisting(`span.user[title="${name} - ${name}@test.com"]`);
      const nameCheck = name ? await nameEle : true;
      const contentEle = await this.hasElement('span.label', permission, row);
      const permissionCheck = permission ? await !!contentEle : true;
      // XXX should rely on a class or column header name
      const timeFrameEle = await this.hasElement('span', permission, row);
      const timeFrameCheck = timeFrame ? await !!timeFrameEle : true;
      if (nameCheck && permissionCheck && timeFrameCheck) {
        found = row;
        break;
      }
    }
    return found;
  }

  async getField(field) {
    const ele = await this.el;
    await ele.waitForVisible();
    if (field === 'begin' || field === 'end') {
      const idElement = await ele.element(`[id="${field}"]`);
       return idElement;
    }
    const nameElement = await ele.element(`[name="${field}"]`);
    return nameElement;
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
    console.log('inside set permission 1')
    opts = opts || {};
    const permission = opts.permission || '';
    const timeFrame = opts.timeFrame || '';
    const begin = opts.begin || '';
    const end = opts.end || '';
    const { notify } = opts;
    if (name) {
      console.log('inside set permission 8')
      await this.setFieldValue('userGroup', name);
      console.log('inside set permission 2')
    }
    await this.setFieldValue('right', permission);
    console.log('inside set permission 3')
    const timeButton = await this.timeFrameButton;
    console.log('inside set permission 4', timeButton)
    await timeButton.click();
    console.log('inside set permission 5')
    if (timeFrame === 'datebased') {
      await this.setFieldValue('begin', begin);
      console.log('inside set permission 6')
      if (end) {
        await this.setFieldValue('end', end);
      }
    }
    await this.setFieldValue('notify', notify);
    console.log('inside set permission 7')
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

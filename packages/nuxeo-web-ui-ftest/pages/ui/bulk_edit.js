/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import BasePage from '../base';

export default class BulkEdit extends BasePage {
  get editDocumentsButton() {
    return this.el;
  }

  get dialog() {
    return this.el.element('#dialog');
  }

  get cancelButton() {
    return this.el.element('.actions :first-child');
  }

  get saveButton() {
    return this.el.element('.actions #save');
  }

  getField(field) {
    return this.el.$(`[name="${field}"]`);
  }

  getFieldValue(field) {
    const fieldEl = this.getField(field);
    return fixtures.layouts.getValue(fieldEl);
  }

  setFieldValue(field, value) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  async editMultipleOptions(table) {
    for (const row of table.rows()) {
      const [fieldName, fieldValue, action] = row;
      const fieldEl = await this.getField(fieldName);
      await fieldEl.waitForVisible();
      const bulkEditOption = await this.getBulkEditOptions(fieldName);
      await bulkEditOption.scrollIntoView();
      if (action === 'remove') {
        await bulkEditOption.click();
        const emptyField = await this.bulkEditOptionsList(fieldName, 'Empty value(s)');
        emptyField.click();
      } else if (action === 'addValues') {
        await bulkEditOption.click();
        const addValueField = await this.bulkEditOptionsList(fieldName, 'Add value(s)');
        await addValueField.click();
        await fixtures.layouts.setValue(fieldEl, fieldValue);
      } else if (action === 'replace') {
        await fixtures.layouts.setValue(fieldEl, fieldValue);
      }
    }
  }

  async getBulkEditOptions(field) {
    const filedElem = await this.el.element(`[name="${field}"]`);
    let bulkWidget = await filedElem.parentElement();
    // some elements generated in Studio are wrapped in divs
    const bulkWidgetTag = await bulkWidget.getTagName();
    if (bulkWidgetTag !== 'nuxeo-bulk-widget') {
      bulkWidget = await bulkWidget.parentElement();
    }
    const bulkWidgetSelect = await bulkWidget.$('nuxeo-select');
    return bulkWidgetSelect;
  }

  async bulkEditOptionsList(fieldName, editOption) {
    await driver.waitUntil(
      async () => {
        const els = await driver.elements(`${this._selector} nuxeo-bulk-widget nuxeo-select paper-item`);
        return els.length > 1;
      },
      {
        timeout: 3000,
        timeoutMsg: 'expected bulkEditOptionsList text to be different after 5s',
      },
    );
    const fieldNameElem = await this.el.element(`[name="${fieldName}"]`);
    const parentElem = await fieldNameElem.parentElement();
    const listItems = await parentElem.elements('nuxeo-select paper-item');
    let foundElem;
    for (const elem of listItems) {
      const currentElementText = await elem.getText();

      if (currentElementText === editOption) {
        foundElem = elem;
      }
    }
    // await foundElem.setAttribute('aria-selected', true);
    return foundElem;
  }
}

/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class BulkEdit extends BasePage {
  get editDocumentsButton() {
    return this.el;
  }

  get dialog() {
    return (async () => {
      const ele = await this.el.element('#dialog');
      return ele;
    })();
  }

  get cancelButton() {
    return this.el.element('.actions :first-child');
  }

  get saveButton() {
    return (async () => {
      const ele = await this.el.element('.actions #save');
      return ele;
    })();
  }

  async getField(field) {
    const ele = await this.el;
    const result = await ele.$(`[name="${field}"]`);
    return result;
  }

  async getFieldValue(field) {
    const fieldEl = await this.getField(field);
    const finalFieldEle = await fixtures.layouts.getValue(fieldEl);
    return finalFieldEle;
  }

  async setFieldValue(field, value) {
    const fieldEl = await this.getField(field);
    await fieldEl.waitForVisible();
    const result = await fixtures.layouts.setValue(fieldEl, value);
    return result;
  }

  async editMultipleOptions(table) {
    const rows = table.rows();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const [fieldName, fieldValue, action] = row;
      const fieldEl = await this.getField(fieldName);
      await fieldEl.waitForVisible();
      const bulkEditOption = await this.getBulkEditOptions(fieldName);
      await bulkEditOption.scrollIntoView();
      if (action === 'remove') {
        await bulkEditOption.click();
        const emptyField = await this.bulkEditOptionsList(fieldName, 'Empty value(s)');
        await emptyField.click();
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
    const fieldEle = await this.el.element(`[name="${field}"]`);
    let bulkWidget = await fieldEle.parentElement();
    // some elements generated in Studio are wrapped in divs
    const bulkWidgetTag = await bulkWidget.getTagName();
    if (bulkWidgetTag !== 'nuxeo-bulk-widget') {
      bulkWidget = await bulkWidget.parentElement();
    }
    const bulkWidgetSelect = await bulkWidget.$('nuxeo-select');
    return bulkWidgetSelect;
  }

  async bulkEditOptionsList(fieldName, editOption) {
    const ele = await driver.elements(`${this._selector} nuxeo-bulk-widget nuxeo-select paper-item`);
    if (ele.length > 1) {
      const fieldNameElem = await this.el.element(`[name="${fieldName}"]`);
      const parentElem = await fieldNameElem.parentElement();
      const listItems = await parentElem.elements('nuxeo-select paper-item');
      let foundElem;
      for (let index = 0; index < listItems.length; index++) {
        const elem = listItems[index];
        const currentElementText = await elem.getText();
        if (currentElementText === editOption) {
          foundElem = elem;
        }
      }
      return foundElem;
    }
    return false;
  }
}

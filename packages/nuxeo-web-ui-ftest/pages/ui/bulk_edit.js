import BasePage from '../base';

export default class BulkEdit extends BasePage {
  get editDocumentsButton() {
    return this.el;
  }

  get dialog() {
    return (async () => {
      const dialog = await this.el.element('#dialog');
      return dialog;
    })();
  }

  get cancelButton() {
    return this.el.element('.actions :first-child');
  }

  get saveButton() {
    return this.el.element('.actions #save');
  }

  getField(field) {
    return (async () => {
      const fieldElem = await this.el.$(`[name="${field}"]`);
      return fieldElem;
    })();
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
    table.rows().forEach(async (row) => {
      const [fieldName, fieldValue, action] = row;
      const fieldEl = await this.getField(fieldName);
      await fieldEl.waitForVisible();
      const bulkEditOption = await this.getBulkEditOptions(fieldName);
      await bulkEditOption.scrollIntoView();
      if (action === 'remove') {
        await bulkEditOption.click();
        this.bulkEditOptionsList(fieldName, 'Empty value(s)').click();
      } else if (action === 'addValues') {
        await bulkEditOption.click();
        this.bulkEditOptionsList(fieldName, 'Add value(s)').click();
        fixtures.layouts.setValue(fieldEl, fieldValue);
      } else if (action === 'replace') {
        fixtures.layouts.setValue(fieldEl, fieldValue);
      }
    });
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

    return listItems.find((e) => e.getText() === editOption);
  }
}

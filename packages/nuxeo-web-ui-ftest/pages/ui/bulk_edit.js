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

  editMultipleOptions(table) {
    table.rows().forEach((row) => {
      const [fieldName, fieldValue, action] = row;
      const fieldEl = this.getField(fieldName);
      fieldEl.waitForVisible();
      if (action === 'remove') {
        this.getBulkEditOptions(fieldName).click();
        this.bulkEditOptionsList('Remove value(s)').click();
      } else if (action === 'replace') {
        fixtures.layouts.setValue(fieldEl, fieldValue);
      }
    });
  }

  getBulkEditOptions(field) {
    const bulkWidget = this.el.element(`nuxeo-directory-suggestion[name="${field}"]`).parentElement();
    return bulkWidget.$('nuxeo-select');
  }

  bulkEditOptionsList(editOption) {
    driver.waitUntil(() => {
      const els = driver.elements(`${this._selector} nuxeo-bulk-widget nuxeo-select paper-item`);
      return els.length > 1;
    });
    return this.el.elements('nuxeo-bulk-widget nuxeo-select paper-item').find((e) => e.getText() === editOption);
  }
}

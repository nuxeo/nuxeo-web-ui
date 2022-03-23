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
      this.getBulkEditOptions(fieldName).scrollIntoView();
      if (action === 'remove') {
        this.getBulkEditOptions(fieldName).click();
        this.bulkEditOptionsList(fieldName, 'Empty value(s)').click();
      } else if (action === 'addValues') {
        this.getBulkEditOptions(fieldName).click();
        this.bulkEditOptionsList(fieldName, 'Add value(s)').click();
        fixtures.layouts.setValue(fieldEl, fieldValue);
      } else if (action === 'replace') {
        fixtures.layouts.setValue(fieldEl, fieldValue);
      }
    });
  }

  getBulkEditOptions(field) {
    let bulkWidget = this.el.element(`[name="${field}"]`).parentElement();
    // some elements generated in Studio are wrapped in divs
    if (bulkWidget.getTagName() !== 'nuxeo-bulk-widget') {
      bulkWidget = bulkWidget.parentElement();
    }
    return bulkWidget.$('nuxeo-select');
  }

  bulkEditOptionsList(fieldName, editOption) {
    driver.waitUntil(() => {
      const els = driver.elements(`${this._selector} nuxeo-bulk-widget nuxeo-select paper-item`);
      return els.length > 1;
    });

    const listItems = this.el
      .element(`[name="${fieldName}"]`)
      .parentElement()
      .elements('nuxeo-select paper-item');
    return listItems.find((e) => e.getText() === editOption);
  }
}

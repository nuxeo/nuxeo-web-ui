import BasePage from '../../base';

export default class DocumentLayout extends BasePage {
  async getField(field) {
    driver.waitForExist(this._selector);
    const fieldElem = await this.el.$(`[name="${field}"]`);
    return fieldElem;
  }

  async getFieldValue(field) {
    const fieldEl = await this.getField(field);
    return fixtures.layouts.getValue(fieldEl);
  }

  setFieldValue(field, value) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  fillMultipleValues(table) {
    table.rows().forEach((row) => {
      const fieldName = row[0];
      const fieldEl = this.getField(fieldName);
      fieldEl.waitForVisible();
      fieldEl.scrollIntoView();
      return fixtures.layouts.setValue(fieldEl, row[1]);
    });
  }
}

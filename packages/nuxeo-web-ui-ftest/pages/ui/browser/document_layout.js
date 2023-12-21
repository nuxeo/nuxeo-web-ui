/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

export default class DocumentLayout extends BasePage {
  async getField(field) {
    driver.waitForExist(this._selector);
    const fieldEle = await this.el.$(`[name="${field}"]`);
    return fieldEle;
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

  async fillMultipleValues(table) {
    const rows = table.rows();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fieldName = row[0];
      const fieldEl = await this.getField(fieldName);
      await fieldEl.waitForVisible();
      await fieldEl.scrollIntoView();
      await fixtures.layouts.setValue(fieldEl, row[1]);
    }
  }
}

/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

export default class DocumentLayout extends BasePage {
  async getField(field) {
    await driver.waitForExist(this._selector);
    const ele = await this.el;
    const result = await ele.$(`[name="${field}"]`);
    return result;
  }

  getFieldValue(field) {
    const fieldEl = this.getField(field);
    return fixtures.layouts.getValue(fieldEl);
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
      const result = await fixtures.layouts.setValue(fieldEl, row[1]);
      return result;
    }
  }
}

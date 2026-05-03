/* eslint-disable no-await-in-loop */
import BasePage from '../../base.js';

export default class DocumentLayout extends BasePage {
  async getField(field) {
    let result;
    await driver.waitUntil(
      async () => {
        try {
          const ele = await $(this._selector);
          if (!(await ele.isExisting())) return false;
          // Use a combined selector to avoid calling $ on a potentially stale element
          // which causes WDIO v9 implicitWait to throw synchronously
          const child = await $(`${this._selector} [name="${field}"]`);
          if (!(await child.isExisting())) return false;
          result = child;
          return true;
        } catch (e) {
          return false;
        }
      },
      {
        timeout: 10000,
        interval: 500,
        timeoutMsg: `Layout "${this._selector}" or field "${field}" not found`,
      },
    );
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

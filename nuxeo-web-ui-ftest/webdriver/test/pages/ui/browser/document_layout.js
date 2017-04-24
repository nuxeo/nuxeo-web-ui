'use strict';

import BasePage from '../../base';

export default class DocumentLayout extends BasePage {
  getField(field) {
    driver.waitForExist(this._selector);
    driver.waitForVisible(this._selector);
    return this.el.element(`[name="${field}"]`);
  }

  getFieldValue(field) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.getValue(fieldEl);
  }

  setFieldValue(field, value) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  fillMultipleValues(table) {
    table.rows().forEach((row) => {
      const fieldEl = this.getField(row[0]);
      return fixtures.layouts.setValue(fieldEl, row[1]);
    });
  }
}

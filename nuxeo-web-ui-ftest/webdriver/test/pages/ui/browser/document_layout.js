'use strict';

import BasePage from '../base'

export default class DocumentLayout extends BasePage {

  getField(field) {
    let form = this.el;
    form.waitForVisible();
    return form.element(`[name="${field}"]`);
  }

  getFieldValue(field) {
    let fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.getValue(fieldEl);
  }

  setFieldValue(field, value) {
    let fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

}
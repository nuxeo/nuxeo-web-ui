'use strict';

export default class CreateDialog {

  constructor(selector) {
    this.dialog = driver.element(selector);
  }

  get isVisible() {
    return this.dialog.isVisible();
  }

  set docType(docType) {
    const dropdown = this.dialog.element('paper-dropdown-menu[label="Document type"]');
    dropdown.click();
    dropdown.waitForVisible('iron-dropdown');
    dropdown.click(`///paper-item[text()="${docType}"]`);
    const doctype = docType.toLowerCase();
    this.dialog.waitForVisible(`#form nuxeo-${doctype}-edit`);
  }

  form(docType) {
    const doctype = docType.toLowerCase();
    return this.dialog.element(`#form nuxeo-${doctype}-edit`);
  }
}

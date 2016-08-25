'use strict';

export default class CreateDialog {

  constructor(selector) {
    this.dialog = driver.element(selector);
  }

  get isVisible() {
    return this.dialog.isVisible();
  }

  get docType() {
    return this._docType;
  }

  set docType(docType) {
    this._docType = docType;
    this.dialog.click(`///paper-button[normalize-space(text())="${this.docType}"]`);
    this.form.waitForVisible(5000);
  }

  set title(title) {
    // XXX this.form.setValue('input[name="title"]', title)
    this.form.setValue(`input.nuxeo-${this.docType.toLowerCase()}-edit`, title);
  }

  get form() {
    return new DocumentEdit(this.dialog.element(`nuxeo-${this.docType.toLowerCase()}-edit`));
  }

  submit() {
    this.dialog.click('///paper-button[text()="Create"]');
  }
}

'use strict';

export default class EditDoc {

  constructor(selector) {
    this.dialog = driver.element(selector);
  }

  get isVisible() {
    return this.dialog.isVisible();
  }

  submit() {
    this.dialog.waitForVisible('paper-button.primary');
    this.dialog.element('paper-button.primary').click();
  }

  editTitle(docType) {
    const doctype = docType.toLowerCase();
    if (doctype === 'picture') {
      this.dialog.waitForVisible('input.nuxeo-file-edit', 2000);
      this.dialog.setValue('input.nuxeo-file-edit', `New_Test_${docType}`);
    } else {
    this.dialog.waitForVisible(`input.nuxeo-${doctype}-edit`, 2000);
    this.dialog.setValue(`input.nuxeo-${doctype}-edit`, `New_Test_${docType}`);
    }
  }

}

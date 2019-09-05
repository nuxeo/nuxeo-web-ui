import BasePage from '../base';

export default class EditDoc extends BasePage {
  submit() {
    this.el.waitForVisible('paper-button.primary');
    this.el.element('paper-button.primary').click();
  }

  editTitle(docType) {
    const doctype = docType.toLowerCase();
    if (doctype === 'picture') {
      this.el.waitForVisible('input.nuxeo-file-edit');
      this.el.setValue('input.nuxeo-file-edit', `New_Test_${docType}`);
    } else {
      this.el.waitForVisible(`input.nuxeo-${doctype}-edit`);
      this.el.setValue(`input.nuxeo-${doctype}-edit`, `New_Test_${docType}`);
    }
  }
}

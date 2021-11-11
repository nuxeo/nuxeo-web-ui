import BasePage from '../base';

export default class BulkEdit extends BasePage {
  get editDocumentsButton() {
    return this.el;
  }

  get bulkDefaultLayout() {
    return this.el.element('#dialog nuxeo-bulk-default-layout');
  }

  get dialog() {
    return this.el.element('#dialog');
  }

  get cancelButton() {
    return this.el.element('.actions :first-child');
  }

  get saveButton() {
    return this.el.element('.actions #save');
  }

  get toastNotification() {
    return this.el.element('mwc-snackbar');
  }

  getField(field) {
    return this.el.$(`[name="${field}"]`);
  }

  getFieldValue(field) {
    const fieldEl = this.getField(field);
    return fixtures.layouts.getValue(fieldEl);
  }

  setFieldValue(field, value) {
    const fieldEl = this.getField(field);
    fieldEl.waitForVisible();
    return fixtures.layouts.setValue(fieldEl, value);
  }

  clickEditDocumentsButton() {
    const el = this.editDocumentsButton;
    el.waitForVisible();
    el.click();
  }

  editMultipleOptions(table) {
    table.rows().forEach((row) => {
      const fieldName = row[0];
      const fieldEl = this.getField(fieldName);
      fieldEl.waitForVisible();
      fieldEl.scrollIntoView();
      return fixtures.layouts.setValue(fieldEl, row[1]);
    });
  }

  clickSaveButton() {
    const { saveButton } = this;
    saveButton.waitForVisible();
    saveButton.click();
  }
}

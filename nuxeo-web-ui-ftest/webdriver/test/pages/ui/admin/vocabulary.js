'use strict';

export default class Vocabulary {

  constructor(selector) {
    driver.waitForVisible(selector, 5000);
    this.page = driver.element(selector);
  }

  vocabulary(option) {
    const selection = option.toLowerCase();
    const dropdown = this.page.element('paper-dropdown-menu #menuButton');
    dropdown.click('#trigger');
    dropdown.waitForVisible('#dropdown');
    dropdown.click(`#dropdown #contentWrapper div paper-menu div paper-item[name="${selection}"]`);
  }

  get isAddNewEntryVisible() {
    driver.waitForVisible(`#addEntry`, 5000);
    return this.page.element(`#addEntry`).isVisible();
  }

  get isDialogVisible() {
    driver.waitForVisible(`#dialog`, 5000);
    return this.page.element(`#dialog`).isVisible();
  }

  addNewL10nEntry(id, label) {
    driver.waitForVisible(`#addEntry`, 5000);
    this.page.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`, 2000);
    this.page.element(`#dialog input[name="id"]`).setValue(id);
    this.page.element(`#dialog input[name="label"]`).setValue(label);
    this.page.click('#dialog paper-button[name="save"]');
  }

  get isVocabularyTableVisible() {
    driver.waitForVisible(`#table`, 5000);
    return this.page.element(`#table`).isVisible();
  }

  get entryCount() {
    var res = this.page.elements(`#table #items nuxeo-data-table-row`);
    if (res && res.value) {
      return res.value.length;
    } else {
      return 0;
    }
  }

  table() {
    driver.waitForVisible(`#table`, 5000);
    return this.page.element(`#table`);
  }

  get isVocabularyTableFilled() {
    return !this.page.getText(`#table #items nuxeo-data-table-row`).some((txt) => txt.trim().length === 0);
  }

}

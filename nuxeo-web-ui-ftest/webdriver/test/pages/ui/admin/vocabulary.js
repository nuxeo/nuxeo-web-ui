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
    var hasEmptyRow = true;
    var res = this.page.getText(`#table #items nuxeo-data-table-row`);
    hasEmptyRow = res.some(function(rowText) {
        return rowText.trim().length === 0;
    });
    return !hasEmptyRow;
  }

}

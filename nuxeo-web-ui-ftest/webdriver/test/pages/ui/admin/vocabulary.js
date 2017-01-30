'use strict';

export default class Vocabulary {

  constructor(selector) {
    driver.waitForVisible(selector);
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
    driver.waitForVisible(`#addEntry`);
    return this.page.element(`#addEntry`).isVisible();
  }

  get isDialogVisible() {
    driver.waitForVisible(`#dialog`);
    return this.page.element(`#dialog`).isVisible();
  }

  addNewEntry(id, label) {
    driver.waitForVisible(`#addEntry`);
    this.page.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`, 2000);
    this.page.element(`#dialog input[name="id"]`).setValue(id);
    this.page.element(`#dialog input[name="label"]`).setValue(label);
    this.page.click('#dialog paper-button[name="save"]');
  }

  addNewL10nEntry(id, label, parentIds) {
    driver.waitForVisible(`#addEntry`);
    this.page.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`, 2000);
    this.page.element(`#selectParent`).click();
    driver.waitForVisible(`#parentDialog`, 2000);
    for (let i = 0; i < parentIds.length - 1; i++) {
      this.page.click(`#parentDialog nuxeo-tree-node div[name="${parentIds[i].trim()}"] iron-icon`);
    }
    this.page.click(`#parentDialog nuxeo-tree-node div[name="${parentIds[parentIds.length - 1].trim()}"] a`);
    this.page.element(`#dialog input[name="id"]`).setValue(id);
    this.page.element(`#dialog input[name="label"]`).setValue(label);

    this.page.click('#dialog paper-button[name="save"]');
  }

  waitForHasEntry(id, reverse) {
    driver.waitUntil(() => {
      if (reverse) {
        return this.page.getText(`#table #items nuxeo-data-table-cell`).every((txt) => txt.trim() !== id);
      } else {
        return this.page.getText(`#table #items nuxeo-data-table-cell`).some((txt) => txt.trim() === id);
      }
    }, reverse ? `The vocabulary does have such entry` : `The vocabulary does not have such entry`);
    return true;
  }

  deleteEntry(index) {
    const selector = `#delete-button-${(index - 1)}`;
    this.page.element(selector).click();
    driver.alertAccept();
  }

  editEntry(index, label) {
    const selector = `#edit-button-${(index - 1)}`;
    this.page.element(selector).click();
    driver.waitForVisible(`#dialog`);
    this.page.element(`#dialog input[name="label"]`).setValue(label);
    this.page.click('#dialog paper-button[name="save"]');
  }

  get isVocabularyTableVisible() {
    driver.waitForVisible(`#table`);
    return this.page.element(`#table`).isVisible();
  }

  get entryCount() {
    const res = this.page.elements(`#table #items nuxeo-data-table-row`);
    if (res && res.value) {
      return res.value.length;
    } else {
      return 0;
    }
  }

  table() {
    driver.waitForVisible(`#table`);
    return this.page.element(`#table`);
  }

  get isVocabularyTableFilled() {
    return !this.page.getText(`#table #items nuxeo-data-table-row`).some((txt) => txt.trim().length === 0);
  }

  get hasEditDialog() {
    driver.waitForVisible(`#edit-button-0`);
    this.page.element(`#edit-button-0`).click();
    driver.waitForVisible(`#dialog`);
    const visibleLabels = driver.isVisible(`#dialog input[name="label"]`);
    let allFieldVisible = false;
    if (visibleLabels.length) {
      allFieldVisible = visibleLabels.every((el) => el);
    } else {
      allFieldVisible = visibleLabels;
    }
    allFieldVisible = allFieldVisible && driver.isVisible(`#dialog input[name="id"]`);
    this.page.element(`#dialog paper-button[name="cancel"]`).click();
    return allFieldVisible;
  }

  get hasCreateDialog() {
    driver.waitForVisible(`#addEntry`);
    this.page.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`);
    const visibleLabels = driver.isVisible(`#dialog input[name="label"]`);
    let allFieldVisible = false;
    if (visibleLabels.length) {
      allFieldVisible = visibleLabels.every((el) => el);
    } else {
      allFieldVisible = visibleLabels;
    }
    allFieldVisible = allFieldVisible && driver.isVisible(`#dialog input[name="id"]`);
    this.page.element(`#selectParent`).click();
    driver.waitForVisible(`#parentDialog nuxeo-tree-node:first-child`);
    this.page.element(`#parentDialog paper-button[name="close"]`).click();
    this.page.element(`#dialog paper-button[name="cancel"]`).click();
    return allFieldVisible;
  }

}

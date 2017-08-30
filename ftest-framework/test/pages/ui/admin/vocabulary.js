'use strict';

import BasePage from '../../base';

export default class Vocabulary extends BasePage {

  vocabulary(option) {
    const selection = option.toLowerCase();
    const dropdown = this.el.element('paper-dropdown-menu #menuButton');
    dropdown.waitForVisible('#trigger');
    dropdown.click('#trigger');
    const itemSelector = `#dropdown #contentWrapper div paper-menu div paper-item[name="${selection}"]`;
    dropdown.waitForVisible(itemSelector);
    dropdown.click(itemSelector);
  }

  get isAddNewEntryVisible() {
    driver.waitForVisible(`#addEntry`);
    return this.el.element(`#addEntry`).isVisible();
  }

  get isDialogVisible() {
    driver.waitForVisible(`#dialog`);
    return this.el.element(`#dialog`).isVisible();
  }

  addNewEntry(id, label) {
    driver.waitForVisible(`#addEntry`);
    this.el.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`, 2000);
    this.el.element(`#dialog input[name="id"]`).setValue(id);
    this.el.element(`#dialog input[name="label"]`).setValue(label);
    this.el.click('#dialog paper-button[name="save"]');
  }

  addNewL10nEntry(id, label, parentIds) {
    driver.waitForVisible(`#addEntry`);
    this.el.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`, 2000);
    this.el.element(`#selectParent`).click();
    driver.waitForVisible(`#parentDialog`, 2000);
    for (let i = 0; i < parentIds.length - 1; i++) {
      this.el.click(`#parentDialog nuxeo-tree-node div[name="${parentIds[i].trim()}"] iron-icon`);
    }
    this.el.click(`#parentDialog nuxeo-tree-node div[name="${parentIds[parentIds.length - 1].trim()}"] a`);
    this.el.element(`#dialog input[name="id"]`).setValue(id);
    this.el.element(`#dialog input[name="label"]`).setValue(label);

    this.el.click('#dialog paper-button[name="save"]');
  }

  waitForHasEntry(id, reverse) {
    const el = this.el;
    driver.waitForVisible(`#table #items`);
    driver.waitUntil(() => {
      const cells = el.elements(`#table #items nuxeo-data-table-cell`).value;
      if (reverse) {
        return cells.every((cell) => cell.getText().trim() !== id);
      } else {
        return cells.some((cell) => cell.getText().trim() === id);
      }
    }, reverse ? `The vocabulary does have such entry` : `The vocabulary does not have such entry`);
    return true;
  }

  deleteEntry(index) {
    const selector = `#delete-button-${(index - 1)}`;
    this.el.element(selector).click();
    driver.alertAccept();
  }

  editEntry(index, label) {
    const selector = `#edit-button-${(index - 1)}`;
    this.el.element(selector).click();
    driver.waitForVisible(`#dialog`);
    this.el.element(`#dialog input[name="label"]`).setValue(label);
    this.el.click('#dialog paper-button[name="save"]');
  }

  get isVocabularyTableVisible() {
    driver.waitForVisible(`#table`);
    return this.el.element(`#table`).isVisible();
  }

  get entryCount() {
    const res = this.el.elements(`#table #items nuxeo-data-table-row`);
    if (res && res.value) {
      return res.value.length;
    } else {
      return 0;
    }
  }

  table() {
    driver.waitForVisible(`#table`);
    return this.el.element(`#table`);
  }

  get isVocabularyTableFilled() {
    this.el.waitForVisible(`#table #items nuxeo-data-table-row`);
    return !this.el.elements(`#table #items nuxeo-data-table-row`).value
               .some((row) => row.getText().trim().length === 0);
  }

  get hasEditDialog() {
    driver.waitForVisible(`#edit-button-0`);
    this.el.element(`#edit-button-0`).click();
    driver.waitForVisible(`#dialog`);
    const visibleLabels = driver.isVisible(`#dialog input[name="label"]`);
    let allFieldVisible = false;
    if (visibleLabels.length) {
      allFieldVisible = visibleLabels.every((el) => el);
    } else {
      allFieldVisible = visibleLabels;
    }
    allFieldVisible = allFieldVisible && driver.isVisible(`#dialog input[name="id"]`);
    this.el.element(`#dialog paper-button[name="cancel"]`).click();
    return allFieldVisible;
  }

  get hasCreateDialog() {
    driver.waitForVisible(`#addEntry`);
    this.el.element(`#addEntry`).click();
    driver.waitForVisible(`#dialog`);
    const visibleLabels = driver.isVisible(`#dialog input[name="label"]`);
    let allFieldVisible = false;
    if (visibleLabels.length) {
      allFieldVisible = visibleLabels.every((el) => el);
    } else {
      allFieldVisible = visibleLabels;
    }
    allFieldVisible = allFieldVisible && driver.isVisible(`#dialog input[name="id"]`);
    this.el.element(`#selectParent`).click();
    driver.waitForVisible(`#parentDialog nuxeo-tree-node:first-child`);
    this.el.element(`#parentDialog paper-button[name="close"]`).click();
    this.el.element(`#dialog paper-button[name="cancel"]`).click();
    return allFieldVisible;
  }

}

import BasePage from '../../base';

export default class Vocabulary extends BasePage {
  vocabulary(option) {
    const selection = option.toLowerCase();
    const dropdown = this.el.element('#menuButton');
    dropdown.waitForVisible();
    dropdown.click();
    const item = this.el.element(`nuxeo-select paper-item[name="${selection}"]`);
    item.waitForVisible();
    item.click();
  }

  addNewEntry(id, label) {
    driver.waitForVisible('#addEntry');
    this.el.element('#addEntry').click();
    const dialog = this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    dialog.waitForVisible();
    dialog.waitForVisible('input[name="id"]');
    dialog.element('input[name="id"]').setValue(id);
    dialog.waitForVisible('input[name="label"]');
    dialog.element('input[name="label"]').setValue(label);
    dialog.waitForVisible('paper-button[name="save"]');
    dialog.click('paper-button[name="save"]');
  }

  waitForHasEntry(id, reverse) {
    const { el } = this;
    driver.waitForVisible('#table');
    driver.waitUntil(
      () => {
        const cells = el.elements('#table nuxeo-data-table-cell');
        if (reverse) {
          return cells.every((cell) => cell.getText().trim() !== id);
        }
        return cells.some((cell) => cell.getText().trim() === id);
      },
      reverse ? 'The vocabulary does have such entry' : 'The vocabulary does not have such entry',
    );
    return true;
  }

  deleteEntry(index) {
    const selector = `#delete-button-${index - 1}`;
    this.el.element(selector).click();
    driver.alertAccept();
  }

  editEntry(index, label) {
    const selector = `#edit-button-${index - 1}`;
    this.el.element(selector).click();
    const dialog = this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    dialog.waitForVisible();
    dialog.waitForVisible('input[name="label"]');
    dialog.element('input[name="label"]').setValue(label);
    dialog.click('paper-button[name="save"]');
  }

  get isVocabularyTableVisible() {
    return this.el.element('#table').waitForVisible();
  }

  get entryCount() {
    const res = this.el.elements('#table #items nuxeo-data-table-row');
    if (res) {
      return res.length;
    }
    return 0;
  }

  table() {
    driver.waitForVisible('#table');
    return this.el.element('#table');
  }

  get isVocabularyTableFilled() {
    this.el.waitForVisible('#table nuxeo-data-table-row');
    return !this.el.elements('#table nuxeo-data-table-row').some((row) => row.getText().trim().length === 0);
  }

  get hasEditDialog() {
    driver.waitForVisible('#edit-button-0');
    this.el.element('#edit-button-0').click();
    this.el.waitForVisible('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    const dialog = this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    const allFieldVisible = dialog.waitForVisible('input[name="label"]') && dialog.waitForVisible('input[name="id"]');
    dialog.waitForVisible('paper-button[name="cancel"]');
    dialog.element('paper-button[name="cancel"]').click();
    return allFieldVisible;
  }

  get hasCreateDialog() {
    this.el.waitForVisible('#addEntry');
    this.el.element('#addEntry').click();
    this.el.waitForVisible('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    const dialog = this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    const allFieldVisible = dialog.waitForVisible('input[name="label"]') && dialog.waitForVisible('input[name="id"]');
    dialog.element('#selectParent').click();
    dialog.waitForVisible('#parentDialog nuxeo-tree-node:first-child');
    dialog.waitForVisible('#parentDialog paper-button[name="close"]');
    dialog.element('#parentDialog paper-button[name="close"]').click();
    dialog.waitForVisible('paper-button[name="cancel"]');
    dialog.scrollIntoView('paper-button[name="cancel"]');
    dialog.element('paper-button[name="cancel"]').click();
    return allFieldVisible;
  }
}

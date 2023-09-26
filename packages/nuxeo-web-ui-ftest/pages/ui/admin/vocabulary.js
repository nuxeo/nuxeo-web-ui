/* eslint-disable no-await-in-loop */
import BasePage from '../../base';

export default class Vocabulary extends BasePage {
  async vocabulary(option) {
    const selection = await option.toLowerCase();
    const dropdown = await this.el.element('#menuButton');
    await dropdown.waitForVisible();
    await dropdown.click();
    const item = await this.el.element(`nuxeo-select paper-item[name="${selection}"]`);
    await item.waitForVisible();
    await item.click();
  }

  async addNewEntry(id, label) {
    await driver.waitForVisible('#addEntry');
    const addEntryButton = await this.el.element('#addEntry');
    await addEntryButton.click();
    const dialog = await this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    await dialog.waitForVisible();
    const idInput = await dialog.element('input[name="id"]');
    await idInput.setValue(id);
    const labelInput = await dialog.element('input[name="label"]');
    await labelInput.setValue(label);
    const saveButton = await dialog.element('paper-button[name="save"]');
    await saveButton.waitForVisible();
    await saveButton.click();
  }

  async waitForHasEntry(id, reverse) {
    const el = await this.el;
    await driver.waitForVisible('#table');
    await driver.waitUntil(
      async () => {
        const cells = await el.elements('#table nuxeo-data-table-cell');
        if (reverse) {
          return cells.every(async (cell) => (await cell.getText()).trim() !== id);
        }
        return cells.some(async (cell) => (await cell.getText()).trim() === id);
      },
      reverse ? 'The vocabulary does have such entry' : 'The vocabulary does not have such entry',
      {
        timeoutMsg: 'waitForHasEntry timedout',
      },
    );
    return true;
  }

  async deleteEntry(index) {
    const selector = `#delete-button-${index - 1}`;
    const deleteButton = await this.el.element(selector);
    await deleteButton.scrollIntoView(selector);
    await deleteButton.click();
    await driver.alertAccept();
  }

  async editEntry(index, label) {
    const selector = `#edit-button-${index - 1}`;
    const editButton = await this.el.element(selector);
    await editButton.scrollIntoView(selector);
    await editButton.click();
    const dialog = await this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
    await dialog.waitForVisible();
    await dialog.waitForVisible('input[name="label"]');
    const labelInput = await dialog.element('input[name="label"]');
    await labelInput.setValue(label);
    const saveButton = await dialog.element('paper-button[name="save"]');
    await saveButton.click();
  }

  get isVocabularyTableVisible() {
    return (async () => {
      const table = await this.el.element('#table');
      return table.waitForVisible();
    })();
  }

  get entryCount() {
    return async () => {
      const res = await this.el.elements('#table #items nuxeo-data-table-row');
      if (res) {
        return res.length;
      }
      return 0;
    };
  }

  async table() {
    await driver.waitForVisible('#table');
    return this.el.element('#table');
  }

  get isVocabularyTableFilled() {
    return (async () => {
      const tableRow = await this.el.element('#table nuxeo-data-table-row');
      await tableRow.waitForVisible();
      const rows = await this.el.elements('#table nuxeo-data-table-row');
      const isTableNotEmpty = await rows.every(async (row) => (await row.getText()).trim().length !== 0);
      return isTableNotEmpty;
    })();
  }

  get hasEditDialog() {
    return async () => {
      await driver.waitForVisible('#edit-button-0');
      const editButton = await this.el.element('#edit-button-0');
      await editButton.click();
      await this.el.waitForVisible('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
      const dialog = await this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
      const labelFieldVisible = await dialog.element('input[name="label"]');
      const labelFieldVisibleValue = await labelFieldVisible.waitForVisible();
      const idFieldVisible = await dialog.element('input[name="id"]');
      const idFieldVisibleValue = await idFieldVisible.waitForVisible();
      const allFieldVisible = labelFieldVisibleValue && idFieldVisibleValue;
      await dialog.waitForVisible('paper-button[name="cancel"]');
      const cancelButton = await dialog.element('paper-button[name="cancel"]');
      await cancelButton.click();
      return allFieldVisible;
    };
  }

  get hasCreateDialog() {
    return async () => {
      await this.el.waitForVisible('#addEntry');
      const addButton = await this.el.element('#addEntry');
      await addButton.click();
      await this.el.waitForVisible('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
      const dialog = await this.el.element('nuxeo-dialog[id="vocabularyEditDialog"]:not([aria-hidden])');
      const labelFieldVisible = await dialog.element('input[name="label"]');
      const labelFieldVisibleValue = await labelFieldVisible.waitForVisible();
      const idFieldVisible = await dialog.element('input[name="id"]');
      const idFieldVisibleValue = await idFieldVisible.waitForVisible();
      const allFieldVisible = labelFieldVisibleValue && idFieldVisibleValue;
      const selectParent = await dialog.element('#selectParent');
      await selectParent.click();
      await dialog.waitForVisible('#parentDialog nuxeo-tree-node:first-child');
      await dialog.waitForVisible('#parentDialog paper-button[name="close"]');
      const parentDialog = await dialog.element('#parentDialog paper-button[name="close"]');
      await parentDialog.click();
      await dialog.waitForVisible('paper-button[name="cancel"]');
      await dialog.scrollIntoView('paper-button[name="cancel"]');
      const cancel = await dialog.element('paper-button[name="cancel"]');
      await cancel.click();
      return allFieldVisible;
    };
  }
}

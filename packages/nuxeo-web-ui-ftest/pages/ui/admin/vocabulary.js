/* eslint-disable no-await-in-loop */
import BasePage from '../../base.js';

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
    const addEntryButton = await this.el.element('#addEntry');
    await addEntryButton.waitForVisible();
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
    // Wait for the dialog to close, confirming the save has been submitted
    await this.waitForNotVisible('nuxeo-dialog[id="vocabularyEditDialog"]');
  }

  async waitForHasEntry(id, reverse) {
    await driver.waitUntil(
      async () => {
        // Search within nuxeo-vocabulary-management to avoid ambiguous global #table lookups.
        // Exclude header cells which contain filter dropdowns (they carry the [header] attribute).
        const cells = await this.el.elements('#table nuxeo-data-table-row nuxeo-data-table-cell:not([header])');
        // `elements()` returns a WDIO ChainablePromiseArray-resolved object; convert to a real
        // array so we can use Array.prototype methods (.map/.every/.some) synchronously.
        const cellArray = Array.from(cells);
        if (!cellArray.length) {
          // Table has no data cells yet (hidden during refresh or rows not yet stamped); keep waiting.
          return false;
        }
        // Await all cell texts concurrently so we can compare synchronously
        const texts = await Promise.all(cellArray.map((cell) => cell.getText().then((t) => t.trim())));
        if (reverse) {
          return texts.every((text) => text !== id);
        }
        return texts.some((text) => text === id);
      },
      {
        timeoutMsg: reverse
          ? `Expected not to find vocabulary entry: ${id}`
          : `Expected to find vocabulary entry: ${id}`,
      },
    );
    return true;
  }

  async deleteEntry(index) {
    const selector = `#delete-button-${index - 1}`;
    const deleteButton = await this.el.element(selector);
    await deleteButton.waitForVisible();
    await deleteButton.scrollIntoView(selector);

    // Wait for the alert to appear, retrying the click if it didn't register
    await driver.waitUntil(
      async () => {
        try {
          await driver.getAlertText();
          return true;
        } catch (e) {
          // Alert not present — retry the click and keep waiting
          try {
            await deleteButton.click();
          } catch (clickError) {
            // Ignore transient click failures so waitUntil can retry
          }
          return false;
        }
      },
      {
        timeout: 10000,
        interval: 1000,
        timeoutMsg: 'Expected confirmation alert did not appear',
      },
    );

    // Alert is confirmed present — accept it directly (no retry needed)
    await driver.acceptAlert();
  }

  async editEntry(index, label) {
    const selector = `#edit-button-${index - 1}`;
    const editButton = await this.el.element(selector);
    await editButton.waitForVisible();
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
    const table = await this.el.element('#table');
    await table.waitForVisible();
    return table;
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
      const editButton = await this.el.element('#edit-button-0');
      await editButton.waitForVisible();
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

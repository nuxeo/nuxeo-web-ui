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
        // Read the element's `entries` property directly (the source of truth) instead
        // of scraping rendered cell text. The `nuxeo-data-table` wraps `iron-list`,
        // which virtualises rows: when `items.length` shrinks (e.g. after a delete),
        // iron-list keeps the extra physical row in the DOM with its previous `item`
        // model still bound, so its `nuxeo-data-table-cell` continues to render the
        // stale label. Polling rendered cell text therefore can never see the entry
        // disappear and `I cannot see "Breizh" entry` times out after a successful
        // delete.
        //
        // We use `this.el.getProperty('entries')` rather than `driver.execute` with a
        // `document.querySelector`, because `nuxeo-vocabulary-management` is stamped
        // inside `nuxeo-admin`'s shadow DOM and is not reachable from light DOM. The
        // page object's `this.el` is already a WDIO element resolved through WDIO's
        // shadow-piercing `$`, so `getProperty` reads across the shadow boundary.
        let entries;
        try {
          entries = await this.el.getProperty('entries');
        } catch (e) {
          // Element may be temporarily detached during a refresh \u2014 keep waiting.
          return false;
        }
        if (!Array.isArray(entries)) {
          // `entries` not yet populated (initial load). In reverse mode (asserting
          // absence) treat as "not present"; otherwise keep waiting for the first load.
          return Boolean(reverse);
        }
        // The scenario passes either the entry id ("Brittany") or its label ("Breizh"),
        // so match against both to support both styles of step usage.
        const present = entries.some((entry) => {
          const props = (entry && entry.properties) || {};
          return props.id === id || props.label === id;
        });
        return reverse ? !present : present;
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

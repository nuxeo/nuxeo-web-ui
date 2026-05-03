/* eslint-disable no-await-in-loop */
import BasePage from '../../base.js';

export default class DocumentLayout extends BasePage {
  /**
   * Safely get a field element using a combined global selector.
   * Uses waitUntil + isExisting to avoid WDIO v9 implicitWait process crashes.
   */
  async getField(field) {
    const selector = `${this._selector} [name="${field}"]`;
    await driver.waitUntil(
      async () => {
        try {
          const el = await $(selector);
          return await el.isExisting();
        } catch (e) {
          return false;
        }
      },
      {
        timeout: 10000,
        interval: 500,
        timeoutMsg: `Layout "${this._selector}" or field "${field}" not found`,
      },
    );
    return $(selector);
  }

  /**
   * Safely perform an action on a field element, re-fetching it to avoid stale references.
   * Wraps the action in waitUntil to handle timing issues where the DOM re-renders.
   */
  async _safeFieldAction(field, action) {
    const selector = `${this._selector} [name="${field}"]`;
    await driver.waitUntil(
      async () => {
        try {
          const el = await $(selector);
          if (!(await el.isExisting())) return false;
          if (!(await el.isDisplayed())) return false;
          await action(el);
          return true;
        } catch (e) {
          return false;
        }
      },
      {
        timeout: 10000,
        interval: 500,
        timeoutMsg: `Field "${field}" in layout "${this._selector}" not interactable`,
      },
    );
  }

  async getFieldValue(field) {
    let result;
    await this._safeFieldAction(field, async (el) => {
      result = await fixtures.layouts.getValue(el);
    });
    return result;
  }

  async setFieldValue(field, value) {
    await this._safeFieldAction(field, async (el) => {
      await fixtures.layouts.setValue(el, value);
    });
  }

  async fillMultipleValues(table) {
    const rows = table.rows();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fieldName = row[0];
      await this._safeFieldAction(fieldName, async (el) => {
        await el.scrollIntoView();
        await fixtures.layouts.setValue(el, row[1]);
      });
    }
  }
}

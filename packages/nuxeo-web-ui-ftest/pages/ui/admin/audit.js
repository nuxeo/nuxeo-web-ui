import BasePage from '../../base';

export default class Audit extends BasePage {
  get isAuditTableDisplayed() {
    return (async () => {
      const tableEl = this.el.$('#table').waitForDisplayed();
      return tableEl;
    })();
  }

  get isAuditTableFilled() {
    return (async () => {
      const element = await this.el;
      const tableRow = await element.$$('#table nuxeo-data-table-row');
      return !(
        tableRow.some(async (row) => {
          const text = await row.getText();
          return text.trim().length;
        }) === 0
      );
    })();
  }

  async waitForHasEntry(action, reverse) {
    const el = await this.el;
    await driver.waitUntil(
      async () => {
        const cells = await el.$$('#table nuxeo-data-table-cell');
        if (reverse) {
          return cells.every(async (cell) => (await cell.getText()).trim() !== action);
        }
        return cells.some(async (cell) => (await cell.getText()).trim() === action);
      },
      reverse ? 'The audit does have such entry' : 'The audit does not have such entry',
      {
        timeoutMsg: 'The audit does have such entry',
      },
    );
    return true;
  }
}

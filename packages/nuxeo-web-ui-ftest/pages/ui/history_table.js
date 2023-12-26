/* eslint-disable no-await-in-loop */
import BasePage from '../base';

export default class HistoryTable extends BasePage {
  getHistory(event) {
    return this.el.$(`///*[text()="${event}"]`);
  }

  get isHistoryTableVisible() {
    return this.el.$('#table').waitForDisplayed();
  }

  get isHistoryTableFilled() {
    return (async () => {
      await this.el.waitForDisplayed('#table nuxeo-data-table-row');
      const tableRow = await this.el.$$('#table nuxeo-data-table-row');
      let found = false;
      for (let index = 0; index < tableRow.length; index++) {
        const itemText = await tableRow[index].getText();
        if (itemText.trim().length === 0) {
          throw new 'table rows are empty'();
        } else {
          found = true;
        }
      }
      return found;
    })();
  }

  waitForHasEntry(action, reverse) {
    const { el } = this;
    driver.waitUntil(
      () => {
        const cells = el.$$('#table nuxeo-data-table-cell');
        if (reverse) {
          return cells.every((cell) => cell.getText().trim() !== action);
        }
        return cells.some((cell) => cell.getText().trim() === action);
      },
      reverse ? 'The history does have such entry' : 'The history does not have such entry',
    );
    return true;
  }
}

import BasePage from '../base';

export default class HistoryTable extends BasePage {
  getHistory(event) {
    return this.el.$(`///*[text()="${event}"]`);
  }

  get isHistoryTableVisible() {
    return this.el.$('#table').waitForDisplayed();
  }

  get isHistoryTableFilled() {
    this.el.waitForDisplayed('#table nuxeo-data-table-row');
    return !this.el.$$('#table nuxeo-data-table-row').some((row) => row.getText().trim().length === 0);
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

import BasePage from '../../base';

export default class Audit extends BasePage {
  get isAuditTableDisplayed() {
    return this.el.$('#table').waitForDisplayed();
  }

  get isAuditTableFilled() {
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
      reverse ? 'The audit does have such entry' : 'The audit does not have such entry',
    );
    return true;
  }
}

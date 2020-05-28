export default class Spreadsheet {
  constructor() {
    driver.waitUntil(() => driver.execute(() => window.spreadheet));
  }

  element(...params) {
    return driver.element(...params);
  }

  get table() {
    return this.element('table.htCore');
  }

  get headers() {
    return this.table.elements('thead span').value.map((e) => e.getText());
  }

  get rows() {
    return this.table.elements('tbody tr');
  }

  get console() {
    return this.element('#console');
  }

  /**
   * Set data at given row and cell
   */
  setData(row, cell, data) {
    this._callHandsontable('setDataAtCell', row, cell, data);
  }

  /**
   * Get data at given row and cell
   */
  getData(row, cell) {
    return this._callHandsontable('getDataAtCell', row, cell);
  }

  /**
   * Save the data
   */
  save() {
    // click() was resulting "no element reference returned by script"
    driver.execute((el) => el.click(), this.element('#save').value);
  }

  /**
   * Close the spreadsheet
   */
  close() {
    driver.execute((el) => el.click(), this.element('#close').value);
  }

  /**
   * Call a Handsontable method
   */
  _callHandsontable(method, ...params) {
    // eslint-disable-next-line no-undef, no-shadow
    driver.execute((method, ...params) => window.spreadsheet.ht[method](...params), method, ...params);
  }
}

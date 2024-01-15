export default class Spreadsheet {
  constructor() {
    driver.waitUntil(() => driver.execute(() => window.spreadheet));
  }

  element(...params) {
    return driver.element(...params);
  }

  get table() {
    return (async () => {
      const tableEle = await this.element('table.htCore');
      return tableEle;
    })();
  }

  get headers() {
    return (async () => {
      try {
        const table = await this.table;
        const headerElements = await table.elements('thead span');
        const headerElementArray = Array.from(headerElements);
        const header = await Promise.all(headerElementArray.map(async (e) => e.getText()));
        return header;
      } catch (error) {
        console.error('Error fetching headers:', error);
        return [];
      }
    })();
  }

  get rows() {
    return (async () => {
      const tableEle = await this.table.elements('tbody tr');
      return tableEle;
    })();
  }

  get console() {
    return (async () => {
      const consoleEle = await this.element('#console');
      return consoleEle;
    })();
  }

  /**
   * Set data at given row and cell
   */
  async setData(row, cell, data) {
    await this._callHandsontable('setDataAtCell', row, cell, data);
  }

  /**
   * Get data at given row and cell
   */
  async getData(row, cell) {
    return (async () => {
      const getDataCell = await this._callHandsontable('getDataAtCell', row, cell);
      return getDataCell;
    })();
  }

  /**
   * Save the data
   */
  async save() {
    const saveButton = await this.element('#save');
    if (saveButton) {
      await saveButton.click();
    } else {
      console.error('Save button not found!!');
    }
  }

  /**
   * Close the spreadsheet
   */
  async close() {
    const closeButton = await this.element('#close');
    if (closeButton) {
      await closeButton.click();
    } else {
      console.error('Close button not found!!');
    }
  }

  /**
   * Call a Handsontable method
   */
  async _callHandsontable(method, ...params) {
    // eslint-disable-next-line no-undef, no-shadow
    await driver.execute((method, ...params) => window.spreadsheet.ht[method](...params), method, ...params);
  }
}

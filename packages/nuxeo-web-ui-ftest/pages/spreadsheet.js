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
    return (async () => {
      try {
        const table = await this.table;
        const headerElements = await table.elements('thead span');
        const headerElementArray = Array.from(headerElements); 
        const header = await Promise.all(headerElementArray.map(async (e) => await e.getText()));
        return header;
      } catch (error) {
        console.error('Error fetching headers:', error);
        return [];
      }
    })();
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
  async setData(row, cell, data) {
     this._callHandsontable('setDataAtCell', row, cell, data);
  }

  /**
   * Get data at given row and cell
   */
  async getData(row, cell) {
    return this._callHandsontable('getDataAtCell', row, cell);
  }

  /**
   * Save the data
   */
  async save() {
    const saveButton = await this.element('#save');
    if (saveButton) {
      await saveButton.click();
    } else {
      console.error('Save button not found');
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
      console.error('Close button not found');
    }
  }

  /**
   * Call a Handsontable method
   */
  _callHandsontable(method, ...params) {
    // eslint-disable-next-line no-undef, no-shadow
    driver.execute((method, ...params) => window.spreadsheet.ht[method](...params), method, ...params);
  }
  
  
}

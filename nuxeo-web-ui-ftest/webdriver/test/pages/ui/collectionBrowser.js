'use strict';

export default class CollectionBrowser {

  constructor(selector) {
    driver.waitForVisible(selector, 5000);
    this.page = driver.element(selector);
  }

  hasDocument(doc) {
    let rows = this.page.elements('#datatable #list nuxeo-data-table-row');
    return rows.value.some((row) => row.getText(`nuxeo-data-table-cell a.title`).trim() === doc.title);
  }

  clickDocument(doc) {
    let rows = this.page.elements('#datatable #list nuxeo-data-table-row');
    return rows.value.some((row) => {
      if (row.getText(`nuxeo-data-table-cell a.title`).trim() === doc.title) {
        row.click();
        return true;
      } else {
        return false;
      }
    });
  }
}

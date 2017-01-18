'use strict';

export default class CollectionBrowser {

  constructor(selector) {
    driver.waitForVisible(selector);
    this.page = driver.element(selector);
  }

  waitForHasMember(doc) {
    driver.waitUntil(function() {
      let rows = this.page.elements('#datatable #list nuxeo-data-table-row');
      return rows.value.some((row) => row.getText(`nuxeo-data-table-cell a.title`).trim() === doc.title);
    }.bind(this), 'The document does not appear in the collection');
    return true;
  }

  clickMember(doc) {
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

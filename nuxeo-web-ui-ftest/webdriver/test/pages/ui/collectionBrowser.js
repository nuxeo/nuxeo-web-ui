'use strict';

export default class CollectionBrowser {

  constructor(selector) {
    driver.waitForVisible(selector);
    this.page = driver.element(selector);
  }

  waitForHasMember(doc) {
    driver.waitUntil(() => {
      const rows = this.page.elements('nuxeo-data-table #list nuxeo-data-table-row');
      return rows.value.some((row) => row.getText(`nuxeo-data-table-cell a.title`).trim() === doc.title);
    }, 'The document does not appear in the collection');
    return true;
  }

  clickMember(doc) {
    const rows = this.page.elements('nuxeo-data-table #list nuxeo-data-table-row');
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

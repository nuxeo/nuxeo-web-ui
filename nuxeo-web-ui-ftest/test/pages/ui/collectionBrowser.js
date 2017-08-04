'use strict';

import BasePage from '../base';

export default class CollectionBrowser extends BasePage {

  waitForHasMember(doc) {
    const el = this.el;
    el.waitForVisible('nuxeo-data-table #list nuxeo-data-table-row');
    driver.waitUntil(() => {
      const rows = el.elements('nuxeo-data-table #list nuxeo-data-table-row');
      return rows.value.some((row) => row.getText(`nuxeo-data-table-cell a.title`).trim() === doc.title);
    }, 'The document does not appear in the collection');
    return true;
  }

  clickMember(doc) {
    const rows = this.el.elements('nuxeo-data-table #list nuxeo-data-table-row');
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

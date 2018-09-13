'use strict';

import BasePage from '../base';

export default class Recents extends BasePage {

  get nbItems() {
    const items = this.el.elements('#recentDocumentsList .list-item').value;
    let count = 0;
    items.forEach((item) => {
      if (item.isVisible()) {
        count++;
      }
    });
    return count;
  }

  reload() {
    fixtures.documents.reloadLocalStorage('* >>> nuxeo-recent-documents >>> #storage');
  }
}
